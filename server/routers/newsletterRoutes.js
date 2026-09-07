const express = require("express");
const router = express.Router();
const { subscribe, unsubscribe } = require("../controllers/newsletterControllers");

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
