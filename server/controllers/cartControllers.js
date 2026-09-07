const db = require("../config/db");

/* ===================== GET CART ===================== */
const getCart = async (req, res) => {
  try {
    // Get or create cart
    let [carts] = await db.query("SELECT * FROM cart WHERE user_id = ?", [req.user.id]);

    if (carts.length === 0) {
      const [result] = await db.query("INSERT INTO cart (user_id) VALUES (?)", [req.user.id]);
      carts = [{ id: result.insertId, user_id: req.user.id, coupon_id: null }];
    }

    const cart = carts[0];

    // Get cart items with product details
    const [items] = await db.query(
      `SELECT ci.id, ci.quantity, ci.product_id, ci.variant_id,
              p.name, p.slug, p.price, p.compare_price, p.stock,
              pv.variant_name, pv.variant_value, pv.price_adjustment, pv.stock as variant_stock,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image,
              c.name as category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at DESC`,
      [cart.id]
    );

    // Calculate totals
    let subtotal = 0;
    const cartItems = items.map((item) => {
      const itemPrice = item.price + (item.price_adjustment || 0);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      return {
        ...item,
        unit_price: itemPrice,
        total: itemTotal,
      };
    });

    // Get coupon if applied
    let discount = 0;
    let coupon = null;
    if (cart.coupon_id) {
      const [coupons] = await db.query(
        "SELECT * FROM coupons WHERE id = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > NOW())",
        [cart.coupon_id]
      );

      if (coupons.length > 0) {
        coupon = coupons[0];
        if (subtotal >= coupon.min_order_amount) {
          if (coupon.discount_type === "percentage") {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
              discount = coupon.max_discount;
            }
          } else {
            discount = coupon.discount_value;
          }
        }
      }
    }

    // Get site settings for shipping threshold
    const [settings] = await db.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('free_shipping_threshold', 'gst_rate')"
    );

    const settingsMap = {};
    settings.forEach((s) => (settingsMap[s.setting_key] = parseFloat(s.setting_value)));

    const freeShippingThreshold = settingsMap.free_shipping_threshold || 999;
    const gstRate = settingsMap.gst_rate || 18;

    const shippingFree = subtotal >= freeShippingThreshold;
    const taxableAmount = subtotal - discount;
    const taxAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;

    return res.status(200).json({
      success: true,
      cart: {
        id: cart.id,
        items: cartItems,
        itemCount: cartItems.length,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        shipping: shippingFree ? 0 : null, // null means not yet calculated (depends on option)
        shippingFree,
        freeShippingThreshold,
        taxAmount,
        gstRate,
        totalAmount: Math.round((taxableAmount + taxAmount) * 100) / 100,
        coupon: coupon ? { id: coupon.id, code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value } : null,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== ADD TO CART ===================== */
const addToCart = async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    // Verify product exists and is active
    const [products] = await db.query(
      "SELECT id, name, stock, price FROM products WHERE id = ? AND is_active = 1",
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check stock
    const availableStock = variant_id
      ? (await db.query("SELECT stock FROM product_variants WHERE id = ?", [variant_id]))[0][0]?.stock || 0
      : products[0].stock;

    if (availableStock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    // Get or create cart
    let [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [req.user.id]);

    if (carts.length === 0) {
      const [result] = await db.query("INSERT INTO cart (user_id) VALUES (?)", [req.user.id]);
      carts = [{ id: result.insertId }];
    }

    const cartId = carts[0].id;

    // Check if item already in cart
    const [existingItems] = await db.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))",
      [cartId, product_id, variant_id || null, variant_id || null]
    );

    if (existingItems.length > 0) {
      const newQty = existingItems[0].quantity + parseInt(quantity);
      if (newQty > availableStock) {
        return res.status(400).json({ success: false, message: "Insufficient stock for requested quantity" });
      }
      await db.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [newQty, existingItems[0].id]);
    } else {
      await db.query(
        "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)",
        [cartId, product_id, variant_id || null, parseInt(quantity)]
      );
    }

    return res.status(200).json({
      success: true,
      message: `${products[0].name} added to cart`,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE CART ITEM ===================== */
const updateCartItem = async (req, res) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: "Valid item ID and quantity required" });
    }

    // Verify ownership
    const [items] = await db.query(
      `SELECT ci.id, ci.product_id, ci.variant_id, p.stock, pv.stock as variant_stock
       FROM cart_items ci
       JOIN cart c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [item_id, req.user.id]
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    const availableStock = items[0].variant_stock !== null ? items[0].variant_stock : items[0].stock;
    if (quantity > availableStock) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    await db.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [parseInt(quantity), item_id]);

    return res.status(200).json({ success: true, message: "Cart updated" });
  } catch (error) {
    console.error("Update cart item error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== REMOVE CART ITEM ===================== */
const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE ci FROM cart_items ci
       JOIN cart c ON ci.cart_id = c.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    return res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CLEAR CART ===================== */
const clearCart = async (req, res) => {
  try {
    const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [req.user.id]);

    if (carts.length > 0) {
      await db.query("DELETE FROM cart_items WHERE cart_id = ?", [carts[0].id]);
      await db.query("UPDATE cart SET coupon_id = NULL WHERE id = ?", [carts[0].id]);
    }

    return res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== APPLY COUPON ===================== */
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const [coupons] = await db.query(
      `SELECT * FROM coupons 
       WHERE code = ? AND is_active = 1 
       AND (valid_from IS NULL OR valid_from <= NOW()) 
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit)`,
      [code.toUpperCase()]
    );

    if (coupons.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    const coupon = coupons[0];

    // Get cart subtotal
    const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [req.user.id]);
    if (carts.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const [items] = await db.query(
      `SELECT SUM((p.price + COALESCE(pv.price_adjustment, 0)) * ci.quantity) as subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.cart_id = ?`,
      [carts[0].id]
    );

    const subtotal = items[0].subtotal || 0;

    if (subtotal < coupon.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`,
      });
    }

    // Apply coupon to cart
    await db.query("UPDATE cart SET coupon_id = ? WHERE id = ?", [coupon.id, carts[0].id]);

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === "percentage") {
      discount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: Math.round(discount * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== REMOVE COUPON ===================== */
const removeCoupon = async (req, res) => {
  try {
    await db.query("UPDATE cart SET coupon_id = NULL WHERE user_id = ?", [req.user.id]);

    return res.status(200).json({ success: true, message: "Coupon removed" });
  } catch (error) {
    console.error("Remove coupon error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
};
