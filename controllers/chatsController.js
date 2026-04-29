const mongoose = require("mongoose");
const UsersCollection = mongoose.model("user");
const UserAuditLogs = require("../model/userActivitySchema");
const queryHelper = require("../helpers/query");
const statusCode = require("../helpers/statusCode");
const sendMail = require("../helpers/sendMail");
const bcrypt = require("bcrypt");
const { logAdminActivity, logUserActivity } = require("../helpers/logsHelper");
const MessageCollection = require("../model/messageSchema");

class ChatsController {
  async getOnlineUsers(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne({ _id: userId });
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });
      }
      let getAllUser = await UsersCollection.find({
        company_id: comp_id,
        status: 0,
        _id: { $ne: userId },
      });
      return res.status(statusCode.OK).send({
        status: true,
        data: getAllUser,
      });
    } catch (error) {
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async getChats(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let { receiverId } = req.body;
      let userData = await UsersCollection.findOne({ _id: userId });
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });
      }
      let messages = await MessageCollection.find({
        $or: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      }).sort({ createdAt: 1 }); // sort oldest → newest

      return res.status(statusCode.OK).send({
        status: true,
        data: messages,
      });
    } catch (error) {
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async markAsRead(req, res) {
    try {
      const { senderId, receiverId } = req.body;
      let { userId, comp_id } = res.locals.user;

      if (!senderId || !receiverId) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Missing senderId or receiverId" });
      }

      // Update all unread messages
      const result = await MessageCollection.updateMany(
        { senderId, receiverId, isRead: false },
        { $set: { isRead: true } }
      );

      return res.status(statusCode.OK).send({
        status: true,
        message: "Messages marked as read",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error in markAsRead:", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Server error while marking as read",
        error: error.message,
      });
    }
  }
  async editMessage(req, res) {
    try {
      let bData = req.body;
      console.log(bData, "bData");
    } catch (error) {
      console.error("editMessage in markAsRead:", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Server error while marking as read",
        error: error.message,
      });
    }
  }
  async deleteMessage(req, res) {
    try {
      let { chat_id } = req.query;
      console.log(chat_id, "chat_id");
      await MessageCollection.findOneAndUpdate(
        { _id: chat_id },
        {
          $set: {
            isDeleted: true,
          },
        }
      );
    } catch (error) {
      console.error("deleteMessage error:", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Server error while delete Message",
        error: error.message,
      });
    }
  }
  async getMessage(req, res) {
    try {
      let { chat_id } = req.query;
      let chatData = await MessageCollection.findOne({ _id: chat_id });
      if (!chatData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Cannot found!" });
      }
      return res.status(statusCode.OK).send({ status: true, data: chatData });
    } catch (error) {
      console.error("getMessage in error :", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Server error while get Message",
        error: error.message,
      });
    }
  }
  async updateMessage(req, res) {
    try {
      let bData = req.body;
      let chatData = await MessageCollection.findOne({ _id: bData.chat_id });
      if (!chatData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Cannot found!" });
      }
      chatData.text = bData.text;
      chatData.isEdited = true;
      await chatData.save();
      console.log(chatData, "------chatData");

      return;
      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Message updated successfully..." });
    } catch (error) {
      console.error("updateMessage in error :", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Server error while update Message",
        error: error.message,
      });
    }
  }
}
module.exports = new ChatsController();
