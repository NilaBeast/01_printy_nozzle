const db = require("../../config/db");
const { sendContactReplyMail } = require("../../utils/mailer");

/* Idempotent self-heal so older installs get the replies thread table. */
const ensureRepliesTable = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS contact_replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id INT NOT NULL,
      sender ENUM('customer', 'staff') DEFAULT 'staff',
      sender_name VARCHAR(200) DEFAULT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES contact_messages(id) ON DELETE CASCADE,
      INDEX idx_message (message_id)
    ) ENGINE=InnoDB`
  );
};

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

/* ===================== GET CONTACT MESSAGE DETAILS ===================== */
const getContactDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [messages] = await db.query("SELECT * FROM contact_messages WHERE id = ?", [id]);
    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    let replies = [];
    try {
      await ensureRepliesTable();
      const [rows] = await db.query(
        "SELECT * FROM contact_replies WHERE message_id = ? ORDER BY id ASC",
        [id]
      );
      replies = rows;
    } catch {
      replies = [];
    }

    // Opening a ticket marks it read (but never downgrades replied/archived).
    try {
      await db.query(
        "UPDATE contact_messages SET is_read = 1, status = CASE WHEN status = 'pending' THEN 'read' ELSE status END WHERE id = ?",
        [id]
      );
      messages[0].is_read = 1;
      if (messages[0].status === "pending") messages[0].status = "read";
    } catch {
      /* non-fatal */
    }

    return res.status(200).json({ success: true, data: { ...messages[0], replies } });
  } catch (error) {
    console.error("Admin getContactDetails error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== REPLY TO CONTACT MESSAGE ===================== */
const replyToContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const [messages] = await db.query("SELECT * FROM contact_messages WHERE id = ?", [id]);
    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    const contact = messages[0];

    await ensureRepliesTable();

    const staffName =
      [req.user?.first_name, req.user?.last_name].filter(Boolean).join(" ").trim() || "Support Team";
    const [insertRes] = await db.query(
      "INSERT INTO contact_replies (message_id, sender, sender_name, message) VALUES (?, 'staff', ?, ?)",
      [id, staffName, String(message).trim()]
    );

    await db.query("UPDATE contact_messages SET status = 'replied', is_read = 1 WHERE id = ?", [id]);

    // Email the customer — a mail failure must not fail the reply itself.
    let emailSent = false;
    try {
      const result = await sendContactReplyMail({
        to: contact.email,
        name: contact.name,
        subject: contact.subject,
        replyMessage: String(message).trim(),
      });
      emailSent = Boolean(result?.sent);
    } catch (mailError) {
      console.error("Contact reply email failed:", mailError.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent ? "Reply sent to customer" : "Reply saved (email not sent — SMTP not configured)",
      data: { replyId: insertRes.insertId, emailSent },
    });
  } catch (error) {
    console.error("Admin replyToContact error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getSubscribers,
  deleteSubscriber,
  getContactMessages,
  getContactDetails,
  updateMessageStatus,
  replyToContact,
  deleteContactMessage,
};
