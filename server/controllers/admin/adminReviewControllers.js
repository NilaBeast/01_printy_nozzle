const db = require("../../config/db");

/* ===================== GET ALL REVIEWS ===================== */
const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, rating = "", product_id = "", status = "" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ["1=1"];
    let params = [];

    if (rating) {
      whereClauses.push("r.rating = ?");
      params.push(rating);
    }

    if (product_id) {
      whereClauses.push("r.product_id = ?");
      params.push(product_id);
    }

    if (status !== "") {
      whereClauses.push("r.is_approved = ?");
      params.push(status === "approved" || status === "1" ? 1 : 0);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRes] = await db.query(
      `SELECT COUNT(*) AS total FROM reviews r WHERE ${whereSql}`,
      params
    );
    const total = countRes[0].total;

    const [reviews] = await db.query(
      `SELECT r.*,
              u.first_name, u.last_name, u.email,
              p.name AS product_title, p.slug AS product_slug
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE ${whereSql}
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Admin getAllReviews error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== TOGGLE / APPROVE REVIEW ===================== */
const toggleReviewApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    const [result] = await db.query(
      "UPDATE reviews SET is_approved = ? WHERE id = ?",
      [is_approved ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    return res.status(200).json({ success: true, message: "Review approval status updated" });
  } catch (error) {
    console.error("Admin toggleReviewApproval error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE REVIEW ===================== */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const [review] = await db.query("SELECT product_id FROM reviews WHERE id = ?", [id]);
    if (review.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const productId = review[0].product_id;

    await db.query("DELETE FROM reviews WHERE id = ?", [id]);

    // Recalculate product rating
    const [ratingStats] = await db.query(
      "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews FROM reviews WHERE product_id = ? AND is_approved = 1",
      [productId]
    );

    const newAvg = ratingStats[0].avg_rating || 0;
    const newTotal = ratingStats[0].total_reviews || 0;

    await db.query(
      "UPDATE products SET rating = ?, total_reviews = ? WHERE id = ?",
      [Number(newAvg).toFixed(2), newTotal, productId]
    );

    return res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Admin deleteReview error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllReviews,
  toggleReviewApproval,
  deleteReview,
};
