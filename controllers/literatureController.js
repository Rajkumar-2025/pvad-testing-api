const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const UsersCollection = mongoose.model("user");
const { ObjectId } = require("mongodb");
const LiteratureCollection = require("../model/LiteratureArticleSchema");
const literatureArticleCollection = require("../model/LiteratureArticleSchema");
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
const { generateArticleId } = require("../helpers/uniqueIdHelper");
const handleError = require("../helpers/errorHandler");
const { buildQuery } = require("../helpers/queryBuilder");
const {
  validateHeaders,
  validateRowAgainstSchema,
} = require("../utils/validators");
const { parseRow } = require("../utils/rowParser");
const { requiredHeaders } = require("../config/bulkUploadMap");
const XLSX = require("xlsx");
const productsCollection = require("../model/productSchema");
const LiteratureReviewCollection = require("../model/LiteratureReviewSchema");
const SiteSettingCollection = require("../model/SiteSettingSchema");
const LiteratureTemplateSetting = require("../model/literatureTemplateConfigSchema");
const exportToExcel = require("../helpers/exportToExcel");
const LiteratureLogCollection = require("../model/literatureActivitySchema");
const { syncArrayFields } = require("../utils/syncArrayFields");
const { getChangedFields, buildAuditLogs } = require("../utils/auditHelpers");

// const IGNORED_FIELDS = ["tab"];

// const flattenObject = (obj, parentKey = "", result = {}) => {
//   Object.keys(obj || {}).forEach((key) => {
//     const value = obj[key];
//     const newKey = parentKey ? `${parentKey}.${key}` : key;

//     if (
//       value &&
//       typeof value === "object" &&
//       !Array.isArray(value) &&
//       !(value instanceof Date)
//     ) {
//       flattenObject(value, newKey, result);
//     } else {
//       result[newKey] = value;
//     }
//   });

//   return result;
// };

// const getChangedFields = (oldData, newData) => {
//   console.log(
//     oldData,
//     newData,
//     "oldData, newDataoldData, newDataoldData, newData",
//   );
//   // const changes = [];

//   // Object.keys(newData).forEach((key) => {
//   //   if (IGNORED_FIELDS.includes(key)) return;

//   //   if (
//   //     newData[key] !== undefined &&
//   //     JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
//   //   ) {
//   //     changes.push({
//   //       field: key,
//   //       oldValue: oldData[key],
//   //       newValue: newData[key],
//   //     });
//   //   }
//   // });

//   // return changes;

//   const changes = [];

//   const oldFlat = flattenObject(oldData);
//   const newFlat = flattenObject(newData);

//   Object.keys(newFlat).forEach((key) => {
//     if (IGNORED_FIELDS.includes(key)) return;

//     if (
//       newFlat[key] !== undefined &&
//       JSON.stringify(oldFlat[key]) !== JSON.stringify(newFlat[key])
//     ) {
//       changes.push({
//         field: key, // e.g. category_validation_data.study_type
//         oldValue: oldFlat[key],
//         newValue: newFlat[key],
//       });
//     }
//   });

//   return changes;
// };

// const STATUS_LABELS = {
//   0: "Draft",
//   1: "Review",
//   2: "Archive",
// };
// const AUDITABLE_FIELDS = [
//   /* ---------- ARTICLE ---------- */
//   "article_title",
//   "authors",
//   "article_id",
//   "journal_name",
//   "volume",
//   "abstract",
//   "search_engine",
//   "publication_date",
//   "search_date",
//   "article_link_doi",
//   "primary_reporter",
//   "country",
//   "literature_language",
//   "literature_category",
//   "patient_age",
//   "age_group",
//   "patient_gender",

//   /* ---------- PATIENT ---------- */
//   "patient.year_of_birth",
//   "patient.age",
//   "patient.age_group",
//   "patient.gender",

//   /* ---------- CASE INFO ---------- */
//   "case_information.received_date",
//   "case_information.case_type",
//   "case_information.country",

//   /* ---------- REPORTER ---------- */
//   "reporter.first_name",
//   "reporter.address",
//   "reporter.country",

//   /* ---------- MEDICAL ---------- */
//   "medical_history",

//   /* ---------- PRODUCTS ---------- */
//   "company_product",
//   "company_suspect_product",
//   "other_company_suspect_product",
//   "concomitant_drug",

//   /* ---------- EVENTS ---------- */
//   "adverse_event",
//   "special_scenario",

//   /* ---------- ASSESSMENT ---------- */
//   "assessment_status",
//   "assessment_commends",
//   "assessor",

//   /* ---------- VALIDATION ---------- */
//   "category_validation_data.drug_ae_relationships",
//   "category_validation_data.causality",
//   "category_validation_data.study_type",
//   "category_validation_data.validation_reason",

//   /* ---------- NARRATIVE ---------- */
//   "narrative",

//   "assessment_summary",
// ];

// const pickByPaths = (obj, paths) => {
//   const result = {};

//   for (const path of paths) {
//     const parts = path.split(".");
//     let src = obj;
//     let dst = result;

//     for (let i = 0; i < parts.length; i++) {
//       if (!src) break;

//       if (i === parts.length - 1) {
//         dst[parts[i]] = src[parts[i]];
//       } else {
//         dst[parts[i]] = dst[parts[i]] || {};
//         src = src[parts[i]];
//         dst = dst[parts[i]];
//       }
//     }
//   }

//   return result;
// };
// const isEqual = (a, b) => {
//   return JSON.stringify(a) === JSON.stringify(b);
// };
// const diffObjects = (oldObj, newObj, basePath = "") => {
//   const changes = [];

//   for (const key in newObj) {
//     const path = basePath ? `${basePath}.${key}` : key;

//     if (
//       typeof newObj[key] === "object" &&
//       newObj[key] !== null &&
//       !Array.isArray(newObj[key])
//     ) {
//       changes.push(...diffObjects(oldObj[key] || {}, newObj[key], path));
//     } else {
//       if (!isEqual(oldObj[key], newObj[key])) {
//         changes.push({
//           field: path,
//           oldValue: oldObj[key] ?? null,
//           newValue: newObj[key] ?? null,
//         });
//       }
//     }
//   }

//   return changes;
// };

// const ARRAY_FIELDS = [
//   "concomitant_drug",
//   "adverse_event",
//   "company_product",
//   "company_suspect_product",
//   "other_company_suspect_product",
//   "medical_history",
//   "special_scenario",
//   "literature_category",
// ];

// function diffArrayById(oldArr = [], newArr = [], fieldName) {
//   const logs = [];

//   const oldMap = new Map(oldArr.map((item) => [String(item._id), item]));

//   const newMap = new Map(
//     newArr.map((item) =>
//       item._id ? [String(item._id), item] : [crypto.randomUUID(), item],
//     ),
//   );

//   // ➕ ADDED
//   for (const [id, newItem] of newMap) {
//     if (!oldMap.has(id)) {
//       logs.push({
//         field: fieldName,
//         action: "ADDED",
//         old_value: null,
//         new_value: newItem,
//       });
//     }
//   }

//   // ❌ REMOVED
//   for (const [id, oldItem] of oldMap) {
//     if (!newMap.has(id)) {
//       logs.push({
//         field: fieldName,
//         action: "REMOVED",
//         old_value: oldItem,
//         new_value: null,
//       });
//     }
//   }

//   // ✏️ UPDATED (per field)
//   for (const [id, newItem] of newMap) {
//     if (!oldMap.has(id)) continue;

//     const oldItem = oldMap.get(id);

//     for (const key of Object.keys(newItem)) {
//       if (key === "_id") continue;

