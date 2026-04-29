const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    ticket_id: { type: String, required: true, unique: true, trim: true },
    raised_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    company_id: { type: String, required: true },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    // Chat conversation between user and admin
    conversation: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user", // could be admin or user
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        attachment: {
          type: String,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    ticket_action: [
      {
        action_user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        action: {
          type: String,
          default: "",
        },
        reason: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status_code: {
      type: Number,
      default: 0, // 0 - "Open", 1 - "In Progress", 2 - "Re Open", 3 - "Closed"
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Re Open", "Closed"],
      default: "Open",
    },
    isDeleted: { type: Boolean, default: false },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    category_name: { type: String, default: "" },
    sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    sub_category_name: { type: String, default: "" },
    issue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    issue_name: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// module.exports = mongoose.model("Ticket", ticketSchema);
