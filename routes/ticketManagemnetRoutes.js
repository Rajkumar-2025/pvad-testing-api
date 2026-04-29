const express = require("express");
const router = express.Router();
const ticketManagementController = require("../controllers/ticketManagementController");
const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/create-category",
  authMiddleware,
  ticketManagementController.createCategory
);
router.get(
  "/get-categories",
  authMiddleware,
  ticketManagementController.getAllCategories
);
router.post(
  "/add-sub-category",
  authMiddleware,
  ticketManagementController.createSubCategory
);
router.post("/add-issue", authMiddleware, ticketManagementController.addIssue);
router.put(
  "/update-priority/:categoryId/:level/:itemId",
  authMiddleware,
  ticketManagementController.updatePriority
);
router.put(
  "/update-name",
  authMiddleware,
  ticketManagementController.updateName
);
// router.patch("/update-status/:id", authMiddleware, ticketManagementController.updateTicketStatus);
// router.delete("/delete/:id", authMiddleware, ticketManagementController.deleteTicket);

module.exports = router;
