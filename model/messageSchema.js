const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    default: null,
  },
  text: String,
  isRead: { type: Boolean, default: false }, // Unread/Read indicator
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }, // delete / not
  isEdited: { type: Boolean, default: false }, // edit / not
});
messageSchema.pre("save", function (next) {
  if (!this.receiverId && !this.groupId) {
    return next(new Error("Message must have either a receiverId or groupId"));
  }
  next();
});
// module.exports = mongoose.model("Message", messageSchema);
