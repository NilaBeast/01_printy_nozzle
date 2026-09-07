const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getSalesChart,
} = require("../../controllers/admin/adminDashboardControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

router.get("/stats", getDashboardStats);
router.get("/sales-chart", getSalesChart);

module.exports = router;
