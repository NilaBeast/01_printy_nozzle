const db = require("../config/db");

/* ===================== FORMAT HELPER ===================== */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
};

/* ===================== BUILD ORDER TIMELINE ===================== */
const buildTimeline = (order) => {
  const steps = [
    {
      step: "Order Placed",
      key: "placed",
      timestamp: formatDateTime(order.created_at),
      is_completed: Boolean(order.created_at),
    },
    {
      step: "Packed",
      key: "packed",
      timestamp: formatDateTime(order.packed_at),
      is_completed: Boolean(order.packed_at) || ["shipped", "delivered"].includes(order.status),
    },
    {
      step: "Shipped",
      key: "shipped",
      timestamp: formatDateTime(order.shipped_at),
      carrier: order.shipping_carrier || "BlueDart Express",
      tracking_number: order.tracking_number || null,
      is_completed: Boolean(order.shipped_at) || order.status === "delivered",
    },
    {
      step: "Out for Delivery",
      key: "out_for_delivery",
      timestamp: formatDateTime(order.out_for_delivery_at),
      is_completed: Boolean(order.out_for_delivery_at) || order.status === "delivered",
    },
    {
      step: "Delivered",
      key: "delivered",
      timestamp: formatDateTime(order.delivered_at),
      is_completed: order.status === "delivered",
    },
  ];

  if (order.status === "cancelled") {
    return [
      {
        step: "Order Placed",
        key: "placed",
        timestamp: formatDateTime(order.created_at),
        is_completed: true,
      },
      {
        step: "Cancelled",
        key: "cancelled",
        timestamp: formatDateTime(order.cancelled_at || order.updated_at),
        is_completed: true,
      },
    ];
  }

  return steps;
};

