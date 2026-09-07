const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
} = require("../../controllers/admin/adminUserControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);

module.exports = router;
