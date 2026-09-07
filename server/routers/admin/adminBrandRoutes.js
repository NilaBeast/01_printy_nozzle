const express = require("express");
const router = express.Router();
const {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../../controllers/admin/adminBrandControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");
const { productImageUpload } = require("../../middlewares/uploadMiddleware");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllBrands);
router.post("/", productImageUpload.single("logo"), createBrand);
router.put("/:id", productImageUpload.single("logo"), updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;
