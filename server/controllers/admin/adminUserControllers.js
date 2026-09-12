const db = require("../../config/db");

/* ===================== GET ALL USERS (ADMIN) ===================== */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", role = "", status = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ["1=1"];
    let params = [];

    if (search) {
      whereClauses.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (role) {
      whereClauses.push("role = ?");
      params.push(role);
    }

    if (status !== "") {
      whereClauses.push("is_active = ?");
      params.push(status === "active" || status === "1" ? 1 : 0);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRes] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE ${whereSql}`, params);
    const total = countRes[0].total;

    const [users] = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, is_active, created_at,
              (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS total_orders,
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = users.id AND (payment_status = 'paid' OR status = 'delivered')) AS total_spent
       FROM users
       WHERE ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Admin getAllUsers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET USER DETAILS ===================== */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT id, first_name, last_name, email, phone, role, is_active, created_at FROM users WHERE id = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Addresses
    const [addresses] = await db.query("SELECT * FROM addresses WHERE user_id = ?", [id]);
    user.addresses = addresses;

    // Recent orders
    const [orders] = await db.query(
      "SELECT id, order_number, total_amount, status, payment_status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 10",
      [id]
    );
    user.orders = orders;

    // 3D Print orders
    const [printOrders] = await db.query(
      "SELECT id, order_number, total_amount, status, payment_status, created_at FROM printing_orders WHERE user_id = ? ORDER BY id DESC LIMIT 10",
      [id]
    );
    user.printOrders = printOrders;

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Admin getUserById error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE USER STATUS / ROLE ===================== */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    // Prevent changing own role or deactivating self
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot modify your own account role/status here" });
    }

    const [result] = await db.query(
      `UPDATE users SET
         role = COALESCE(?, role),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [role || null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Admin updateUser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
};
