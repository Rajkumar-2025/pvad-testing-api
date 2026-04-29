const { Server } = require("socket.io");
const User = require("../model/usersSchema");
const Message = require("../model/messageSchema");
const { ObjectId } = require("mongodb");

let io;
const onlineUsers = new Map(); // userId -> socketId

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // frontend origin in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // user online
    socket.on("userOnline", async (user) => {
      // console.log("User connected:", user);

      // store in onlineUsers: userId -> socketId
      onlineUsers.set(user._id.toString(), socket.id);
      socket.join(user._id);
      // broadcast updated list
      await broadcastCompanyUsers(user.company_id);
    });

    // read message
    socket.on("readMessage", async (receiverId, senderId) => {
      socket.join(receiverId);
      console.log(receiverId, "joined room");
      let result = await Message.updateMany(
        { senderId, receiverId, isRead: false },
        { $set: { isRead: true } }
      );

      if (result.modifiedCount > 0) {
        let data = {
          status: true,
          receiverId,
          senderId,
        };
        io.emit("messageReaded", data);
      }
    });

    // send message
    socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
      const newMessage = await Message.create({ senderId, receiverId, text });
      if (newMessage) {
        let responseData = { senderId, receiverId, status: true };
        io.emit("receiveMessage", responseData);
      }
    });

    socket.on("editMessage", (data) => {
      try {
        // console.log(data, "dattaa from edit message");
        onlineUsers.forEach(async (key, value) => {
          // console.log("normal sss", key, value);
          if (data.receiver_id == value) {
            let editMessage = await Message.findOneAndUpdate(
              { _id: data.chat_id },
              {
                $set: {
                  isEdited: true,
                  text: data.text,
                },
              }
            );
            io.to(key).emit("messageEditedNote", { status: true });
          }
        });
      } catch (error) {
        console.log("editMessage error", error);
        return res.status(500).send({ status: false, message: error });
      }
    });

    socket.on("deleteMessage", (data) => {
      onlineUsers.forEach(async (key, value) => {
        if (data.receiverId == value) {
          let deletedMsg = await Message.findOneAndUpdate(
            { _id: data._id },
            {
              $set: {
                isDeleted: true,
              },
            }
          );
          io.to(key).emit("messageDeletedNote", { status: true });
        }
      });
    });

    // users Join group
    socket.on("joinGroup", ({ userId, groupId }) => {
      console.log(`User ${userId} joined group ${groupId}`);
      socket.join(groupId);
    });

    socket.on("sendGroupMessage", async ({ senderId, groupId, text }) => {
      try {
        console.log(senderId, groupId, text, "senderId, groupId, text");
        // return;
        const newMessage = await Message.create({ senderId, groupId, text });

        if (newMessage) {
          // Populate sender info for frontend
          const populatedMsg = await newMessage.populate(
            "senderId",
            "username"
          );

          // Emit only to this group room
          io.to(groupId.toString()).emit("groupMessage", populatedMsg);
        }
      } catch (err) {
        console.error("Error in sendGroupMessage:", err);
      }
    });

    // edit group message
    socket.on("editGroupMessage", async ({ message_id, text, groupId }) => {
      try {
        await Message.findByIdAndUpdate(message_id, {
          $set: { text, isEdited: true },
        });
        io.to(groupId.toString()).emit("groupMessageEditedNote", {
          groupId,
          message_id,
          text,
        });
      } catch (err) {
        console.error("editGroupMessage error:", err);
      }
    });

    // delete group message
    socket.on("deleteGroupMessage", async ({ _id, groupId }) => {
      // console.log(_id, groupId, "_id, groupId deleteGroupMessage ");
      // return;
      try {
        await Message.findByIdAndUpdate(_id, { $set: { isDeleted: true } });
        io.to(groupId.toString()).emit("groupMessageDeletedNote", {
          groupId,
          _id,
        });
      } catch (err) {
        console.error("deleteGroupMessage error:", err);
      }
    });

    // join group room
    socket.on("joinGroup", ({ groupId }) => {
      socket.join(groupId.toString());
      console.log(`User ${socket.id} joined group ${groupId}`);
    });

    // user disconnect
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      let disconnectedUserId = null;
      let companyId = null;

      // find userId by socketId
      for (let [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);

          // fetch companyId for this user
          const u = await User.findById(userId, { company_id: 1 });
          if (u) companyId = u.company_id;

          break;
        }
      }

      if (companyId) {
        // broadcast updated user list after disconnect
        await broadcastCompanyUsers(companyId);
      }
    });
  });
}

// helper: broadcast updated company user list with activeChat info
async function broadcastCompanyUsers(company_id) {
  const activeUserIds = Array.from(onlineUsers.keys()).map(
    (id) => new ObjectId(id)
  );

  const usersData = await User.aggregate([
    { $match: { company_id } },
    {
      $addFields: {
        activeChat: {
          $cond: {
            if: { $in: ["$_id", activeUserIds] },
            then: true,
            else: false,
          },
        },
      },
    },
    { $project: { _id: 1, username: 1, is_logged: 1, activeChat: 1 } },
  ]);

  io.emit("onlineUsers", usersData);
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initSocket, getIO, onlineUsers };
