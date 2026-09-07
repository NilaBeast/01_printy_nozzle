const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} = require("../controllers/cartControllers");
const { protect } = require("../middlewares/authMiddlewares");

router.use(protect); // All cart routes require user login

router.get("/", getCart);
router.post("/add", addToCart);
router.put("/item/:id", updateCartItem);
router.delete("/item/:id", removeCartItem);
router.delete("/clear", clearCart);
router.post("/coupon", applyCoupon);
router.delete("/coupon", removeCoupon);

module.exports = router;
