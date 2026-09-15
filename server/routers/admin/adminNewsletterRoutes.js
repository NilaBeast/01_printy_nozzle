const express = require("express");
const router = express.Router();
const {
  getSubscribers,
  deleteSubscriber,
  getContactMessages,
  getContactDetails,
  updateMessageStatus,
  replyToContact,
  deleteContactMessage,
} = require("../../controllers/admin/adminNewsletterControllers");
const { protect, authorizeRoles } = require("../../middlewares/authMiddlewares");

router.use(protect, authorizeRoles("admin"));

// Subscribers
router.get("/subscribers", getSubscribers);
router.delete("/subscribers/:id", deleteSubscriber);

// Contact messages
router.get("/contacts", getContactMessages);
router.get("/contacts/:id", getContactDetails);
router.put("/contacts/:id", updateMessageStatus);
router.post("/contacts/:id/reply", replyToContact);
router.delete("/contacts/:id", deleteContactMessage);

module.exports = router;
