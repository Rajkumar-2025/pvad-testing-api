const mongoose = require("mongoose");
const UsersCollection = mongoose.model("user");
const UserAuditLogs = require("../model/userActivitySchema");
const queryHelper = require("../helpers/query");
const statusCode = require("../helpers/statusCode");
const sendMail = require("../helpers/sendMail");
const bcrypt = require("bcrypt");
const { logAdminActivity, logUserActivity } = require("../helpers/logsHelper");
const GroupMessageCollection = require("../model/groupSchema");
const MessageCollection = require("../model/messageSchema");
const { getIO, onlineUsers } = require("../utils/socketConnection");

class GroupChatController {
  async createGroupChat(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found admin" });
      }
      let members = [];
      for (let member of bData.members) {
        members.push({ member_id: member._id });
      }
      let structuredData = {
        name: bData.groupName,
        description: bData.description,
        members,
        createdBy: userId,
        company_id: comp_id,
      };

      let createGroup = await queryHelper.insertData(
        GroupMessageCollection,
        structuredData
      );
      if (createGroup.status) {
        let groupData = createGroup.msg;
        let io = getIO();

        let creatorSocketId = onlineUsers.get(
          structuredData.createdBy.toString()
        );
        groupData.members.forEach((m) => {
          let socketId = onlineUsers.get(m.member_id.toString());
          if (socketId) {
            console.log(socketId, "--------socketId");
            io.to(socketId).emit("newGroupCreated", groupData);
          }
        });
        io.to(creatorSocketId).emit("newGroupCreated", groupData);
      }
      return res.status(statusCode.OK).send({
        status: createGroup.status,
        message: "Group created sucessfully...",
        data: createGroup.msg,
      });
    } catch (error) {
      console.log("Something went wrong while create a group", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async getAllGroup(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne({ _id: userId });
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });
      }
      let groupData;

      // Groups created by this user (he is admin of these)
      const adminGroups = await GroupMessageCollection.find({
        company_id: comp_id,
        createdBy: userId,
      });

      if (adminGroups.length > 0) {
        // If user is creator of any group → treat him as admin
        groupData = await GroupMessageCollection.find({ company_id: comp_id });
      } else {
        // Otherwise → fetch groups where he is a member
        groupData = await GroupMessageCollection.find({
          company_id: comp_id,
          "members.member_id": userId,
        });
      }
      const enrichedGroups = groupData.map((group) => {
        const totalMembers = (group.members?.length || 0) + 1; // +1 for createdBy
        return {
          ...group.toObject(),
          totalMembers,
        };
      });
      return res
        .status(statusCode.OK)
        .send({ status: true, data: enrichedGroups });
    } catch (error) {
      console.log("Something went wrong while getAllGroup", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async getGroupMembers(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      const { groupId } = req.params;
      let userData = await UsersCollection.findOne({ _id: userId });
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });
      }
      const group = await GroupMessageCollection.findById(groupId)
        .populate({
          path: "members.member_id",
          model: UsersCollection,
          select: "username email avatar is_logged", // fields you want
        })
        .populate({
          path: "createdBy",
          model: UsersCollection,
          select: "username email avatar is_logged", // fields you want
        });

      if (!group) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Group not found" });
      }
      return res.status(statusCode.OK).send({
        status: true,
        data: group.members.map((m) => ({
          _id: m._id,
          joinedDate: m.joinedDate,
          user: m.member_id,
        })),
        creator: { admin: group.createdBy, createdAt: group.createdAt },
      });
    } catch (error) {
      console.log("Something went wrong while getGroupMembers", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async deleteMember(req, res) {
    try {
      const { groupId, memberId } = req.params;
      let { userId, comp_id } = res.locals.user; // assume you have auth middleware
      let userData = await UsersCollection.findOne({ _id: userId, role: 1 });
      let io = getIO();

      if (!userData) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Only admin can remove members" });
      }

      const group = await GroupMessageCollection.findById(groupId);
      if (!group) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Group not found" });
      }

      // remove member
      group.members = group.members.filter(
        (m) => String(m.member_id) !== String(memberId)
      );
      await group.save();

      let groupData = group.toObject();
      groupData.groupId = groupId;

      groupData.members.forEach((m) => {
        let socketId = onlineUsers.get(m.member_id.toString());
        if (socketId) {
          io.to(socketId).emit("memberRemoved", {
            groupId,
            memberId,
            members: group.members,
          });
        }
      });

      let removedSocketId = onlineUsers.get(memberId.toString());
      if (removedSocketId) {
        // make them leave the group room
        io.sockets.sockets.get(removedSocketId)?.leave(groupId);

        // also notify them directly that they were removed
        io.to(removedSocketId).emit("removedFromGroup", {
          groupId,
          message: "You have been removed from the group",
        });
      }

      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Member removed successfully" });
    } catch (err) {
      console.error("Error removing member:", err);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Server error" });
    }
  }

  async getGroupChatHistory(req, res) {
    try {
      const { groupId } = req.params;
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne({ _id: userId });
      if (!userData) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "cannot found user" });
      }
      const messages = await MessageCollection.find({
        groupId: groupId,
      })
        .populate("senderId", "username")
        .sort({ createdAt: 1 });

      res.status(statusCode.OK).send({ status: true, data: messages });
    } catch (error) {
      console.error("Error getGroupChatHistory:", error);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Server error" });
    }
  }
  async getAvailableUser(req, res) {
    try {
      const { groupId } = req.params;
      const group = await GroupMessageCollection.findById(groupId);
      if (!group)
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Group not found" });

      const memberIds = group.members.map((m) => m.member_id.toString());
      const users = await UsersCollection.find({
        _id: { $nin: [...memberIds, group.createdBy] },
        company_id: group.company_id,
        status: 0,
      });

      res.status(statusCode.OK).send({ status: true, data: users });
    } catch (err) {
      console.error(err);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Server error" });
    }
  }
  async addMembers(req, res) {
    try {
      const { groupId } = req.params;
      const { memberIds } = req.body;

      const group = await GroupMessageCollection.findById(groupId);
      if (!group) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Group not found" });
      }

      // build new members
      const newMembers = memberIds.map((id) => ({
        member_id: id,
        joinedDate: new Date(),
      }));

      // add members (prevent duplicates using $addToSet ideally)
      group.members.push(...newMembers);
      await group.save();

      const io = getIO();

      // notify newly added members
      for (let id of memberIds) {
        const socketId = onlineUsers.get(id.toString());
        if (socketId) {
          // add them to the socket room instantly
          io.sockets.sockets.get(socketId)?.join(groupId.toString());

          // send them the full group data so it shows up in their sidebar immediately
          io.to(socketId).emit("addedToGroup", {
            groupId,
            group: group.toObject(),
          });
        }
      }

      // notify existing group members about update
      io.to(groupId.toString()).emit("groupMembersUpdated", {
        groupId,
        members: group.members,
      });

      res.status(statusCode.OK).send({ status: true, newMembers });
    } catch (err) {
      console.error("Error adding members:", err);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Server error" });
    }
  }
  async editGroup(req, res) {
    try {
      const { groupId, newName } = req.body;
      const { userId } = res.locals.user;

      // Check if the group exists
      let group = await GroupMessageCollection.findById(groupId);
      if (!group) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Group not found" });
      }

      // Check if current user is admin (createdBy)
      if (group.createdBy.toString() !== userId.toString()) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Only admin can edit group name" });
      }

      // Update name
      group.name = newName;
      await group.save();

      // Emit socket event so all members get update

      const io = getIO();

      // notify newly added members
      // for (let id of memberIds) {
      //   const socketId = onlineUsers.get(id.toString());
      //   if (socketId) {
      //     // add them to the socket room instantly
      //     io.sockets.sockets.get(socketId)?.join(groupId.toString());

      //     // send them the full group data so it shows up in their sidebar immediately
      //     // io.to(socketId).emit("addedToGroup", {
      //     //   groupId,
      //     //   group: group.toObject(),
      //     // });
      //     io.to(groupId).emit("groupNameUpdated", {
      //       groupId,
      //       newName,
      //     });
      //   }
      // }

      return res.status(statusCode.OK).send({
        status: true,
        message: "Group name updated successfully",
        data: group,
      });
    } catch (error) {
      console.error("Error editGroup:", error);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Server error" });
    }
  }
}

module.exports = new GroupChatController();
