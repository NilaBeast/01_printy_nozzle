const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  updatePreferences,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  getUser3DFiles,
} = require("../controllers/profileControllers");
const { protect } = require("../middlewares/authMiddlewares");
const { productImageUpload } = require("../middlewares/uploadMiddleware");

router.use(protect); // All profile endpoints require user authentication

// Profile Info & Avatar
router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/avatar", productImageUpload.single("avatar"), uploadAvatar);

// Preferences & Password
router.put("/preferences", updatePreferences);
router.put("/change-password", changePassword);

// Addresses CRUD
router.get("/addresses", getAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);
router.put("/addresses/:id/default", setDefaultAddress);

// Wishlist
router.get("/wishlist", getWishlist);
router.post("/wishlist/toggle/:productId", toggleWishlist);
router.delete("/wishlist/:productId", removeFromWishlist);

// User 3D Files
router.get("/3d-files", getUser3DFiles);

module.exports = router;
