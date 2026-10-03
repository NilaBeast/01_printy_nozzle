const express = require("express");
const router = express.Router();
const {
  getAllPrintOrders,
  getPrintOrderDetails,
  getPrintOrderInvoice,
  updatePrintOrderStatus,
  verifyQrPayment,
  listPrintQuotations,
  getPrintQuotation,
  updatePrintQuotation,
  deletePrintQuotation,
  getAllMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialColors,
  setMaterialColors,
  getAllColors,
  createColor,
  updateColor,
  deleteColor,
} = require("../../controllers/admin/adminPrintingControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

// Print orders
router.get("/orders", getAllPrintOrders);
router.get("/orders/:id/invoice", getPrintOrderInvoice);
router.get("/orders/:id", getPrintOrderDetails);
router.put("/orders/:id/status", updatePrintOrderStatus);
router.put("/orders/:id/verify-payment", verifyQrPayment);

// WhatsApp quote requests
router.get("/quotations", listPrintQuotations);
router.get("/quotations/:id", getPrintQuotation);
router.put("/quotations/:id", updatePrintQuotation);
router.delete("/quotations/:id", deletePrintQuotation);

// Materials management
router.get("/materials", getAllMaterials);
router.post("/materials", createMaterial);
router.put("/materials/:id", updateMaterial);
router.delete("/materials/:id", deleteMaterial);
router.get("/materials/:id/colors", getMaterialColors);
router.put("/materials/:id/colors", setMaterialColors);

// Colors management
router.get("/colors", getAllColors);
router.post("/colors", createColor);
router.put("/colors/:id", updateColor);
router.delete("/colors/:id", deleteColor);

module.exports = router;