/* ===================== GET USER ORDERS (MY ORDERS PAGE) ===================== */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, search, time_range = "last_6_months", page = 1, limit = 10 } = req.query;

    let whereClauses = ["o.user_id = ?"];
    let params = [userId];

    // Status Tab filter
    if (status && status !== "all") {
      if (status === "processing") {
        whereClauses.push("o.status IN ('pending', 'confirmed', 'processing')");
      } else {
        whereClauses.push("o.status = ?");
        params.push(status);
      }
    }

    // Time Range filter
    if (time_range === "last_6_months") {
      whereClauses.push("o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)");
    } else if (time_range === "this_year" || time_range === "2024") {
      whereClauses.push("YEAR(o.created_at) = YEAR(CURDATE())");
    }

    // Search by Order ID or Item name
    if (search) {
      whereClauses.push("(o.order_number LIKE ? OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_name LIKE ?))");
      const term = `%${search.replace(/^#/, "")}%`;
      params.push(term, term);
    }

    const whereSql = whereClauses.join(" AND ");

    // Fetch E-commerce Product Orders
    const [orders] = await db.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.subtotal, o.shipping_cost,
              o.payment_method_label, o.payment_status, o.tracking_number, o.shipping_carrier,
              o.created_at, o.delivered_at, o.shipped_at
       FROM orders o
       WHERE ${whereSql}
       ORDER BY o.created_at DESC`,
      params
    );

    // Populate items & thumbnails for each order
    for (const ord of orders) {
      const [items] = await db.query(
        `SELECT oi.id, oi.product_name, oi.category_name, oi.variant_value, oi.price, oi.quantity, oi.total,
                COALESCE(oi.product_image, (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1), 'https://res.cloudinary.com/demo/image/upload/sample.jpg') as image_url
         FROM order_items oi
         WHERE oi.order_id = ?`,
        [ord.id]
      );

      ord.items = items;
      ord.items_count = items.reduce((sum, it) => sum + it.quantity, 0);
      ord.items_summary = items.map((it) => it.product_name).join(", ");
      
      const allThumbnails = items.map((it) => it.image_url);
      ord.thumbnails = allThumbnails.slice(0, 3);
      ord.additional_items_count = Math.max(0, items.length - 3);

      ord.formatted_date = formatDate(ord.created_at);
      ord.delivered_date = ord.delivered_at ? formatDate(ord.delivered_at) : null;
      ord.expected_delivery = ord.status === "delivered" 
        ? `Delivered on ${formatDate(ord.delivered_at || ord.created_at)}`
        : `Expected by ${formatDate(new Date(new Date(ord.created_at).getTime() + 4 * 24 * 60 * 60 * 1000))}`;

      // Status Pill helpers
      ord.is_3d_print = false;
      ord.can_cancel = ["pending", "confirmed"].includes(ord.status);
      ord.can_track = ["shipped", "processing"].includes(ord.status);
      ord.can_reorder = true;
      ord.can_return = ord.status === "delivered";
    }

    // Also fetch 3D Printing orders if not filtering strictly for a status unavailable in 3D prints
    let printOrders = [];
    if (!status || status === "all" || status === "processing" || status === "delivered" || status === "cancelled") {
      let pWhere = ["po.user_id = ?"];
      let pParams = [userId];

      if (status === "processing") {
        pWhere.push("po.status IN ('pending', 'reviewing', 'in_production', 'printing', 'quality_check')");
      } else if (status === "delivered" || status === "cancelled") {
        pWhere.push("po.status = ?");
        pParams.push(status);
      }

      if (time_range === "last_6_months") {
        pWhere.push("po.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)");
      } else if (time_range === "this_year") {
        pWhere.push("YEAR(po.created_at) = YEAR(CURDATE())");
      }

      if (search) {
        pWhere.push("(po.order_number LIKE ? OR po.file_name LIKE ?)");
        const term = `%${search.replace(/^#/, "")}%`;
        pParams.push(term, term);
      }

      const [pRows] = await db.query(
        `SELECT po.id, po.order_number, po.status, po.total_amount, po.file_name, po.file_url, po.quantity,
                po.created_at, po.estimated_delivery,
                pm.name as material_name, pc.name as color_name, pc.hex_code
         FROM printing_orders po
         LEFT JOIN printing_materials pm ON po.material_id = pm.id
         LEFT JOIN printing_colors pc ON po.color_id = pc.id
         WHERE ${pWhere.join(" AND ")}
         ORDER BY po.created_at DESC`,
        pParams
      );

      printOrders = pRows.map((po) => ({
        id: po.id,
        order_number: po.order_number,
        status: po.status,
        status_label: po.status === "in_production" ? "In Production" : po.status.charAt(0).toUpperCase() + po.status.slice(1),
        total_amount: po.total_amount,
        formatted_date: formatDate(po.created_at),
        expected_delivery: po.status === "delivered" ? "Delivered" : `Expected by ${formatDate(new Date(new Date(po.created_at).getTime() + 4 * 24 * 60 * 60 * 1000))}`,
        is_3d_print: true,
        file_name: po.file_name,
        material_name: po.material_name,
        color_name: po.color_name,
        quantity: po.quantity,
        items_count: po.quantity,
        items_summary: `Custom 3D Print (${po.file_name}) - Material: ${po.material_name} | Color: ${po.color_name} | Qty: ${po.quantity}`,
        thumbnails: [
          "https://res.cloudinary.com/demo/image/upload/v1/3d_print_icon.png",
          "https://res.cloudinary.com/demo/image/upload/v1/filament_spool.png",
          "https://res.cloudinary.com/demo/image/upload/v1/nozzle_icon.png",
        ],
        additional_items_count: 2,
        can_cancel: ["pending", "reviewing"].includes(po.status),
        can_track: ["shipped", "in_production", "printing"].includes(po.status),
        can_reorder: true,
        can_return: false,
      }));
    }

    // Merge standard orders & 3D print orders, sorted chronologically descending
    const allOrders = [...orders, ...printOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Simple in-memory pagination for unified feed
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = allOrders.slice(offset, offset + parseInt(limit));

    return res.status(200).json({
      success: true,
      orders: paginated,
      pagination: {
        total: allOrders.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(allOrders.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET SINGLE ORDER DETAILS (ORDER DETAILS PAGE) ===================== */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Support lookup by ID or order_number (e.g. EL12456 or #EL12456)
    const cleanId = id.replace(/^#/, "");
    const isNumeric = !isNaN(cleanId) && !cleanId.startsWith("EL");
    const queryField = isNumeric ? "o.id = ?" : "o.order_number = ?";

    const [orders] = await db.query(
      `SELECT o.*
       FROM orders o
       WHERE ${queryField} AND (o.user_id = ? OR ? = 'admin')`,
      [cleanId, userId, req.user.role]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    // Order items
    const [items] = await db.query(
      `SELECT oi.*, p.slug as product_slug,
              COALESCE(oi.product_image, (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1), 'https://res.cloudinary.com/demo/image/upload/sample.jpg') as image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;

    // Formatted Dates & Header
    order.formatted_placed_at = formatDateTime(order.created_at);
    order.formatted_date = formatDate(order.created_at);
    order.status_pill = {
      status: order.status,
      label: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      is_delivered: order.status === "delivered",
      is_cancelled: order.status === "cancelled",
    };

    // 5-Stage Stepper / Timeline
    order.timeline = buildTimeline(order);

    // Addresses Breakdown
    order.shipping_address = {
      full_name: order.shipping_name,
      phone: order.shipping_phone,
      email: order.shipping_email,
      address_line1: order.shipping_address1,
      address_line2: order.shipping_address2,
      city: order.shipping_city,
      state: order.shipping_state,
      pincode: order.shipping_pincode,
      country: order.shipping_country || "India",
      formatted: `${order.shipping_address1}${order.shipping_address2 ? ', ' + order.shipping_address2 : ''}, ${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}, ${order.shipping_country || 'India'}`
    };

    order.billing_address = {
      full_name: order.billing_name || order.shipping_name,
      phone: order.billing_phone || order.shipping_phone,
      address_line1: order.billing_address1 || order.shipping_address1,
      address_line2: order.billing_address2 || order.shipping_address2,
      city: order.billing_city || order.shipping_city,
      state: order.billing_state || order.shipping_state,
      pincode: order.billing_pincode || order.shipping_pincode,
      country: order.billing_country || order.shipping_country || "India",
      formatted: `${order.billing_address1 || order.shipping_address1}${order.billing_address2 ? ', ' + order.billing_address2 : ''}, ${order.billing_city || order.shipping_city}, ${order.billing_state || order.shipping_state} ${order.billing_pincode || order.shipping_pincode}, ${order.billing_country || 'India'}`
    };

    // Financial Summary
    order.summary = {
      items_count: items.reduce((sum, it) => sum + it.quantity, 0),
      subtotal: parseFloat(order.subtotal),
      shipping_cost: parseFloat(order.shipping_cost),
      is_shipping_free: parseFloat(order.shipping_cost) === 0,
      discount: parseFloat(order.discount),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount),
    };

    // Breadcrumbs
    order.breadcrumbs = [
      { label: "Home", url: "/" },
      { label: "My Orders", url: "/orders" },
      { label: `Order #${order.order_number}`, url: `/orders/${order.order_number}` },
    ];

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== REORDER PRODUCTS (ADD ALL ITEMS TO CART) ===================== */
const reorderOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const cleanId = id.replace(/^#/, "");
    const isNumeric = !isNaN(cleanId) && !cleanId.startsWith("EL");
    const queryField = isNumeric ? "id = ?" : "order_number = ?";

    const [orders] = await db.query(
      `SELECT id FROM orders WHERE ${queryField} AND user_id = ?`,
      [cleanId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const orderId = orders[0].id;

    // Get order items
    const [items] = await db.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL",
      [orderId]
    );

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: "No active products to reorder" });
    }

    // Find or create cart
    let [cart] = await db.query("SELECT id FROM cart WHERE user_id = ?", [userId]);
    let cartId;
    if (cart.length === 0) {
      const [newCart] = await db.query("INSERT INTO cart (user_id) VALUES (?)", [userId]);
      cartId = newCart.insertId;
    } else {
      cartId = cart[0].id;
    }

    // Insert items into cart
    for (const item of items) {
      const [existing] = await db.query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, item.product_id]
      );

      if (existing.length > 0) {
        await db.query(
          "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
          [item.quantity, existing[0].id]
        );
      } else {
        await db.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
          [cartId, item.product_id, item.quantity]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "All items added to your cart successfully!",
    });
  } catch (error) {
    console.error("Reorder error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DOWNLOAD / GET INVOICE ===================== */
const getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const cleanId = id.replace(/^#/, "");
    const isNumeric = !isNaN(cleanId) && !cleanId.startsWith("EL");
    const queryField = isNumeric ? "o.id = ?" : "o.order_number = ?";

    const [orders] = await db.query(
      `SELECT o.*, u.first_name, u.last_name, u.email as customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE ${queryField} AND (o.user_id = ? OR ? = 'admin')`,
      [cleanId, userId, req.user.role]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    const [items] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
    order.items = items;

    const invoice = {
      invoice_number: `INV-${order.order_number}`,
      invoice_date: formatDate(order.created_at),
      order_number: order.order_number,
      company: {
        name: "ElectroLab Technologies Pvt. Ltd.",
        address: "123, Maker Street, Koramangala, Bengaluru, Karnataka 560034",
        gstin: "29AAAAA0000A1Z5",
        email: "support@electrolab.in",
        phone: "+91 98765 43210",
      },
      customer: {
        name: order.shipping_name,
        email: order.shipping_email || order.customer_email,
        phone: order.shipping_phone,
        address: `${order.shipping_address1}${order.shipping_address2 ? ', ' + order.shipping_address2 : ''}, ${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}`,
      },
      items: items.map((it) => ({
        description: it.product_name + (it.variant_value ? ` (${it.variant_value})` : ""),
        category: it.category_name,
        quantity: it.quantity,
        unit_price: parseFloat(it.price),
        total: parseFloat(it.total),
      })),
      financials: {
        subtotal: parseFloat(order.subtotal),
        shipping_cost: parseFloat(order.shipping_cost),
        discount: parseFloat(order.discount),
        gst_rate: "18%",
        tax_amount: parseFloat(order.tax_amount),
        grand_total: parseFloat(order.total_amount),
      },
      payment: {
        method: order.payment_method_label || order.payment_method.toUpperCase(),
        status: order.payment_status.toUpperCase(),
      },
    };

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE ORDER (CHECKOUT) ===================== */
const createOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const {
      shipping_address_id,
      shipping_name,
      shipping_phone,
      shipping_email,
      shipping_address1,
      shipping_address2,
      shipping_city,
      shipping_state,
      shipping_pincode,
      shipping_country,
      delivery_option = "standard",
      payment_method = "cod",
      notes,
    } = req.body;

    // Get user cart
    const [cart] = await connection.query("SELECT * FROM cart WHERE user_id = ?", [userId]);
    if (cart.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const [cartItems] = await connection.query(
      `SELECT ci.*, p.name as product_name, p.price, p.stock, p.category_id,
              c.name as category_name,
              pv.variant_name, pv.variant_value, pv.price_adjustment,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as product_image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.cart_id = ?`,
      [cart[0].id]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Check stock & calculate subtotal
    let subtotal = 0;
    for (const item of cartItems) {
      const itemStock = item.variant_id ? item.stock : item.stock;
      if (itemStock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${item.product_name}. Available: ${itemStock}`,
        });
      }
      const itemPrice = parseFloat(item.price) + parseFloat(item.price_adjustment || 0);
      subtotal += itemPrice * item.quantity;
    }

    // Coupon calculation
    let discount = 0;
    let couponId = null;
    let couponCode = null;
    if (cart[0].coupon_id) {
      const [coupons] = await connection.query(
        "SELECT * FROM coupons WHERE id = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > NOW())",
        [cart[0].coupon_id]
      );
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (subtotal >= parseFloat(coupon.min_order_amount)) {
          couponId = coupon.id;
          couponCode = coupon.code;
          if (coupon.discount_type === "percentage") {
            discount = (subtotal * parseFloat(coupon.discount_value)) / 100;
            if (coupon.max_discount && discount > parseFloat(coupon.max_discount)) {
              discount = parseFloat(coupon.max_discount);
            }
          } else {
            discount = parseFloat(coupon.discount_value);
          }
          await connection.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [coupon.id]);
        }
      }
    }

    // Shipping cost
    const [settings] = await connection.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('free_shipping_threshold', 'standard_shipping_cost', 'express_shipping_cost', 'same_day_shipping_cost', 'gst_rate')"
    );
    const configMap = {};
    settings.forEach((s) => (configMap[s.setting_key] = s.setting_value));

    const freeThreshold = parseFloat(configMap.free_shipping_threshold || 999);
    let shippingCost = 0;

    if (delivery_option === "express") {
      shippingCost = parseFloat(configMap.express_shipping_cost || 99);
    } else if (delivery_option === "same_day") {
      shippingCost = parseFloat(configMap.same_day_shipping_cost || 149);
    } else {
      shippingCost = subtotal >= freeThreshold ? 0 : parseFloat(configMap.standard_shipping_cost || 0);
    }

    // GST Tax calculation
    const gstRate = parseFloat(configMap.gst_rate || 18);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = (taxableAmount * gstRate) / 100;
    const totalAmount = taxableAmount + taxAmount + shippingCost;

    // Resolve address
    let shipName = shipping_name;
    let shipPhone = shipping_phone;
    let shipEmail = shipping_email;
    let shipAdd1 = shipping_address1;
    let shipAdd2 = shipping_address2;
    let shipCity = shipping_city;
    let shipState = shipping_state;
    let shipPin = shipping_pincode;
    let shipCountry = shipping_country || "India";

    if (shipping_address_id) {
      const [addr] = await connection.query("SELECT * FROM addresses WHERE id = ? AND user_id = ?", [shipping_address_id, userId]);
      if (addr.length > 0) {
        shipName = addr[0].full_name;
        shipPhone = addr[0].phone;
        shipEmail = addr[0].email;
        shipAdd1 = addr[0].address_line1;
        shipAdd2 = addr[0].address_line2;
        shipCity = addr[0].city;
        shipState = addr[0].state;
        shipPin = addr[0].pincode;
        shipCountry = addr[0].country;
      }
    }

    const orderNumber = `EL${Math.floor(10000 + Math.random() * 90000)}`;

    const methodLabels = {
      upi: "UPI (GPay)",
      card: "Credit / Debit Card",
      net_banking: "Net Banking",
      wallet: "Digital Wallet",
      cod: "Cash on Delivery",
    };

    // Insert Order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (user_id, order_number, status, shipping_name, shipping_phone, shipping_email,
        shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_pincode, shipping_country,
        billing_name, billing_phone, billing_address1, billing_address2, billing_city, billing_state, billing_pincode, billing_country,
        delivery_option, shipping_cost, payment_method, payment_method_label, payment_status,
        subtotal, discount, tax_amount, total_amount, coupon_id, coupon_code, notes)
       VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        orderNumber,
        shipName,
        shipPhone,
        shipEmail,
        shipAdd1,
        shipAdd2,
        shipCity,
        shipState,
        shipPin,
        shipCountry,
        shipName,
        shipPhone,
        shipAdd1,
        shipAdd2,
        shipCity,
        shipState,
        shipPin,
        shipCountry,
        delivery_option,
        shippingCost,
        payment_method,
        methodLabels[payment_method] || "Cash on Delivery",
        payment_method === "cod" ? "pending" : "paid",
        subtotal.toFixed(2),
        discount.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        couponId,
        couponCode,
        notes || null,
      ]
    );

    const orderId = orderResult.insertId;

    // Insert Order Items & Deduct stock
    for (const item of cartItems) {
      const itemPrice = parseFloat(item.price) + parseFloat(item.price_adjustment || 0);
      const itemTotal = itemPrice * item.quantity;

      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, category_name, variant_name, variant_value, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.product_image,
          item.category_name,
          item.variant_name || null,
          item.variant_value || null,
          itemPrice.toFixed(2),
          item.quantity,
          itemTotal.toFixed(2),
        ]
      );

      // Decrement product stock & increase total_sold
      await connection.query(
        "UPDATE products SET stock = stock - ?, total_sold = total_sold + ? WHERE id = ?",
        [item.quantity, item.quantity, item.product_id]
      );
    }

    // Clear cart
    await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cart[0].id]);
    await connection.query("UPDATE cart SET coupon_id = NULL WHERE id = ?", [cart[0].id]);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: {
        id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount.toFixed(2),
        payment_method,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create order error:", error);
    return res.status(500).json({ success: false, message: "Order creation failed" });
  } finally {
    connection.release();
  }
};

/* ===================== CANCEL ORDER ===================== */
const cancelOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const cleanId = id.replace(/^#/, "");
    const isNumeric = !isNaN(cleanId) && !cleanId.startsWith("EL");
    const queryField = isNumeric ? "id = ?" : "order_number = ?";

    const [orders] = await connection.query(
      `SELECT * FROM orders WHERE ${queryField} AND user_id = ?`,
      [cleanId, req.user.id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    if (!["pending", "confirmed", "processing"].includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in '${order.status}' status. It may have already shipped.`,
      });
    }

    // Restore stock
    const [items] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [order.id]);
    for (const item of items) {
      if (item.product_id) {
        await connection.query(
          "UPDATE products SET stock = stock + ?, total_sold = GREATEST(total_sold - ?, 0) WHERE id = ?",
          [item.quantity, item.quantity, item.product_id]
        );
      }
    }

    // Restore coupon
    if (order.coupon_id) {
      await connection.query("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE id = ?", [order.coupon_id]);
    }

    await connection.query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?", [order.id]);

    await connection.commit();

    return res.status(200).json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel order error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    connection.release();
  }
};

module.exports = {
  getUserOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  reorderOrderItems,
  getOrderInvoice,
};
