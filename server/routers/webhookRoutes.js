const express = require("express");
const router = express.Router();
const { delhiveryWebhook } = require("../controllers/webhookControllers");

// Delhivery status pushes (verified inside the controller via
// DELHIVERY_WEBHOOK_SECRET when configured). No login required.
router.post("/delhivery", delhiveryWebhook);

module.exports = router;
