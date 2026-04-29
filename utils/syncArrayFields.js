// utils/syncArrayFields.js
/**
 * Keeps the plural string arrays (source of truth from the Safety step)
 * in sync with the singular structured object arrays (used by the ICSR step).
 *
 * Rules:
 *  - If a name exists in the string array but NOT in the object array → add it
 *    with blank detail fields (dose, route, dates, etc.)
 *  - If a name exists in BOTH → preserve all existing detail fields, just
 *    ensure the name stays correct.
 *  - If a name was REMOVED from the string array → remove the matching object
 *    row entirely.
 *
 * Matching priority:
 *  1. Exact name match (most reliable when users edit in place)
 *  2. Position match (fallback for reorders)
 *
 * This utility is pure – it takes existing DB data + incoming body and
 * returns the merged object arrays. No DB calls.
 */

// ── Blank templates ────────────────────────────────────────────────────────

const BLANK_DRUG = {
  name: "",
  dose: "",
  active_substance: "",
  therapy_start_date: "",
  therapy_end_date: "",
  route_of_adminstration: "",
  strength: "",
  indication: "",
  therapy_duration: "",
};

const BLANK_EVENT = {
  name: "",
  start_date: "",
  end_date: "",
  event_outcome: "",
};

// ── Core merge helper ──────────────────────────────────────────────────────

/**
 * Merges a string[] of names into an object[].
 *
 * @param {string[]} nameList      – incoming string array (e.g. bData.company_products)
 * @param {object[]} existingItems – current DB object array (e.g. doc.company_product)
 * @param {object[]} incomingItems – object array from request body (may have partial edits)
 * @param {object}   blank         – template for a new row
 * @returns {object[]}
 */
const mergeIntoObjectArray = (
  nameList = [],
  existingItems = [],
  incomingItems = [],
  blank,
) => {
  return nameList.map((name, index) => {
    // 1. Prefer an incoming object row that already has this name (user edited ICSR detail)
    const fromIncoming =
      incomingItems.find((item) => item?.name === name) || incomingItems[index];

    // 2. Fall back to what's already in the DB
    const fromDB =
      existingItems.find((item) => item?.name === name) || existingItems[index];

    // Merge: blank < DB < incoming (incoming wins for any field that was sent)
    return {
      ...blank,
      ...(fromDB ? toPlainObject(fromDB) : {}),
      ...(fromIncoming ? toPlainObject(fromIncoming) : {}),
      name, // name always comes from the string array (Safety step is source of truth)
    };
  });
};

/**
 * Converts a Mongoose subdocument to a plain JS object safely.
 * If it's already plain, returns it as-is.
 */
const toPlainObject = (obj) => {
  if (!obj) return {};
  return typeof obj.toObject === "function" ? obj.toObject() : { ...obj };
};

// ── Mapping config ─────────────────────────────────────────────────────────
// Each entry maps:
//   sourceField  – plural string array field name in the schema
//   targetField  – singular object array field name in the schema
//   blank        – blank template

const SYNC_MAPPINGS = [
  {
    sourceField: "company_products",
    targetField: "company_product",
    blank: BLANK_DRUG,
  },
  {
    sourceField: "company_suspect_products",
    targetField: "company_suspect_product",
    blank: BLANK_DRUG,
  },
  {
    sourceField: "other_company_suspect_products",
    targetField: "other_company_suspect_product",
    blank: BLANK_DRUG,
  },
  {
    sourceField: "concomitant_drugs",
    targetField: "concomitant_drug",
    blank: BLANK_DRUG,
  },
  {
    sourceField: "adverse_events",
    targetField: "adverse_event",
    blank: BLANK_EVENT,
  },
  {
    sourceField: "special_scenarios",
    targetField: "special_scenario",
    blank: BLANK_EVENT,
  },
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Given incoming request body data and the existing DB document,
 * returns a patch object containing the synced object arrays.
 *
 * Only runs sync for fields that are actually present in bData
 * (so a partial update of just one field doesn't wipe the others).
 *
 * @param {object} bData       – req.body (after tab is stripped)
 * @param {object} existingDoc – Mongoose document from DB (.toObject() or raw)
 * @returns {object}           – additional fields to merge into the $set payload
 */
const syncArrayFields = (bData, existingDoc) => {
  const patch = {};

  for (const { sourceField, targetField, blank } of SYNC_MAPPINGS) {
    // Only sync if the string array was actually sent in this request
    if (!Object.prototype.hasOwnProperty.call(bData, sourceField)) continue;

    const nameList = bData[sourceField] || [];
    const existingItems = existingDoc[targetField] || [];
    // The body may also contain updated object array data (from ICSR step edits)
    const incomingItems = bData[targetField] || [];

    patch[targetField] = mergeIntoObjectArray(
      nameList,
      existingItems,
      incomingItems,
      blank,
    );
  }

  return patch;
};

module.exports = { syncArrayFields };
