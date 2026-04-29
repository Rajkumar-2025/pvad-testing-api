    const express = require("express");

    const authMiddleware = require("../middleware/authMiddleware");
    const chatsController = require("../controllers/chatsController");
    const router = express.Router();

    router.get("/get-online-users", authMiddleware, chatsController.getOnlineUsers);
    router.post("/get-user-chat", authMiddleware, chatsController.getChats);
    router.post("/mark-as-read", authMiddleware, chatsController.markAsRead);
    router.post("/edit-message", authMiddleware, chatsController.editMessage);
    router.get("/delete-message", authMiddleware, chatsController.deleteMessage);
    router.get("/get-message", authMiddleware, chatsController.getMessage);
    router.put("/update-message", authMiddleware, chatsController.updateMessage);
    module.exports = router;
