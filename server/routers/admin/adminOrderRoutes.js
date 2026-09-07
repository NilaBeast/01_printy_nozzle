const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} = require("../../controllers/admin/adminOrderControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllOrders);
router.get("/:id", getOrderDetails);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
