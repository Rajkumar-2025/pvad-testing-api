// utils/auditHelpers.js
"use strict";

/**
 * Audit-trail utilities for LiteratureArticle.
 *
 * Log document shape (matches actual DB schema exactly):
 * {
 *   literature_article_id: ObjectId,
 *   field:      string,          // e.g. "journal_name", "company_product", "company_product.active_substance"
 *   old_value:  { [field]: * },  // e.g. { journal_name: null }  or  { company_product: { name:"..", .. } }
 *   new_value:  { [field]: * },
 *   tab:        string,          // step label e.g. "Publication Details"
 *   action:     "UPDATED" | "ADDED" | "REMOVED" | "Upload",
 *   created_by: ObjectId | null,
 *   createdAt:  Date,            // set by Mongoose timestamps
 *   updatedAt:  Date,
 * }
 *
 * Diffing strategy:
 *   Object-array fields  → per-item _id diff  → ADDED / REMOVED / UPDATED(sub-field)
 *   All other fields     → flat leaf diff      → UPDATED
 */

// ─────────────────────────────────────────────────────────────────────────────
// IGNORED – never logged
// ─────────────────────────────────────────────────────────────────────────────
const IGNORED_FIELDS = new Set([
  "tab",
  "__v",
  "createdAt",
  "updatedAt",
  "_id",
  "company_id",
  "article_unique_id",
  "article_title_sim",
  "abstract_sim",
  "cross_check_result",
  "cross_check_id",
  "cross_check_article_title_sim",
  "cross_check_abstract_sim",
  "self_check_result",
  "self_check_id",
  "self_check_article_title_sim",
  "self_check_abstract_sim",
  "final_result",
  "final_id",
  "result",
  "error",
  "adverse_event_data",
  "drug_classification_data",
  "triplet_data",
  "relevance_data",
  "validation_data",
]);

// ─────────────────────────────────────────────────────────────────────────────
// AUDITABLE_FIELD_MAP  key → human label
// key must be the EXACT MongoDB field name (flat schema field or dot-path leaf)
// ─────────────────────────────────────────────────────────────────────────────
const AUDITABLE_FIELD_MAP = {
  // Publication
  article_title: "Article Title",
  authors: "Authors",
  article_id: "Source ID",
  journal_name: "Journal Name",
  volume: "Volume",
  abstract: "Abstract",
  search_engine: "Search Engine",
  publication_date: "Publication Date",
  search_date: "Search Date",
  search_duration: "Search Duration",
  article_link_doi: "Article Link (DOI)",
  literature_language: "Literature Language",

  // Safety
  primary_reporter: "Primary Reporter",
  patient_age: "Patient Age",
  age_group: "Age Group",
  patient_gender: "Patient Gender",
  patient_identifier: "Patient Identifier",
  country: "Country",

  // Classification
  literature_category: "Literature Category",
  other_safety_options: "Pre-clinical Options",
  other_specify_detail: "Pre-clinical Other Detail",
  fta_available: "FTA Available",
  fta_link: "FTA Link",

  // Category validation (flat schema fields)
  category_validation_data_study_type: "Study Type",
  category_validation_data_drug_ae_relationships: "Drug AE Relationships",
  category_validation_data_causality: "Causality",
  category_validation_data_validation_reason: "Literature Assessment",

  // ICSR – Case Information (flat schema fields)
  case_info_received_date: "Received Date",
  case_info_case_type: "Case Type",
  case_info_country: "Case Country",

  // ICSR – Reporter (flat schema fields)
  reporter_name: "Reporter Name",
  reporter_address: "Reporter Address",
  reporter_country: "Reporter Country",

  // ICSR – Patient
  patient_year_of_birth: "Year of Birth",

  // Safety string arrays
  // company_products: "Company Products",
  // company_suspect_products: "Company Suspect Products",
  // other_company_suspect_products: "Other Suspect Products",
  // concomitant_drugs: "Concomitant Drugs",
  // adverse_events: "Adverse Events",
  // special_scenarios: "Special Scenarios",
  // indications: "Indications",

  // // ICSR object arrays
  // medical_history: "Medical History",
  // company_product: "Company Product",
  // company_suspect_product: "Company Suspect Product",
  // other_company_suspect_product: "Other Company Suspect Product",
  // concomitant_drug: "Concomitant Drug",
  // adverse_event: "Adverse Event",
  // special_scenario: "Special Scenario",

  // Array sub-fields (used in UPDATED sub-field entries)
  name: "Name",
  dose: "Dose",
  active_substance: "Active Substance",
  therapy_start_date: "Therapy Start Date",
  therapy_end_date: "Therapy End Date",
  route_of_adminstration: "Route of Administration",
  strength: "Strength",
  indication: "Indication",
  therapy_duration: "Therapy Duration",
  start_date: "Start Date",
  end_date: "End Date",
  event_outcome: "Event Outcome",

  // Assessment
  narrative: "Narrative",
  assessment_status: "Assessment Status",
  assessment_summary: "Remarks",
  // assessor: "Assessor",
  // reviewer: "Reviewer",
};

