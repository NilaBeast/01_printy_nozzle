const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  setPrimaryImage,
  addVariant,
  updateVariant,
  deleteVariant,
} = require("../../controllers/admin/adminProductControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");
const { productImageUpload } = require("../../middlewares/uploadMiddleware");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", productImageUpload.array("images", 5), createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Product images
router.post("/:id/images", productImageUpload.single("image"), addProductImage);
router.delete("/images/:imageId", deleteProductImage);
router.put("/:productId/images/:imageId/primary", setPrimaryImage);

// Product variants
router.post("/:productId/variants", addVariant);
router.put("/variants/:variantId", updateVariant);
router.delete("/variants/:variantId", deleteVariant);

module.exports = router;
