const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const authMiddleware = require("../middleware/authMiddleware");
const Multer = require("multer");
const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});
router.post(
  "/create",
  upload.single("attachment"),
  authMiddleware,
  ticketController.createTicket
);
router.get("/get-all", authMiddleware, ticketController.getAllTickets);
router.get(
  "/get-comp-based-caegory",
  authMiddleware,
  ticketController.getCompBasedCategory
);
router.get("/get-ticket", authMiddleware, ticketController.getTicket);
router.get("/get-admins", authMiddleware, ticketController.getAdmins);
router.post(
  "/reply",
  upload.single("attachment"),
  authMiddleware,
  ticketController.replyMessage
);
router.put("/update-ticket", authMiddleware, ticketController.updateTicket);
router.get("/ticket-kpi", authMiddleware, ticketController.ticketKPI);
// router.patch("/update-status/:id", authMiddleware, ticketController.updateTicketStatus);
// router.delete("/delete/:id", authMiddleware, ticketController.deleteTicket);

module.exports = router;
