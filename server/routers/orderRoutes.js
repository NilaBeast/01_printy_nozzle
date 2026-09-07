const express = require("express");
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  reorderOrderItems,
  getOrderInvoice,
} = require("../controllers/orderControllers");
const { protect } = require("../middlewares/authMiddlewares");

router.use(protect); // All order actions require authentication

router.post("/", createOrder);
router.get("/", getUserOrders);
router.get("/my-orders", getUserOrders);
router.get("/:id", getOrderById);
router.get("/:id/invoice", getOrderInvoice);
router.post("/:id/reorder", reorderOrderItems);
router.put("/:id/cancel", cancelOrder);

module.exports = router;
