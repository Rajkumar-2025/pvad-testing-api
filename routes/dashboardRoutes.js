const express = require("express");
const DashboardController = require("../controllers/dashboardController");
const { validateRegisterUserRules } = require("../utils/bodyValidator");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/get-user-account-details",
  authMiddleware,
  DashboardController.getUsers
);
router.post(
  "/update-user-account-details",
  authMiddleware,
  DashboardController.updateUserDetails
);
router.post(
  "/add-user-manual",
  authMiddleware,
  DashboardController.addUserManually
);
router.post(
  "/check-current-password",
  authMiddleware,
  DashboardController.checkCurrentPassword
);
router.post(
  "/change-password",
  authMiddleware,
  DashboardController.changePassword
);
router.get(
  "/get-users-for-admin",
  authMiddleware,
  DashboardController.getUsersForAdmin
);
router.post("/edit-user", authMiddleware, DashboardController.editUser);
router.get("/audit-logs/:id", authMiddleware, DashboardController.getHistory);
router.get(
  "/download-audit-logs/:id/excel",
  // authMiddleware,
  DashboardController.downloadAuditLogsPDF
);
router.get("/users-KPI", authMiddleware, DashboardController.usersKPI);
router.get(
  "/dashboard-KPI",
  authMiddleware,
  DashboardController.dashboardMetrics
);
router.get(
  "/get-literature-related-KPI",
  authMiddleware,
  DashboardController.getOverAllMetrics
);
module.exports = router;
