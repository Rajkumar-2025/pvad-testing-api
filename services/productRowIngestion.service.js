const XLSX = require("xlsx");
const fs = require("fs");
const mongoose = require("mongoose");

const ProductTemplateConfig = require("../model/productTemplateConfigSchema");
const CompanyProduct = require("../model/productSchema");

/**
 * Reads excel rows & inserts into company_product
 */
async function ingestProductRows({
  filePath,
  templateId,
  productUploadId,
  companyId,
  uploadedBy,
  remarks,
  uploadMode,
}) {
  // 1️⃣ Fetch template
  try {
    const template = await ProductTemplateConfig.findById(templateId).lean();

    if (!template || !template.mapping) {
      throw new Error("Template mapping not found");
    }

    const mapping = template.mapping;
    /**
     * mapping:
     * {
     *   product_name: "Product Name",
     *   generic_name: "Generic Name",
     *   approval_number: ""
     * }
     */

    // 2️⃣ Load workbook (memory efficient)
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      raw: false,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert sheet to JSON rows
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) return;

    // 3️⃣ Build column resolver (DSA)
    // header → fieldName
    const headerToField = new Map();
    for (const [field, headerName] of Object.entries(mapping)) {
      if (headerName) {
        headerToField.set(headerName.trim(), field);
      }
    }

    const bulkOps = [];

    for (const row of rows) {

      const doc = {
        upload_by_id: uploadedBy,
        template_id: templateId,
        product_upload_id: productUploadId,
        product_generic_name: "",
        company_id: companyId,
        remarks: remarks || "",
        status: 0,
        isDeleted: false,
      };

      for (const [header, value] of Object.entries(row)) {
        const normalizedHeader = header.trim();
        const fieldName = headerToField.get(normalizedHeader);

        if (fieldName) {
          doc[fieldName] = typeof value === "string" ? value.trim() : value;
        }
      }
      doc.product_generic_name = doc.generic_name || ""; // Ensure the field exists
      doc.product_name = doc.product_name || ""; // Ensure the field exists
      doc.approval_number = doc.approval_number || ""; // Ensure the field exists
      // ✅ Mandatory column check
    //   console.log(doc, "-------doc");
      if (!doc.product_generic_name) continue;
      bulkOps.push({ insertOne: { document: doc } });
    }

    if (!bulkOps.length) return;
    // console.log(bulkOps, "Bulk operations prepared for product ingestion");
    // 4️⃣ EXISTING mode → deactivate old rows
    // if (uploadMode === "EXISTING") {
    //   await CompanyProduct.updateMany(
    //     {
    //       company_id: companyId,
    //       template_id: templateId,
    //       product_upload_id: { $ne: productUploadId },
    //       status: 0,
    //     },
    //     { $set: { status: 1 } },
    //   );
    // }

    // 5️⃣ Bulk insert (fast, safe)
    await CompanyProduct.bulkWrite(bulkOps, { ordered: false });
  } catch (error) {
    console.log(error, "Error in ingesting product rows");
  }
}

module.exports = {
  ingestProductRows,
};
