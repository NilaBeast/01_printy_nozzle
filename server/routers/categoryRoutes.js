const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryBySlug,
} = require("../controllers/categoryControllers");

router.get("/", getAllCategories);
router.get("/:slug", getCategoryBySlug);

module.exports = router;
