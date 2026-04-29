const createError = require("http-errors");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

require("./config/db_connection");
require("./model/usersSchema");
const app = express();

const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const literatureRoutes = require("./routes/literatureRoutes");
const chatsRoutes = require("./routes/chatRoutes");
const groupChatRoutes = require("./routes/groupChatRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const ticketManagementRoutes = require("./routes/ticketManagemnetRoutes");
const literatureProductRoutes = require("./routes/literatureProductRoutes");
const literatureUploadReviewRoutes = require("./routes/literatureReviewRoutes");
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/get/file",
  express.static(path.join(__dirname, "uploads/literatures"))
);
app.use(
  "/get/company-product-file",
  express.static(path.join(__dirname, "uploads/company-products"))
);

// Assign routes
app.use("/v1/api/", userRoutes);
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/dashboard/", dashboardRoutes);
app.use("/v1/api/article/", literatureRoutes);
app.use("/v1/api/chats/", chatsRoutes);
app.use("/v1/api/group-chats/", groupChatRoutes);
app.use("/v1/api/manage-tickets/", ticketManagementRoutes);
app.use("/v1/api/tickets/", ticketRoutes);
app.use("/v1/api/literature-product/", literatureProductRoutes);
app.use("/v1/api/literature-review/", literatureUploadReviewRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).render("404", { title: " Sorry, page not found" });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
