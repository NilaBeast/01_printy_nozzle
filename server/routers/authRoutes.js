const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/authControllers");
const { protect } = require("../middlewares/authMiddlewares");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/address", protect, addAddress);
router.put("/address/:id", protect, updateAddress);
router.delete("/address/:id", protect, deleteAddress);

module.exports = router;