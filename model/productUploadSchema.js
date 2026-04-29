const mongoose = require("mongoose");

const productFileUpload = new mongoose.Schema(
  {
    company_id: {
      type: String,
      required: true,
    },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product_template_config",
      required: true,
    },
    original_file_name: {
      type: String,
      required: true,
    },
    db_file_name: {
      type: String,
      required: true,
    },
    version: { type: String, default: "1.0" },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: Number,
      default: 0,
    },
    file_hash: {
      type: String,
      required: true,
    },
    DMLC_createdAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
    duplicate_justification: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("product_file_upload", productFileUpload);
