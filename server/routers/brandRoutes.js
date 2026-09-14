const express = require("express");
const router = express.Router();
const { getAllActiveBrands } = require("../controllers/brandControllers");

router.get("/", getAllActiveBrands);

module.exports = router;
