const db = require("../config/db");

/* ===================== GET ALL CATEGORIES ===================== */
const getAllCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = 1) as product_count
       FROM categories c
       WHERE c.is_active = 1
       ORDER BY c.sort_order ASC, c.name ASC`
    );

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET CATEGORY BY SLUG ===================== */
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [categories] = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = 1) as product_count
       FROM categories c
       WHERE c.slug = ? AND c.is_active = 1`,
      [slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      category: categories[0],
    });
  } catch (error) {
    console.error("Get category by slug error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
};
