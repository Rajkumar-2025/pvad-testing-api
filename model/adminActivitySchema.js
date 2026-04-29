const mongoose = require("mongoose");

const adminActivitySchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  action: { type: String, required: true }, // e.g. "CREATE_USER", "EDIT_USER", "DELETE_USER"
  target_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  }, // which user was affected
  description: { type: String },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin_Activity_Log", adminActivitySchema);
