const LiteratureArticle = require("../model/LiteratureArticleSchema");

exports.validateRowAgainstSchema = async function (data) {
  try {
    const temp = new LiteratureArticle(data);
    await temp.validate();
    return null; // valid
  } catch (err) {
    return err.message; // return validation error
  }
};

exports.validateHeaders = function (fileHeaders, requiredHeaders) {
  const missing = requiredHeaders.filter(h => !fileHeaders.includes(h));

  if (missing.length > 0) {
    return `Missing required headers: ${missing.join(", ")}`;
  }

  return null;
};