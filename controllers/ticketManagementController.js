const statusCode = require("../helpers/statusCode");
const ticketManagementCollection = require("../model/ticketManagementSchema");
const UsersCollection = require("../model/usersSchema");

class TicketManagementController {
  async createCategory(req, res) {
    try {
      const { name } = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Cannot found admin" });
      }
      if (!name) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Category name are required" });
      }
      const category = await ticketManagementCollection.create({
        company_id: comp_id,
        name,
        created_by: userId,
      });
      res.status(statusCode.CREATED).send({ status: true, data: category });
    } catch (err) {
      console.error("Error creating category:", err);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: err.message });
    }
  }
  async getAllCategories(req, res) {
    try {
      let { userId, comp_id } = res.locals.user;

      // Check if admin
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res.status(statusCode.UNAUTHORIZED).send({
          status: false,
          message: "Cannot find admin",
        });
      }

      // Query params
      const {
        page = 1,
        limit = 10,
        category = "",
        subCategory = "",
        issue = "",
        priority = "",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const baseMatch = {
        company_id: comp_id,
        is_deleted: false,
      };
      const filterStages = [];

      // Filter by priority
      if (priority) {
        filterStages.push({
          $match: {
            $or: [
              { priority },
              { "subCategories.priority": priority },
              { "subCategories.issues.priority": priority },
            ],
          },
        });
      }

      // Filter by category name
      if (category) {
        filterStages.push({
          $match: { name: new RegExp(category, "i") },
        });
      }

      // Filter by subcategory name
      if (subCategory) {
        filterStages.push({
          $match: { "subCategories.name": new RegExp(subCategory, "i") },
        });
      }

      // Filter by issue name
      if (issue) {
        filterStages.push({
          $match: { "subCategories.issues.name": new RegExp(issue, "i") },
        });
      }

      const dataPipeline = [
        { $match: baseMatch },
        ...filterStages,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ];

      const countPipeline = [
        { $match: baseMatch },
        ...filterStages,
        { $count: "total" },
      ];
      const [categories, totalCountResult] = await Promise.all([
        ticketManagementCollection.aggregate(dataPipeline),
        ticketManagementCollection.aggregate(countPipeline),
      ]);

      const totalCount = totalCountResult[0]?.total || 0;
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      return res.status(statusCode.OK).send({
        status: true,
        message: "Categories fetched successfully",
        data: categories,
        totalCount,
        currentPage: parseInt(page),
        totalPages,
      });
    } catch (error) {
      console.error("Error fetch category:", error);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: error.message });
    }
  }

  async createSubCategory(req, res) {
    try {
      const { categoryId, name } = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Cannot found admin" });
      }
      if (!categoryId || !name) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "categoryId and name are required" });
      }

      const category = await ticketManagementCollection.findByIdAndUpdate(
        categoryId,
        { $push: { subCategories: { name } } },
        { new: true }
      );

      if (!category)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "Category not found" });

      res.status(statusCode.CREATED).send({ status: true, data: category });
    } catch (err) {
      console.error("Error creating sub category:", err);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: err.message });
    }
  }
  async addIssue(req, res) {
    try {
      const { categoryId, subCategoryId, name } = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Cannot found admin" });
      }
      if (!categoryId || !subCategoryId || !name) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "categoryId, sub categoryId and name are required",
        });
      }

      const category = await ticketManagementCollection.findOneAndUpdate(
        { _id: categoryId, "subCategories._id": subCategoryId },
        { $push: { "subCategories.$.issues": { name } } },
        { new: true }
      );

      if (!category)
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "SubCategory not found" });

      return res
        .status(statusCode.CREATED)
        .send({ status: true, data: category });
    } catch (err) {
      console.error("Error creating issue:", err);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: err.message });
    }
  }
  async updatePriority(req, res) {
    try {
      const { categoryId, level, itemId } = req.params;
      const { priority } = req.body;
      let { userId, comp_id } = res.locals.user;
      let user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Cannot found admin" });
      }
      let timeline;
      if (priority == "urgent") {
        timeline = 1;
      } else if (priority === "high") {
        timeline = 3;
      } else if (priority === "medium") {
        timeline = 5;
      } else if (priority === "low") {
        timeline = 7;
      } else {
        timeline = 0;
      }
      if (level === "category") {
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId },
          {
            $set: { priority, timeline },
          }
        );
      } else if (level === "subCategory") {
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId, "subCategories._id": itemId },
          {
            $set: {
              "subCategories.$.priority": priority,
              "subCategories.$.timeline": timeline,
              priority: "",
            },
          }
        );
      } else if (level === "issue") {
        const categoryDoc = await ticketManagementCollection.findOne(
          {
            _id: categoryId,
            "subCategories.issues._id": itemId,
          },
          { "subCategories.$": 1 }
        );
        const subCategoryId = categoryDoc?.subCategories?.[0]?._id;
        if (!subCategoryId) throw new Error("Subcategory not found");
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId, "subCategories._id": subCategoryId },
          { $set: { "subCategories.$.priority": "" } }
        );
        await ticketManagementCollection.findOneAndUpdate(
          {
            _id: categoryId,
          },
          {
            $set: {
              priority: "",
            },
          }
        );
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId, "subCategories.issues._id": itemId },
          {
            $set: {
              "subCategories.$[].issues.$[i].priority": priority,
              "subCategories.$[].issues.$[i].timeline": timeline,
            },
          },
          { arrayFilters: [{ "i._id": itemId }] }
        );
      }
      return res.status(statusCode.OK).send({
        status: true,
        message: "Priority updated successfully",
        timeline,
      });
    } catch (err) {
      console.error("Error update Priority:", err);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: err.message });
    }
  }
  async updateName(req, res) {
    try {
      const { name, categoryId, level, itemId } = req.body;
      const { userId, comp_id } = res.locals.user;

      // Validate admin
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
        role: 1,
      });
      if (!user) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Cannot find admin" });
      }

      if (!name?.trim()) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Name is required" });
      }

      if (level === "category") {
        // Update category name
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId },
          { $set: { name: name.trim() } }
        );
      } else if (level === "subCategory") {
        // Update subCategory name
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId, "subCategories._id": itemId },
          { $set: { "subCategories.$.name": name.trim() } }
        );
      } else if (level === "issue") {
        // Find subcategory containing the issue
        const categoryDoc = await ticketManagementCollection.findOne(
          {
            _id: categoryId,
            "subCategories.issues._id": itemId,
          },
          { "subCategories.$": 1 }
        );

        const subCategoryId = categoryDoc?.subCategories?.[0]?._id;
        if (!subCategoryId) {
          throw new Error("Subcategory not found for the issue");
        }

        // Update issue name
        await ticketManagementCollection.findOneAndUpdate(
          { _id: categoryId },
          {
            $set: {
              "subCategories.$[].issues.$[i].name": name.trim(),
            },
          },
          { arrayFilters: [{ "i._id": itemId }] }
        );
      } else {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Invalid level provided" });
      }

      return res.status(statusCode.OK).send({
        status: true,
        message: "Name updated successfully",
      });
    } catch (err) {
      console.error("Error updating name:", err);
      return res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: err.message });
    }
  }
}
module.exports = new TicketManagementController();
