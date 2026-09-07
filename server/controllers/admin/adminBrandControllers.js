const db = require("../../config/db");
const slugify = require("slugify");
const { uploadFile } = require("../../utils/cloudinaryUploader");

/* ===================== GET ALL BRANDS ===================== */
const getAllBrands = async (req, res) => {
  try {
    const [brands] = await db.query(`
      SELECT b.*, COUNT(p.id) AS product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = 1
      GROUP BY b.id
      ORDER BY b.name ASC
    `);

    return res.status(200).json({ success: true, data: brands });
  } catch (error) {
    console.error("Admin getAllBrands error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE BRAND ===================== */
const createBrand = async (req, res) => {
  try {
    const { name, description, website_url, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Brand name is required" });
    }

    let slug = slugify(name, { lower: true, strict: true });
    const [existing] = await db.query("SELECT id FROM brands WHERE slug = ?", [slug]);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    let logoUrl = null;
    if (req.file) {
      const uploadRes = await uploadFile(req.file.buffer, "brands", "image");
      logoUrl = uploadRes.secure_url;
    }

    const [result] = await db.query(
      "INSERT INTO brands (name, slug, logo_url, description, website_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [
        name,
        slug,
        logoUrl,
        description || null,
        website_url || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: { brandId: result.insertId, slug },
    });
  } catch (error) {
    console.error("Admin createBrand error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE BRAND ===================== */
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, website_url, is_active } = req.body;

    const [existing] = await db.query("SELECT * FROM brands WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    let slug = undefined;
    if (name && name !== existing[0].name) {
      slug = slugify(name, { lower: true, strict: true });
      const [slugCheck] = await db.query("SELECT id FROM brands WHERE slug = ? AND id != ?", [slug, id]);
      if (slugCheck.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    let logoUrl = undefined;
    if (req.file) {
      const uploadRes = await uploadFile(req.file.buffer, "brands", "image");
      logoUrl = uploadRes.secure_url;
    }

    await db.query(
      `UPDATE brands SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         logo_url = COALESCE(?, logo_url),
         description = ?,
         website_url = ?,
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name || null,
        slug || null,
        logoUrl || null,
        description !== undefined ? description : null,
        website_url !== undefined ? website_url : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    return res.status(200).json({ success: true, message: "Brand updated successfully" });
  } catch (error) {
    console.error("Admin updateBrand error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE BRAND ===================== */
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.query("SELECT id FROM products WHERE brand_id = ? LIMIT 1", [id]);
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete brand with associated products. Deactivate it first.",
      });
    }

    const [result] = await db.query("DELETE FROM brands WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    return res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Admin deleteBrand error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};
