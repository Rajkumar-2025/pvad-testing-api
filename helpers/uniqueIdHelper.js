const Ticket = require("../model/ticketSchema");
const Article = require("../model/LiteratureArticleSchema");

const generateTicketId = async (companyId) => {
  try {
    if (!companyId)
      throw new Error("Company ID is required to generate ticket ID");

    // Find the latest ticket for this company
    const lastTicket = await Ticket.findOne({ company_id: companyId })
      .sort({ createdAt: -1 })
      .select("ticket_id");

    let nextNumber = 1;

    if (lastTicket && lastTicket.ticket_id) {
      const parts = lastTicket.ticket_id.split("-");
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    const formattedNumber = String(nextNumber).padStart(4, "0");

    return `${companyId}-TCKT-${formattedNumber}`;
  } catch (error) {
    console.error("Error generating ticket ID:", error);
    throw new Error("Failed to generate ticket ID");
  }
};

// const generateArticleId = async (companyId) => {
//   try {
//     if (!companyId)
//       throw new Error("Company ID is required to generate article ID");

//     // Use first 3 letters of companyId (ignore digits, underscores, etc.)
//     const prefix = companyId
//       .replace(/[^A-Za-z]/g, "")
//       .substring(0, 3)
//       .toUpperCase();

//     // Find latest article for this company prefix
//     const lastArticle = await Article.findOne({
//       article_unique_id: new RegExp(`^${prefix}-ARTI-`),
//     })
//       .sort({ createdAt: -1 })
//       .select("article_unique_id");

//     let nextNumber = 1;

//     if (lastArticle && lastArticle.article_unique_id) {
//       const parts = lastArticle.article_unique_id.split("-");
//       const lastNumber = parseInt(parts[parts.length - 1]);
//       if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
//     }

//     const formattedNumber = String(nextNumber).padStart(3, "0");
//     const newArticleId = `${prefix}-ARTI-${formattedNumber}`;

//     // Final safety check (avoid duplicate)
//     const exists = await Article.findOne({ article_unique_id: newArticleId });
//     if (exists) {
//       // Increment and retry once if conflict
//       const formattedRetry = String(nextNumber + 1).padStart(3, "0");
//       return `${prefix}-ARTI-${formattedRetry}`;
//     }

//     return newArticleId;
//   } catch (error) {
//     console.error("Error generating article ID:", error);
//     throw new Error("Failed to generate article ID");
//   }
// };

// Assumes Mongoose model: const Article = mongoose.model('Article', articleSchema);

const generateArticleId = async (companyId) => {
  try {
    if (!companyId) {
      throw new Error("Company ID is required to generate article ID");
    }

    // Extract 3-letter alpha prefix
    const alphaPrefix = companyId
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 3)
      .toUpperCase(); // "PHA"

    // Extract numeric code (first numeric run; pad to 2 digits). From "PHARMNOVA_01" -> "01"
    const numericMatch = companyId.match(/\d+/g);
    const companyCode = (numericMatch ? numericMatch.join("") : "")
      .slice(0, 2)
      .padStart(2, "0");

    // Build the static base (without the running number)
    const base = `${alphaPrefix}${companyCode}`; // "PHA01"

    // Find the last article with this base
    // Pattern: ^PHA01\d{7}$
    const regex = new RegExp(`^${base}\\d{7}$`);

    const lastArticle = await Article.findOne(
      { article_unique_id: regex },
      { article_unique_id: 1, createdAt: 1 },
    ).sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastArticle?.article_unique_id) {
      // Grab the last 7 digits and increment
      const last7 = lastArticle.article_unique_id.slice(-7);
      const parsed = parseInt(last7, 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
    }

    const running = String(nextNumber).padStart(7, "0");
    const newArticleId = `${base}${running}`; // "PHA010000001"

    // Simple uniqueness check (in case createdAt ordering is not perfect)
    const exists = await Article.findOne({ article_unique_id: newArticleId });
    if (exists) {
      const retry = String(nextNumber + 1).padStart(7, "0");
      return `${base}${retry}`;
    }

    return newArticleId;
  } catch (error) {
    console.error("Error generating article ID:", error);
    throw new Error("Failed to generate article ID");
  }
};

module.exports = { generateTicketId, generateArticleId };
