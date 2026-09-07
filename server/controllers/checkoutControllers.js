const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ===================== INITIATE CHECKOUT ===================== */
const initiateCheckout = async (req, res) => {
  try {
    // Get cart and items
    const [carts] = await db.query("SELECT * FROM cart WHERE user_id = ?", [req.user.id]);
    if (carts.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const [items] = await db.query(
      `SELECT ci.*, p.name, p.price, p.stock,
              pv.price_adjustment, pv.stock as variant_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.cart_id = ?`,
      [carts[0].id]
    );

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Check all items are in stock
    for (const item of items) {
      const availStock = item.variant_stock !== null ? item.variant_stock : item.stock;
      if (item.quantity > availStock) {
        return res.status(400).json({
          success: false,
          message: `${item.name} has insufficient stock. Available: ${availStock}`,
        });
      }
    }

    // Calculate subtotal
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += (item.price + (item.price_adjustment || 0)) * item.quantity;
    });

    // Get settings
    const [settings] = await db.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('free_shipping_threshold', 'gst_rate', 'standard_shipping_cost', 'express_shipping_cost', 'same_day_shipping_cost')"
    );
    const settingsMap = {};
    settings.forEach((s) => (settingsMap[s.setting_key] = parseFloat(s.setting_value)));

    // Coupon discount
    let discount = 0;
    let couponInfo = null;
    if (carts[0].coupon_id) {
      const [coupons] = await db.query("SELECT * FROM coupons WHERE id = ? AND is_active = 1", [carts[0].coupon_id]);
      if (coupons.length > 0) {
        const coupon = coupons[0];
        couponInfo = { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value };
        if (subtotal >= coupon.min_order_amount) {
          if (coupon.discount_type === "percentage") {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
          } else {
            discount = coupon.discount_value;
          }
        }
      }
    }

    const gstRate = settingsMap.gst_rate || 18;
    const freeShippingThreshold = settingsMap.free_shipping_threshold || 999;

    // Get user addresses
    const [addresses] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC",
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      checkout: {
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        gstRate,
        freeShippingThreshold,
        shippingOptions: {
          standard: { cost: subtotal >= freeShippingThreshold ? 0 : (settingsMap.standard_shipping_cost || 0), label: "Standard Delivery", eta: "3-5 Working Days" },
          express: { cost: settingsMap.express_shipping_cost || 99, label: "Express Delivery", eta: "1-2 Working Days" },
          same_day: { cost: settingsMap.same_day_shipping_cost || 149, label: "Same Day Delivery", eta: "Same day (Selected cities)" },
        },
        coupon: couponInfo,
        savedAddresses: addresses,
        itemCount: items.length,
      },
    });
  } catch (error) {
    console.error("Initiate checkout error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE RAZORPAY ORDER ===================== */
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, order_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: `receipt_${order_id || Date.now()}`,
      payment_capture: 1,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Update order with razorpay order id if order exists
    if (order_id) {
      await db.query(
        "UPDATE orders SET razorpay_order_id = ? WHERE id = ? AND user_id = ?",
        [razorpayOrder.id, order_id, req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return res.status(500).json({ success: false, message: "Payment initiation failed" });
  }
};

/* ===================== VERIFY PAYMENT ===================== */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details missing" });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Payment failed
      if (order_id) {
        await db.query(
          "UPDATE orders SET payment_status = 'failed' WHERE id = ? AND user_id = ?",
          [order_id, req.user.id]
        );
      }
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Payment success — update order
    if (order_id) {
      await db.query(
        `UPDATE orders SET payment_status = 'paid', status = 'confirmed',
         razorpay_payment_id = ?, razorpay_signature = ?
         WHERE id = ? AND user_id = ?`,
        [razorpay_payment_id, razorpay_signature, order_id, req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ success: false, message: "Payment verification error" });
  }
};

module.exports = {
  initiateCheckout,
  createRazorpayOrder,
  verifyPayment,
};
