const queryHelper = require("../helpers/query");
const statusCode = require("../helpers/statusCode");
const sendMail = require("../helpers/sendMail");
const ticketCollection = require("../model/ticketSchema");
const UsersCollection = require("../model/usersSchema");
const ticketManagementCollection = require("../model/ticketManagementSchema");
const {generateTicketId} = require("../helpers/uniqueIdHelper");
const cloudUpload = require("../config/cloudinaryConfig");
const { ObjectId } = require("mongodb");
const { buildQuery } = require("../helpers/queryBuilder");

const { logUserActivity, logAdminActivity } = require("../helpers/logsHelper");
const handleError = require("../helpers/errorHandler");

class TicketController {
  async createTicket(req, res) {
    try {
      let bData = req.body;
      let { userId, comp_id } = res.locals.user;

      // Find user
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot find user" });
      }
      let cldRes;
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        cldRes = await cloudUpload(dataURI);
      }

      // Generate unique ticket ID
      const ticket_id = await generateTicketId(comp_id);

      const ticketData = {
        title: bData.title,
        ticket_id,
        message: bData.message,
        category_id: bData.category_id || null,
        category_name: bData.category_name || "",
        sub_category_id: bData.sub_category_id || null,
        sub_category_name: bData.sub_category_name || "",
        issue_id: bData.issue_id || null,
        issue_name: bData.issue_name || "",
        raised_by: userId,
        company_id: comp_id,
      };
      // Initialize conversation array with first message
      ticketData.conversation = [
        {
          sender: userId,
          message: bData.message || "",
          attachment: req.file ? cldRes.secure_url : "",
          createdAt: new Date(),
        },
      ];
      const newTicket = await ticketCollection.create(ticketData);

      // Log user activity
      await logUserActivity(
        userId,
        `User ${user.username} created ticket: ${bData.title}`,
        {
          ip: req.ip,
          device: req.headers["user-agent"],
        }
      );

      return res.status(statusCode.CREATED).send({
        status: true,
        message: "Ticket raised successfully",
        data: newTicket,
      });
    } catch (err) {
      console.log("Error creating ticket:", err);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Internal server error" });
    }
  }
  async getAllTickets(req, res) {
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

      const { query, page, limit } = buildQuery(req.query, user, {
        company_id: comp_id,
        isDeleted: false,
      });

      const totalCount = await ticketCollection.countDocuments(query);

      const tickets = await ticketCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("raised_by", "username email role")
        .populate("assigned_to", "username email role");

      return res.status(200).send({
        status: true,
        data: { tickets, totalCount },
        message: "Fetched successfully",
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async getCompBasedCategory(req, res) {
    try {
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
      let categoryData = await ticketManagementCollection.find({
        company_id: comp_id,
      });
      console.log(categoryData, "categoryData");
      if (!categoryData) {
        return res.status(statusCode.NOT_FOUND).send({
          status: false,
          message: "There is no category on file. check with your admin",
        });
      }
      return res.status(statusCode.OK).send({
        status: true,
        data: categoryData,
        message: "Successfully fetched",
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .json({ status: false, message: "Internal server error" });
    }
  }
  async getTicket(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let { ticketId } = req.query;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found user" });
      }
      const ticketData = await ticketCollection
        .findOne({ _id: ticketId })
        .populate([
          { path: "conversation.sender", select: "username email" },
          { path: "raised_by", select: "username email" },
          { path: "assigned_to", select: "username email" },
        ]);

      if (!ticketData)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Ticket not found" });

      res.status(statusCode.OK).send({
        status: true,
        message: "Reply added successfully",
        data: ticketData,
      });
    } catch (error) {
      console.error("Error fetching getTicket:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .json({ status: false, message: "Internal server error" });
    }
  }
  async replyMessage(req, res) {
    try {
      let { message, ticket_id } = req.body;
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
      const newMessage = {
        sender: userId,
        message,
        createdAt: new Date(),
      };
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        let cldRes = await cloudUpload(dataURI);
        newMessage.attachment = cldRes.secure_url;
      }
      const updatedTicket = await ticketCollection
        .findByIdAndUpdate(
          ticket_id,
          { $push: { conversation: newMessage } },
          { new: true }
        )
        .populate("conversation.sender", "username");

      if (!updatedTicket)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Ticket not found" });

      res.status(statusCode.OK).send({
        status: true,
        message: "Reply added successfully",
        data: updatedTicket,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Internal server error" });
    }
  }
  async getAdmins(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }
      let admins = await UsersCollection.find({
        company_id: comp_id,
        role: 1,
      });
      return res.status(statusCode.OK).send({
        status: true,
        message: "Fetched successfully",
        data: admins,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Internal server error" });
    }
  }
  async updateTicket(req, res) {
    try {
      const { ticket_id, status, assigned_to } = req.body;
      let { userId, comp_id } = res.locals.user;

      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: false, message: "Cannot found admin" });
      }
      // Only update fields if they are provided
      const updateData = {};
      if (status) updateData.status = status;
      if (assigned_to) updateData.assigned_to = assigned_to;
      if (assigned_to === undefined) {
        updateData.status = "Open";
        updateData.assigned_to = null;
      }
      const updatedTicket = await ticketCollection
        .findByIdAndUpdate(ticket_id, updateData, {
          new: true,
        })
        .populate("raised_by", "username")
        .populate("assigned_to", "username");

      return res
        .status(statusCode.OK)
        .send({ status: true, data: updatedTicket });
    } catch (error) {
      console.error("Error updateTicket:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Internal server error" });
    }
  }
  async ticketKPI(req, res) {
    try {
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

      const query =
        user.role === 1
          ? { company_id: comp_id, isDeleted: false }
          : {
              raised_by: new ObjectId(userId),
              company_id: comp_id,
              isDeleted: false,
            };
      console.log(query, "csacasc");
      const tickets = await ticketCollection.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const counts = {
        Open: 0,
        InProgress: 0,
        ReOpen: 0,
        Closed: 0,
      };

      tickets.forEach((t) => {
        counts[t._id] = t.count;
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      return res.status(statusCode.OK).send({
        status: true,
        message: "Ticket KPI fetched successfully",
        data: { ...counts, total },
      });
    } catch (error) {
      console.error("Error updateTicket:", error);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Internal server error" });
    }
  }
}

module.exports = new TicketController();
