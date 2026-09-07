const db = require("../../config/db");

/* ===================== GET SUBSCRIBERS ===================== */
const getSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ["1=1"];
    let params = [];

    if (search) {
      whereClauses.push("email LIKE ?");
      params.push(`%${search}%`);
    }

    if (status !== "") {
      whereClauses.push("is_active = ?");
      params.push(status === "active" || status === "1" ? 1 : 0);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRes] = await db.query(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE ${whereSql}`, params);
    const total = countRes[0].total;

    const [subscribers] = await db.query(
      `SELECT * FROM newsletter_subscribers WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return res.status(200).json({
      success: true,
      data: {
        subscribers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Admin getSubscribers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE SUBSCRIBER ===================== */
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM newsletter_subscribers WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Subscriber not found" });
    }

    return res.status(200).json({ success: true, message: "Subscriber removed successfully" });
  } catch (error) {
    console.error("Admin deleteSubscriber error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET CONTACT MESSAGES ===================== */
const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ["1=1"];
    let params = [];

    if (status) {
      whereClauses.push("status = ?");
      params.push(status);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRes] = await db.query(`SELECT COUNT(*) AS total FROM contact_messages WHERE ${whereSql}`, params);
    const total = countRes[0].total;

    const [messages] = await db.query(
      `SELECT * FROM contact_messages WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Admin getContactMessages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE MESSAGE STATUS ===================== */
const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'read', 'replied', 'archived'

    const [result] = await db.query("UPDATE contact_messages SET status = ? WHERE id = ?", [status || "read", id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    return res.status(200).json({ success: true, message: "Message status updated" });
  } catch (error) {
    console.error("Admin updateMessageStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE CONTACT MESSAGE ===================== */
const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM contact_messages WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    return res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Admin deleteContactMessage error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getSubscribers,
  deleteSubscriber,
  getContactMessages,
  updateMessageStatus,
  deleteContactMessage,
};
