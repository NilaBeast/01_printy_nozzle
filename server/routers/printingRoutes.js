const express = require("express");
const router = express.Router();
const {
  uploadPrintFile,
  getPrintingConfig,
  getMaterials,
  getColors,
  calculatePrice,
  createPrintOrder,
  getUserPrintOrders,
  getPrintOrderById,
  getPrintOrderInvoice,
  getSlicerStatus,
  sliceQuote,
} = require("../controllers/printingControllers");
const { protect } = require("../middlewares/authMiddlewares");
const { printFileUpload, sliceFileUpload } = require("../middlewares/uploadMiddleware");

// Public endpoints
router.get("/materials", getMaterials);
router.get("/colors", getColors);
router.get("/config", getPrintingConfig);
router.get("/slicer-status", getSlicerStatus);
router.post("/calculate-price", calculatePrice);
router.post("/upload", printFileUpload.single("file"), uploadPrintFile);
// Exact Bambu Studio slice (free CLI). Slices a temp copy — nothing stored.
router.post("/slice-quote", sliceFileUpload.single("file"), sliceQuote);

// Authenticated print order endpoints
router.post("/order", protect, createPrintOrder);
router.get("/orders", protect, getUserPrintOrders);
router.get("/orders/:id/invoice", protect, getPrintOrderInvoice);
router.get("/orders/:id", protect, getPrintOrderById);

module.exports = router;
