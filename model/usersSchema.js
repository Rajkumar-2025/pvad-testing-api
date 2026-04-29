const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    tax_id: { type: String, default: "" },
    job_title: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      match: [
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\. [0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please add a valid email address.",
      ],
      required: [true, "Please enter Email Address"],
      lowercase: true,
      trim: true,
    },
    phone_no: {
      type: String,
      default: "",
    },
    password: {
      type: String,
    },
    company_id: {
      type: String,
      required: true,
    },
    company_name: {
      type: String,
    },
    auth_status: {
      type: Boolean,
      default: false,
    },
    refresh_token: {
      type: String,
      default: "",
    },
    role: {
      type: Number,
      default: 1, // 0 - Super admin , 1 - company admins, 2 - operation
    },
    otp: {
      type: String,
      default: "",
    },
    otp_status: {
      type: Number,
      default: 0, // 0 - default , 1 - OTP send to user, 2 - OTP verified
    },
    otp_expiry: {
      type: String,
    },
    address: {
      type: String,
      default: "",
    },
    status: {
      type: Number,
      default: 0, // 0 - Active , 1 - In Active, 2 - Deactive by admin
    },
    isDeleted: { type: Boolean, default: false },
    in_active_date: {
      type: Date,
      default: null,
    },
    is_logged: {
      type: Boolean,
      default: false,
    },
    created_by_admin: {
      type: Boolean,
      default: false, // false while create a super admin
    },
    temp_password: {
      type: String,
      default: "",
    },
    is_temp_password_used: {
      type: Boolean,
      default: false,
    },
    reset_password_token: {
      type: String,
      default: "",
    },
    reset_password_expires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1, company_id: 1 }, { unique: true });

module.exports = mongoose.model("user", userSchema);
