const express = require("express");
const router = express.Router();
const { getContactPageData, submitContact } = require("../controllers/contactControllers");

router.get("/", getContactPageData);
router.get("/info", getContactPageData);
router.post("/", submitContact);

module.exports = router;
