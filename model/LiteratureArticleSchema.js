"use strict";

const mongoose = require("mongoose");

// ====================== REGEX ======================

/**
 * Detects URLs (http, https, www, etc.)
 */
const linkRegex = /(https?:\/\/|www\.)/i;

// ====================== VALIDATORS ======================

/**
 * Disallows links/URLs in string fields.
 * Supports both plain strings and arrays of strings.
 */
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

/**
 * Validates that a value is a properly formatted URL.
 */
const urlValidator = {
  validator: function (v) {
    if (!v) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  message: "Invalid URL format.",
};

// ====================== HELPER FUNCTIONS ======================

/**
 * Returns true if a string value is empty, null, undefined, or only whitespace.
 * @param {*} v
 * @returns {boolean}
 */
const isEmptyString = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * Returns true if a DrugSchema subdocument has no meaningful data across all its fields.
 * An entry is considered "empty" only if ALL tracked fields are blank.
 * @param {Object} obj
 * @returns {boolean}
 */
const isEmptyDrug = (obj) => {
  if (!obj || typeof obj !== "object") return true;
  const fields = [
    "name",
    "dose",
    "therapy_start_date",
    "therapy_end_date",
    "route_of_adminstration",
    "strength",
    "indication",
    "therapy_duration",
  ];
  return fields.every((f) => isEmptyString(obj[f]));
};

/**
 * Returns true if an AdverseEventSchema subdocument has no meaningful data.
 * @param {Object} obj
 * @returns {boolean}
 */
const isEmptyAdverseEvent = (obj) => {
  if (!obj || typeof obj !== "object") return true;
  const fields = ["name", "start_date", "end_date", "event_outcome"];
  return fields.every((f) => isEmptyString(obj[f]));
};

/**
 * Returns true if a SpecialScenarioSchema subdocument has no meaningful data.
 * @param {Object} obj
 * @returns {boolean}
 */
const isEmptySpecialScenario = (obj) => {
  if (!obj || typeof obj !== "object") return true;
  const fields = ["name", "start_date", "end_date", "event_outcome"];
  return fields.every((f) => isEmptyString(obj[f]));
};

/**
 * Filters empty strings from a string array field on the given data object.
 * Mutates the field in-place.
 * @param {Object} data - The document or update payload object
 * @param {string[]} fields - List of field names to clean
 */
const cleanStringArrayFields = (data, fields) => {
  fields.forEach((field) => {
    if (Array.isArray(data[field])) {
      data[field] = data[field].filter((v) => !isEmptyString(v));
    }
  });
};

/**
 * Filters empty subdocuments from DrugSchema array fields.
 * Mutates the field in-place.
 * @param {Object} data
 * @param {string[]} fields
 */
const cleanDrugArrayFields = (data, fields) => {
  fields.forEach((field) => {
    if (Array.isArray(data[field])) {
      data[field] = data[field].filter((v) => !isEmptyDrug(v));
    }
  });
};

/**
 * Filters empty subdocuments from AdverseEventSchema array fields.
 * Mutates the field in-place.
 * @param {Object} data
 * @param {string[]} fields
 */
const cleanAdverseEventArrayFields = (data, fields) => {
  fields.forEach((field) => {
    if (Array.isArray(data[field])) {
      data[field] = data[field].filter((v) => !isEmptyAdverseEvent(v));
    }
  });
};

/**
 * Filters empty subdocuments from SpecialScenarioSchema array fields.
 * Mutates the field in-place.
 * @param {Object} data
 * @param {string[]} fields
 */
const cleanSpecialScenarioArrayFields = (data, fields) => {
  fields.forEach((field) => {
    if (Array.isArray(data[field])) {
      data[field] = data[field].filter((v) => !isEmptySpecialScenario(v));
    }
  });
};

// ====================== FIELD LISTS ======================
// Centralised so pre-save and pre-update stay in sync automatically.

const STRING_ARRAY_FIELDS = [
  "company_products",
  "company_suspect_products",
  "indications",
  "other_company_suspect_products",
  "concomitant_drugs",
  "adverse_events",
  "special_scenarios",
  "indication",
];

const DRUG_ARRAY_FIELDS = [
  "company_product",
  "company_suspect_product",
  "other_company_suspect_product",
  "concomitant_drug",
];

const ADVERSE_EVENT_ARRAY_FIELDS = ["medical_history", "adverse_event"];

const SPECIAL_SCENARIO_ARRAY_FIELDS = ["special_scenario"];

// ====================== SUB-SCHEMAS ======================

const DrugSchema = new mongoose.Schema({
  name: { type: String, default: "", validate: noLinksValidator },
  dose: { type: String, default: "", validate: noLinksValidator },
  therapy_start_date: { type: String, default: "", validate: noLinksValidator },
  therapy_end_date: { type: String, default: "", validate: noLinksValidator },
  route_of_adminstration: {
    type: String,
    default: "",
    validate: noLinksValidator,
  },
  strength: { type: String, default: "", validate: noLinksValidator },
  indication: { type: String, default: "", validate: noLinksValidator },
  therapy_duration: { type: String, default: "", validate: noLinksValidator },
});

const AdverseEventSchema = new mongoose.Schema({
  name: { type: String, default: "", validate: noLinksValidator },
  start_date: { type: String, default: "", validate: noLinksValidator },
  end_date: { type: String, default: "", validate: noLinksValidator },
  event_outcome: { type: String, default: "", validate: noLinksValidator },
});

const SpecialScenarioSchema = new mongoose.Schema({
  name: { type: String, default: "", validate: noLinksValidator },
  start_date: { type: String, default: "", validate: noLinksValidator },
  end_date: { type: String, default: "", validate: noLinksValidator },
  event_outcome: { type: String, default: "", validate: noLinksValidator },
});

// ====================== MAIN SCHEMA ======================

const LiteratureArticleSchema = new mongoose.Schema(
  {
    // ── Publication Details ──────────────────────────────────────────────────
    article_unique_id: {
      type: String,
      required: true,
      unique: true,
      validate: noLinksValidator,
    },
    literature_review_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Literature_Review",
      default: null,
    },
    article_id: { type: String, required: true, validate: noLinksValidator },
    company_id: { type: String, required: true, validate: noLinksValidator },
    article_title: { type: String, validate: noLinksValidator },
    authors: { type: String, validate: noLinksValidator },
    journal_name: { type: String, validate: noLinksValidator },
    volume: { type: String, validate: noLinksValidator },
    source: { type: String, validate: noLinksValidator },

    abstract: { type: String, default: "" },
    drug_major_focus: [{ type: String, validate: noLinksValidator }],
    drug_index_term: [{ type: String, validate: noLinksValidator }],
    medical_term_major_focus: [{ type: String, validate: noLinksValidator }],
    medical_index_term: [{ type: String, validate: noLinksValidator }],

    publication_date: Date,
    search_date: Date,
    search_duration: { type: String, default: "" },
    search_engine: { type: String, default: "" },
    category_validation_data_study_type: { type: String, default: "" },
    article_link_doi: { type: String, default: "" },
    fta_link: { type: String, default: "" },

    // ── Safety Details ───────────────────────────────────────────────────────
    primary_reporter: { type: String, validate: noLinksValidator },
    patient_identifier: { type: String, validate: noLinksValidator },
    patient_age: { type: String, validate: noLinksValidator },
    age_group: { type: String, validate: noLinksValidator },
    patient_gender: { type: String, validate: noLinksValidator },

    // ── String Array Fields (cleaned by middleware) ──────────────────────────
    company_products: [{ type: String, validate: noLinksValidator }],
    company_suspect_products: [{ type: String, validate: noLinksValidator }],
    indications: [{ type: String, validate: noLinksValidator }],
    other_company_suspect_products: [
      { type: String, validate: noLinksValidator },
    ],
    concomitant_drugs: [{ type: String, validate: noLinksValidator }],
    adverse_events: [{ type: String, validate: noLinksValidator }],
    special_scenarios: [{ type: String, validate: noLinksValidator }],

    literature_category: [{ type: String, validate: noLinksValidator }],
    other_safety_options: [{ type: String, validate: noLinksValidator }],
    other_specify_detail: { type: String, validate: noLinksValidator },
    fta_available: { type: String, validate: noLinksValidator },
    literature_language: { type: String, validate: noLinksValidator },
    category_validation_data_drug_ae_relationships: {
      type: String,
      default: "",
    },
    category_validation_data_causality: { type: String, default: "" },
    category_validation_data_validation_reason: { type: String, default: "" },

    uploaded_date: { type: Date, default: Date.now },

    case_info_received_date: { type: Date, default: null },
    case_info_country: {
      type: String,
      default: "",
      validate: noLinksValidator,
    },
    case_info_case_type: {
      type: String,
      default: "",
      validate: noLinksValidator,
    },

    reporter_name: { type: String, default: "", validate: noLinksValidator },
    reporter_address: { type: String, default: "", validate: noLinksValidator },
    reporter_country: { type: String, default: "", validate: noLinksValidator },

    patient_year_of_birth: {
      type: String,
      default: "",
      validate: noLinksValidator,
    },

    // ── Sub-document Array Fields (cleaned by middleware) ────────────────────
    medical_history: [AdverseEventSchema],
    company_product: [DrugSchema],
    company_suspect_product: [DrugSchema],
    other_company_suspect_product: [DrugSchema],
    concomitant_drug: [DrugSchema],
    indication: [{ type: String, validate: noLinksValidator }],
    adverse_event: [AdverseEventSchema],
    special_scenario: [SpecialScenarioSchema],

    narrative: { type: String, default: "", validate: noLinksValidator },

    // ── Assessor / Reviewer ──────────────────────────────────────────────────
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    assessment_status: { type: Number, default: 0 },
    assessment_summary: {
      type: String,
      default: "",
      validate: noLinksValidator,
    },

    // ── Status Flags ─────────────────────────────────────────────────────────
    status: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    // ── Similarity / Cross-check / Self-check ────────────────────────────────
    article_title_sim: { type: String, default: "" },
    abstract_sim: { type: String, default: "" },
    cross_check_result: { type: String, default: "" },
    cross_check_id: { type: String, default: "" },
    cross_check_article_title_sim: { type: String, default: "" },
    cross_check_abstract_sim: { type: String, default: "" },
    self_check_result: { type: String, default: "" },
    self_check_id: { type: String, default: "" },
    self_check_article_title_sim: { type: String, default: "" },
    self_check_abstract_sim: { type: String, default: "" },
    final_result: { type: String, default: "" },
    final_id: { type: String, default: "" },
    result: { type: String, default: "" },

    // ── Misc ─────────────────────────────────────────────────────────────────
    reason: { type: String, default: "" },
    matched_drug: { type: String, default: "" },
    priority: { type: String, default: "0" },
    followup_explanation: { type: String, default: "" },
    literature_type: { type: String, default: "" },
    literature_status: { type: String, default: "Unclassified" },

    // ── AI / NLP Result Blobs ────────────────────────────────────────────────
    adverse_event_data: {
      patient: [String],
      drugs: [String],
      indications: [String],
      adverse_events: [String],
      special_scenarios: [String],
      summary: { type: String, default: "" },
      drug_ae_relationships: [String],
    },
    drug_classification_data: {
      company_drugs: [String],
      company_suspect_drugs: [String],
      other_suspect_drugs: [String],
      concomitant_drugs: [String],
      validation_notes: { type: String, default: "" },
    },
    triplet_data: {
      triplets: [
        {
          subject: { type: String, default: "" },
          relation: { type: String, default: "" },
          object: { type: String, default: "" },
        },
      ],
    },
    relevance_data: {
      is_relevant: { type: Boolean, default: false },
      explanation: { type: String, default: "" },
    },
    validation_data: {
      original_classification: { type: Boolean, default: false },
      validated_classification: { type: Boolean, default: false },
      validation_reason: { type: String, default: "" },
      elements_found: {
        company_drugs_detected: [String],
        adverse_event_phrases: [String],
        special_scenarios: [String],
      },
    },

    categorization_data_classification: { type: String, default: "" },
    categorization_data_explanation: { type: String, default: "" },

    category_validation_data_original_classification: {
      type: String,
      default: "",
    },
    category_validation_data_validated_classification: {
      type: String,
      default: "",
    },
    category_validation_data_is_correct: { type: Boolean, default: false },
    category_validation_data_patient_identifiers: {
      type: [String],
      default: [],
      validate: noLinksValidator,
    },
    category_validation_data_company_suspect_drug: {
      type: [String],
      default: [],
      validate: noLinksValidator,
    },
    category_validation_data_adverse_events: [String],
    category_validation_data_special_scenarios: [String],
    category_validation_data_indications: [String],

    error: { type: String, default: "" },
  },
  { timestamps: true },
);

