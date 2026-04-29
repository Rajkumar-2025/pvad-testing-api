const { body } = require("express-validator");
const striptags = require("striptags");

// Regex to detect URLs
const linkRegex = /(https?:\/\/|www\.)/i;

// Custom validator: Disallow links except for specific fields
const noLinksAllowed = (value, { req, path }) => {
  if (!value) return true;
  // Skip validation for allowed link fields
  if (path === "fta_link" || path === "article_link_doi") return true;
  // Disallow URLs in other fields
  if (linkRegex.test(value)) {
    throw new Error("Links or URLs are not allowed in this field.");
  }
  return true;
};

// Optional URL format validator for the two link fields
const validateURL = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    throw new Error("Invalid URL format....");
  }
};

const validateArticleRules = [
  body("article_id").trim().optional().custom(noLinksAllowed),
  body("article_title").optional().custom(noLinksAllowed),
  body("authors").optional().custom(noLinksAllowed),
  body("journal_name").optional().custom(noLinksAllowed),
  body("volume").optional().custom(noLinksAllowed),
  body("abstract").optional().custom(noLinksAllowed),
  body("source").optional().custom(noLinksAllowed),

  body("fta_link").optional().custom(validateURL),
  // body("article_link_doi").optional().custom(validateURL),

  body("primary_reporter").optional().custom(noLinksAllowed),
  body("country").optional().custom(noLinksAllowed),
  body("patient_age").optional().custom(noLinksAllowed),
  body("age_group").optional().custom(noLinksAllowed),

  body("narrative").optional().custom(noLinksAllowed),
  body("assessment_summary").optional().custom(noLinksAllowed),
];

module.exports = {
  validateArticleRules,
};
