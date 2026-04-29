const mongoose = require("mongoose");
const reviewSettingSchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
    },
    created_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    review_setting_id: {
      type: String,
      trim: true,
      require: true,
    },
    generic_names: [
      {
        product_generic_name: {
          type: String,
        },
        product_generic_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
        },
        brand_name: {
          type: String,
        },
        synonym_name: {
          type: String,
        },
        manufacturer_name: {
          type: String,
        },
      },
    ],
    search_engine: {
      type: String,
      require: true,
    },
    other_source: {
      type: String,
      default: "",
    },
    input_method: {
      type: String,
      default: "manual",
    },
    frequency_type: {
      type: String,
      default: "weekly",
      require: true,
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
    },
    status: {
      type: Number,
      default: 0, // 0 - active , 1 -in active
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// module.exports = mongoose.model("review_setting", reviewSettingSchema);
