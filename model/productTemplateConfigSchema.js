const mongoose = require("mongoose");

/* ----------------------------------
   Mapping Version Schema
----------------------------------- */
const ProductTemplateSettingSchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
      required: true,
    },
    name_of_the_file: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      default: 0,
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

ProductTemplateSettingSchema.index(
  { company_id: 1, name_of_the_file: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "product_template_config",
  ProductTemplateSettingSchema,
);
