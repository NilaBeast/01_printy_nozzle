const express = require("express");
const router = express.Router();
const {
  getAllVariations,
  createVariation,
  updateVariation,
  deleteVariation,
} = require("../../controllers/admin/adminVariationControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllVariations);
router.post("/", createVariation);
router.put("/:id", updateVariation);
router.delete("/:id", deleteVariation);

module.exports = router;
