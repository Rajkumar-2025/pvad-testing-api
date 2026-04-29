module.exports = {
  requiredHeaders: [
    "article_title",
    "authors",
    // "journal_name",
    // "volume",
    "abstract",
    "source",
    // "publication_date",
    "search_date",
    "company_drug",
    // "fta_link",
    "article_link_doi",
    // "country",
    // "primary_reporter"
  ],

  arrayFields: [
    "suspect_products",
    "co_suspect_drugs",
    "adverse_events",
    "literature_category",
    "other_safety_options"
  ],

  // if a column name in excel is different from schema name
  headerMap: {
    "suspect_products": "suspect_products",
    "co_suspect_drugs": "co_suspect_drugs",
    "adverse_events": "adverse_events",
    "literature_category": "literature_category",
    "other_safety_options": "other_safety_options",
  }
};
