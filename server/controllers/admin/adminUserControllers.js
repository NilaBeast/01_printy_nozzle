const db = require("../../config/db");
const bcrypt = require("bcrypt");

const saltRounds = Number(process.env.SALT_ROUNDS) || 10;

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

    const runListQuery = (withLogin) =>
      db.query(
        `SELECT id, first_name, last_name, email, phone, role, is_active, created_at${withLogin ? ", last_login" : ""},
                (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS total_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = users.id AND (payment_status = 'paid' OR status = 'delivered')) AS total_spent
         FROM users
         WHERE ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
      );

    // Fall back gracefully on legacy DBs lacking users.last_login.
    let users;
    try {
      [users] = await runListQuery(true);
    } catch (loginColError) {
      if (loginColError && (loginColError.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(loginColError.message || ""))) {
        [users] = await runListQuery(false);
      } else {
        throw loginColError;
      }
    }

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

/* ===================== UPDATE USER (DETAILS / STATUS / ROLE) ===================== */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, role, is_active } = req.body;

    // Prevent changing own role or deactivating self
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot modify your own account role/status here" });
    }

    // Email uniqueness check
    if (email && email.trim()) {
      const [existingEmail] = await db.query("SELECT id FROM users WHERE email = ? AND id != ?", [email.trim(), id]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ success: false, message: "Email already in use by another account" });
      }
    }

    const [result] = await db.query(
      `UPDATE users SET
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         email = COALESCE(?, email),
         phone = ?,
         role = COALESCE(?, role),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        (first_name !== undefined && first_name !== "") ? first_name : null,
        (last_name !== undefined && last_name !== "") ? last_name : null,
        (email !== undefined && email.trim() !== "") ? email.trim() : null,
        phone !== undefined ? phone : null,
        role || null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
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

/* ===================== CREATE USER (ADMIN) ===================== */
const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role, is_active } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    const safeRole = role === "admin" ? "admin" : "customer";
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await db.query(
      "INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [
        first_name.trim(),
        last_name.trim(),
        cleanEmail,
        phone?.trim() || null,
        hashedPassword,
        safeRole,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { userId: result.insertId },
    });
  } catch (error) {
    console.error("Admin createUser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE USER (ADMIN) ===================== */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Never let an admin delete their own account.
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    // Linked orders, carts, addresses cascade (ON DELETE CASCADE).
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
