const mongoose = require("mongoose");

const UploadMappingSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["PUBMED", "EMBASE"],
      required: true,
    },

    mapping: {
      type: Map,
      of: String, // db_field -> uploaded_column
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);

const SiteSettingSchema = new mongoose.Schema(
  {
    company_id: {
      type: String,
    },

    // -------------------------------
    // Company Branding
    // -------------------------------
    logo: {
      type: String, // URL or path
      default: "",
    },

    favicon: {
      type: String, // URL or path
      default: "",
    },

    bannerImage: {
      type: String,
      default: "",
    },

    themeColor: {
      type: String,
      default: "#1976d2",
    },

    /* -------------------------------
       Literature Upload Settings
    --------------------------------*/
    // literatureUploadSettings: {
    //   pubmed: UploadMappingSchema,
    //   embase: UploadMappingSchema,
    // },

    // -------------------------------
    // Credibility Subscription Section
    // -------------------------------
    subscription: {
      planName: {
        type: String,
        enum: ["Basic", "Pro", "Enterprise"],
        default: "Basic",
      },

      planId: {
        type: String, // razorpay/plans ID if needed
      },

      status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active",
      },

      startDate: {
        type: Date,
      },

      endDate: {
        type: Date,
      },

      autoRenew: {
        type: Boolean,
        default: false,
      },

      // Plan Limits (configurable per company)
      limits: {
        users: { type: Number, default: 10 }, // max allowed
        products: { type: Number, default: 100 },
        literatureArticles: { type: Number, default: 10000000 },
      },

      // Payment Details
      lastPaymentDate: {
        type: Date,
      },
      nextPaymentDate: {
        type: Date,
      },
      amountPaid: {
        type: Number,
      },
      currency: {
        type: String,
        default: "INR",
      },
    },

    // -------------------------------
    // App Preferences
    // -------------------------------
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    language: {
      type: String,
      default: "en",
    },

    // Soft Delete + Status
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Number,
      default: 0, // 0 = active
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("site_setting", SiteSettingSchema);