/** Object-array fields – use _id-based per-item diffing */
const OBJECT_ARRAY_FIELDS = new Set([
  // "company_product",
  // "company_suspect_product",
  // "other_company_suspect_product",
  // "concomitant_drug",
  // "adverse_event",
  // "special_scenario",
  // "medical_history",
]);

const STATUS_LABELS = { 0: "Draft", 1: "Review", 2: "Archive" };

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

const isEqual = (a, b) => {
  const n = (v) => (v === undefined ? null : v);
  return JSON.stringify(n(a)) === JSON.stringify(n(b));
};

/**
 * Strips _id from an object for ADDED log entries.
 * DB shows ADDED new_value without _id (item didn't exist yet).
 */
const stripId = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const { _id, __v, ...rest } = obj;
  return rest;
};

/**
 * Flattens a plain object to dot-path keys.
 * Arrays are ATOMIC – never descended into.
 * Dates are ATOMIC.
 */
const flattenObject = (obj, parentKey = "", result = {}) => {
  if (
    !obj ||
    typeof obj !== "object" ||
    Array.isArray(obj) ||
    obj instanceof Date
  ) {
    if (parentKey) result[parentKey] = obj;
    return result;
  }

  const keys = Object.keys(obj);
  if (!keys.length) {
    if (parentKey) result[parentKey] = obj;
    return result;
  }

  keys.forEach((key) => {
    if (!parentKey && IGNORED_FIELDS.has(key)) return;
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    const value = obj[key];

    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  });

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// diffArrayById – per-item _id-based diff for object arrays
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produces change descriptors for one object-array field.
 *
 * old_value / new_value shape matches the DB exactly:
 *   ADDED   → { [field]: itemWithoutId }   old: { [field]: null }
 *   REMOVED → { [field]: itemWithId }      new: { [field]: null }
 *   UPDATED → { [field.subKey]: oldVal }   new: { [field.subKey]: newVal }
 *
 * @param {object[]} oldArr
 * @param {object[]} newArr
 * @param {string}   fieldName
 * @returns {object[]}  raw change descriptors { field, action, old_value, new_value }
 */
const diffArrayById = (oldArr = [], newArr = [], fieldName) => {
  const logs = [];

  // Index old items by string _id
  const oldMap = new Map(
    oldArr.filter((item) => item?._id).map((item) => [String(item._id), item]),
  );

  // Separate new items into those with and without _id
  const newWithId = newArr.filter((item) => item?._id);
  const newWithout = newArr.filter((item) => !item?._id);
  const newMap = new Map(newWithId.map((item) => [String(item._id), item]));

  // ── ADDED: items in request with no _id (brand new) ──────────────────────
  for (const newItem of newWithout) {
    logs.push({
      field: fieldName,
      action: "ADDED",
      old_value: { [fieldName]: null },
      new_value: { [fieldName]: stripId(newItem) },
    });
  }

  // ── ADDED: items with _id not found in old document ───────────────────────
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) {
      logs.push({
        field: fieldName,
        action: "ADDED",
        old_value: { [fieldName]: null },
        new_value: { [fieldName]: stripId(newItem) },
      });
    }
  }

  // ── REMOVED: items in old document not present in new ────────────────────
  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      logs.push({
        field: fieldName,
        action: "REMOVED",
        // REMOVED keeps _id in old_value (matches DB sample)
        old_value: { [fieldName]: oldItem },
        new_value: { [fieldName]: null },
      });
    }
  }

  // ── UPDATED: sub-field changes on existing items ─────────────────────────
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) continue;
    const oldItem = oldMap.get(id);

    for (const key of Object.keys(newItem)) {
      if (key === "_id") continue;
      if (isEqual(oldItem[key], newItem[key])) continue;

      const subField = `${fieldName}.${key}`;
      logs.push({
        field: subField,
        action: "UPDATED",
        old_value: { [subField]: oldItem[key] ?? null },
        new_value: { [subField]: newItem[key] ?? null },
      });
    }
  }

  return logs;
};

