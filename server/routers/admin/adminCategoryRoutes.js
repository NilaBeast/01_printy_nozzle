const express = require("express");
const router = express.Router();
const {
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../../controllers/admin/adminCategoryControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");
const { productImageUpload } = require("../../middlewares/uploadMiddleware");

router.use(protect, authorizeRoles("admin"));

router.post("/", productImageUpload.single("image"), createCategory);
router.put("/:id", productImageUpload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
