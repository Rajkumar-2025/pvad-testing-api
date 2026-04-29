const moment = require("moment");
const { arrayFields } = require("../config/bulkUploadMap");

exports.parseRow = function (row) {
  const parsedRow = {};

  for (let key in row) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");

    let value = row[key];

    // Trim string
    if (typeof value === "string") value = value.trim();

    // ARRAY FIELDS
    if (arrayFields.includes(normalizedKey)) {
      if (!value) {
        parsedRow[normalizedKey] = [];
      } else if (typeof value === "string") {
        parsedRow[normalizedKey] = value.split(",").map(v => v.trim());
      } else if (typeof value === "number") {
        parsedRow[normalizedKey] = [String(value)];
      } else if (Array.isArray(value)) {
        parsedRow[normalizedKey] = value;
      } else {
        parsedRow[normalizedKey] = [];
      }
      continue;
    }

    // DATE FIELDS
    if (["publication_date", "search_date"].includes(normalizedKey)) {
      parsedRow[normalizedKey] = value ? new Date(value) : null;
      continue;
    }

    parsedRow[normalizedKey] = value;
  }

  return parsedRow;
};
