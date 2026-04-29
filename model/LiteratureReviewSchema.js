const mongoose = require("mongoose");

const LiteratureUploadLogSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true },
    creator_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    original_name: { type: String },
    saved_file_name: { type: String },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "literature_template_config",
      required: true,
    },
    total_rows: { type: Number, required: true },
    input_rows: { type: Number, required: true },
    output_rows: { type: Number, default: 0 },

    deduplicate_rows: { type: Number, default: 0 },
    follow_up_rows: { type: Number, default: 0 },
    drug_mismatch: { type: Number, default: 0 },

    ICSR_rows: { type: Number, default: 0 },
    other_safety_rows: { type: Number, default: 0 }, // clinical aggregate
    pre_clinical_rows: { type: Number, default: 0 }, // pre clinical aggregate
    non_relevant_rows: { type: Number, default: 0 },
    unclassified_rows: { type: Number, default: 0 },

    original_filename: { type: String },

    ai_classification_date_time: { type: Date, default: null },
    ai_status: { type: Number, default: 0 },

    uploaded_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Literature_Review", LiteratureUploadLogSchema);
