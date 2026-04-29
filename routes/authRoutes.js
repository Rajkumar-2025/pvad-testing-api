const express = require("express");
const verifyAccessToken = require("../middleware/authMiddleware.js");
const authController = require("../controllers/authController.js");

const router = express.Router();

router.get("/check", verifyAccessToken, authController.checkUserAuth);
router.post("/refresh", authController.refreshToken);

module.exports = router;
