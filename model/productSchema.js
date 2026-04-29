const mongoose = require("mongoose");
const prodductSchema = new mongoose.Schema(
  {
    upload_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product_template_config",
      required: true,
    },
    product_upload_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product_file_upload",
      required: true,
    },
    company_id: {
      type: String,
      required: true,
    },
    approval_number: {
      type: String,
    },
    product_generic_name: {
      type: String,
      required: true,
    },
    product_name: {
      type: String,
    },
    remarks: {
      type: String,
      default: "",
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

// prodductSchema.index({
//   company_id: 1,
//   template_id: 1,
//   status: 1,
// });

// prodductSchema.index({
//   product_upload_id: 1,
// });

module.exports = mongoose.model("company_product", prodductSchema);
