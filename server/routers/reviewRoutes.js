const express = require("express");
const router = express.Router();
const {
  addReview,
  getProductReviews,
  deleteReview,
} = require("../controllers/reviewControllers");
const { protect } = require("../middlewares/authMiddlewares");

router.get("/:productId", getProductReviews);
router.post("/:productId", protect, addReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;
