const { body } = require("express-validator");
const striptags = require("striptags");

let validateRegisterUserRules = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .customSanitizer((value) => striptags(value))
    .escape()
    .withMessage("Username must be atleast 3 character long"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 8 })
    .escape()
    .withMessage("Password must be 8 character long"),
  body("company_name")
    .trim()
    .isLength({ min: 6 })
    .customSanitizer((value) => striptags(value))
    .escape()
    .withMessage("company name must be atleast 6 character long"),
];

let validateLoginUserRule = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 8 })
    .escape()
    .withMessage("Password must be 8 character long"),
  body("company_id")
    .trim()
    .isLength({ min: 3 })
    .escape()
    .withMessage("Company id must be atleast 3 character long"),
];

module.exports = {
  validateRegisterUserRules,
  validateLoginUserRule,
};
