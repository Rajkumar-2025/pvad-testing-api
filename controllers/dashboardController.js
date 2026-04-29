const mongoose = require("mongoose");
const UsersCollection = mongoose.model("user");
const AdminAuditLogs = require("../model/adminActivitySchema");
const UserAuditLogs = require("../model/userActivitySchema");
const { validationResult } = require("express-validator");
const queryHelper = require("../helpers/query");
const statusCode = require("../helpers/statusCode");
const sendMail = require("../helpers/sendMail");
const bcrypt = require("bcrypt");
const { logAdminActivity, logUserActivity } = require("../helpers/logsHelper");
const { buildQuery } = require("../helpers/queryBuilder");
const handleError = require("../helpers/errorHandler");
const LiteratureArticles = require("../model/LiteratureArticleSchema");
const ProductsCollection = require("../model/productSchema");
const SiteSettingCollection = require("../model/SiteSettingSchema");
const LiteratureReviewCollection = require("../model/LiteratureReviewSchema");
const PDFDocument = require("pdfkit");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");

class DashboardController {
  async getUsers(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne(
        { _id: userId },
        {
          refresh_token: 0,
          otp: 0,
          password: 0,
          admin_id: 0,
          otp_status: 0,
          // _id: 0,
        },
      );
      if (!userData) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });
      }

      // console.log(userData, "userData");
      return res
        .status(statusCode.OK)
        .send({ data: userData, message: "Fetched User" });
    } catch (error) {
      console.log("getUsers error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error });
    }
  }
  async updateUserDetails(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let bData = req.body;
      if (!userId && !comp_id)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "cannot found user" });

      let updateUserDetails = await UsersCollection.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            job_title: bData.job_title,
            address: bData.address,
          },
        },
      );
      await logUserActivity(
        userId,
        `UPDATE DETAILS as Job title : ${bData.job_title}, Address : ${bData.address} `,
        {
          ip: req.ip,
          device: req.headers["user-agent"],
        },
      );
      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Updated successfully..." });
    } catch (error) {
      console.log("updateUserDetails error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error });
    }
  }
  // async addUserManually(req, res) {
  //   try {
  //     let bData = req.body;
  //     let { userId, comp_id } = res.locals.user;
  //     let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
  //     if (!adminUser) {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: false, message: "Cannot found admin" });
  //     }
  //     // const hashedPassword = await bcrypt.hash(bData.password, 10);
  //     let dbData = {
  //       admin_id: userId,
  //       username: bData.username,
  //       job_title: bData.jobTitle,
  //       company_name: adminUser.company_name,
  //       address: bData.address,
  //       email: bData.email.toLowerCase().trim(),
  //       // password: hashedPassword,
  //       company_id: comp_id,
  //       auth_status: bData.auth_status,
  //       role: bData.role == "operation" ? 2 : 1,
  //       status: bData.active_status == true ? 0 : 1,
  //     };
  //     // console.log(dbData, "dbData");
  //     // return;
  //     let addUsers = await queryHelper.insertData(UsersCollection, dbData);
  //     if (addUsers.status) {
  //       const resetToken = jwt.sign(
  //         { id: addUsers.msg._id },
  //         process.env.SECRET_KEY,
  //         {
  //           expiresIn: "15m",
  //         },
  //       );

  //       const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  //       let htmlContent = `<h2>Create Password</h2>
  //       <h2>Company ID : ${comp_id}</h2>
  //               <p>Click the link below to reset your password:</p>
  //               <a href="${resetLink}">Click to create a password</a>
  //               <p>This link expires in 15 minutes.</p>`;
  //       let mail = sendMail(
  //         bData.email,
  //         "This is your Password creation with company ID",
  //         htmlContent,
  //       );
  //       await logAdminActivity(
  //         userId,
  //         "ADD_USER",
  //         addUsers.msg._id,
  //         `Admin ${adminUser.username} create a user ${dbData.username}`,
  //       );
  //       return res.status(statusCode.CREATED).send({
  //         status: addUsers.status,
  //         message: "User created successfully...",
  //       });
  //     } else {
  //       return res
  //         .status(statusCode.FORBIDDEN)
  //         .send({ status: addUsers.status, message: addUsers.msg });
  //     }
  //   } catch (error) {
  //     console.log("addUserManually error", error);
  //     return res
  //       .status(statusCode.FORBIDDEN)
  //       .send({ status: false, message: error });
  //   }
  // }
  async addUserManually(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res.status(statusCode.FORBIDDEN).send({
          status: false,
          message: "Cannot found admin",
        });
      }

      bData.email = bData.email.toLowerCase().trim();

      const existingUser = await UsersCollection.findOne({
        email: bData.email,
        company_id: comp_id,
        isDeleted: false,
      });

      if (existingUser) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "User with this email already exists in this company",
        });
      }

      let dbData = {
        admin_id: userId,
        username: bData.username,
        job_title: bData.jobTitle,
        company_name: adminUser.company_name,
        address: bData.address,
        email: bData.email,
        company_id: comp_id,
        auth_status: bData.auth_status,
        role: bData.role === "operation" ? 2 : 1,
        status: bData.active_status === true ? 0 : 1,
      };

      let addUsers = await queryHelper.insertData(UsersCollection, dbData);

      if (addUsers.status) {
        const resetToken = jwt.sign(
          { id: addUsers.msg._id },
          process.env.SECRET_KEY,
          { expiresIn: "15m" },
        );

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        let htmlContent = `
        <h2>Create Password</h2>
        <h3>Company ID : ${comp_id}</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Click to create a password</a>
        <p>This link expires in 15 minutes.</p>
      `;

        await sendMail(
          bData.email,
          "This is your Password creation with company ID",
          htmlContent,
        );

        await logAdminActivity(
          userId,
          "ADD_USER",
          addUsers.msg._id,
          `Admin ${adminUser.username} created user ${dbData.username}`,
        );

        return res.status(statusCode.CREATED).send({
          status: true,
          message: "User created successfully",
        });
      }

      return res.status(statusCode.BAD_REQUEST).send({
        status: false,
        message: addUsers.msg,
      });
    } catch (error) {
      console.error("addUserManually error:", error);

      if (error.code === 11000) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "User with this email already exists in this company",
        });
      }

      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async checkCurrentPassword(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;
      let userData = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!userData) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      const isMatch = await bcrypt.compare(
        bData.currentPassword,
        userData.password,
      );
      if (!isMatch) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Incorrect password" });
      }
      return res
        .status(statusCode.OK)
        .send({ status: true, message: "Current password verified" });
    } catch (error) {
      console.log("checkCurrentPassword error", error.message);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message });
    }
  }
  async changePassword(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let { newPassword } = req.body;

      let userData = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!userData) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      userData.password = hashedPassword;
      await userData.save();
      await logUserActivity(userData._id, `UPDATE PASSWORD as ${newPassword}`, {
        ip: req.ip,
        device: req.headers["user-agent"],
      });
      return res.status(statusCode.OK).send({
        status: true,
        message: "Password changed successful.",
      });
    } catch (error) {
      console.log("changePassword error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message });
    }
  }
  async getUsersForAdmin(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
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
      let queryParams = req.query;
      // queryParams.status =
      //   queryParams.status === "Active"
      //     ? (queryParams.status = 0)
      //     : (queryParams.status = 1);
      const { query, page, limit, sort } = buildQuery(queryParams, adminUser, {
        company_id: comp_id,
      });
      if (req.query.status) {
        query.status = req.query.status === "Active" ? 0 : 1;
      }
      // console.log(query, "queryParams");
      if (req.query.searchField === "role" && req.query.search) {
        const s = String(req.query.search).trim().toLowerCase();

        let codes = [];
        if ("admin".startsWith(s)) codes.push(1);
        if ("operation".startsWith(s)) codes.push(2);

        if (codes.length === 0) {
          return res.status(200).send({
            status: true,
            message: "Fetched successfully",
            data: { templates: [], totalCount: 0 },
          });
        }

        query.role = codes.length === 1 ? codes[0] : { $in: codes };
      }

      const totalCount = await UsersCollection.countDocuments(query);
      const Users = await UsersCollection.find(query, {
        otp: 0,
        otp_status: 0,
        password: 0,
        refresh_token: 0,
      })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      return res.status(200).send({
        status: true,
        data: { Users, totalCount },
        message: "Fetched successfully",
      });
    } catch (error) {
      console.log("getUsersForAdmin error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error.message });
    }
  }
  async editUser(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find admin" });
      }

      let updateData = {
        admin_id: userId,
        username: bData.username,
        job_title: bData.jobTitle,
        company_name: adminUser.company_name,
        address: bData.address,
        email: bData.email,
        company_id: comp_id,
        auth_status: bData.auth_status,
        role: bData.role === "operation" ? 2 : 1,
      };

      if (bData.password && bData.password.trim() !== "") {
        updateData.password = await bcrypt.hash(bData.password, 10);
      }

      const existingUser = await UsersCollection.findById(bData._id);
      if (!existingUser) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "User not found" });
      }

      if (bData.active_status !== undefined) {
        updateData.status = bData.active_status === true ? 0 : 1;

        if (existingUser.status !== updateData.status) {
          updateData.in_active_date =
            updateData.status === 1 ? new Date() : null;
        }
      }
      let updatedUser = await UsersCollection.findByIdAndUpdate(
        bData._id,
        { $set: updateData },
        { new: true },
      );

      if (updatedUser) {
        if (bData.password && bData.password.trim() !== "") {
          let message = `
          <h1>${comp_id}</h1>
          <h2>Your one-time login password: ${bData.password}</h2>
          <p>Kindly update the password once you log in...</p>`;
          await sendMail(
            bData.email,
            "This is your company ID and updated password",
            message,
          );
        }
        await logAdminActivity(
          userId,
          "EDIT_USER",
          updatedUser._id,
          `Admin ${adminUser.username} edited user ${updatedUser.username}`,
        );

        if (existingUser.status !== updatedUser.status) {
          await logAdminActivity(
            userId,
            updatedUser.status === 1 ? "DEACTIVATE_USER" : "ACTIVATE_USER",
            updatedUser._id,
            `Admin ${adminUser.username} ${
              updatedUser.status === 1 ? "deactivated" : "activated"
            } user ${updatedUser.username}`,
          );
        }
        return res.status(statusCode.OK).send({
          status: true,
          message: "User updated successfully...",
          data: updatedUser,
        });
      } else {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "User update failed" });
      }
    } catch (error) {
      console.log("editUser error", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }

  // =========== AUDIT LOG CONTROLLER STARTS ===========//
  async getHistory(req, res) {
    // try {
    //   const { id } = req.params;
    //   const { type, page = 1, limit = 20 } = req.query;

    //   if (!id) {
    //     return res.status(statusCode.BAD_REQUEST).send({
    //       status: false,
    //       message: "User ID is required",
    //     });
    //   }

    //   const skip = (Number(page) - 1) * Number(limit);

    //   let Model = UserAuditLogs;
    //   let query = { user_id: id };

    //   if (type === "admin") {
    //     Model = AdminAuditLogs;
    //     query = { admin_id: id };
    //   }

    //   const logs = await Model.find(query)
    //     .sort({ created_at: -1 })
    //     .skip(skip)
    //     .limit(Number(limit))
    //     .lean();

    //   const total = await Model.countDocuments(query);

    //   return res.status(statusCode.OK).send({
    //     status: true,
    //     logs,
    //     hasMore: skip + logs.length < total,
    //   });
    // } catch (error) {
    //   console.log("getHistory error", error);
    //   return res
    //     .status(statusCode.INTERNAL_SERVER_ERROR)
    //     .send({ status: false, message: error.message });
    // }
    try {
      const { id } = req.params;
      const { type, page = 1, limit = 20 } = req.query;

      if (!id) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "User ID is required",
        });
      }

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      let Model = UserAuditLogs;
      let query = { user_id: id };

      if (type === "admin") {
        Model = AdminAuditLogs;
        query = { admin_id: id };
      }

      /* -------------------------
       Fetch Logs
    --------------------------*/
      const logs = await Model.find(query)
        .sort({ created_at: -1 }) // keep consistent
        .skip(skip)
        .limit(limitNum)
        .lean();

      /* -------------------------
       Total Count
    --------------------------*/
      const totalCount = await Model.countDocuments(query);

      return res.status(statusCode.OK).send({
        status: true,
        logs,
        totalCount, // ✅ required for table pagination
      });
    } catch (error) {
      console.log("getHistory error", error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: error.message,
      });
    }
  }
  async downloadAuditLogsPDF(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.query;

      let Model;
      let query;

      if (type === "admin") {
        Model = AdminAuditLogs;
        query = { admin_id: id };
      } else {
        Model = UserAuditLogs;
        query = { user_id: id };
      }

      const logs = await Model.find(query).sort({ created_at: -1 }).lean();

      let user = await UsersCollection.findOne({ _id: id });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find user" });
      }

      /* --------------------------
       Create Workbook
    ---------------------------*/
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Audit Logs");

      /* --------------------------
       Define Columns
    ---------------------------*/
      const columns = [{ header: "Action", key: "action", width: 25 }];

      if (type === "admin") {
        columns.push({
          header: "Description",
          key: "description",
          width: 40,
        });
      }

      columns.push(
        { header: "IP Address", key: "ip", width: 20 },
        { header: "Device", key: "device", width: 40 },
        { header: "Date (UTC)", key: "date", width: 25 },
      );

      worksheet.columns = columns;

      /* --------------------------
       Add Rows
    ---------------------------*/
      logs.forEach((log) => {
        worksheet.addRow({
          action: log.action,
          description: log.description || "",
          ip: log.metadata?.ip || "",
          device: log.metadata?.device || "",
          date: new Date(log.created_at).toUTCString(),
        });
      });

      /* --------------------------
       Header Styling
    ---------------------------*/
      worksheet.getRow(1).font = { bold: true };

      /* --------------------------
       Response Headers
    ---------------------------*/
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${user.username}-audit-trail-${Date.now()}.xlsx`,
      );

      /* --------------------------
       Stream Excel
    ---------------------------*/
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.log("Excel generation error", error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).send({
        status: false,
        message: error.message,
      });
    }
  }
  // =========== AUDIT LOG CONTROLLER ENDS ===========//

  async usersKPI(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;

      let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      if (!adminUser) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find admin" });
      }

      const userKPI = await UsersCollection.aggregate([
        { $match: { company_id: comp_id } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            operationUsers: {
              $sum: { $cond: [{ $eq: ["$role", 2] }, 1, 0] },
            },
            adminUsers: {
              $sum: { $cond: [{ $eq: ["$role", 1] }, 1, 0] },
            },
            activeUsers: {
              $sum: { $cond: [{ $eq: ["$status", 0] }, 1, 0] },
            },
            inactiveUsers: {
              $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] },
            },
          },
        },
        { $project: { _id: 0 } },
      ]);

      const usersData = userKPI[0] || {
        totalUsers: 0,
        operationUsers: 0,
        adminUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
      };

      let companySetting = await SiteSettingCollection.findOne({
        company_id: comp_id,
      });

      const allowedUploads =
        companySetting?.subscription?.limits?.literatureArticles || 0;

      const totalUploadsAgg = await LiteratureReviewCollection.aggregate([
        { $match: { company_id: `${comp_id}` } },
        {
          $group: {
            _id: null,
            total_uploads: { $sum: "$total_rows" },
          },
        },
      ]);

      const totalUploads = totalUploadsAgg[0]?.total_uploads || 0;

      return res.status(statusCode.OK).send({
        status: true,
        data: {
          ...usersData,
          allowedUploads,
          totalUploads,
        },
      });
    } catch (error) {
      console.log("usersKPI error", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }
  async dashboardMetrics(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      //  let adminUser = await UsersCollection.findOne({ _id: userId, role: 1 });
      // if (!adminUser) {
      //   return res
      //     .status(statusCode.FORBIDDEN)
      //     .send({ status: false, message: "Cannot find admin" });
      // }

      // KPI Queries (parallel execution)
      const [totalUsers, activeUsers] = await Promise.all([
        UsersCollection.countDocuments({ company_id: comp_id }),
        UsersCollection.countDocuments({
          company_id: comp_id,
          // isDeleted: false,
          status: 0,
        }),
      ]);

      return res.status(statusCode.OK).send({
        status: true,
        message: "Dashboard metrics fetched successfully",
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
          },
        },
      });
    } catch (error) {
      console.error("dashboard Metrics error", error);
      return handleError(res, error, "dashboard Metrics error");
    }
  }

  // =========== DASHBOARD KPI METRICS ===========//
  async getOverAllMetrics(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      const metrics = await LiteratureReviewCollection.aggregate([
        {
          $match: {
            company_id: comp_id,
          },
        },
        {
          $group: {
            _id: null,
            total_rows: { $sum: "$total_rows" },
            deduplicate_rows: { $sum: "$deduplicate_rows" },
            follow_up_rows: { $sum: "$follow_up_rows" },
            drug_mismatch: { $sum: "$drug_mismatch" },
            ICSR_rows: { $sum: "$ICSR_rows" },
            other_safety_rows: { $sum: "$other_safety_rows" },
            pre_clinical_rows: { $sum: "$pre_clinical_rows" },
            non_relevant_rows: { $sum: "$non_relevant_rows" },
            unclassified_rows: { $sum: "$unclassified_rows" },
            ai_classification_date_time: {
              $sum: "$ai_classification_date_time",
            },
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
      ]);
      const statusMetrics = await LiteratureArticles.aggregate([
        {
          $match: {
            company_id: comp_id,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$assessment_status",
            count: { $sum: 1 },
          },
        },
      ]);

      const statusKpi = {
        draft: 0,
        review: 0,
        archive: 0,
        total: 0,
      };

      const classificationStatusKpi = {
        ICSR_rows: 10,
        other_safety_rows: 10,
        pre_clinical_rows: 10,
        non_relevant_rows: 10,
        unclassified_rows: 10,
        total_classified: 50,
      };

      const categoryMetrics = {
        total_categories: 0,
        deduplicate_rows: 0,
        follow_up_rows: 0,
        drug_mismatch: 0,
      };

      statusMetrics.forEach((item) => {
        if (item._id === 0) statusKpi.draft = item.count;
        if (item._id === 1) statusKpi.review = item.count;
        if (item._id === 2) statusKpi.archive = item.count;
        statusKpi.total += item.count;
      });
      metrics.forEach((item) => {
        classificationStatusKpi.ICSR_rows += item.ICSR_rows || 0;
        classificationStatusKpi.other_safety_rows +=
          item.other_safety_rows || 0;
        classificationStatusKpi.pre_clinical_rows +=
          item.pre_clinical_rows || 0;
        classificationStatusKpi.non_relevant_rows +=
          item.non_relevant_rows || 0;
        classificationStatusKpi.unclassified_rows +=
          item.unclassified_rows || 0;
        classificationStatusKpi.total_classified += item.total_rows || 0;
        categoryMetrics.deduplicate_rows += item.deduplicate_rows || 0;
        categoryMetrics.follow_up_rows += item.follow_up_rows || 0;
        categoryMetrics.drug_mismatch += item.drug_mismatch || 0;
        categoryMetrics.total_categories += item.total_rows || 0;
      });

      const [totalUsers, activeUsers] = await Promise.all([
        UsersCollection.countDocuments({ company_id: comp_id }),
        UsersCollection.countDocuments({
          company_id: comp_id,
          // isDeleted: false,
          status: 0,
        }),
      ]);
      return res.status(statusCode.OK).json({
        success: true,
        data: {
          ...(metrics[0] || {
            total_rows: 0,
            deduplicate_rows: 0,
            follow_up_rows: 0,
            ICSR_rows: 0,
            other_safety_rows: 0,
            pre_clinical_rows: 0,
            non_relevant_rows: 0,
            unclassified_rows: 0,
            ai_classification_date_time: 0,
          }),
          status_kpi: statusKpi,
          users: {
            total: totalUsers,
            active: activeUsers,
          },
          classification_kpi: classificationStatusKpi,
          category_metrics: categoryMetrics,
        },
      });
    } catch (error) {
      console.error("getOverAllMetrics error", error);
      return handleError(res, error, "getOverAllMetrics error");
    }
  }
}

module.exports = new DashboardController();
