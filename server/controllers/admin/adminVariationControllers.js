const db = require("../../config/db");
const slugify = require("slugify");
const { ensureVariationSchema } = require("../../utils/variationSchema");

/* ===================== LIST VARIATIONS (ADMIN) ===================== */
const getAllVariations = async (req, res) => {
  try {
    await ensureVariationSchema().catch(() => {});
    const [variations] = await db.query(
      `SELECT v.*,
              (SELECT COUNT(*) FROM products WHERE variation_id = v.id) AS product_count
       FROM variations v
       ORDER BY v.sort_order ASC, v.id ASC`
    );
    return res.status(200).json({ success: true, data: variations });
  } catch (error) {
    console.error("Admin getAllVariations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== PUBLIC ACTIVE VARIATIONS ===================== */
const getActiveVariations = async (req, res) => {
  try {
    await ensureVariationSchema().catch(() => {});
    const [variations] = await db.query(
      "SELECT id, name, slug FROM variations WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    );
    return res.status(200).json({ success: true, data: variations });
  } catch (error) {
    console.error("Get active variations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE VARIATION ===================== */
const createVariation = async (req, res) => {
  try {
    await ensureVariationSchema().catch(() => {});
    const { name, sort_order, is_active } = req.body;

    if (!String(name || "").trim()) {
      return res.status(400).json({ success: false, message: "Variation name is required" });
    }

    let slug = slugify(name, { lower: true, strict: true });
    const [existing] = await db.query("SELECT id FROM variations WHERE slug = ?", [slug]);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const [result] = await db.query(
      "INSERT INTO variations (name, slug, sort_order, is_active) VALUES (?, ?, ?, ?)",
      [
        String(name).trim(),
        slug,
        sort_order !== undefined && sort_order !== "" ? Number(sort_order) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Variation created successfully",
      data: { variationId: result.insertId, slug },
    });
  } catch (error) {
    console.error("Admin createVariation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE VARIATION ===================== */
const updateVariation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, is_active } = req.body;

    const [existing] = await db.query("SELECT * FROM variations WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Variation not found" });
    }

    let slug = undefined;
    if (name && name !== existing[0].name) {
      slug = slugify(name, { lower: true, strict: true });
      const [slugCheck] = await db.query("SELECT id FROM variations WHERE slug = ? AND id != ?", [slug, id]);
      if (slugCheck.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    await db.query(
      `UPDATE variations SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name || null,
        slug || null,
        sort_order !== undefined && sort_order !== "" ? Number(sort_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    return res.status(200).json({ success: true, message: "Variation updated successfully" });
  } catch (error) {
    console.error("Admin updateVariation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE VARIATION ===================== */
const deleteVariation = async (req, res) => {
  try {
    const { id } = req.params;
    // Detach products first (covers DBs without the FK / SET NULL).
    await db.query("UPDATE products SET variation_id = NULL WHERE variation_id = ?", [id]).catch(() => {});
    const [result] = await db.query("DELETE FROM variations WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Variation not found" });
    }
    return res.status(200).json({ success: true, message: "Variation deleted successfully" });
  } catch (error) {
    console.error("Admin deleteVariation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllVariations,
  getActiveVariations,
  createVariation,
  updateVariation,
  deleteVariation,
};
