const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* Common storage creator */
const createStorage = (folderPath) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      // console.log("📂 Multer destination called");
      // console.log("Folder path:", folderPath);

      const fullPath = path.join(process.cwd(), folderPath);
      // console.log("Resolved full path:", fullPath);

      fs.mkdirSync(fullPath, { recursive: true });
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });

/* Common file filter */
const excelCsvFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/octet-stream",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel or CSV files are allowed"));
  }
};

/* ===========================
   Product Upload
   =========================== */
const productUpload = multer({
  storage: createStorage("uploads/literatures/"),
  fileFilter: excelCsvFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

/* ===========================
   Literature Upload
   =========================== */
const literatureUpload = multer({
  storage: createStorage("uploads/literatures/"),
  // fileFilter: excelCsvFilter,
  // limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const createMultiUploadArray = ({
  folderPath = "uploads/company-products/",
  fieldName = "files",
  maxCount = 10,
  fileFilter = excelCsvFilter,
  limits = { fileSize: 5 * 1024 * 1024 }, // 5MB/file default
} = {}) => {
  const upload = multer({
    storage: createStorage(folderPath),
    fileFilter,
    limits,
  });

  // Returns middleware that expects multiple files in the same field
  return upload.array(fieldName, maxCount);
};

module.exports = {
  productUpload,
  literatureUpload,
  createMultiUploadArray,
};
