const express = require("express");
const router = express.Router();
const {
  getServiceability,
  getCharges,
  getTracking,
} = require("../controllers/shippingControllers");
const { protect } = require("../middlewares/authMiddlewares");

// Public: pincode check + rate quote (used at checkout / PDP)
router.get("/serviceability/:pincode", getServiceability);
router.get("/charges", getCharges);

// Authed: owner-checked live tracking for an order or print order
router.get("/track/:type/:id", protect, getTracking);

module.exports = router;
