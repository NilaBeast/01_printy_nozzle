const db = require("../config/db");

/* ===================== GET ALL ACTIVE BRANDS ===================== */
const getAllActiveBrands = async (req, res) => {
  try {
    const [brands] = await db.query(
      `SELECT b.id, b.name, b.slug, b.logo_url,
              COUNT(p.id) AS product_count
       FROM brands b
       LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = 1
       WHERE b.is_active = 1
       GROUP BY b.id
       ORDER BY b.name ASC`
    );

    return res.status(200).json({
      success: true,
      brands,
    });
  } catch (error) {
    console.error("Get all brands error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getAllActiveBrands };
