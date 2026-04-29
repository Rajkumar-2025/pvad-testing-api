const mongoose = require("mongoose");

// 🔹 Regex to detect URLs
const linkRegex = /(https?:\/\/|www\.)/i;

// 🔹 Reuse your safe validator
const noLinksValidator = {
  validator: function (v) {
    if (!v) return true;

    if (Array.isArray(v)) {
      return v.every(
        (item) => typeof item === "string" && !linkRegex.test(item),
      );
    }

    if (typeof v === "string") {
      return !linkRegex.test(v);
    }

    return true;
  },
  message: "Links or URLs are not allowed in this field.",
};

const LiteratureLogSchema = new mongoose.Schema(
  {
    literature_article_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Literature_Article",
      required: true,
      index: true,
    },

    field: {
      type: String, // e.g. "category_validation_data.patient_identifiers"
      validate: noLinksValidator,
    },

    old_value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    new_value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    tab: {
      type: String, // UI tab name
      default: "",
      validate: noLinksValidator,
    },

    action: {
      type: String, // UPDATED / CREATED / DELETED
      default: "UPDATED",
      validate: noLinksValidator,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = log time
  },
);

module.exports = mongoose.model("Literature_Log", LiteratureLogSchema);
