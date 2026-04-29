const express = require("express");
const literatureReviewController = require("../controllers/literatureReviewController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post(
  "/create-upload-setting",
  authMiddleware,
  literatureReviewController.createOrUpdateTemplateSetting
);
router.put(
  "/edit-upload-setting",
  authMiddleware,
  literatureReviewController.updateTemplateSetting
);
router.get(
  "/literature-template-settings",
  authMiddleware,
  literatureReviewController.getLiteratureTemplateSettings
);
router.get(
  "/get-uploaded-history",
  authMiddleware,
  literatureReviewController.listUploadedHistory
);
router.get(
  "/get-active-templates",
  authMiddleware,
  literatureReviewController.getActiveTemplates
);

module.exports = router;