//       if (JSON.stringify(oldItem[key]) !== JSON.stringify(newItem[key])) {
//         logs.push({
//           field: `${fieldName}.${key}`,
//           action: "UPDATED",
//           old_value: { [key]: oldItem[key] },
//           new_value: { [key]: newItem[key] },
//         });
//       }
//     }
//   }

//   return logs;
// }

/**
 * Format array changes for audit logs
 * @param {Array} oldArr
 * @param {Array} newArr
 * @returns {Object} { oldDisplay, newDisplay }
 */
const formatArrayChange = (oldArr = [], newArr = []) => {
  if (!Array.isArray(oldArr) || !Array.isArray(newArr)) {
    return { oldDisplay: oldArr, newDisplay: newArr };
  }

  const added = newArr.filter((v) => !oldArr.includes(v));
  const removed = oldArr.filter((v) => !newArr.includes(v));

  if (added.length && !removed.length) {
    return {
      oldDisplay: null,
      newDisplay: `Added: ${added.join(", ")}`,
    };
  }

  if (!added.length && removed.length) {
    return {
      oldDisplay: `Removed: ${removed.join(", ")}`,
      newDisplay: null,
    };
  }

  if (added.length && removed.length) {
    return {
      oldDisplay: `Removed: ${removed.join(", ")}`,
      newDisplay: `Added: ${added.join(", ")}`,
    };
  }

  return {
    oldDisplay: oldArr.join(", "),
    newDisplay: newArr.join(", "),
  };
};
class LiteratureController {
  async createLiterature(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: errors.array() });
      }
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      bData.company_id = comp_id;
      bData.created_user_id = userId;
      let uniqueId = await generateArticleId(comp_id);
      bData.article_unique_id = uniqueId;
      bData.assessment_status = 0;
      bData.assessor = userId;
      bData.logs = [
        {
          user_id: userId,
          action: `Article created by ${user.username}`,
        },
      ];
      let createLiterature = await queryHelper.insertData(
        literatureArticleCollection,
        bData,
      );
      if (createLiterature.status) {
        await logLiteratureActivity({
          createdBy: user._id,
          literatureArticleId: createLiterature.msg._id,
          action: "CREATED",
          field: "article",
          oldValue: null,
          newValue: {
            id: createLiterature.msg.article_unique_id,
            title: createLiterature.msg.title, // optional
          },
          tab: "Overview",
        });

        await logUserActivity(
          user._id,
          `User ${user.username} create the article ID ${createLiterature.msg.article_unique_id}`,
          {
            ip: req.ip,
            device: req.headers["user-agent"],
          },
        );
        return res.status(statusCode.CREATED).send({
          status: createLiterature.status,
          data: createLiterature.msg,
          message: "Literature created successfully",
        });
      }
      console.log(createLiterature.msg);
      return res.status(statusCode.BAD_REQUEST).send({
        status: createLiterature.status,
        message: "Cannot create the literature. Please try again",
      });
    } catch (error) {
      console.log("createLiterature error", error);
      return handleError(res, error, "createLiterature error");
    }
  }
  // async updateLiterature(req, res) {
  //   try {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: errors.array() });
  //     }
  //     const { userId, comp_id } = res.locals.user;
  //     const literatureId = req.params.literatureId;
  //     const bData = req.body;
  //     // console.log(bData, "bData");
  //     // return;
  //     const user = await UsersCollection.findOne({
  //       _id: userId,
  //       company_id: comp_id,
  //     });

  //     if (!user) {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: false, message: "User not found" });
  //     }

  //     let filter = {};
  //     if (mongoose.Types.ObjectId.isValid(literatureId)) {
  //       filter = { _id: literatureId };
  //     } else {
  //       filter = { article_unique_id: literatureId };
  //     }

  //     const literatureData = await literatureArticleCollection.findOne(filter);

  //     if (!literatureData) {
  //       return res
  //         .status(statusCode.NOT_FOUND)
  //         .send({ status: false, message: "Literature not found" });
  //     }

  //     if (bData.assessor === "") bData.assessor = null;
  //     // console.log(bData.assessment_status, "bData.assessment_status");
  //     if (bData.assessment_status === "save") bData.assessment_status = 0;
  //     else if (bData.assessment_status === "review")
  //       bData.assessment_status = 1;
  //     else if (bData.assessment_status === "archive")
  //       bData.assessment_status = 2;
  //     else bData.assessment_status = 0;
  //     // console.log(bData,"update ")
  //     // return
  //     const { tab, ...dataForUpdate } = bData;

  //     const changes = getChangedFields(
  //       literatureData.toObject(),
  //       dataForUpdate,
  //     );
  //     console.log(
  //       literatureData,
  //       "literatureDataliteratureDataliteratureData",
  //       changes,
  //     );
  //     if (changes.length === 0) {
  //     }
  //     /* ---------- BUILD LOGS ---------- */
  //     const logs = changes.map((change) => {
  //       const leafField = change.field.split(".").pop();

  //       let oldVal = change.oldValue ?? null;
  //       let newVal = change.newValue ?? null;

  //       if (leafField === "assessment_status") {
  //         oldVal = STATUS_LABELS[oldVal] || oldVal;
  //         newVal = STATUS_LABELS[newVal] || newVal;
  //       }

  //       return {
  //         literature_article_id: literatureData._id,
  //         field: leafField,
  //         old_value: { [leafField]: oldVal },
  //         new_value: { [leafField]: newVal },
  //         tab: tab || "Unknown",
  //         created_by: userId,
  //         action: "UPDATED",
  //         createdAt: new Date(),
  //       };
  //     });

  //     const updatedLiterature =
  //       await literatureArticleCollection.findOneAndUpdate(
  //         filter,
  //         { $set: bData },
  //         { new: true },
  //       );
  //     // if (logs.length > 0) {
  //     //   await LiteratureLogCollection.insertMany(logs);
  //     // }
  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       message: "Literature updated successfully.",
  //       data: updatedLiterature,
  //     });
  //   } catch (error) {
  //     console.error("updateLiterature error:", error);
  //     return handleError(res, error, "updateLiterature error");
  //   }
  // }
  async updateLiterature(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send({ status: false, message: errors.array() });
      }

      const { userId, comp_id } = res.locals.user;
      const literatureId = req.params.literatureId;
      let bData = req.body;
      // console.log(
      //   bData,
      //   "dataForUpdatedataForUpdate",
      //   literatureId,
      //   userId,
      //   comp_id,
      // );
      // return;

      // ── Auth + document fetch in parallel ────────────────────────────────────
      const filter = mongoose.Types.ObjectId.isValid(literatureId)
        ? { _id: literatureId }
        : { article_unique_id: literatureId };

      const [user, literatureData] = await Promise.all([
        UsersCollection.findOne({ _id: userId, company_id: comp_id }).lean(),
        literatureArticleCollection.findOne(filter),
      ]);
      // console.log(user, literatureData, "user, literatureData");
      if (!user) {
        return res
          .status(403)
          .send({ status: false, message: "User not found" });
      }
      if (!literatureData) {
        return res
          .status(404)
          .send({ status: false, message: "Literature not found" });
      }

      // ── Normalise ─────────────────────────────────────────────────────────────
      if (bData.assessor === "") bData.assessor = null;
      if (bData.reviewer === "") bData.reviewer = null;

      const STATUS_MAP = { save: 0, review: 1, archive: 2 };
      if (bData.assessment_status in STATUS_MAP) {
        bData.assessment_status = STATUS_MAP[bData.assessment_status];
      }

      if (bData.literature_category?.length) {
        bData.literature_status =
          bData.literature_category[bData.literature_category.length - 1];
      }
      // console.log(filter, "filter, bData");
      // return;
      // ── Sync string arrays → object arrays ───────────────────────────────────
      const syncedArrays = syncArrayFields(bData, literatureData.toObject());
      bData = { ...bData, ...syncedArrays };
      // ── Strip non-persisted fields ────────────────────────────────────────────
      const { tab, ...dataForUpdate } = bData;
      // console.log(dataForUpdate, "dataForUpdatedataForUpdate");

      // ── Compute audit diff BEFORE the update ─────────────────────────────────
      // const changes = getChangedFields(
      //   literatureData.toObject(),
      //   dataForUpdate,
      // );

      // // ── Early return if nothing changed ───────────────────────────────────────
      // if (changes.length === 0) {
      //   return res.status(200).send({
      //     status: true,
      //     message: "No changes detected",
      //     data: literatureData,
      //   });
      // }
      console.log(dataForUpdate, "changeschangeschangeschanges");
      // ── Persist + audit logs in parallel ─────────────────────────────────────
      await literatureArticleCollection.findOneAndUpdate(filter, {
        $set: dataForUpdate,
      });

      // await LiteratureLogCollection.insertMany(
      //   buildAuditLogs(changes, literatureData._id, userId, tab),
      // );
      // let [updatedLiterature] = await Promise.all([
      // ]);

      return res.status(200).send({
        status: true,
        message: "Literature updated successfully",
        data: [],
      });
    } catch (error) {
      console.error("updateLiterature error:", error);
      return handleError(res, error, "updateLiterature error");
    }
  }

  async getUsers(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.find({
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "There is no users" });
      }
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully...",
        data: user,
      });
    } catch (error) {
      console.log("getUsers list error", error);
      return handleError(res, error, "getUsers list error literature");
    }
  }

  async getLiteratureArticle(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const { reviewId, type } = req.params;
      const { literature_status, literature_type } = req.query;
      const isDownload = req.query.download === "true";
      // return;
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
          // isDeleted: false,
        },
        1, // chage the api type
        // { UsersCollection }
      );
      if (req.query.assessment_status) {
        query.assessment_status =
          req.query.assessment_status === "Draft"
            ? 0
            : req.query.assessment_status === "Reviewed"
              ? 1
              : 2;
      }
      if (req.query.assessor) {
        query.assessor = new ObjectId(req.query.assessor);
      }
      if (req.query.reviewer) {
        query.reviewer = new ObjectId(req.query.reviewer);
      }
      if (req.params?.reviewId && type) {
        query.literature_review_id = new ObjectId(reviewId);

        const typeMap = {
          duplicate: { final_result: "Duplicate" },
          "follow-up": { final_result: "Follow-up" },
          ICSR: { literature_status: "ICSR", final_result: "Initial" },
          "clinical-aggregate": {
            literature_status: "Clinical Aggregate",
            final_result: "Initial",
          },
          "pre-clinical-aggregate": {
            literature_status: "Pre-clinical Aggregate",
            final_result: "Initial",
          },
          "non-relevant": { literature_status: "NR" },
          Unclassified: { literature_status: "Unclassified" },
          "drug-mismatch": { literature_status: "drug_mismatch" },
        };

        Object.assign(query, typeMap[type] || {});
      } else if (literature_status && literature_type) {
        console.log("else if working &&");
        const statusMap = {
          ICSR: "ICSR",
          "Clinical-Aggregate": "Clinical Aggregate",
          "Pre-clinical-Aggregate": "Pre-clinical Aggregate",
          Duplicate: "Duplicate",
        };

        query.literature_status = statusMap[literature_status];
        query.final_result = literature_type;
        query.literature_type = literature_type;
      } else if (literature_status) {
        console.log("else if working literature_status");

        const statusOnlyMap = {
          ICSR: { literature_status: "ICSR", final_result: "Initial" },
          "Clinical-Aggregate": {
            literature_status: "Clinical Aggregate",
            final_result: "Initial",
          },
          "Pre-clinical-Aggregate": {
            literature_status: "Pre-clinical Aggregate",
            final_result: "Initial",
          },
          NR: { literature_status: "NR" },
          Unclassified: { literature_status: "Unclassified" },
        };

        Object.assign(query, statusOnlyMap[literature_status] || {});
      } else if (literature_type) {
        if (literature_type === "drug_mismatch") {
          query.literature_status = "drug_mismatch";
        } else {
          query.final_result = literature_type;
        }
      }

      // console.log(query, "queryqueryqueryqueryquery");
      const isAdmin = user.role === 1;
      // console.log(query,"queryqueryquery")
      const pipeline = [{ $match: query }, { $sort: sort }];

      if (!isDownload) {
        pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
      }
      delete query.download;
      // console.log(query, "queryqueryquery initiae");
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "assessor",
          foreignField: "_id",
          as: "assessor_user",
        },
      });
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "reviewer",
          foreignField: "_id",
          as: "reviewer_user",
        },
      });
      pipeline.push({
        $addFields: {
          assessor_name: {
            $cond: [
              { $gt: [{ $size: "$assessor_user" }, 0] },
              { $arrayElemAt: ["$assessor_user.username", 0] },
              "",
            ],
          },
          reviewer_name: {
            $cond: [
              { $gt: [{ $size: "$reviewer_user" }, 0] },
              { $arrayElemAt: ["$reviewer_user.username", 0] },
              "",
            ],
          },
        },
      });
      pipeline.push({
        $project: {
          assessor_user: 0,
          reviewer_user: 0,
        },
      });
      pipeline.push({
        $addFields: {
          action: {
            $switch: {
              branches: [
                { case: { $eq: [isAdmin, true] }, then: "edit" },
                {
                  case: {
                    $and: [
                      { $eq: ["$assessment_status", 0] },
                      { $eq: ["$created_user_id", { $toObjectId: userId }] },
                    ],
                  },
                  then: "edit",
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$assessment_status", 1] },
                      { $eq: ["$reviewer", { $toObjectId: userId }] },
                    ],
                  },
                  then: "edit",
                },
                {
                  case: { $eq: ["$assessment_status", 2] },
                  then: isAdmin ? "edit" : "completed",
                },
              ],
              default: "userlock",
            },
          },
        },
      });
      const [articles, totalCount] = await Promise.all([
        literatureArticleCollection.aggregate(pipeline),
        literatureArticleCollection.countDocuments(query),
      ]);

      if (isDownload) {
        //=========NEEDs to work on that============//
        return exportToExcel(res, {
          fileName: "literature_articles.xlsx",
          sheetName: "Sheet1",
          columns: [
            "article_id",
            "article_title",
            "authors",
            "abstract",
            "source",
            "company_drug",
            "drug_major_focus",
            "drug_index_term",
            "medical_term_major_focus",
            "medical_index_term",
            "publication_date",
            "search_date",
            "search_duration",
            "fta_link",
            "article_link_doi",
            "narrative",
            "literature_status",
            "matched_drug", // need to change company drug instead of matched_drug
            "special_scenarios",
            "company_products",
            "company_suspect_products",
            "indications",
            "other_company_suspect_products",
            "concomitant_drugs",
            "adverse_events",
          ],
          data: articles,
          transformers: {
            medical_index_term: (v) => (Array.isArray(v) ? v.join(", ") : v),
            medical_term_major_focus: (v) =>
              Array.isArray(v) ? v.join(", ") : v,
            company_drug: (v) => (Array.isArray(v) ? v.join(", ") : v),
            drug_major_focus: (v) => (Array.isArray(v) ? v.join(", ") : v),
            drug_index_term: (v) => (Array.isArray(v) ? v.join(", ") : v),
            matched_drug: (v) => (Array.isArray(v) ? v.join(", ") : v),
            special_scenarios: (v) => (Array.isArray(v) ? v.join(", ") : v),
            company_products: (v) => (Array.isArray(v) ? v.join(", ") : v),
            company_suspect_products: (v) =>
              Array.isArray(v) ? v.join(", ") : v,
            indications: (v) => (Array.isArray(v) ? v.join(", ") : v),
            other_company_suspect_products: (v) =>
              Array.isArray(v) ? v.join(", ") : v,
            concomitant_drugs: (v) => (Array.isArray(v) ? v.join(", ") : v),
            adverse_events: (v) => (Array.isArray(v) ? v.join(", ") : v),
          },
        });
      }

      return res.status(statusCode.OK).send({
        status: true,
        data: { articles, totalCount },
        message: "Fetched successfully",
      });
    } catch (error) {
      console.log("getLiteratureArticle error", error);
      return handleError(res, error, "getLiteratureArticle error literature");
    }
  }

  async getIndividualLiterature(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let literatureId = req.params.literatureId;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      // let literatureData = await LiteratureCollection.findOne({
      //   _id: literatureId,
      // });
      let literatureData = await literatureArticleCollection.aggregate([
        {
          $match: {
            article_unique_id: literatureId,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assessor",
            foreignField: "_id",
            as: "assessor_data",
          },
        },
        {
          $unwind: {
            path: "$assessor_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reviewer",
            foreignField: "_id",
            as: "reviewer_data",
          },
        },
        {
          $unwind: {
            path: "$reviewer_data",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
      return res
        .status(statusCode.OK)
        .send({ status: true, data: literatureData[0] });
    } catch (error) {
      console.log("getIndividualLiterature error", error);
      return handleError(res, error, "getIndividualLiterature error");
    }
  }
  // async viewAndEditArticle(req, res) {
  //   try {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: errors.array() });
  //     }
  //     let { userId, comp_id } = res.locals.user;
  //     let bData = req.body;
  //     let literatureId = req.params.literatureId;
  //     let user = await UsersCollection.findOne({
  //       _id: userId,
  //       company_id: comp_id,
  //     });
  //     if (!user) {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: false, message: "Cannot found user" });
  //     }
  //     let literatureData = await literatureArticleCollection.findOne({
  //       article_unique_id: literatureId,
  //       company_id: comp_id,
  //     });
  //     if (!literatureData) {
  //       return res.status(statusCode.NOT_FOUND).send({
  //         status: false,
  //         message: "Literature not found",
  //       });
  //     }
  //     // console.log(literatureData, "literatureData", bData);
  //     if (bData.assessor === "") bData.assessor = null;

  //     if (bData.assessment_status === "save") bData.assessment_status = 0;
  //     else if (bData.assessment_status === "review")
  //       bData.assessment_status = 1;
  //     else if (bData.assessment_status === "archive")
  //       bData.assessment_status = 2;

  //     /* ---------- FIND CHANGES ---------- */
  //     const { tab, ...dataForUpdate } = bData;
  //     const changes = getChangedFields(
  //       literatureData.toObject(),
  //       dataForUpdate,
  //     );
  //     console.log(changes, "logslogslogs");

  //     /* ---------- BUILD LOGS ---------- */
  //     const logs = changes.map((change) => {
  //       const leafField = change.field.split(".").pop();
  //       let oldVal = change.oldValue ?? null;
  //       let newVal = change.newValue ?? null;

  //       if (leafField === "assessment_status") {
  //         oldVal = STATUS_LABELS[oldVal] || oldVal;
  //         newVal = STATUS_LABELS[newVal] || newVal;
  //       }

  //       return {
  //         literature_article_id: literatureData._id,
  //         field: leafField,
  //         old_value: { [leafField]: oldVal },
  //         new_value: { [leafField]: newVal },
  //         updated_at: new Date(),
  //         tab: tab || "Unknown",
  //         created_by: userId,
  //         log_status: "UPDATED",
  //       };
  //     });
  //     // console.log(logs, "logslogslogs");
  //     /* ---------- UPDATE & PUSH LOGS ---------- */
  //     await literatureArticleCollection.findOneAndUpdate(
  //       {
  //         article_unique_id: literatureId,
  //         company_id: comp_id,
  //       },
  //       {
  //         $set: bData,
  //       },
  //     );
  //     await LiteratureLogCollection.insertMany(logs);
  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       message: "Literature updated successfully",
  //     });
  //   } catch (error) {
  //     console.log("viewAndEditArticle error", error);
  //     return handleError(res, error, "getIndividualLiterature error");
  //   }
  // }
  // async bulkUpload(req, res) {
  //   try {
  //     const file = req.file;
  //     const { templateId } = req.body;

  //     if (!file) {
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: "No file uploaded" });
  //     }

  //     const { userId, comp_id } = res.locals.user;

  //     const existingCount = await literatureArticleCollection.countDocuments({
  //       company_id: comp_id,
  //       isDeleted: false,
  //     });
  //     const isInitialUpload = existingCount === 0;

  //     const user = await UsersCollection.findOne({
  //       _id: userId,
  //       company_id: comp_id,
  //     });

  //     if (!user) {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: false, message: "Cannot find user" });
  //     }

  //     /* ---------------- FETCH TEMPLATE ---------------- */
  //     const template = await LiteratureTemplateSetting.findOne({
  //       _id: templateId,
  //       company_id: comp_id,
  //       isDeleted: false,
  //     });

  //     if (!template) {
  //       return res.status(400).send({
  //         status: false,
  //         message: "Invalid or deleted template selected",
  //       });
  //     }

  //     // --------------- READ FILE -----------------
  //     const filePath = path.resolve(file.path);
  //     const ext = path.extname(file.originalname).toLowerCase();
  //     let parsedRows = [];

  //     // ---------------- PARSE CSV ----------------
  //     if (ext === ".csv") {
  //       const fileContent = fs.readFileSync(filePath, "utf8");

  //       const parsed = Papa.parse(fileContent, {
  //         header: true,
  //         skipEmptyLines: true,
  //       });

  //       if (!parsed.data || parsed.data.length === 0) {
  //         return res.status(statusCode.BAD_REQUEST).send({
  //           status: false,
  //           message: "CSV file is empty or invalid",
  //         });
  //       }

  //       parsedRows = parsed.data;
  //     }

  //     // ------------- PARSE XLS / XLSX ------------
  //     else if (ext === ".xls" || ext === ".xlsx") {
  //       const workbook = XLSX.readFile(filePath);
  //       const sheetName = workbook.SheetNames[0];

  //       let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  //         defval: "",
  //         raw: true, // IMPORTANT: Keep excel date serial numbers
  //       });

  //       sheet = sheet
  //         .map((row) => {
  //           Object.keys(row).forEach((key) => {
  //             const lower = key.toLowerCase();

  //             if (typeof row[key] === "number" && lower.includes("date")) {
  //               const excelDate = new Date((row[key] - 25569) * 86400 * 1000);
  //               row[key] = excelDate.toISOString();
  //             }

  //             if (typeof row[key] === "string" && lower.includes("date")) {
  //               const match = row[key].match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  //               if (match) {
  //                 const [_, dd, mm, yyyy] = match;
  //                 row[key] = new Date(
  //                   `${yyyy}-${mm}-${dd}T00:00:00Z`
  //                 ).toISOString();
  //               }
  //             }
  //             if (key.startsWith("__EMPTY") || key.trim() === "") {
  //               delete row[key];
  //             }
  //           });

  //           return row;
  //         })
  //         .filter((row) => Object.values(row).some((val) => val !== ""));

  //       parsedRows = sheet;
  //     }
  //     // --------------- UNSUPPORTED ----------------
  //     else {
  //       return res.status(statusCode.BAD_REQUEST).send({
  //         status: false,
  //         message: "Unsupported file format. Upload CSV or Excel.",
  //       });
  //     }

  //     /* ---------------- HEADER VALIDATION ---------------- */
  //     const fileHeaders = Object.keys(parsedRows[0] || {}).map((h) =>
  //       h.toString().trim()
  //     );

  //     const templateHeaders = Object.values(template.mapping)
  //       .filter(Boolean)
  //       .map((h) => h.toString().trim());

  //     const missingHeaders = templateHeaders.filter(
  //       (h) => !fileHeaders.includes(h)
  //     );

  //     if (missingHeaders.length > 0) {
  //       fs.unlinkSync(filePath);

  //       return res.status(statusCode.BAD_REQUEST).send({
  //         status: false,
  //         message: "Uploaded file does not match selected template",
  //         errorType: "HEADER_MISMATCH",
  //         missingHeaders,
  //       });
  //     }
  //     let reviewData = {
  //       company_id: comp_id,
  //       creator_user_id: userId,
  //       total_rows: parsedRows.length,
  //       template_id: req.body.templateId,
  //       original_name: file.originalname,
  //       saved_file_name: file.filename,
  //     };
  //     // console.log(file, "--------file", reviewData, req.body);
  //     // return;
  //     // -------- FInd the uploaded count and return false
  //     let findCompanySetting = await SiteSettingCollection.findOne({
  //       company_id: comp_id,
  //     });
  //     let getTodalUploads = await LiteratureReviewCollection.aggregate([
  //       {
  //         $match: {
  //           company_id: `${comp_id}`,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: null,
  //           total_uploads: {
  //             $sum: "$total_rows",
  //           },
  //         },
  //       },
  //     ]);
  //     let compTotal =
  //       findCompanySetting.subscription?.limits?.literatureArticles;
  //     if (parsedRows.length > compTotal) {
  //       // console.log("need to send the error", compTotal, parsedRows.length);
  //       return res.status(statusCode.UNAUTHORIZED).send({
  //         status: false,
  //         message: "You dont have a credit. Please contact admin.",
  //       });
  //     }
  //     if (
  //       getTodalUploads.length &&
  //       getTodalUploads[0].total_uploads + parsedRows.length > compTotal
  //     ) {
  //       return res.status(statusCode.UNAUTHORIZED).send({
  //         status: false,
  //         message: "You dont have a credit. Please contact admin.",
  //       });
  //     }
  //     let createReview = await LiteratureReviewCollection.create(reviewData);
  //     // // ---------------- HEADER VALIDATION ----------------
  //     // // const fileHeaders = Object.keys(parsedRows[0] || {});
  //     // const headerError = validateHeaders(fileHeaders, requiredHeaders);

  //     // if (headerError) {
  //     //   return res.status(403).send({ status: false, message: headerError });
  //     // }

  //     /* ---------------- MAP & INSERT ROWS ---------------- */
  //     const mapRowUsingTemplate = (rawRow, mapping) => {
  //       const dbRow = {};

  //       for (const [dbField, fileHeader] of Object.entries(mapping)) {
  //         if (!fileHeader) continue;
  //         dbRow[dbField] = rawRow[fileHeader] ?? "";
  //       }

  //       return dbRow;
  //     };

  //     // ---------------- PROCESS ROWS -----------------------
  //     const totalRows = parsedRows.length;
  //     let successCount = 0;
  //     let failedRows = [];
  //     let insertedRows = [];
  //     for (let [idx, rawRow] of parsedRows.entries()) {
  //       try {
  //         // let row;
  //         let row = mapRowUsingTemplate(rawRow, template.mapping);

  //         function convertArrayData(data) {
  //           if (data === null || data === undefined) {
  //             return [];
  //           }

  //           // If already an array → normalize & clean
  //           if (Array.isArray(data)) {
  //             return data.map((v) => String(v).trim()).filter(Boolean);
  //           }

  //           // If string → split by comma
  //           if (typeof data === "string") {
  //             return data
  //               .split(",")
  //               .map((v) => v.trim())
  //               .filter(Boolean);
  //           }

  //           // Any other type (number, boolean, etc.)
  //           return [String(data).trim()].filter(Boolean);
  //         }

  //         function parseToMongoDate(value) {
  //           if (!value) return null;

  //           // Already a Date
  //           if (value instanceof Date && !isNaN(value)) {
  //             return value;
  //           }

  //           // Excel serial number (e.g. 45234)
  //           if (typeof value === "number") {
  //             return new Date((value - 25569) * 86400 * 1000);
  //           }

  //           // String date (MM/DD/YYYY or MM/DD/YYYY HH:mm)
  //           if (typeof value === "string") {
  //             const cleaned = value.trim();

  //             // Match: 2/14/2022 0:00 OR 02/14/2022
  //             const match = cleaned.match(
  //               /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
  //             );

  //             if (match) {
  //               const [, mm, dd, yyyy, hh = "0", min = "0"] = match;
  //               return new Date(Date.UTC(yyyy, mm - 1, dd, hh, min));
  //             }

  //             // ISO fallback
  //             const isoDate = new Date(cleaned);
  //             if (!isNaN(isoDate)) return isoDate;
  //           }

  //           return null;
  //         }

  //         // ------------------ NORMALIZE company_drug BEFORE VALIDATION ------------------
  //         // let companyDrugValue = row.company_drug;

  //         // Convert ALL types → clean string

  //         // ------------------ VALIDATE DRUG ------------------
  //         // const drugError = await validateSuspectDrugs(
  //         //   companyDrugValue.toLowerCase(),
  //         //   comp_id
  //         // );

  //         // if (drugError) {
  //         //   failedRows.push({
  //         //     row: idx + 1,
  //         //     reason: drugError,
  //         //   });
  //         //   continue;
  //         // }

  //         // ------------------ FINALIZE company_drug ARRAY FORMAT ------------------
  //         row.company_drug = convertArrayData(row.company_drug);
  //         row.drug_major_focus = convertArrayData(row.drug_major_focus);
  //         row.drug_index_term = convertArrayData(row.drug_index_term);
  //         row.medical_term_major_focus = convertArrayData(
  //           row.medical_term_major_focus
  //         );
  //         row.medical_index_term = convertArrayData(row.medical_index_term);
  //         // row.suspect_products = [...row.company_drug];
  //         // ------------------ ADD SYSTEM FIELDS ------------------
  //         row.company_id = comp_id;
  //         row.created_user_id = userId;
  //         row.literature_review_id = createReview._id;
  //         row.article_unique_id = await generateArticleId(comp_id);
  //         row.search_date = parseToMongoDate(row.search_date);
  //         row.assessor = userId;
  //         row.logs = [
  //           {
  //             user_id: userId,
  //             action: `Article created by ${user.username}`,
  //             timestamp: new Date(),
  //           },
  //         ];
  //         // ------------------ INSERT INTO DB ------------------
  //         let insertedData = await literatureArticleCollection.create(row);
  //         // console.log(insertedData,"-------insertedData")
  //         successCount++;
  //         insertedRows.push(insertedData);
  //       } catch (err) {
  //         console.log("Error row:", idx + 1, err);
  //         failedRows.push({
  //           row: idx + 1,
  //           reason: err.message,
  //         });
  //       }
  //     }
  //     // return
  //     fs.unlinkSync(filePath);

  //     try {
  //       const axios = require("axios");
  //       let payLoad = {
  //         company_id: comp_id,
  //         total_uploaded: successCount,
  //         uploaded_rows: insertedRows,
  //         skip_cross_check: isInitialUpload,
  //         literature_review_id: createReview._id,
  //       };
  //       const pythonResponse = await axios.post(
  //         "http://127.0.0.1:8000/api/initiate-deduplication/",
  //         payLoad
  //       );

  //       console.log("Python API response:", pythonResponse.data);
  //     } catch (pyErr) {
  //       console.error("Python API call failed:", pyErr.message);
  //     }
  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       message: `Upload completed. ${successCount}/${totalRows} inserted.`,
  //       totalRows,
  //       successCount,
  //       failedCount: failedRows.length,
  //       failedRows,
  //     });
  //   } catch (error) {
  //     console.error("bulkUpload error", error);
  //     return handleError(res, error, "bulkUpload error");
  //   }
  // }
  async viewAndEditArticle(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: errors.array() });
      }

      const { userId, comp_id } = res.locals.user;
      let bData = req.body;
      const literatureId = req.params.literatureId;

      // ── Auth check ───────────────────────────────────────────────────────────
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }

      // ── Fetch existing document ───────────────────────────────────────────────
      const literatureData = await literatureArticleCollection.findOne({
        article_unique_id: literatureId,
        company_id: comp_id,
      });
      if (!literatureData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Literature not found" });
      }

      // ── Normalise status fields ───────────────────────────────────────────────
      if (bData.assessor === "") bData.assessor = null;

      const STATUS_MAP = { save: 0, review: 1, archive: 2 };
      if (bData.assessment_status in STATUS_MAP) {
        bData.assessment_status = STATUS_MAP[bData.assessment_status];
      }

      // ── Sync string arrays → object arrays ───────────────────────────────────
      // Keeps company_product[], adverse_event[] etc. in step with the Safety
      // step's company_products[], adverse_events[] string arrays.
      const syncedArrays = syncArrayFields(bData, literatureData.toObject());
      bData = { ...bData, ...syncedArrays };

      // ── Compute audit changes (BEFORE the update) ─────────────────────────────
      const { tab, ...dataForUpdate } = bData;
      const changes = getChangedFields(
        literatureData.toObject(),
        dataForUpdate,
      );

      // ── Persist ───────────────────────────────────────────────────────────────
      await literatureArticleCollection.findOneAndUpdate(
        { article_unique_id: literatureId, company_id: comp_id },
        { $set: bData },
      );

      // ── Write audit logs (only when something actually changed) ───────────────
      if (changes.length > 0) {
        const logs = buildAuditLogs(changes, literatureData._id, userId, tab);
        await LiteratureLogCollection.insertMany(logs);
      }

      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Literature updated successfully" });
    } catch (error) {
      console.error("viewAndEditArticle error", error);
      return handleError(res, error, "viewAndEditArticle error");
    }
  }
  async bulkUpload(req, res) {
    let filePath;
    // return
    try {
      const file = req.file;
      const { templateId } = req.body;

      if (!file) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "No file uploaded",
        });
      }

      const { userId, comp_id } = res.locals.user;
      filePath = path.resolve(file.path);

      const existingCount = await literatureArticleCollection.countDocuments({
        company_id: comp_id,
        isDeleted: false,
      });

      const isInitialUpload = existingCount === 0;

      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });

      if (!user) {
        return res.status(statusCode.FORBIDDEN).send({
          status: false,
          message: "Cannot find user",
        });
      }

      /* ---------------- FETCH TEMPLATE ---------------- */
      const template = await LiteratureTemplateSetting.findOne({
        _id: templateId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!template) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Invalid or deleted template selected",
        });
      }

      /* ---------------- READ FILE ---------------- */
      const ext = path.extname(file.originalname).toLowerCase();
      let parsedRows = [];

      /* ---------------- CSV ---------------- */
      if (ext === ".csv") {
        const fileContent = fs.readFileSync(filePath, "utf8");

        const parsed = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
        });

        if (!parsed.data || parsed.data.length === 0) {
          return res.status(statusCode.BAD_REQUEST).send({
            status: false,
            message: "CSV file is empty or invalid",
          });
        }

        parsedRows = parsed.data;
      } else if (ext === ".xls" || ext === ".xlsx") {
        /* ---------------- XLS / XLSX ---------------- */
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];

        let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: "",
          raw: true,
        });

        if (!sheet || sheet.length === 0) {
          return res.status(statusCode.BAD_REQUEST).send({
            status: false,
            message: "Excel file is empty or invalid",
          });
        }

        sheet = sheet
          .map((row) => {
            Object.keys(row).forEach((key) => {
              if (key.startsWith("__EMPTY") || key.trim() === "") {
                delete row[key];
              }
            });
            return row;
          })
          .filter((row) => Object.values(row).some((val) => val !== ""));

        parsedRows = sheet;
      } else {
        /* ---------------- UNSUPPORTED ---------------- */
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Unsupported file format. Upload CSV or Excel.",
        });
      }

      /* ---------------- HEADER VALIDATION ---------------- */
      const fileHeaders = Object.keys(parsedRows[0] || {}).map((h) =>
        h.toString().trim().toLowerCase(),
      );

      const templateHeaders = Object.values(template.mapping)
        .filter(Boolean)
        .map((h) => h.toString().trim().toLowerCase());

      const missingHeaders = templateHeaders.filter(
        (h) => !fileHeaders.includes(h),
      );

      if (missingHeaders.length > 0) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Uploaded file does not match selected template",
          errorType: "HEADER_MISMATCH",
          missingHeaders,
        });
      }

      /* ---------------- REVIEW ENTRY ---------------- */
      const reviewData = {
        company_id: comp_id,
        creator_user_id: userId,
        total_rows: parsedRows.length,
        input_rows: parsedRows.length,
        template_id: templateId,
        original_name: file.originalname,
        saved_file_name: file.filename,
      };

      const findCompanySetting = await SiteSettingCollection.findOne({
        company_id: comp_id,
      });

      const getTotalUploads = await LiteratureReviewCollection.aggregate([
        { $match: { company_id: `${comp_id}` } },
        {
          $group: {
            _id: null,
            total_uploads: { $sum: "$total_rows" },
          },
        },
      ]);

      const compTotal =
        findCompanySetting.subscription?.limits?.literatureArticles;

      if (
        parsedRows.length > compTotal ||
        (getTotalUploads.length &&
          getTotalUploads[0].total_uploads + parsedRows.length > compTotal)
      ) {
        return res.status(statusCode.UNAUTHORIZED).send({
          status: false,
          message: "You dont have a credit. Please contact admin.",
        });
      }

      const createReview = await LiteratureReviewCollection.create(reviewData);

      /* ---------------- HELPERS ---------------- */
      const mapRowUsingTemplate = (rawRow, mapping) => {
        const dbRow = {};
        for (const [dbField, fileHeader] of Object.entries(mapping)) {
          if (!fileHeader) continue;
          dbRow[dbField] = rawRow[fileHeader] ?? "";
        }
        return dbRow;
      };

      const convertArrayData = (data) => {
        if (data == null) return [];
        if (Array.isArray(data))
          return data
            .map(String)
            .map((v) => v.trim())
            .filter(Boolean);
        if (typeof data === "string")
          return data
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        return [String(data).trim()].filter(Boolean);
      };

      const parseToMongoDate = (value) => {
        if (!value) return null;
        if (value instanceof Date && !isNaN(value)) return value;
        if (typeof value === "number")
          return new Date((value - 25569) * 86400 * 1000);

        if (typeof value === "string") {
          const match = value
            .trim()
            .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
          if (match) {
            const [, mm, dd, yyyy, hh = "0", min = "0"] = match;
            return new Date(Date.UTC(yyyy, mm - 1, dd, hh, min));
          }
          const iso = new Date(value);
          if (!isNaN(iso)) return iso;
        }
        return null;
      };

      /* ---------------- PROCESS ROWS ---------------- */
      let successCount = 0;
      let failedRows = [];
      let insertedRows = [];

      for (let [idx, rawRow] of parsedRows.entries()) {
        try {
          let row = mapRowUsingTemplate(rawRow, template.mapping);

          row.company_drug = convertArrayData(row.company_drug);
          row.drug_major_focus = convertArrayData(row.drug_major_focus);
          row.drug_index_term = convertArrayData(row.drug_index_term);
          row.medical_term_major_focus = convertArrayData(
            row.medical_term_major_focus,
          );
          row.medical_index_term = convertArrayData(row.medical_index_term);

          row.company_id = comp_id;
          row.created_user_id = userId;
          row.literature_review_id = createReview._id;
          row.article_unique_id = await generateArticleId(comp_id);
          row.search_date = parseToMongoDate(row.search_date);
          row.assessor = userId;

          const insertedData = await literatureArticleCollection.create(row);
          await LiteratureLogCollection.create([
            {
              literature_article_id: insertedData._id,
              field: "File upload",
              old_value: null,
              new_value: null,
              tab: "Literature",
              action: "Upload",
              created_by: userId,
            },
          ]);
          successCount++;
          insertedRows.push(insertedData);
        } catch (err) {
          failedRows.push({
            row: idx + 1,
            reason: err.message,
          });
        }
      }
      // console.log("ascascsacasascsac");
      // return;
      /* ---------------- PYTHON CALL ---------------- */
      // try {
      //   const axios = require("axios");
      //   let pythonResponse = await axios.post(
      //     process.env.PYTHON_API_URL + "/api/initiate-deduplication/",
      //     {
      //       company_id: comp_id,
      //       total_uploaded: successCount,
      //       uploaded_rows: insertedRows,
      //       skip_cross_check: isInitialUpload,
      //       literature_review_id: createReview._id,
      //     },
      //   );
      //   console.log(res.data.data, "--------------res");
      //   const uploadedRows = pythonResponse.data.data.uploaded_rows || [];

      //   // const unclassifiedCount = uploadedRows.filter(
      //   //   (r) => (r.matched_drug || "") === "",
      //   // ).length;

      await LiteratureReviewCollection.findOneAndUpdate(
        { _id: createReview._id },
        { $set: { output_rows: successCount } },
      );

      try {
        const axios = require("axios");
        const pythonResponse = await axios.post(
          `${process.env.PYTHON_API_URL}/initiate-deduplication`,
          {
            company_id: comp_id,
            total_uploaded: successCount,
            uploaded_rows: insertedRows,
            skip_cross_check: isInitialUpload,
            literature_review_id: createReview._id,
          },
          { timeout: 15000 },
        );

        console.log("Python OK:", pythonResponse.data);
      } catch (e) {
        console.error("Python API failed:", e.message);
      }

      return res.status(statusCode.OK).send({
        status: true,
        message: `Upload completed. ${successCount}/${parsedRows.length} inserted.`,
        totalRows: parsedRows.length,
        successCount,
        failedCount: failedRows.length,
        failedRows,
      });
    } catch (error) {
      console.error("bulkUpload error", error);
      return handleError(res, error, "bulkUpload error");
    } finally {
      // if (filePath && fs.existsSync(filePath)) {
      //   fs.unlinkSync(filePath);
      // }
    }
  }

  async statusBulkUpdate(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const { ids, status } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "No article IDs provided" });
      }

      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user)
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "User not found" });

      let newStatus;
      if (status === "review") newStatus = 1;
      else if (status === "archive") newStatus = 2;
      else
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Invalid status value" });

      const articles = await literatureArticleCollection.find({
        _id: { $in: ids },
        company_id: comp_id,
      });

      if (articles.length === 0)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "No matching articles found" });

      const openArticles = articles.filter((a) => a.assessment_status === 0);

      const updateIds = openArticles.map((a) => a._id);
      if (updateIds.length > 0) {
        await literatureArticleCollection.updateMany(
          { _id: { $in: updateIds }, company_id: comp_id },
          { $set: { assessment_status: newStatus } },
        );
      }

      const summary = {
        total: ids.length,
        updated: updateIds.length,
        skipped: ids.length - updateIds.length,
      };

      return res.status(statusCode.OK).send({
        status: true,
        message: `Bulk update completed — ${summary.updated} updated, ${summary.skipped} skipped`,
        summary,
      });
    } catch (error) {
      console.error("statusBulkUpdate error", error);
      return handleError(res, error, "statusBulkUpdate error");
    }
  }
  //=============================================================================//

  async getLiteratures(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let { page = 1, limit = 10, search = "", role } = req.query;

      // Check user exists
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      console.log(userId, "useriddddd ");
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }

      // Build match query
      let matchQuery = { company_id: comp_id };

      if (search) {
        matchQuery.$or = [
          { title: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
          { literatureId: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination params
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      // Aggregation pipeline
      const pipeline = [
        { $match: matchQuery },
        {
          $lookup: {
            from: "users",
            localField: "action_initiated_user_id",
            foreignField: "_id",
            as: "actionUser",
          },
        },
        {
          $unwind: {
            path: "$actionUser",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            is_logged: "$actionUser.is_logged",
            user_name: "$actionUser.username",
          },
        },
        {
          $project: {
            actionUser: 0,
            literature_action: 0,
          },
        },
        {
          $addFields: {
            iconStatus: {
              $switch: {
                branches: [
                  // Re QC initiated user cannot edit
                  // status = 2
                  {
                    case: {
                      $and: [
                        { $eq: ["$status", 2] },
                        {
                          $ne: [
                            "$action_initiated_user_id",
                            new ObjectId(userId),
                          ],
                        },
                      ],
                    },
                    then: "edit",
                  },
                  // Created user cannot be edited once moved to QC
                  // status = 1
                  {
                    case: {
                      $and: [
                        { $eq: ["$status", 1] },
                        {
                          $eq: [
                            "$action_initiated_user_id",
                            new ObjectId(userId),
                          ],
                        },
                        {
                          $ne: ["$created_user_id", new ObjectId(userId)],
                        },
                        { $eq: ["$is_logged", true] },
                      ],
                    },
                    then: "edit",
                  },
                  // EDIT: if no action initiated, allow edit and not a created user
                  {
                    case: {
                      $and: [
                        { $eq: ["$status", 1] },
                        {
                          $ne: ["$created_user_id", new ObjectId(userId)],
                        },
                        { $eq: ["$action_initiated_user_id", null] },
                      ],
                    },
                    then: "edit",
                  },

                  // status = 0
                  // EDIT: only the action initiator (and logged in, status=0)
                  {
                    case: {
                      $and: [
                        {
                          $eq: [
                            "$action_initiated_user_id",
                            new ObjectId(userId),
                          ],
                        },
                        { $eq: ["$is_logged", true] },
                        { $eq: ["$status", 0] },
                      ],
                    },
                    then: "edit",
                  },
                  // EDIT: if no action initiated, allow edit
                  {
                    case: {
                      $and: [
                        { $eq: ["$action_initiated_user_id", null] },
                        { $eq: ["$status", 0] },
                      ],
                    },
                    then: "edit",
                  },

                  // Admin unlock conditions
                  // UNLOCK: role=1 user, when action user is offline
                  {
                    case: {
                      $and: [
                        { $eq: [user.role, 1] },
                        { $eq: ["$status", 0] },
                        { $eq: ["$is_logged", false] },
                      ],
                    },
                    then: "unlock",
                  },
                  {
                    case: {
                      $and: [
                        { $eq: [user.role, 1] },
                        { $eq: ["$status", 1] },
                        { $eq: ["$is_logged", false] },
                      ],
                    },
                    then: "unlock",
                  },

                  // Non-editable cases → status-based lock icons
                  {
                    case: { $eq: ["$status", 0] },
                    then: "lock",
                  },
                  {
                    case: { $eq: ["$status", 1] },
                    then: "qc-lock",
                  },
                  {
                    case: { $eq: ["$status", 2] },
                    then: "re-qc-lock",
                  },
                  {
                    case: { $eq: ["$status", 3] },
                    then: "complete",
                  },
                ],
                default: "lock",
              },
            },
          },
        },

        {
          $facet: {
            rows: [
              { $sort: { _id: -1 } }, // sort newest first
              { $skip: skip },
              { $limit: limit },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      const result = await LiteratureCollection.aggregate(pipeline);

      // Extract results
      const rows = result[0]?.rows || [];
      const totalCount = result[0]?.totalCount[0]?.count || 0;

      return res.status(statusCode.OK).send({
        status: true,
        data: {
          rows,
          total: totalCount,
          page,
          limit,
        },
      });
    } catch (error) {
      console.log("getLiteratures error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message || error });
    }
  }

  async initiateAction(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      let literatureData = await LiteratureCollection.findOne({
        _id: bData.literatureId,
      });
      // console.log(literatureData,"literatureData")
      if (!literatureData) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Cannot find the lierature",
        });
      }
      let updateData = {
        action_initiate_date_time: Date.now(),
        action_initiated_user_id: userId,
      };
      let literatureAction = {
        action_user: userId,
        action: bData.log,
      };
      // console.log(literatureAction, "literatureAction");
      // return;
      await logLiteratureActivity(
        userId,
        literatureData._id,
        `User : ${user.username} opened the literature. Title : ${literatureData.literatureId}`,
        {
          ip: req.ip,
          device: req.headers["user-agent"],
        },
      );
      await logUserActivity(
        user._id,
        `User : ${user.username} opened the literature. Title ${literatureData.literatureId}`,
        {
          ip: req.ip,
          device: req.headers["user-agent"],
        },
      );
      await LiteratureCollection.findOneAndUpdate(
        { _id: bData.literatureId },
        {
          $push: { literature_action: literatureAction },
          $set: updateData,
        },
      );

      return res.status(statusCode.OK).send({
        status: true,
        message: "Action has been initiated for QC checking",
      });
    } catch (error) {
      console.log("initiateAction error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message || error });
    }
  }
  async unlockByAdmin(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let { reason, password, literature_id } = req.body;

      // Ensure admin
      let adminUser = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });

      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      const isMatch = await bcrypt.compare(password, adminUser.password);
      if (!isMatch) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Incorrect password" });
      }

      let literatureData = await LiteratureCollection.findOne({
        _id: literature_id,
      });

      if (!literatureData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Incorrect password" });
      }
      let literatureAction = {
        action_user: userId,
        action: `Admin : ${adminUser.username} unlock the literature`,
        reason,
      };
      let updatedData = {
        action_initiated_user_id: null,
      };
      if (literatureData.status == 3) {
        updatedData.status = 0;
      }
      await logLiteratureActivity(
        userId,
        literatureData._id,
        `Admin : ${adminUser.username} unlock the literature. Title : ${literatureData.literatureId}`,
        {
          ip: req.ip,
          device: req.headers["user-agent"],
        },
      );
      await logAdminActivity(
        userId,
        "UNLOCK_LITERATURE",
        null,
        `Admin ${adminUser.username} unlock the literature. Title : ${literatureData.literatureId}`,
      );
      await LiteratureCollection.findOneAndUpdate(
        {
          _id: literature_id,
        },
        {
          $push: { literature_action: literatureAction },
          $set: updatedData,
        },
      );
      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Literature status updated" });
    } catch (error) {
      console.log("initiateAction error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message || error });
    }
  }
  async getAuditHistory(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      let literatureData = await LiteratureCollection.aggregate([
        {
          $match: {
            _id: new ObjectId(bData.literatureId),
            company_id: comp_id,
          },
        },
        {
          $project: {
            literature_action: 1,
          },
        },
        {
          $unwind: "$literature_action",
        },

        {
          $lookup: {
            from: "users", // your users collection name
            localField: "literature_action.action_user",
            foreignField: "_id",
            as: "action_user_info",
          },
        },
        {
          $unwind: {
            path: "$action_user_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "literature_action.user_name": "$action_user_info.username",
            "literature_action.role": "$action_user_info.role",
          },
        },
        {
          $sort: { "literature_action.createdAt": -1 },
        },
        {
          $group: {
            _id: "$_id",
            literature_action: { $push: "$literature_action" },
          },
        },
      ]);
      console.log(literatureData, "literatureData");
      if (!literatureData) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Cannot find the lierature",
        });
      }
      return res.status(statusCode.OK).send({
        status: true,
        data: literatureData[0],
      });
    } catch (error) {
      console.log("getAuditHistory error", error);
      return handleError(res, error, "getAuditHistory error");
    }
  }
  async getLiteratureLogs(req, res) {
    try {
      const { literatureArticleId } = req.params;

      if (!literatureArticleId) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: "Literature article id is required",
        });
      }

      const logs = await LiteratureLogCollection.aggregate([
        {
          $match: {
            literature_article_id: new mongoose.Types.ObjectId(
              literatureArticleId,
            ),
          },
        },

        {
          $lookup: {
            from: "literaturearticles",
            localField: "literature_article_id",
            foreignField: "_id",
            as: "literature",
          },
        },
        { $unwind: { path: "$literature", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "created_by",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            _id: 1,
            tab: 1,
            field: 1,

            /* ---------- OLD VALUE ---------- */
            old_value: {
              $switch: {
                branches: [
                  // if object → extract first value
                  {
                    case: { $eq: [{ $type: "$old_value" }, "object"] },
                    then: {
                      $let: {
                        vars: {
                          ov: { $objectToArray: "$old_value" },
                        },
                        in: { $arrayElemAt: ["$$ov.v", 0] },
                      },
                    },
                  },
                  // if string → return as is
                  {
                    case: { $eq: [{ $type: "$old_value" }, "string"] },
                    then: "$old_value",
                  },
                ],
                default: null,
              },
            },

            /* ---------- NEW VALUE ---------- */
            new_value: {
              $switch: {
                branches: [
                  {
                    case: { $eq: [{ $type: "$new_value" }, "object"] },
                    then: {
                      $let: {
                        vars: {
                          nv: { $objectToArray: "$new_value" },
                        },
                        in: { $arrayElemAt: ["$$nv.v", 0] },
                      },
                    },
                  },
                  {
                    case: { $eq: [{ $type: "$new_value" }, "string"] },
                    then: "$new_value",
                  },
                ],
                default: null,
              },
            },

            updated_by: "$user.username",
            literatureId: "$literature.article_id",
            createdAt: 1,
          },
        },

        { $sort: { createdAt: -1 } },
      ]);

      const sanitizeValue = (value) => {
        if (Array.isArray(value)) {
          // If array, join elements or indicate empty
          return value.length ? value.join(", ") : null;
        }

        if (value && typeof value === "object") {
          const keys = Object.keys(value);
          if (keys.length === 1) {
            // If single key object, extract the value
            const val = value[keys[0]];
            if (Array.isArray(val)) return val.length ? val.join(", ") : null;
            return val ?? null;
          }
          return JSON.stringify(value); // For multiple keys, stringify safely
        }

        return value ?? null; // Default fallback
      };

      const formattedLogs = logs.map((log) => ({
        id: log._id,
        tab: log.tab || "",
        field: log.field,
        old_value: sanitizeValue(log.old_value),
        new_value: sanitizeValue(log.new_value),
        updated_by: log.updated_by || "System",
        updated_at: log.createdAt,
        article_id: log.literatureId,
      }));

      return res.status(statusCode.OK).json({
        status: true,
        data: formattedLogs,
      });
    } catch (error) {
      console.error("getLiteratureLogs error:", error);
      return handleError(res, error, "getLiteratureLogs error");
    }
  }
}
module.exports = new LiteratureController();
