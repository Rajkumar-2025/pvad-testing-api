const express = require("express");
const LiteratureController = require("../controllers/literatureController");
const { validateRegisterUserRules } = require("../utils/bodyValidator");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const { literatureUpload } = require("../helpers/fileUploadHelper");
const { validateArticleRules } = require("../utils/validateArticleRules");

router.post(
  "/create-literature",
  authMiddleware,
  validateArticleRules,
  LiteratureController.createLiterature,
);
router.put(
  "/update-literature/:literatureId",
  authMiddleware,
  // validateArticleRules,
  LiteratureController.updateLiterature,
);
router.get("/get-users-list", authMiddleware, LiteratureController.getUsers);
router.get(
  "/get-articles/:reviewId/:type",
  authMiddleware,
  LiteratureController.getLiteratureArticle,
);
router.get(
  "/get-all-articles",
  authMiddleware,
  LiteratureController.getLiteratureArticle,
);
router.get(
  "/get-individual-article/:literatureId",
  authMiddleware,
  LiteratureController.getIndividualLiterature,
);
router.put(
  "/view-with-edit/:literatureId",
  authMiddleware,
  validateArticleRules,
  LiteratureController.viewAndEditArticle,
);
router.post(
  "/bulk-upload",
  authMiddleware,
  literatureUpload.single("file"),
  LiteratureController.bulkUpload,
);
router.put(
  "/update-articles",
  authMiddleware,
  LiteratureController.statusBulkUpdate,
);

//================================================//
router.post(
  "/get-literature",
  authMiddleware,
  LiteratureController.getLiteratures,
);
router.get(
  "/get-individual-literature/:literatureId",
  authMiddleware,
  LiteratureController.getIndividualLiterature,
);

router.post(
  "/user-initate-action",
  authMiddleware,
  LiteratureController.initiateAction,
);
router.post(
  "/unlock-literature",
  authMiddleware,
  LiteratureController.unlockByAdmin,
);
// router.post(
//   "/get-audit-history",
//   authMiddleware,
//   LiteratureController.getAuditHistory
// );
router.get(
  "/get-audit-history/:literatureArticleId",
  authMiddleware,
  LiteratureController.getLiteratureLogs,
);
module.exports = router;
