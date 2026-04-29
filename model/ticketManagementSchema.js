const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: {
    type: String,
    enum: ["urgent", "high", "medium", "low"],
    default: "low",
  },
  timeline: {
    type: Number,
    default: 7,
  },
});

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: {
    type: String,
    enum: ["urgent", "high", "medium", "low"],
    default: "low",
  },
  timeline: {
    type: Number,
    default: 7,
  },
  issues: [issueSchema],
});

const categorySchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: Number,
      default: 0,
    },
    is_deleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    priority: {
      type: String,
      enum: ["urgent", "high", "medium", "low"],
      default: "low",
    },
    timeline: {
      type: Number,
      default: 7,
    },
    subCategories: [subCategorySchema],
  },
  { timestamps: true }
);

// module.exports = mongoose.model("Category", categorySchema);
