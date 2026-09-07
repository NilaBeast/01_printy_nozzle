const db = require("../config/db");

/* ===================== ADD REVIEW ===================== */
const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Check product exists
    const [products] = await db.query("SELECT id FROM products WHERE id = ? AND is_active = 1", [productId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if user already reviewed
    const [existing] = await db.query(
      "SELECT id FROM reviews WHERE product_id = ? AND user_id = ?",
      [productId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "You have already reviewed this product" });
    }

    // Add review
    await db.query(
      "INSERT INTO reviews (product_id, user_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)",
      [productId, req.user.id, rating, title || null, comment || null]
    );

    // Update product average rating
    const [avgResult] = await db.query(
      "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ? AND is_visible = 1",
      [productId]
    );

    await db.query(
      "UPDATE products SET avg_rating = ?, review_count = ? WHERE id = ?",
      [Math.round(avgResult[0].avg_rating * 100) / 100, avgResult[0].review_count, productId]
    );

    return res.status(201).json({ success: true, message: "Review submitted successfully" });
  } catch (error) {
    console.error("Add review error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET PRODUCT REVIEWS ===================== */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let orderBy = "r.created_at DESC";
    if (sort === "oldest") orderBy = "r.created_at ASC";
    else if (sort === "highest") orderBy = "r.rating DESC";
    else if (sort === "lowest") orderBy = "r.rating ASC";

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND is_visible = 1",
      [productId]
    );

    const [reviews] = await db.query(
      `SELECT r.id, r.rating, r.title, r.comment, r.created_at,
              u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.is_visible = 1
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [productId, parseInt(limit), offset]
    );

    // Rating distribution
    const [distribution] = await db.query(
      `SELECT rating, COUNT(*) as count
       FROM reviews WHERE product_id = ? AND is_visible = 1
       GROUP BY rating ORDER BY rating DESC`,
      [productId]
    );

    return res.status(200).json({
      success: true,
      reviews,
      distribution,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE REVIEW ===================== */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const [reviews] = await db.query("SELECT product_id FROM reviews WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (reviews.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const productId = reviews[0].product_id;

    await db.query("DELETE FROM reviews WHERE id = ? AND user_id = ?", [id, req.user.id]);

    // Update product average
    const [avgResult] = await db.query(
      "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ? AND is_visible = 1",
      [productId]
    );

    await db.query(
      "UPDATE products SET avg_rating = COALESCE(?, 0), review_count = ? WHERE id = ?",
      [avgResult[0].avg_rating, avgResult[0].review_count, productId]
    );

    return res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  addReview,
  getProductReviews,
  deleteReview,
};
