const mongoose = require("mongoose");
const UsersCollection = mongoose.model("user");
const ProductCollection = require("../model/productSchema");
const ReviewSettingCollection = require("../model/reviewSettingSchema");
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const queryHelper = require("../helpers/query");
const bcrypt = require("bcrypt");
const statusCode = require("../helpers/statusCode");
const jwt = require("jsonwebtoken");
const sendMail = require("../helpers/sendMail");
const {
  logUserActivity,
  logAdminActivity,
  logLiteratureActivity,
} = require("../helpers/logsHelper");
const handleError = require("../helpers/errorHandler");
const { buildQuery } = require("../helpers/queryBuilder");

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const csvParser = require("csv-parser");
const crypto = require("crypto");

const ProductTemplateMappingCollection = require("../model/productTemplateConfigSchema");
const CompanyProductListCollection = require("../model/companyProductListSchema");
const productFileUploadCollection = require("../model/productUploadSchema");
const {
  ingestProductRows,
} = require("../services/productRowIngestion.service");
async function generateDrugMasterExcel({ files, companyId, mongoId, userId }) {
  try {
    const axios = require("axios");
    const FormData = require("form-data");
    const fs = require("fs");
    const path = require("path");

    const companyRecord = await CompanyProductListCollection.findById(mongoId, {
      product_files: 1,
    }).lean();

    if (!companyRecord) {
      throw new Error("Company product record not found");
    }

    const fileNames = files.map((f) => f.filename);

    const matchedFiles = companyRecord.product_files.filter((pf) =>
      fileNames.includes(pf.db_file_name),
    );

    const templateIds = [
      ...new Set(matchedFiles.map((f) => f.template_id.toString())),
    ];

    const templates = await ProductTemplateMappingCollection.find(
      {
        _id: { $in: templateIds },
        isDeleted: false,
      },
      { mapping: 1 },
    ).lean();

    const templateMap = {};
    templates.forEach((t) => {
      templateMap[t._id.toString()] = t.mapping;
    });

    const fileMetadata = {};

    matchedFiles.forEach((f) => {
      const mapping = templateMap[f.template_id.toString()] || {};

      fileMetadata[f.db_file_name] = {
        template_id: f.template_id,
        generic_name: mapping.generic_name || null,
        version: f.version,
      };
    });

    const formData = new FormData();

    matchedFiles.forEach((file) => {
      const filePath = path.join(
        __dirname,
        "../uploads/company-products/",
        file.db_file_name,
      );

      if (fs.existsSync(filePath)) {
        formData.append(
          "files",
          fs.createReadStream(filePath),
          file.db_file_name,
        );
      }
    });

    formData.append("company_id", companyId);
    formData.append("uploaded_by", userId.toString());
    formData.append("mongo_id", mongoId.toString());

    // 🔥 dynamic per-file metadata
    formData.append("file_metadata", JSON.stringify(fileMetadata));
    console.log(
      `${process.env.PYTHON_API_URL}/create-drug-master-list`,
      "-----------------fileMetadata------------------",
    );
    // return;
    const response = await axios.post(
      `${process.env.PYTHON_API_URL}/create-drug-master-list/`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    const { file_name, download_path } = response.data;

    // await CompanyProductListCollection.updateOne(
    //   { _id: mongoId },
    //   {
    //     $set: {
    //       "drug_master_lists.$[].isActive": false,
    //     },
    //   },
    // );

    // await CompanyProductListCollection.updateOne(
    //   { _id: mongoId },
    //   {
    //     $push: {
    //       drug_master_lists: {
    //         file_name,
    //         download_path,
    //         isActive: true,
    //         created_on: new Date(),
    //       },
    //     },
    //   },
    // );

    return { file_name, download_path };
  } catch (error) {
    console.error("Drug master Excel generation failed:", error.message);
  }
}

class literatureProductController {
  //       Product contollers starts here

  async createProduct(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      console.log(userId, comp_id, "userId, comp_iduserId, comp_id");
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find user" });
      }
      // const existingProduct = await ProductCollection.findOne({
      //   company_id: comp_id,
      //   product_generic_name: bData.product_generic_name,
      // });
      // if (existingProduct) {
      //   return res.status(statusCode.FORBIDDEN).send({
      //     status: false,
      //     message: "Product generic name already taken",
      //   });
      // }
      let productCategoryCode;
      if (bData.product_category == "Drug") {
        productCategoryCode = 1;
      } else if (bData.product_category == "Medical Device") {
        productCategoryCode = 2;
      } else if (bData.product_category == "Vaccine") {
        productCategoryCode = 3;
      } else if (bData.product_category == "Cosmetic") {
        productCategoryCode = 4;
      } else {
        productCategoryCode = 5;
      }
      bData.company_id = comp_id;
      bData.created_user_id = userId;
      bData.product_category_code = productCategoryCode;
      let addProduct = await queryHelper.insertData(ProductCollection, bData);

      if (addProduct.status) {
        await logAdminActivity(
          userId,
          "CREATE_PRODUCT",
          addProduct.msg._id,
          `Admin ${user.username} create a product ${bData.product_generic_name}`,
        );
        return res.status(statusCode.CREATED).send({
          status: addProduct.status,
          data: addProduct.msg,
          message: "Product added successfully...",
        });
      } else {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: addProduct.status, message: addProduct.msg });
      }
    } catch (err) {
      return handleError(res, err, "createProduct error");
    }
  }
  async productUpload(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      if (!req.file) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Kindly upload the file" });
      }

      const filePath = req.file.path;
      const ext = path.extname(filePath).toLowerCase();
      let data = [];

      if (ext === ".csv") {
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row) => data.push(row))
            .on("end", resolve)
            .on("error", reject);
        });
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      } else {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Unsupported file type" });
      }

      if (!data.length) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "File is empty or invalid" });
      }

      //=============Duplicate find code starts===========//

      // const seen = new Set();
      // const duplicatesInFile = new Set();

      // for (const row of data) {
      //   if (!row.product_generic_name) continue;
      //   const name = row.product_generic_name.trim().toLowerCase();
      //   if (seen.has(name)) duplicatesInFile.add(row.product_generic_name);
      //   else seen.add(name);
      // }

      // if (duplicatesInFile.size > 0) {
      //   return res.status(statusCode.BAD_REQUEST).send({
      //     status: false,
      //     message: `Duplicate product_generic_name(s) in file: ${[
      //       ...duplicatesInFile,
      //     ].join(", ")}`,
      //   });
      // }

      // const productNames = Array.from(seen);
      // const existingProducts = await ProductCollection.find({
      //   company_id: comp_id,
      //   product_generic_name: { $in: productNames },
      // }).select("product_generic_name");

      // if (existingProducts.length > 0) {
      //   const existingNames = existingProducts.map(
      //     (p) => p.product_generic_name
      //   );
      //   return res.status(statusCode.BAD_REQUEST).send({
      //     status: false,
      //     message: `These product_generic_name(s) already exist: ${existingNames.join(
      //       ", "
      //     )}`,
      //   });
      // }

      //=============Duplicate find code ends===========//

      const bData = data.map((row) => ({
        ...row,
        company_id: comp_id,
        created_user_id: userId,
      }));

      const addProduct = await queryHelper.insertData(ProductCollection, bData);

      await logAdminActivity(
        userId,
        "UPLOAD_PRODUCTS",
        null,
        `Admin ${user.username} upload a product file. Filename : ${req.file.originalname}`,
      );

      return res.status(statusCode.OK).send({
        status: true,
        message: "Products uploaded successfully",
        insertedCount: addProduct.insertedCount || bData.length,
      });
    } catch (error) {
      console.log(error, "---------error");
      return handleError(res, error, "productUpload error");
    }
  }

  async getProducts(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user)
        return res
          .status(403)
          .send({ status: false, message: "Cannot find user" });

      const { query, page, limit, sort } = buildQuery(
        req.query,
        user,
        {
          company_id: comp_id,
          isDeleted: false,
        },
        1, // chage the api type
      );
      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      const totalCount = await ProductCollection.countDocuments(query);

      const products = await ProductCollection.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("created_user_id", "username email role");

      return res.status(statusCode.OK).send({
        status: true,
        data: { products, totalCount },
        message: "Fetched successfully",
      });
    } catch (error) {
      return handleError(res, error, "getProducts error");
    }
  }

  async getProductGenericName(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        // role: 1,
      });
      if (!user)
        return res
          .status(403)
          .send({ status: false, message: "Cannot find admin" });
      let productData = await ProductCollection.find(
        {
          company_id: comp_id,
          status: 0,
          isDeleted: false,
        },
        {
          created_user_id: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      );
      // console.log(productData, "------------productData");
      return res.status(statusCode.OK).send({
        status: true,
        data: productData,
        message: "Fetched successfully",
      });
    } catch (error) {
      return handleError(res, error, "get Product Generic Name error");
    }
  }

  async editProduct(req, res) {
    try {
      let bData = req.body;
      const { id } = req.params; // product ID
      const { userId, comp_id } = res.locals.user;

      // Check for valid user
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find admin" });
      }

      // Check if product exists
      const existingProduct = await ProductCollection.findOne({
        _id: id,
        company_id: comp_id,
      });
      if (!existingProduct) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Product not found" });
      }

      // Check for duplicate generic name (if user changes it)
      // const duplicateProduct = await ProductCollection.findOne({
      //   company_id: comp_id,
      //   product_generic_name: bData.product_generic_name,
      //   _id: { $ne: id },
      // });
      // if (duplicateProduct) {
      //   return res.status(statusCode.FORBIDDEN).send({
      //     status: false,
      //     message: "Product generic name already taken",
      //   });
      // }

      // Determine product category code
      let productCategoryCode;
      switch (bData.product_category) {
        case "Drug":
          productCategoryCode = 1;
          break;
        case "Medical Device":
          productCategoryCode = 2;
          break;
        case "Vaccine":
          productCategoryCode = 3;
          break;
        case "Cosmetic":
          productCategoryCode = 4;
          break;
        default:
          productCategoryCode = 5;
      }

      // Prepare update data
      bData.updated_user_id = userId;
      bData.product_category_code = productCategoryCode;

      const updateResult = await ProductCollection.findOneAndUpdate(
        { _id: id, company_id: comp_id },
        { $set: bData },
        { new: true },
      );

      if (updateResult) {
        // Log admin activity
        await logAdminActivity(
          userId,
          "EDIT_PRODUCT",
          id,
          `Admin ${user.username} edited product ${bData.product_generic_name}`,
        );

        return res.status(statusCode.OK).send({
          status: true,
          data: updateResult,
          message: "Product updated successfully...",
        });
      } else {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: updateResult.msg });
      }
    } catch (err) {
      console.log(err, "something went wrong...");
      return handleError(res, err, "editProduct error");
    }
  }

  //       Product contollers end here

  //       Review Strategy contollers start here
  async createReviewStrategy(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find admin" });
      }
      bData.created_user_id = userId;
      bData.company_id = comp_id;
      // const addReviewStrategy = await queryHelper.insertData(
      //   ReviewSettingCollection,
      //   bData
      // );
      // // console.log(bData, "bData");
      // if (!addReviewStrategy.status) {
      //   return res.status(statusCode.BAD_REQUEST).send({
      //     status: false,
      //     message: addReviewStrategy.msg,
      //   });
      // }
      // return res.status(statusCode.OK).send({
      //   status: true,
      //   message: "Strategy saved successfully",
      //   data: addReviewStrategy.msg,
      // });
    } catch (error) {
      return handleError(res, error, "create Review Strategy error");
    }
  }
  async getReviewStrategy(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user)
        return res
          .status(403)
          .send({ status: false, message: "Cannot find user" });

      const { query, page, limit } = buildQuery(
        req.query,
        user,
        {
          company_id: comp_id,
          isDeleted: false,
        },
        1,
      );
      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      const totalCount = await ReviewSettingCollection.countDocuments(query);
      console.log(query, "---------query");
      const strategies = await ReviewSettingCollection.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("created_user_id", "username email role");

      return res.status(statusCode.OK).send({
        status: true,
        data: { strategies, totalCount },
        message: "Fetched successfully",
      });
    } catch (error) {
      return handleError(res, error, "get review strategy error");
    }
  }
  async editStrategy(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      const strategyId = req.params.id;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find admin" });
      }
      const existingStrategy = await ReviewSettingCollection.findOne({
        _id: strategyId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!existingStrategy) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Strategy not found" });
      }

      let updateData = {
        review_setting_id: bData.review_setting_id,
        source: bData.source,
        other_source: bData.other_source || "",
        input_method: bData.input_method,
        frequency_type: bData.frequency_type,
        status: bData.status,
        updatedAt: new Date(),
      };

      if (Array.isArray(bData.generic_names)) {
        updateData.generic_names = bData.generic_names.map((item) => ({
          product_generic_name: item.product_generic_name,
          product_generic_id: item.product_generic_id
            ? item.product_generic_id
            : null,
          brand_name: item.brand_name || "",
          synonym_name: item.synonym_name || "",
        }));
      }

      const updatedStrategy = await ReviewSettingCollection.findOneAndUpdate(
        { _id: strategyId, company_id: comp_id },
        { $set: updateData },
        { new: true },
      );

      return res.status(statusCode.OK).send({
        status: true,
        message: "Review strategy updated successfully",
        data: updatedStrategy,
      });
    } catch (error) {
      return handleError(res, error, "editStrategy error");
    }
  }
  async getManualStrategies(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find user" });
      }
      const reviewStrategies = await ReviewSettingCollection.find(
        {
          company_id: comp_id,
          isDeleted: false,
          status: 0,
          input_method: "Manual",
        },
        {
          review_setting_id: 1,
          generic_names: 1,
          search_engine: 1,
        },
      );
      if (!reviewStrategies) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Strategy not found" });
      }
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: reviewStrategies,
      });
    } catch (error) {
      return handleError(res, error, "getManualStrategies error");
    }
  }
  async getSelectedStrategy(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      let strategyId = req.params.id;
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find user" });
      }
      const selectedReviewStrategy = await ReviewSettingCollection.findOne(
        {
          _id: strategyId,
          company_id: comp_id,
          isDeleted: false,
          status: 0,
          input_method: "Manual",
        },
        {
          review_setting_id: 1,
          generic_names: 1,
          search_engine: 1,
          other_source: 1,
          remarks: 1,
        },
      );
      if (!selectedReviewStrategy) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Strategy not found" });
      }
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully sss",
        data: selectedReviewStrategy,
      });
    } catch (error) {
      return handleError(res, error, "getSelectedStrategy error");
    }
  }

  // =================== Product template mapping starts =================//
  async productTemplateMapping(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const { mapping, remarks, status, name_of_the_file } = req.body;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      if (!mapping) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "mapping are required",
        });
      }

      // /* ---------------------------------
      //             CHECK DUPLICATE
      // ----------------------------------*/
      // let existing;

      // if (other_source) {
      //   existing = await ProductTemplateMapping.findOne({
      //     company_id: comp_id,
      //     isDeleted: false,
      //   });
      // } else {
      //   existing = await ProductTemplateMapping.findOne({
      //     company_id: comp_id,
      //     isDeleted: false,
      //   });
      // }
      // if (existing) {
      //   return res.status(statusCode.BAD_REQUEST).json({
      //     status: false,
      //     message: `Template mapping already exists`,
      //     data: existing,
      //   });
      // }

      /* ---------------------------------
              CREATE NEW
      ----------------------------------*/
      const setting = new ProductTemplateMappingCollection({
        name_of_the_file,
        company_id: comp_id,
        remarks,
        status,
        currentVersion: 1.0,
        mapping,
        createdBy: userId,
      });

      await setting.save();
      await logAdminActivity(
        userId,
        "CREATE_PRODUCT_MAPPING",
        setting._id,
        `Admin ${adminUser.username} create a product template ${name_of_the_file}`,
      );

      return res.status(statusCode.CREATED).json({
        status: true,
        message: "Template mapping created successfully",
        data: setting,
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.company_id) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "Product template mapping already exists for this company",
        });
      }

      return handleError(res, error, "productTemplateMapping error");
    }
  }
  async getProductTemplateMapping(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      // Optional: role check if needed
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!user) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Unauthorized access",
        });
      }
      const { query, page, limit, sort } = buildQuery(
        req.query,
        user,
        {
          company_id: comp_id,
          isDeleted: false,
        },
        1,
      );

      // SPECIAL CASE: createdBy text search
      if (req.query.searchField === "createdBy" && req.query.search) {
        // Instead of regex on ObjectId, map to matching user IDs
        const regex = new RegExp(req.query.search, "i");
        const matchingUsers = await UsersCollection.find(
          {
            company_id: comp_id,
            isDeleted: false,
            $or: [{ username: regex }, { email: regex }],
          },
          { _id: 1 },
        ).lean();

        const ids = matchingUsers.map((u) => u._id);

        // If nothing matches, short-circuit to empty result (avoid full scan)
        if (ids.length === 0) {
          return res.status(200).send({
            status: true,
            message: "Fetched successfully",
            data: { templates: [], totalCount: 0 },
          });
        }

        // Override any accidental regex on createdBy from buildQuery
        query.createdBy = { $in: ids };
      }

      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      /* ---------------------------------
             Total Count
          ----------------------------------*/
      const totalCount =
        await ProductTemplateMappingCollection.countDocuments(query);
      console.log(query, "queryqueryquery");
      /* ---------------------------------
             Fetch Records
          ----------------------------------*/
      const templates = await ProductTemplateMappingCollection.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "username email role");

      /* ---------------------------------
             Response
          ----------------------------------*/
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: {
          templates,
          totalCount,
        },
      });
    } catch (error) {
      console.error("getProductTemplateMapping error", error);
      return handleError(res, error, "getProductTemplateMapping error");
    }
  }
  async updateProductTemplateSetting(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      const { mapping, remarks, status, name_of_the_file } = req.body;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      /* -----------------------------
         Validation
      ------------------------------*/
      if (!mapping) {
        return res.status(statusCode.NOT_FOUND).json({
          status: false,
          message: "Mapping are required",
        });
      }

      /* -----------------------------
         Find Existing Setting
      ------------------------------*/
      const setting = await ProductTemplateMappingCollection.findOne({
        company_id: comp_id,
        name_of_the_file,
        isDeleted: false,
      });

      if (!setting) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "Template setting not found",
        });
      }

      /* -----------------------------
         Update Fields
      ------------------------------*/
      setting.mapping = mapping;
      setting.remarks = remarks ?? setting.remarks;
      setting.status = status ?? setting.status;
      // Increment version
      setting.currentVersion = (setting.currentVersion || 1) + 1;

      setting.createdBy = userId; // track last editor
      console.log(setting, "--------setting");
      await setting.save();
      await logAdminActivity(
        userId,
        "UPDATE_MAPPING",
        setting._id,
        `Admin ${adminUser.username} update a template ${name_of_the_file}`,
      );

      return res.status(statusCode.OK).json({
        status: true,
        message: "Template setting updated successfully",
        data: setting,
      });
    } catch (error) {
      console.log(error, "error");
      if (error.code === 11000) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Template setting already exists for this name",
        });
      }
      return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Server error",
      });
    }
  }

  //================= Product files upload APIs ==========================//
  async getActiveTemplates(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user)
        return res
          .status(403)
          .send({ status: false, message: "Cannot find user" });
      const activeTemplates = await ProductTemplateMappingCollection.find({
        company_id: comp_id,
        status: 0,
      }).populate("createdBy", "username email role");

      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: activeTemplates,
      });
    } catch (error) {
      return handleError(res, error, "getCompanyProductList error");
    }
  }

  async uploadCompanyProduct(req, res) {
    try {
      // const { userId, comp_id } = res.locals.user;

      // if (!req.files || !req.files.length) {
      //   return res.status(statusCode.BAD_REQUEST).json({
      //     status: false,
      //     message: "Kindly upload the files",
      //   });
      // }

      // const adminUser = await UsersCollection.findOne({
      //   _id: userId,
      //   role: 1,
      // });

      // if (!adminUser) {
      //   return res.status(statusCode.FORBIDDEN).json({
      //     status: false,
      //     message: "Cannot find admin",
      //   });
      // }

      // const meta = req.body.meta.map((m) => JSON.parse(m));

      // // Find existing company document
      // // let companyRecord = await productFileUploadCollection.findOne({
      // //   company_id: comp_id,
      // // });
      // // console.log(req.files, "req.filesreq.filesreq.files", req.body.meta);
      // // return;
      // // Prepare product_files payload

      // const uploadPayload = [];

      // for (let i = 0; i < req.files.length; i++) {
      //   const file = req.files[i];
      //   const { template_id, upload_mode } = meta[i];

      //   // Find latest active record
      //   const lastActive = await productFileUploadCollection
      //     .findOne({
      //       company_id: comp_id,
      //       template_id,
      //       status: 0,
      //     })
      //     .sort({ createdAt: -1 });

      //   // Deactivate previous versions
      //   await productFileUploadCollection.updateMany(
      //     { company_id: comp_id, template_id, status: 0 },
      //     { $set: { status: 1 } },
      //   );

      //   // Version increment logic

      //   // version calculation
      //   let major = 1;
      //   let minor = 0;

      //   if (lastActive?.version) {
      //     const [m, n] = lastActive.version.split(".").map(Number);
      //     major = m;
      //     minor = n;
      //   }

      //   if (upload_mode === "NEW") {
      //     major += 1;
      //     minor = 0;
      //   } else if (upload_mode === "EXISTING") {
      //     minor += 1;
      //   } else {
      //     major = 1;
      //     minor = 0;
      //   }

      //   const newVersion = `${major}.${minor}`;

      //   uploadPayload.push({
      //     company_id: comp_id,
      //     template_id,
      //     original_file_name: file.originalname,
      //     db_file_name: file.filename,
      //     uploaded_by: userId,
      //     version: newVersion,
      //     status: 0,
      //   });
      // }
      // const savedFiles =
      //   await productFileUploadCollection.insertMany(uploadPayload);
      // // console.log(savedFiles, "uploadPayloaduploadPayload");
      // // return;
      // // First-time upload → create doc
      // // if (!companyRecord) {
      // //   companyRecord = await CompanyProductListCollection.create({
      // //     company_id: comp_id,
      // //     product_files: productFiles,
      // //     drug_master_lists: [],
      // //   });
      // // }
      // // // Subsequent upload → push to array
      // // else {
      // //   companyRecord.product_files.push(...productFiles);
      // //   await companyRecord.save();
      // // }
      // // await CompanyProductListCollection.updateOne(
      // //   { _id: companyRecord._id },
      // //   { $set: { "drug_master_lists.$[].isActive": false } },
      // // );

      // // let pythonResponse = await generateDrugMasterExcel({
      // //   files: productFiles.map((f) => ({
      // //     filename: f.db_file_name,
      // //   })),
      // //   companyId: comp_id,
      // //   mongoId: companyRecord._id,
      // //   userId,
      // // });

      // // await logAdminActivity(
      // //   userId,
      // //   "UPLOAD_COMPANY_PRODUCT_FILES",
      // //   companyRecord._id,
      // //   `Admin ${adminUser.username} uploaded ${req.files.length} product file(s)`,
      // // );

      // return res.status(statusCode.CREATED).json({
      //   status: true,
      //   message: "Files uploaded successfully. Drug master generation started.",
      //   data: {
      //     company_id: comp_id,
      //     uploadedFiles: uploadPayload,
      //   },
      //   // files: pythonResponse,
      // });

      const { userId, comp_id } = res.locals.user;

      // ---------- FILE VALIDATION ----------
      if (!req.files || !req.files.length) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "Kindly upload the files",
        });
      }

      // ---------- ADMIN CHECK ----------
      const adminUser = await UsersCollection.findOne({
        _id: userId,
        role: 1,
      });

      if (!adminUser) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Cannot find admin",
        });
      }

      // ---------- META PARSE ----------
      let meta;
      try {
        meta = req.body.meta.map((m) => JSON.parse(m));
      } catch (err) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "Invalid meta format",
        });
      }

      const uploadPayload = [];

      // ---------- LOOP FILES ----------
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const { template_id, upload_mode } = meta[i];

        if (!template_id) {
          fs.unlinkSync(file.path);
          return res.status(statusCode.BAD_REQUEST).json({
            status: false,
            message: "Template ID is missing",
          });
        }

        // ---------- FILE HASH (SHA‑256) ----------
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto
          .createHash("sha256")
          .update(fileBuffer)
          .digest("hex");

        // ---------- DUPLICATE CHECK ----------
        const duplicate = await productFileUploadCollection.findOne({
          company_id: comp_id,
          template_id,
          file_hash: fileHash,
        });

        if (duplicate) {
          const { overrideDuplicate } = meta[i];

          // ❌ No override → ask frontend to confirm
          if (!overrideDuplicate) {
            fs.unlinkSync(file.path);

            return res.status(statusCode.CONFLICT).json({
              status: false,
              errorCode: "DUPLICATE_FILE",
              message:
                "Exact duplicate file detected. Do you want to submit anyway?",
              duplicate: {
                template_id,
                original_file_name: file.originalname,
                existing_version: duplicate.version,
                uploaded_on: duplicate.createdAt,
              },
            });
          }

          // //  Override requested → validate password
          // if (!password) {
          //   fs.unlinkSync(file.path);
          //   return res.status(statusCode.UNAUTHORIZED).json({
          //     status: false,
          //     message: "Password is required to override duplicate upload",
          //   });
          // }

          // const isPasswordValid = await bcrypt.compare(
          //   password,
          //   adminUser.password,
          // );

          // if (!isPasswordValid) {
          //   fs.unlinkSync(file.path);
          //   return res.status(statusCode.UNAUTHORIZED).json({
          //     status: false,
          //     message: "Invalid password. Duplicate override denied",
          //   });
          // }
        }

        // ---------- FIND LAST ACTIVE ----------
        const lastActive = await productFileUploadCollection
          .findOne({
            company_id: comp_id,
            template_id,
            status: 0,
          })
          .sort({ createdAt: -1 });

        // ---------- VERSION LOGIC ----------
        let major = 1;
        let minor = 0;

        if (lastActive?.version) {
          const [m, n] = lastActive.version.split(".").map(Number);
          major = m;
          minor = n;
        }

        if (upload_mode === "NEW") {
          major += 1;
          minor = 0;
        } else if (upload_mode === "EXISTING") {
          minor += 1;
        }

        const newVersion = `${major}.${minor}`;

        // ---------- DEACTIVATE OLD ----------
        await productFileUploadCollection.updateMany(
          { company_id: comp_id, template_id, status: 0 },
          { $set: { status: 1 } },
        );

        // ---------- BUILD PAYLOAD ----------
        uploadPayload.push({
          company_id: comp_id,
          template_id,
          original_file_name: file.originalname,
          db_file_name: file.filename,
          uploaded_by: userId,
          version: newVersion,
          status: 0,
          file_hash: fileHash,
          remarks: meta[i].remarks || "",
          duplicate_justification: meta[i].duplicate_justification || "",
        });
      }

      // ---------- INSERT ----------
      if (!uploadPayload.length) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "No valid files to upload",
        });
      }
      // console.log(uploadPayload, "uploadPayloaduploadPayload");
      let uploadedData =
        await productFileUploadCollection.insertMany(uploadPayload);
      // console.log(uploadedData, "uploadPayload");
      for (let i = 0; i < uploadedData.length; i++) {
        const payload = uploadedData[i];
        const file = req.files[i];
        const metaItem = meta[i];

        await ingestProductRows({
          filePath: file.path,
          templateId: payload.template_id,
          productUploadId: payload._id,
          companyId: payload.company_id,
          uploadedBy: userId,
          remarks: payload.remarks,
          uploadMode: metaItem.upload_mode,
        });
      }

      return res.status(statusCode.CREATED).json({
        status: true,
        message:
          "Files uploaded successfully. Drug master generation has started.",
        data: {
          company_id: comp_id,
          uploadedFiles: uploadPayload,
        },
      });
    } catch (error) {
      return handleError(res, error, "uploadCompanyProduct error");
    }
  }
  // async getCompanyProductList(req, res) {
  //   try {
  //     const { userId, comp_id } = res.locals.user;
  //     let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
  //     if (!adminUser) {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: false, message: "Cannot found admin" });
  //     }
  //     // ================== (Show Only Latest Files) ==========================//
  //     // const companyProductList = await CompanyProductListCollection.aggregate([
  //     //   { $match: { company_id: comp_id } },
  //     //   {
  //     //     $project: {
  //     //       company_id: 1,
  //     //       product_files: {
  //     //         $filter: {
  //     //           input: "$product_files",
  //     //           as: "file",
  //     //           cond: { $eq: ["$$file.isActive", true] },
  //     //         },
  //     //       },
  //     //     },
  //     //   },
  //     // ]);

  //     const companyProductList = await CompanyProductListCollection.find({
  //       company_id: comp_id,
  //     })
  //       .populate({
  //         path: "product_files.template_id",
  //         select: "name_of_the_file",
  //       })
  //       .populate({
  //         path: "product_files.uploaded_by",
  //         select: "username",
  //       })
  //       .lean();
  //     const recordsWithDownload = companyProductList.map((company) => ({
  //       ...company,
  //       product_files: company.product_files.map((file) => ({
  //         ...file,
  //         download_link: `${process.env.BASE_URL}/get/company-product-file/${file.db_file_name}`,
  //       })),
  //     }));
  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       data: recordsWithDownload,
  //     });
  //   } catch (error) {
  //     return handleError(res, error, "getCompanyProductList error");
  //   }
  // }
  async getCompanyProductList(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      /* ---------------------------
       Auth Check
    ----------------------------*/
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!user) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Unauthorized access",
        });
      }

      /* ---------------------------
       Pagination Params
    ----------------------------*/
      const { query, page, limit, sort } = buildQuery(
        req.query,
        user,
        {
          company_id: comp_id,
          // isDeleted: false,
        },
        1,
      );
      // SPECIAL CASE: createdBy text search
      if (req.query.searchField === "uploaded_by" && req.query.search) {
        // Instead of regex on ObjectId, map to matching user IDs
        const regex = new RegExp(req.query.search, "i");
        const matchingUsers = await UsersCollection.find(
          {
            company_id: comp_id,
            isDeleted: false,
            $or: [{ username: regex }, { email: regex }],
          },
          { _id: 1 },
        ).lean();

        const ids = matchingUsers.map((u) => u._id);

        // If nothing matches, short-circuit to empty result (avoid full scan)
        if (ids.length === 0) {
          return res.status(200).send({
            status: true,
            message: "Fetched successfully",
            data: { productList: [], totalCount: 0 },
          });
        }

        // Override any accidental regex on createdBy from buildQuery
        query.uploaded_by = { $in: ids };
      }
      if (req.query.searchField === "template_id" && req.query.search) {
        // Instead of regex on ObjectId, map to matching user IDs
        const regex = new RegExp(req.query.search, "i");
        const matchingUsers = await ProductTemplateMappingCollection.find(
          {
            company_id: comp_id,
            isDeleted: false,
            $or: [{ name_of_the_file: regex }],
          },
          { _id: 1 },
        ).lean();

        const ids = matchingUsers.map((u) => u._id);

        // If nothing matches, short-circuit to empty result (avoid full scan)
        if (ids.length === 0) {
          return res.status(200).send({
            status: true,
            message: "Fetched successfully",
            data: { productList: [], totalCount: 0 },
          });
        }

        // Override any accidental regex on createdBy from buildQuery
        query.template_id = { $in: ids };
      }

      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      /* ---------------------------------
             Total Count
          ----------------------------------*/
      const totalCount =
        await productFileUploadCollection.countDocuments(query);

      const hasClientSort = Boolean(req.query.sortField && req.query.sortOrder);

      const finalSort = hasClientSort
        ? sort
        : {
            status: 1, // Active first
            createdAt: -1, // Latest first
          };

      /* ---------------------------------
             Fetch Records
          ----------------------------------*/
      const productList = await productFileUploadCollection
        .find(query)
        .sort(finalSort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("uploaded_by", "username email role")
        .populate("template_id", "name_of_the_file");

      /* ---------------------------------
      /* ---------------------------
       Response
    ----------------------------*/
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: {
          productList,
          totalCount,
        },
      });
    } catch (error) {
      console.log(error, "getCompanyProductList error");
      return handleError(res, error, "getCompanyProductList error");
    }
  }
  //  No need this functions, we can directly use uploadCompanyProduct for both create and update
  async updateCompanyProductList(req, res) {
    try {
      const { product_file_id, template_id, mode } = req.body;
      const uploadedFile = req.files[0];
      const { userId, comp_id } = res.locals.user;

      if (!uploadedFile) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "File is required",
        });
      }

      if (!["NEW", "EXISTING"].includes(mode)) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Invalid mode",
        });
      }

      // Find company record containing this file
      const companyRecord = await CompanyProductListCollection.findOne({
        "product_files._id": product_file_id,
      });

      if (!companyRecord) {
        return res.status(statusCode.NOT_FOUND).json({
          status: false,
          message: "Product file record not found",
        });
      }

      //Get existing file
      const existingFile = companyRecord.product_files.id(product_file_id);

      if (!existingFile) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "File not found",
        });
      }
      const parseVersion = (version) => {
        const [major = "0", minor = "0"] = version.split(".");
        return {
          major: parseInt(major, 10),
          minor: parseInt(minor, 10),
        };
      };
      const compareVersions = (a, b) => {
        const v1 = parseVersion(a);
        const v2 = parseVersion(b);

        if (v1.major !== v2.major) {
          return v1.major - v2.major;
        }
        return v1.minor - v2.minor;
      };
      const getNextVersion = (currentVersion, mode) => {
        const { major, minor } = parseVersion(currentVersion);

        if (mode === "NEW") {
          return `${major + 1}.0`;
        }

        // EXISTING
        return `${major}.${minor + 1}`;
      };
      const sameTemplateFiles = companyRecord.product_files.filter(
        (f) => f.template_id.toString() === template_id.toString(),
      );

      let latestVersion = "0.0";

      if (sameTemplateFiles.length > 0) {
        latestVersion = sameTemplateFiles
          .map((f) => f.version)
          .sort(compareVersions)
          .pop();
      }
      const newVersion = getNextVersion(latestVersion, mode);

      // deactivate all previous versions
      sameTemplateFiles.forEach((f) => {
        f.isActive = false;
      });

      // push new version entry
      // companyRecord.product_files.push({
      //   template_id,
      //   original_file_name: uploadedFile.originalname,
      //   db_file_name: uploadedFile.filename,
      //   version: newVersion,
      //   uploaded_by: userId,
      //   isActive: true,
      //   created_on: new Date(),
      // });
      companyRecord.product_files.push({
        template_id,
        original_file_name: uploadedFile.originalname,
        db_file_name: uploadedFile.filename,
        version: newVersion,
        uploaded_by: userId,
        isActive: true,
        created_on: new Date(),
        updated_on: new Date(),
      });
      await companyRecord.save();
      let pythonResposne = await generateDrugMasterExcel({
        files: req.files,
        companyId: comp_id,
        mongoId: companyRecord._id,
        userId,
      });
      return res.status(statusCode.OK).json({
        status: true,
        message: "File uploaded successfully. Excel generation started.",
        version: newVersion,
        files: pythonResposne,
      });
    } catch (error) {
      return handleError(res, error, "updateCompanyProductList error");
    }
  }
  async getDrugMasterLists(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const record = await CompanyProductListCollection.findOne({
        company_id: comp_id,
      });

      const active = record.drug_master_lists.find((d) => d.isActive);
      if (!record) {
        return res.status(200).json({
          status: true,
          drugMaster: {
            status: false,
            active: null,
            history: [],
          },
        });
      }
      res.status(200).json({
        status: true,
        drugMaster: {
          status: Boolean(active),
          active: active || null,
          history: record.drug_master_lists || [],
        },
        // productList,
        // totalCount,
      });
    } catch (error) {
      console.error("getDrugMasterLists error", error);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }
  // =====================================================================
  async getCompanyProductAuditLogs(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const { id } = req.params;
      const adminUser = await UsersCollection.findOne({
        _id: userId,
        role: 1,
      });

      if (!adminUser) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Cannot find admin",
        });
      }

      const logs = await productFileUploadCollection
        .find({
          company_id: comp_id,
          template_id: id,
        })
        .populate("uploaded_by", "username email role");
      return res.status(statusCode.OK).json({
        status: true,
        data: logs,
      });
    } catch (error) {
      return handleError(res, error, "getCompanyProductAuditLogs error");
    }
  }
}
module.exports = new literatureProductController();
