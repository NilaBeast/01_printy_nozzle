const db = require("../../config/db");

/* ===================== GET ALL ORDERS (ADMIN) ===================== */
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", payment_status = "", search = "", from_date = "", to_date = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ["1=1"];
    let params = [];

    if (status) {
      whereClauses.push("o.status = ?");
      params.push(status);
    }

    if (payment_status) {
      whereClauses.push("o.payment_status = ?");
      params.push(payment_status);
    }

    if (search) {
      whereClauses.push("(o.order_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR o.shipping_phone LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (from_date) {
      whereClauses.push("o.created_at >= ?");
      params.push(from_date);
    }

    if (to_date) {
      whereClauses.push("o.created_at <= ?");
      params.push(`${to_date} 23:59:59`);
    }

    const whereSql = whereClauses.join(" AND ");

    const runOrdersQuery = (extraWhere) =>
      db.query(
        `SELECT o.*,
                u.first_name, u.last_name, u.email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE ${whereSql}${extraWhere}
         ORDER BY o.id DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
      );

    const runCountQuery = (extraWhere) =>
      db.query(
        `SELECT COUNT(*) AS total
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE ${whereSql}${extraWhere}`,
        params
      );

    // Pure 3D-print checkouts live only in printing_orders — keep them out
    // of the product Orders list. Fall back gracefully on legacy DBs that
    // lack the order_items.item_type column.
    const printOnlyExclusion = ` AND NOT (
      EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi
        WHERE oi.order_id = o.id AND (oi.item_type IS NULL OR oi.item_type <> 'print')
      )
    )`;

    let orders;
    let total;
    try {
      const [countRes] = await runCountQuery(printOnlyExclusion);
      total = countRes[0].total;
      [orders] = await runOrdersQuery(printOnlyExclusion);
    } catch (exclusionError) {
      if (exclusionError && (exclusionError.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(exclusionError.message || ""))) {
        const [countRes] = await runCountQuery("");
        total = countRes[0].total;
        [orders] = await runOrdersQuery("");
      } else {
        throw exclusionError;
      }
    }

    // Attach a compact item list for the admin table (thumbnails + names).
    if (orders.length) {
      try {
        const [items] = await db.query(
          `SELECT order_id, product_name, product_image, quantity, price
           FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")})
           ORDER BY order_id DESC, id ASC`,
          orders.map((o) => o.id)
        );
        const byOrder = {};
        items.forEach((it) => {
          (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
        });
        orders.forEach((o) => {
          o.items = byOrder[o.id] || [];
        });
      } catch {
        orders.forEach((o) => {
          o.items = [];
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Admin getAllOrders error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET ORDER DETAILS (ADMIN) ===================== */
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      `SELECT o.*, u.first_name, u.last_name, u.email, u.phone AS user_phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    // Order items
    const [items] = await db.query(
      `SELECT oi.*, p.slug,
              (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) AS image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );
    order.items = items;

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Admin getOrderDetails error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE ORDER STATUS ===================== */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, order_status, payment_status, tracking_number, shipping_carrier, notes } = req.body;
    const nextStatus = status || order_status;

    const [existing] = await db.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await db.query(
      `UPDATE orders SET
         status = COALESCE(?, status),
         payment_status = COALESCE(?, payment_status),
         tracking_number = COALESCE(?, tracking_number),
         shipping_carrier = COALESCE(?, shipping_carrier),
         notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        nextStatus || null,
        payment_status || null,
        tracking_number || null,
        shipping_carrier || null,
        notes || null,
        id,
      ]
    );

    return res.status(200).json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    console.error("Admin updateOrderStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
};