// ─────────────────────────────────────────────────────────────────────────────
// getChangedFields – main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} oldData  – literatureData.toObject()
 * @param {object} newData  – req.body (tab stripped, status normalised)
 * @returns {object[]}      – change descriptors
 */
const getChangedFields = (oldData, newData) => {
  const changes = [];

  // ── Pass 1: Object arrays – per-item _id diff ─────────────────────────────
  for (const fieldName of OBJECT_ARRAY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(newData, fieldName)) continue;
    const oldArr = oldData[fieldName] || [];
    const newArr = newData[fieldName] || [];
    if (!isEqual(oldArr, newArr)) {
      changes.push(...diffArrayById(oldArr, newArr, fieldName));
    }
  }

  // ── Pass 2: All other auditable fields (scalars, nested objects, string arrays)
  const oldFlat = flattenObject(oldData);
  const newFlat = flattenObject(newData);

  for (const key of Object.keys(newFlat)) {
    const topKey = key.split(".")[0];

    // Skip ignored and already-handled object-array fields
    if (IGNORED_FIELDS.has(topKey)) continue;
    if (OBJECT_ARRAY_FIELDS.has(topKey)) continue;

    // Only log fields present in the auditable map
    if (!AUDITABLE_FIELD_MAP[key] && !AUDITABLE_FIELD_MAP[topKey]) continue;

    if (isEqual(oldFlat[key], newFlat[key])) continue;

    let oldVal = oldFlat[key] ?? null;
    let newVal = newFlat[key] ?? null;

    // assessment_status → human label
    if (key === "assessment_status") {
      oldVal = STATUS_LABELS[oldVal] ?? oldVal;
      newVal = STATUS_LABELS[newVal] ?? newVal;
    }

    changes.push({
      field: key,
      action: "UPDATED",
      old_value: { [key]: oldVal },
      new_value: { [key]: newVal },
    });
  }

  return changes;
};

// ─────────────────────────────────────────────────────────────────────────────
// buildAuditLogs – converts change descriptors → DB log documents
// Matches exact schema: literature_article_id, field, old_value, new_value,
//                       tab, action, created_by, createdAt (by timestamps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object[]} changes
 * @param {*}        literatureDocId  – literatureData._id
 * @param {*}        userId
 * @param {string}   tab
 * @returns {object[]}
 */
const buildAuditLogs = (changes, literatureDocId, userId, tab) =>
  changes.map((change) => ({
    literature_article_id: literatureDocId,
    field: change.field,
    old_value: change.old_value,
    new_value: change.new_value,
    tab: tab || "Unknown",
    action: change.action,
    created_by: userId,
    // createdAt / updatedAt are set automatically by Mongoose timestamps
  }));

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getChangedFields,
  buildAuditLogs,
  diffArrayById,
  flattenObject,
  STATUS_LABELS,
  AUDITABLE_FIELD_MAP,
  OBJECT_ARRAY_FIELDS,
};
