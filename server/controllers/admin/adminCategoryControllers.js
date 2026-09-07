const db = require("../../config/db");
const slugify = require("slugify");
const { uploadFile, deleteFile } = require("../../utils/cloudinaryUploader");

/* ===================== CREATE CATEGORY ===================== */
const createCategory = async (req, res) => {
  try {
    const { name, description, parent_id, sort_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    let slug = slugify(name, { lower: true, strict: true });
    const [existing] = await db.query("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    let imageUrl = null;
    if (req.file) {
      const uploadRes = await uploadFile(req.file.buffer, "categories", "image");
      imageUrl = uploadRes.secure_url;
    }

    const [result] = await db.query(
      "INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        slug,
        description || null,
        imageUrl,
        parent_id || null,
        sort_order || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { categoryId: result.insertId, slug },
    });
  } catch (error) {
    console.error("Admin createCategory error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE CATEGORY ===================== */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, sort_order, is_active } = req.body;

    const [existing] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    let slug = undefined;
    if (name && name !== existing[0].name) {
      slug = slugify(name, { lower: true, strict: true });
      const [slugCheck] = await db.query("SELECT id FROM categories WHERE slug = ? AND id != ?", [slug, id]);
      if (slugCheck.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    let imageUrl = undefined;
    if (req.file) {
      const uploadRes = await uploadFile(req.file.buffer, "categories", "image");
      imageUrl = uploadRes.secure_url;
    }

    await db.query(
      `UPDATE categories SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         description = ?,
         image_url = COALESCE(?, image_url),
         parent_id = ?,
         sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name || null,
        slug || null,
        description !== undefined ? description : null,
        imageUrl || null,
        parent_id !== undefined ? parent_id : null,
        sort_order !== undefined ? sort_order : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    return res.status(200).json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.error("Admin updateCategory error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE CATEGORY ===================== */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if products exist in category
    const [products] = await db.query("SELECT id FROM products WHERE category_id = ? LIMIT 1", [id]);
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with associated products. Deactivate it or reassign products first.",
      });
    }

    const [result] = await db.query("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Admin deleteCategory error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
};
