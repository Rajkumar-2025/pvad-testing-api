const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  action: { type: String, required: true }, // e.g. "LOGIN", "LOGOUT", "UPDATE_PROFILE"
  metadata: { type: Object }, // optional extra data (IP, device, etc.)
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User_Activity_Log", userActivitySchema);