// ====================== MIDDLEWARE HELPERS ======================

/**
 * Applies all array-cleaning logic to a plain data object.
 * Used by both pre("save") and pre(update) hooks.
 *
 * @param {Object} data - The document or $set payload to clean in-place
 */
const applyArrayCleaning = (data) => {
  cleanStringArrayFields(data, STRING_ARRAY_FIELDS);
  cleanDrugArrayFields(data, DRUG_ARRAY_FIELDS);
  cleanAdverseEventArrayFields(data, ADVERSE_EVENT_ARRAY_FIELDS);
  cleanSpecialScenarioArrayFields(data, SPECIAL_SCENARIO_ARRAY_FIELDS);
};

// ====================== PRE-SAVE MIDDLEWARE ======================
// Triggered by: doc.save()

LiteratureArticleSchema.pre("save", function (next) {
  try {
    applyArrayCleaning(this);
    next();
  } catch (err) {
    next(err);
  }
});

// ====================== PRE-UPDATE MIDDLEWARE ======================
// Triggered by: Model.findOneAndUpdate(), Model.updateOne(), Model.updateMany()

LiteratureArticleSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (next) {
    try {
      const update = this.getUpdate();

      if (!update) return next();

      // Mongoose update payloads may wrap fields inside $set.
      // We clean both the top-level object and the $set object
      // so that callers using either style are covered.
      applyArrayCleaning(update);

      if (update.$set && typeof update.$set === "object") {
        applyArrayCleaning(update.$set);
      }

      next();
    } catch (err) {
      next(err);
    }
  },
);

// ====================== INDEXES ======================

LiteratureArticleSchema.index({ company_id: 1, isDeleted: 1 });
LiteratureArticleSchema.index({ literature_review_id: 1 });
LiteratureArticleSchema.index({ assessor: 1 });
LiteratureArticleSchema.index({ reviewer: 1 });
LiteratureArticleSchema.index({ status: 1, is_active: 1 });
LiteratureArticleSchema.index({ literature_status: 1 });

// ====================== EXPORT ======================

module.exports = mongoose.model("Literature_Article", LiteratureArticleSchema);
