const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const UsersCollection = mongoose.model("user");
const { ObjectId } = require("mongodb");
const literatureArticleCollection = require("../model/LiteratureArticleSchema");
const queryHelper = require("../helpers/query");
const statusCode = require("../helpers/statusCode");
const {
  logUserActivity,
  logAdminActivity,
  logLiteratureActivity,
} = require("../helpers/logsHelper");
const { buildQuery } = require("../helpers/queryBuilder");
const LiteratureReviewCollection = require("../model/LiteratureReviewSchema");
const handleError = require("../helpers/errorHandler");
const LiteratureTemplateSetting = require("../model/literatureTemplateConfigSchema");

class LiteratureReviewController {
  async createOrUpdateTemplateSetting(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const { search_engine, mapping, remarks, status, other_source } =
        req.body;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      if (!search_engine || !mapping) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "search_engine and mapping are required",
        });
      }

      /* ---------------------------------
                CHECK DUPLICATE
    ----------------------------------*/
      let existing;

      if (other_source) {
        existing = await LiteratureTemplateSetting.findOne({
          company_id: comp_id,
          search_engine,
          other_source,
          isDeleted: false,
        });
      } else {
        existing = await LiteratureTemplateSetting.findOne({
          company_id: comp_id,
          search_engine,
          isDeleted: false,
        });
      }
      if (existing) {
        return res.status(statusCode.BAD_REQUEST).json({
          status: false,
          message: `Template mapping already exists for ${search_engine}`,
          data: existing,
        });
      }

      /* ---------------------------------
            CREATE NEW
    ----------------------------------*/
      const setting = new LiteratureTemplateSetting({
        company_id: comp_id,
        search_engine,
        other_source,
        remarks,
        status,
        currentVersion: 1,
        mapping,
        createdBy: userId,
      });

      await setting.save();
      await logAdminActivity(
        userId,
        "CREATE_MAPPING",
        setting._id,
        `Admin ${adminUser.username} create a template ${
          other_source ? other_source : search_engine
        }`,
      );

      return res.status(statusCode.CREATED).json({
        status: true,
        message: "Template mapping created successfully",
        data: setting,
      });
    } catch (error) {
      console.error("createTemplateSetting error", error);
      if (error.code === 11000) {
        const duplicateFields = error.keyValue;
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: `Template setting already exists for company "${duplicateFields.company_id}" and search engine "${duplicateFields.search_engine}"`,
        });
      }

      return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Server error",
      });
    }
  }
  async getLiteratureTemplateSettings(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      /* ---------------------------------
       Validate User
    ----------------------------------*/
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!user) {
        return res.status(403).send({
          status: false,
          message: "Cannot find user",
        });
      }

      /* ---------------------------------
       Build Query (Common Logic)
    ----------------------------------*/
      const { query, page, limit, sort } = buildQuery(
        req.query,
        user,
        {
          company_id: comp_id,
          isDeleted: false,
        },
        1,
      );

      // // SPECIAL CASE: createdBy text search
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

      /* ---------------------------------
       Status Filter (Active / Inactive)
    ----------------------------------*/
      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      console.log(query, "queryquery");
      /* ---------------------------------
       Total Count
    ----------------------------------*/
      const totalCount = await LiteratureTemplateSetting.countDocuments(query);

      /* ---------------------------------
       Fetch Records
    ----------------------------------*/
      const templates = await LiteratureTemplateSetting.find(query)
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
      console.error("getLiteratureTemplateSettings error", error);
      return handleError(res, error, "getLiteratureTemplateSettings error");
    }
  }
  async listUploadedHistory(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;

      // Extract query parameters
      let { page = 1, limit = 10, fromDate = "", toDate = "" } = req.query;

      page = Number(page);
      limit = Number(limit);

      // Build MongoDB filters
      let filter = { company_id: comp_id };

      // Apply date range
      if (fromDate && toDate) {
        filter.createdAt = {
          $gte: new Date(fromDate + "T00:00:00.000Z"),
          $lte: new Date(toDate + "T23:59:59.999Z"),
        };
      } else if (fromDate) {
        filter.createdAt = {
          $gte: new Date(fromDate + "T00:00:00.000Z"),
        };
      } else if (toDate) {
        filter.createdAt = {
          $lte: new Date(toDate + "T23:59:59.999Z"),
        };
      }

      // Count total documents (for pagination)
      const totalCount =
        await LiteratureReviewCollection.countDocuments(filter);

      // Paginated data
      const uploadedHistory = await LiteratureReviewCollection.find(filter)
        .populate("creator_user_id", "username")
        .sort({ createdAt: -1 }) // latest first
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const recordsWithDownload = uploadedHistory.map((item) => ({
        ...item,
        download_link: `${process.env.BASE_URL}/get/file/${item.saved_file_name}`,
      }));

      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: {
          records: recordsWithDownload,
          totalCount,
          page,
          limit,
        },
      });
    } catch (error) {
      console.log("listUploadedHistory error", error);
      return handleError(res, error, "listUploadedHistory error");
    }
  }

  async updateTemplateSetting(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;

      const { search_engine, mapping, remarks, status, other_source } =
        req.body;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }

      /* -----------------------------
       Validation
    ------------------------------*/
      if (!search_engine || !mapping) {
        return res.status(statusCode.NOT_FOUND).json({
          status: false,
          message: "search_engine and mapping are required",
        });
      }

      /* -----------------------------
       Find Existing Setting
    ------------------------------*/
      const setting = await LiteratureTemplateSetting.findOne({
        company_id: comp_id,
        search_engine,
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
      setting.other_source = other_source ?? setting.other_source;

      // Increment version
      setting.currentVersion = (setting.currentVersion || 1) + 1;

      setting.createdBy = userId; // track last editor

      await setting.save();
      await logAdminActivity(
        userId,
        "UPDATE_MAPPING",
        setting._id,
        `Admin ${adminUser.username} update a template ${
          other_source ? other_source : search_engine
        }`,
      );

      return res.status(statusCode.OK).json({
        status: true,
        message: "Template setting updated successfully",
        data: setting,
      });
    } catch (error) {
      // console.error("updateTemplateSetting error", error);

      // Handle duplicate key edge case (just in case)
      if (error.code === 11000) {
        return res.status(statusCode.FORBIDDEN).json({
          status: false,
          message: "Template setting already exists for this search engine",
        });
      }
      return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Server error",
      });
    }
  }
  async getActiveTemplates(req, res) {
    try {
      const { userId, comp_id } = res.locals.user;
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        isDeleted: false,
      });

      if (!user) {
        return res.status(403).send({
          status: false,
          message: "Cannot find user",
        });
      }
      const activeTemplates = await LiteratureTemplateSetting.find({
        company_id: comp_id,
        status: 0,
      }).populate("createdBy", "username email role");
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: activeTemplates,
      });
    } catch (error) {
      console.log("getActiveTemplates error", error);
      return handleError(res, error, "getActiveTemplates error");
    }
  }
}

module.exports = new LiteratureReviewController();
