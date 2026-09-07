const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  toggleReviewApproval,
  deleteReview,
} = require("../../controllers/admin/adminReviewControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllReviews);
router.put("/:id/approve", toggleReviewApproval);
router.delete("/:id", deleteReview);

module.exports = router;
