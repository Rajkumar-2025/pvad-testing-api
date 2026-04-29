const mongoose = require("mongoose");

/* ----------------------------------
   Mapping Version Schema
----------------------------------- */
const LiteratureTemplateSettingSchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
      required: true,
    },

    search_engine: {
      type: String,
      required: true,
      enum: ["PubMed", "Embase", "Other"],
    },

    other_source: {
      type: String,
      default: "",
    },

    status: {
      type: Number,
      default: 0, // 0 = active, 1 = inactive
    },

    currentVersion: {
      type: Number,
      default: 1,
    },
    mapping: {
      type: Object,
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);

// LiteratureTemplateSettingSchema.index(
//   { company_id: 1, search_engine: 1 },
//   { unique: true }
// );

module.exports = mongoose.model(
  "literature_template_config",
  LiteratureTemplateSettingSchema,
);
