const express = require("express");
const router = express.Router();
const {
  getSubscribers,
  deleteSubscriber,
  getContactMessages,
  updateMessageStatus,
  deleteContactMessage,
} = require("../../controllers/admin/adminNewsletterControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

// Subscribers
router.get("/subscribers", getSubscribers);
router.delete("/subscribers/:id", deleteSubscriber);

// Contact messages
router.get("/contacts", getContactMessages);
router.put("/contacts/:id", updateMessageStatus);
router.delete("/contacts/:id", deleteContactMessage);

module.exports = router;
