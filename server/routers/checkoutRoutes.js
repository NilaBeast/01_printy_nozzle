const express = require("express");
const router = express.Router();
const {
  initiateCheckout,
  createRazorpayOrder,
  verifyPayment,
} = require("../controllers/checkoutControllers");
const { protect } = require("../middlewares/authMiddlewares");

router.use(protect); // Checkout operations require login

router.post("/initiate", initiateCheckout);
router.post("/razorpay-order", createRazorpayOrder);
router.post("/verify-payment", verifyPayment);

module.exports = router;
