const db = require("../config/db");

/* ===================== SUBSCRIBE ===================== */
const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // Check if already subscribed
    const [existing] = await db.query("SELECT id, is_active FROM newsletter_subscribers WHERE email = ?", [email]);

    if (existing.length > 0) {
      if (existing[0].is_active) {
        return res.status(409).json({ success: false, message: "Email already subscribed" });
      }
      // Re-activate
      await db.query(
        "UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL WHERE id = ?",
        [existing[0].id]
      );
    } else {
      await db.query("INSERT INTO newsletter_subscribers (email) VALUES (?)", [email]);
    }

    return res.status(200).json({ success: true, message: "Subscribed successfully! You'll receive updates on new products and offers." });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UNSUBSCRIBE ===================== */
const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const [result] = await db.query(
      "UPDATE newsletter_subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE email = ? AND is_active = 1",
      [email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Email not found in subscribers" });
    }

    return res.status(200).json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { subscribe, unsubscribe };
