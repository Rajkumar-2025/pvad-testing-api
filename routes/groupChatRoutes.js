const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const groupChatsController = require("../controllers/groupChatController");
const router = express.Router();

router.post(
  "/create-group",
  authMiddleware,
  groupChatsController.createGroupChat
);
router.get("/get-all-group", authMiddleware, groupChatsController.getAllGroup);
router.get(
  "/:groupId/members",
  authMiddleware,
  groupChatsController.getGroupMembers
);
router.delete(
  "/:groupId/members/:memberId",
  authMiddleware,
  groupChatsController.deleteMember
);
router.get(
  "/:groupId/messages",
  authMiddleware,
  groupChatsController.getGroupChatHistory
);
router.get(
  "/:groupId/available-users",
  authMiddleware,
  groupChatsController.getAvailableUser
);
router.post(
  "/:groupId/members",
  authMiddleware,
  groupChatsController.addMembers
);
router.put(
  "/edit-group-name",
  authMiddleware,
  groupChatsController.editGroup
);
module.exports = router;
