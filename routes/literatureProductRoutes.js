const express = require("express");
const LiteratureProductController = require("../controllers/literatureProductController");
const { validateRegisterUserRules } = require("../utils/bodyValidator");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const {
  productUpload,
  createMultiUploadArray,
} = require("../helpers/fileUploadHelper");

// Product related routes
router.post(
  "/create-product",
  authMiddleware,
  LiteratureProductController.createProduct,
);
router.post(
  "/upload-file",
  authMiddleware,
  productUpload.single("file"),
  LiteratureProductController.productUpload,
);
router.get("/get-all", authMiddleware, LiteratureProductController.getProducts);
router.put(
  "/edit-product/:id",
  authMiddleware,
  LiteratureProductController.editProduct,
);
// Review Strategy related routes
router.get(
  "/get-generic-name",
  authMiddleware,
  LiteratureProductController.getProductGenericName,
);
router.post(
  "/create-review-strategy",
  authMiddleware,
  LiteratureProductController.createReviewStrategy,
);
router.get(
  "/get-review-strategy",
  authMiddleware,
  LiteratureProductController.getReviewStrategy,
);
router.put(
  "/edit-review-strategy/:id",
  authMiddleware,
  LiteratureProductController.editStrategy,
);
router.get(
  "/manual-review-strategy",
  authMiddleware,
  LiteratureProductController.getManualStrategies,
);
router.get(
  "/selected-manual-strategy/:id",
  authMiddleware,
  LiteratureProductController.getSelectedStrategy,
);

//========================Update mapping====================//
router.post(
  "/product-template-mapping",
  authMiddleware,
  LiteratureProductController.productTemplateMapping,
);
router.get(
  "/get-product-template",
  authMiddleware,
  LiteratureProductController.getProductTemplateMapping,
);
router.put(
  "/edit-product-template",
  authMiddleware,
  LiteratureProductController.updateProductTemplateSetting,
);

//================= Product files upload APIs ==========================//
router.get(
  "/get-active-templates",
  authMiddleware,
  LiteratureProductController.getActiveTemplates,
);
router.post(
  "/upload-files",
  authMiddleware,
  createMultiUploadArray(),
  LiteratureProductController.uploadCompanyProduct,
);
router.get(
  "/get-company-product-list",
  authMiddleware,
  LiteratureProductController.getCompanyProductList,
);
router.get(
  "/get-company-product-audit-logs/:id",
  authMiddleware,
  LiteratureProductController.getCompanyProductAuditLogs,
);
// router.post(
//   "/update-version",
//   createMultiUploadArray({
//     folderPath: "uploads/company-products/",
//     maxCount: 1,
//   }),
//   authMiddleware,
//   LiteratureProductController.updateCompanyProductList,
// );
// router.get(
//   "/drug-master-lists",
//   authMiddleware,
//   LiteratureProductController.getDrugMasterLists,
// );

module.exports = router;
