const db = require("../../config/db");

/* ===================== GET ALL COUPONS ===================== */
const getAllCoupons = async (req, res) => {
  try {
    const [coupons] = await db.query("SELECT * FROM coupons ORDER BY id DESC");
    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error("Admin getAllCoupons error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE COUPON ===================== */
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
      is_active,
    } = req.body;

    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({
        success: false,
        message: "Coupon code, discount type, and discount value are required",
      });
    }

    const upperCode = code.trim().toUpperCase();

    const [existing] = await db.query("SELECT id FROM coupons WHERE code = ?", [upperCode]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }

    const [result] = await db.query(
      `INSERT INTO coupons 
       (code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        upperCode,
        discount_type,
        discount_value,
        min_order_amount || 0,
        max_discount || null,
        usage_limit || null,
        valid_from || null,
        valid_until || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: { couponId: result.insertId },
    });
  } catch (error) {
    console.error("Admin createCoupon error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE COUPON ===================== */
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
      is_active,
    } = req.body;

    const [result] = await db.query(
      `UPDATE coupons SET
         code = COALESCE(?, code),
         discount_type = COALESCE(?, discount_type),
         discount_value = COALESCE(?, discount_value),
         min_order_amount = COALESCE(?, min_order_amount),
         max_discount = ?,
         usage_limit = ?,
         valid_from = ?,
         valid_until = ?,
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        code ? code.trim().toUpperCase() : null,
        discount_type || null,
        discount_value || null,
        min_order_amount !== undefined ? min_order_amount : null,
        max_discount !== undefined ? max_discount : null,
        usage_limit !== undefined ? usage_limit : null,
        valid_from !== undefined ? valid_from : null,
        valid_until !== undefined ? valid_until : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({ success: true, message: "Coupon updated successfully" });
  } catch (error) {
    console.error("Admin updateCoupon error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== DELETE COUPON ===================== */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM coupons WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Admin deleteCoupon error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
