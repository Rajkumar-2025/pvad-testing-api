const mongoose = require("mongoose");

const DrugMasterListSchema = new mongoose.Schema(
  {
    file_name: {
      type: String,
      required: true,
    },
    download_path: {
      type: String,
      required: true,
    },
    // uploaded_by: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "user",
    //   required: true,
    // },
    isActive: {
      type: Boolean,
      default: true,
    },
    created_on: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const CompanyProductListSchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
      required: true,
    },
    product_files: [
      {
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
        isActive: {
          type: Boolean,
          default: false,
        },
        created_on: {
          type: Date,
          default: Date.now,
        },
        updated_on: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    drug_master_lists: [DrugMasterListSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "company_products_files",
  CompanyProductListSchema,
);
