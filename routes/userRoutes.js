const express = require("express");
const usersController = require("../controllers/usersControllers");
const { validateRegisterUserRules } = require("../utils/bodyValidator");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/user-register",
  validateRegisterUserRules,
  usersController.userRegister
);
router.post("/user-login", usersController.userLogin);
router.post("/verify-otp", usersController.verifyOtp);
router.post("/resend-otp", usersController.resendOtp);
router.post("/logout", usersController.logout);
router.post("/forgot-password", usersController.forgotPassword);
router.post("/reset-password", usersController.resetPassword);
router.get("/check-token", usersController.checkTokenValidOrNot);
router.post("/forgot-companyID", usersController.getCompanyId);

module.exports = router;
