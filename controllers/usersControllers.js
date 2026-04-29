const mongoose = require("mongoose");
const UsersCollection = mongoose.model("user");
const { validationResult } = require("express-validator");
const queryHelper = require("../helpers/query");
const bcrypt = require("bcrypt");
const statusCode = require("../helpers/statusCode");
const jwt = require("jsonwebtoken");
const sendMail = require("../helpers/sendMail");
const { logUserActivity } = require("../helpers/logsHelper");
const SiteSettingCollection = require("../model/SiteSettingSchema");

const createOTP = () => {
  let min = 100000;
  let max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const tokenCreation = (user) => {
  let token = jwt.sign(
    { userId: user._id, comp_id: user.company_id },
    process.env.SECRET_KEY,
    {
      expiresIn: "30m",
    },
  );
  let refreshToken = jwt.sign(
    { userId: user._id, comp_id: user.company_id },
    process.env.SECRET_KEY,
    {
      expiresIn: "7d",
    },
  );

  return {
    token,
    refreshToken,
  };
};

class usersController {
  async userRegister(req, res, next) {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(statusCode.BAD_REQUEST).send({ error: errors.array() });
    }
    try {
      let bData = req.body;
      const hashedPassword = await bcrypt.hash(bData.password, 10);
      let company_id = bData.company_name.toUpperCase().split(" ")[0] + "_01";
      let companyID = await UsersCollection.find(
        { role: 1 },
        { company_id: 1 },
      );
      let companyId_data = companyID.map((data) => data.company_id);
      let compareData = companyId_data.includes(company_id);
      if (compareData) {
        let lastCompanyId = companyId_data[companyId_data.length - 1];
        let increaseCompany_id = Number(lastCompanyId.split("_")[1]);
        company_id =
          bData.company_name.toUpperCase().split(" ")[0] +
          "_" +
          String((increaseCompany_id += 1)).padStart(2, "0");
      }
      let dbData = {
        username: bData.username,
        email: bData.email,
        password: hashedPassword,
        company_name: bData.company_name,
        auth_status: bData.auth_status,
        company_id: company_id,
      };
      let addUsers = await queryHelper.insertData(UsersCollection, dbData);
      if (addUsers.status) {
        let siteSettingData = {
          company_id: company_id,
          subscription: {
            startDate: new Date(),
            status: "active",
          },
        };
        await queryHelper.insertData(SiteSettingCollection, siteSettingData);
        let message = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Company ID Confirmation</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table width="600" cellpadding="0" cellspacing="0" 
          style="background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding:20px 30px; background:#1976d2; border-radius:8px 8px 0 0;">
              <h2 style="margin:0; color:#ffffff;">
                Welcome to Our Platform
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:15px; color:#333; margin:0 0 15px;">
                Dear ${bData.username},
              </p>

              <p style="font-size:15px; color:#333; margin:0 0 20px;">
                Your account has been successfully created. Below is your
                <strong>Company ID</strong>:
              </p>

              <div style="
                background:#f0f7ff;
                border:1px solid #cce0ff;
                padding:15px;
                text-align:center;
                border-radius:6px;
                margin-bottom:20px;
              ">
                <h1 style="margin:0; color:#1976d2; letter-spacing:1px;">
                  ${company_id}
                </h1>
              </div>

              <p style="font-size:14px; color:#555;">
                Please keep this Company ID for your records. You may be asked
                to reference it during login or support requests.
              </p>

              <p style="font-size:14px; color:#555; margin-top:25px;">
                If you have any questions, feel free to contact our support team.
              </p>

              <p style="font-size:14px; color:#333; margin-top:30px;">
                Regards,<br/>
                <strong>Support Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:15px 30px;
              background:#f4f6f8;
              border-radius:0 0 8px 8px;
              text-align:center;
              font-size:12px;
              color:#888;
            ">
              © Pharmnova Medical Research. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
        let mail = sendMail(bData.email, "This is your company ID", message);
        return res.status(statusCode.CREATED).send({
          status: addUsers.status,
          // data: addUsers.msg,
          message: "User register successfully...",
        });
      } else {
        return res
          .status(statusCode.FORBIDDEN)
          .send({ status: addUsers.status, message: addUsers.msg });
      }
    } catch (error) {
      console.log("userRegister error", error);
      return res
        .status(statusCode.FORBIDDEN)
        .send({ status: false, message: error });
    }
  }

  // without temp password login and verifyOtp controller func start
  // async userLogin(req, res) {
  //   try {
  //     const { email, password, company_id } = req.body;

  //     const user = await UsersCollection.findOne({ email, company_id });
  //     if (!user) {
  //       return res
  //         .status(statusCode.NOT_FOUND)
  //         .send({ status: false, message: "User or company not found" });
  //     }

  //     if (user.status == 1) {
  //       return res.status(statusCode.UNAUTHORIZED).send({
  //         status: false,
  //         message: "Your account has been deactivated. contact admin",
  //       });
  //     }
  //     let comparedPasswordData = user.password
  //       ? user.password
  //       : user.temp_password;
  //     const isMatch = await bcrypt.compare(password, comparedPasswordData);
  //     if (!isMatch) {
  //       return res
  //         .status(statusCode.UNAUTHORIZED)
  //         .send({ status: false, message: "Incorrect password" });
  //     }

  //     // Case 1: If user has OTP (auth_status = true → requires OTP flow)
  //     if (user.auth_status) {
  //       const otp = createOTP();
  //       user.otp = otp;
  //       user.otp_expiry = Date.now() + 2 * 60 * 1000; // 2 mins expiry
  //       user.refresh_token = "";
  //       await user.save();

  //       await sendMail(user.email, "OTP for login", `Your OTP is ${otp}`);
  //       return res.status(statusCode.CREATED).send({
  //         status: true,
  //         step: "OTP_REQUIRED",
  //         message: "OTP has been sent to your email",
  //       });
  //     }

  //     // Case 2: Normal login (no OTP)
  //     const { token, refreshToken } = tokenCreation(user);
  //     user.refresh_token = refreshToken;
  //     (user.is_logged = true), await user.save();

  //     res.cookie("accessToken", token, { httpOnly: true, secure: true });
  //     res.cookie("refreshToken", refreshToken, {
  //       httpOnly: true,
  //       secure: true,
  //     });
  //     let userData = {
  //       _id: user._id,
  //       username: user.username,
  //       company_name: user.company_name,
  //       company_id: user.company_id,
  //       email: user.email,
  //       role: user.role,
  //     };
  //     await logUserActivity(user._id, "LOGIN", {
  //       ip: req.ip,
  //       device: req.headers["user-agent"],
  //     });
  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       step: "LOGGED_IN",
  //       message: "Login successful",
  //       data: userData,
  //     });
  //   } catch (error) {
  //     console.error("userLogin error", error);
  //     res
  //       .status(statusCode.INTERNAL_SERVER_ERROR)
  //       .send({ status: false, message: "Something went wrong" });
  //   }
  // }
  // async verifyOtp(req, res) {
  //   try {
  //     const { email, company_id, otp } = req.body;
  //     const user = await UsersCollection.findOne({ email, company_id });

  //     if (!user || !user.otp) {
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: "No OTP found" });
  //     }

  //     if (Date.now() > user.otp_expiry) {
  //       user.otp = null;
  //       await user.save();
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: "OTP expired" });
  //     }

  //     if (user.otp !== otp) {
  //       return res
  //         .status(statusCode.BAD_REQUEST)
  //         .send({ status: false, message: "Invalid OTP" });
  //     }

  //     // OTP is correct → issue tokens
  //     const { token, refreshToken } = tokenCreation(user);
  //     user.otp = null;
  //     user.otp_expiry = null;
  //     user.refresh_token = refreshToken;
  //     await user.save();

  //     res.cookie("accessToken", token, { httpOnly: true, secure: true });
  //     res.cookie("refreshToken", refreshToken, {
  //       httpOnly: true,
  //       secure: true,
  //     });

  //     return res.status(statusCode.OK).send({
  //       status: true,
  //       step: "LOGGED_IN",
  //       message: "OTP verified, login successful",
  //       token,
  //     });
  //   } catch (error) {
  //     console.error("verifyOtp error", error);
  //     res
  //       .status(statusCode.INTERNAL_SERVER_ERROR)
  //       .send({ status: false, message: "Something went wrong" });
  //   }
  // }
  // without temp password login and verifyOtp controller func end

  async userLogin(req, res) {
    try {
      const { email, password, company_id } = req.body;

      const user = await UsersCollection.findOne({ email, company_id });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "User or company not found" });
      }

      if (user.status === 1) {
        return res.status(statusCode.UNAUTHORIZED).send({
          status: false,
          message: "Your account has been deactivated. Contact admin.",
        });
      }

      let comparedPasswordData = user.password || user.temp_password;
      const isMatch = await bcrypt.compare(password, comparedPasswordData);

      if (!isMatch) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Incorrect password" });
      }

      if (!user.password && user.temp_password) {
        if (user.is_temp_password_used) {
          return res.status(statusCode.FORBIDDEN).send({
            status: false,
            step: "TEMP_PASSWORD_USED",
            message:
              "Temporary password already used. Please change your password to continue.",
          });
        }

        user.is_temp_password_used = true;
        await user.save();
      }

      if (user.auth_status) {
        const otp = createOTP();
        user.otp = otp;
        user.otp_expiry = Date.now() + 2 * 60 * 1000; // 2 min expiry
        user.refresh_token = "";
        await user.save();

        let message = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Login OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding:20px 30px; background:#1976d2; border-radius:8px 8px 0 0;">
              <h2 style="margin:0; color:#ffffff;">
                OTP Verification
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:15px; color:#333; margin:0 0 15px;">
                Dear ${user.username},
              </p>

              <p style="font-size:15px; color:#333; margin:0 0 20px;">
                You are trying to log in to your account. Please use the
                <strong>One-Time Password (OTP)</strong> below to continue:
              </p>

              <div style="
                background:#f0f7ff;
                border:1px solid #cce0ff;
                padding:20px;
                text-align:center;
                border-radius:6px;
                margin-bottom:20px;
              ">
                <h1 style="
                  margin:0;
                  color:#1976d2;
                  letter-spacing:6px;
                  font-size:32px;
                ">
                  ${otp}
                </h1>
              </div>

              <p style="font-size:14px; color:#555;">
                This OTP is valid for <strong>5 minutes</strong>.  
                Please do not share this code with anyone.
              </p>

              <p style="font-size:14px; color:#555; margin-top:20px;">
                If you did not request this login, please ignore this email or
                contact our support team immediately.
              </p>

              <p style="font-size:14px; color:#333; margin-top:30px;">
                Regards,<br/>
                <strong>Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:15px 30px;
              background:#f4f6f8;
              border-radius:0 0 8px 8px;
              text-align:center;
              font-size:12px;
              color:#888;
            ">
              © Pharmnova Medical Research. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        let mailSend = await sendMail(user.email, "OTP for login", message);
        console.log(mailSend, "mailSend00");
        if (!mailSend) {
          return res
            .status(statusCode.INTERNAL_SERVER_ERROR)
            .send({ status: false, message: "Cannot send the email" });
        }
        return res.status(statusCode.CREATED).send({
          status: true,
          step: "OTP_REQUIRED",
          message: "OTP has been sent to your email",
        });
      }

      const { token, refreshToken } = tokenCreation(user);
      user.refresh_token = refreshToken;
      user.is_logged = true;
      await user.save();

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

      const userData = {
        _id: user._id,
        username: user.username,
        company_name: user.company_name,
        company_id: user.company_id,
        email: user.email,
        role: user.role,
      };

      await logUserActivity(user._id, "LOGIN", {
        ip: req.ip,
        device: req.headers["user-agent"],
      });

      return res.status(statusCode.OK).send({
        status: true,
        step: "LOGGED_IN",
        message: "Login successful",
        data: userData,
      });
    } catch (error) {
      console.error("userLogin error", error);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Something went wrong" });
    }
  }

  async verifyOtp(req, res) {
    try {
      const { email, company_id, otp } = req.body;
      const user = await UsersCollection.findOne({ email, company_id });

      if (!user || !user.otp) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "No OTP found" });
      }

      if (Date.now() > user.otp_expiry) {
        user.otp = null;
        await user.save();
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "OTP expired" });
      }

      if (user.otp !== otp) {
        return res
          .status(statusCode.BAD_REQUEST)
          .send({ status: false, message: "Invalid OTP" });
      }

      const { token, refreshToken } = tokenCreation(user);
      user.otp = null;
      user.otp_expiry = null;
      user.refresh_token = refreshToken;

      if (!user.password && user.temp_password && !user.is_temp_password_used) {
        user.is_temp_password_used = true;
      }

      await user.save();

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      const userData = {
        _id: user._id,
        username: user.username,
        company_name: user.company_name,
        company_id: user.company_id,
        email: user.email,
        role: user.role,
      };
      return res.status(statusCode.OK).send({
        status: true,
        step: "LOGGED_IN",
        message: "OTP verified, login successful",
        token,
        data: userData,
      });
    } catch (error) {
      console.error("verifyOtp error", error);
      res
        .status(statusCode.INTERNAL_SERVER_ERROR)
        .send({ status: false, message: "Something went wrong" });
    }
  }
  async resendOtp(req, res) {
    try {
      const { email, company_id } = req.body;

      let user = await UsersCollection.findOne({ email, company_id });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "User not found" });
      }

      // generate OTP
      let sixDigitNumber = createOTP();
      user.otp = sixDigitNumber;
      user.otp_expiry = Date.now() + 2 * 60 * 1000; // 2 minutes validity
      await user.save();

      let message = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Resent OTP for Login</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:20px 30px; background:#1976d2; border-radius:8px 8px 0 0;">
              <h2 style="margin:0; color:#ffffff;">
                Login OTP – Resent
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:15px; color:#333; margin:0 0 15px;">
                Dear User,
              </p>

              <p style="font-size:15px; color:#333; margin:0 0 20px;">
                As requested, we have re-sent your
                <strong>One-Time Password (OTP)</strong> for secure login.
                Please use the OTP below to continue:
              </p>

              <div style="
                background:#f0f7ff;
                border:1px solid #cce0ff;
                padding:20px;
                text-align:center;
                border-radius:6px;
                margin-bottom:20px;
              ">
                <h1 style="
                  margin:0;
                  color:#1976d2;
                  letter-spacing:6px;
                  font-size:32px;
                ">
                  ${sixDigitNumber}
                </h1>
              </div>

              <p style="font-size:14px; color:#555;">
                This OTP is valid for <strong>5 minutes</strong>.
                For your security, please do not share this OTP with anyone.
              </p>

              <p style="font-size:14px; color:#555; margin-top:20px;">
                If you did not request this OTP or are having trouble logging in,
                please contact our support team immediately.
              </p>

              <p style="font-size:14px; color:#333; margin-top:30px;">
                Regards,<br/>
                <strong>Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:15px 30px;
              background:#f4f6f8;
              border-radius:0 0 8px 8px;
              text-align:center;
              font-size:12px;
              color:#888;
            ">
              © Pharmnova Medical Research. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      sendMail(user.email, "Resent OTP for login", message);

      return res.status(statusCode.OK).send({
        status: true,
        step: "OTP_REQUIRED",
        message: "New OTP has been sent to your email",
      });
    } catch (error) {
      console.error("resendOtp error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong while resending OTP",
      });
    }
  }
  async logout(req, res) {
    try {
      let { userId, comp_id } = req.body;

      console.log(userId, comp_id, "user");
      // return
      const user = await UsersCollection.findOne({
        _id: userId,
        company_id: comp_id,
      });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "User or company not found" });
      }
      user.is_logged = false;
      await user.save();
      // await logUserActivity(user._id, "LOGGED OUT", { ip: req.ip, device: req.headers["user-agent"] });
      res.clearCookie("accessToken", {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: "strict",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: "strict",
      });
      return res
        .status(statusCode.OK)
        .json({ message: "Logged out successfully" });
    } catch (err) {
      console.error("logout error", err);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async forgotPassword(req, res) {
    try {
      let { email,companyID } = req.body;
      let user = await UsersCollection.findOne({ email: email, company_id: companyID });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ message: "Enter the correct email and company ID" });
      }
      const resetToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
        expiresIn: "15m",
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Password Reset</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:20px 30px; background:#1976d2; border-radius:8px 8px 0 0;">
              <h2 style="margin:0; color:#ffffff;">
                Password Reset Request
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:15px; color:#333; margin:0 0 15px;">
                Dear User,
              </p>

              <p style="font-size:15px; color:#333; margin:0 0 20px;">
                We received a request to reset the password for your account.
                Click the button below to reset your password:
              </p>

              <div style="text-align:center; margin:30px 0;">
                <a href="${resetLink}"
                  style="
                    background:#1976d2;
                    color:#ffffff;
                    padding:20px 30px;
                    text-decoration:none;
                    border-radius:6px;
                    font-size:15px;
                    display:inline-block;
                  ">
                  Reset Password
                </a>
              </div>

              <p style="font-size:14px; color:#555;">
                This password reset link is valid for <strong>15 minutes</strong>.
                If the link expires, you will need to request a new one.
              </p>

              <p style="font-size:14px; color:#555; margin-top:20px;">
                If you did not request a password reset, please ignore this email
                or contact our support team immediately.
              </p>

              <p style="font-size:14px; color:#333; margin-top:30px;">
                Regards,<br/>
                <strong>Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:15px 30px;
              background:#f4f6f8;
              border-radius:0 0 8px 8px;
              text-align:center;
              font-size:12px;
              color:#888;
            ">
              © Pharmnova Medical Research. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      sendMail(email, "Password Reset Request", htmlContent);

      res
        .status(statusCode.OK)
        .send({ message: "Email has been successfully send." });
    } catch (error) {
      console.error("forgotPassword error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async checkTokenValidOrNot(req, res) {
    try {
      let { token } = req.query;
      console.log(token, "token");
      if (!token) {
        res
          .status(statusCode.BAD_REQUEST)
          .send({ message: "Password token required" });
      }
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SECRET_KEY); // same secret used for reset token
      } catch (err) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Invalid or expired token" });
      }
      return res.status(statusCode.OK).send({
        status: true,
        message: "Valid token",
      });
    } catch (error) {
      console.error("checkTokenValidOrNot error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(statusCode.BAD_REQUEST).send({
          status: false,
          message: "Token and new password are required",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
      } catch (err) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ status: false, message: "Invalid or expired token" });
      }

      const user = await UsersCollection.findOne({ _id: decoded.id });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ status: false, message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
      await user.save();
      await logUserActivity(user._id, "RESET PASSWORD", {
        ip: req.ip,
        device: req.headers["user-agent"],
      });
      return res.status(statusCode.OK).send({
        status: true,
        message:
          "Password reset successful. Please login with your new password",
      });
    } catch (error) {
      console.error("resetPassword error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async getCompanyId(req, res) {
    try {
      let { email } = req.body;
      let user = await UsersCollection.findOne({ email: email });
      if (!user) {
        return res
          .status(statusCode.NOT_FOUND)
          .send({ message: "Enter the correct email" });
      }
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Company ID Details</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:20px 30px; background:#1976d2; border-radius:8px 8px 0 0;">
              <h2 style="margin:0; color:#ffffff;">
                Your Company ID
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:15px; color:#333; margin:0 0 15px;">
                Dear User,
              </p>

              <p style="font-size:15px; color:#333; margin:0 0 20px;">
                Your account has been successfully registered.
                Please find your <strong>Company ID</strong> below:
              </p>

              <div style="
                background:#f0f7ff;
                border:1px solid #cce0ff;
                padding:20px;
                text-align:center;
                border-radius:6px;
                margin-bottom:20px;
              ">
                <h2 style="
                  margin:0;
                  color:#1976d2;
                  letter-spacing:1px;
                ">
                  ${user.company_id}
                </h2>
              </div>

              <p style="font-size:14px; color:#555;">
                Please keep this Company ID safe. It may be required for future
                login, support, or verification purposes.
              </p>

              <p style="font-size:14px; color:#333; margin-top:30px;">
                Regards,<br/>
                <strong>Support Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:15px 30px;
              background:#f4f6f8;
              border-radius:0 0 8px 8px;
              text-align:center;
              font-size:12px;
              color:#888;
            ">
              © Pharmnova Medical Research. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      sendMail(email, "Company Id Request", htmlContent);
      res
        .status(statusCode.OK)
        .send({ message: "Email has been successfully send." });
    } catch (error) {
      console.error("getCompanyId error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
}

module.exports = new usersController();
