const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  company_id: {
    type: String,
  },
  members: [
    {
      member_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      joinedDate: { type: Date, default: Date.now },
    },
  ],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  createdAt: { type: Date, default: Date.now },
});

// module.exports = mongoose.model("Group", groupSchema);
