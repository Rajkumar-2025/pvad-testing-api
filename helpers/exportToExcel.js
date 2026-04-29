const ExcelJS = require("exceljs");

/**
 * Generic Excel export utility
 * Supports:
 *  - columns as string[]
 *  - columns as [{ header, key, width }]
 */
async function exportToExcel(
  res,
  { fileName, sheetName, columns = [], data = [], transformers = {} }
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  /* ---------------- NORMALIZE COLUMNS ---------------- */

  let normalizedColumns = [];

  // Case 1: No columns → auto-generate from data
  if (!columns || columns.length === 0) {
    if (data.length > 0) {
      normalizedColumns = Object.keys(data[0]).map((key) => ({
        header: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        key,
        width: 20,
      }));
    }
  }

  // Case 2: columns as string[]
  else if (typeof columns[0] === "string") {
    normalizedColumns = columns.map((key) => ({
      header: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      key,
      width: 20,
    }));
  }

  // Case 3: columns as object[]
  else {
    normalizedColumns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));
  }

  worksheet.columns = normalizedColumns;

  /* ---------------- ADD ROWS ---------------- */

  data.forEach((row) => {
    const formattedRow = {};

    normalizedColumns.forEach(({ key }) => {
      let value = row[key];
      if (transformers[key]) {
        value = transformers[key](value, row);
      }
      formattedRow[key] = value ?? "";
    });

    worksheet.addRow(formattedRow);
  });

  /* ---------------- HEADER STYLE ---------------- */

  if (normalizedColumns.length > 0) {
    worksheet.getRow(1).font = { bold: true };
  }

  /* ---------------- SEND FILE ---------------- */
  // console.log(fileName, "fileNamefileNamefileName");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = exportToExcel;
