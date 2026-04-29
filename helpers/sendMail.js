const nodemailer = require("nodemailer");

const MailSend = async (to, subject, message) => {
  try {
    // Create a transporter
    // const transporter = nodemailer.createTransport({
    //   host: "sandbox.smtp.mailtrap.io",
    //   port: 587,
    //   secure: false,
    //   auth: {
    //     user: "f2a0296ec6ec5c",
    //     pass: "da1ad11280e546",
    //   },
    // });
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Mail options
    const mailOptions = {
      from: "no-reply@Pharmnova.com",
      to,
      subject,
      // text: message, // plain text
      html: message, // if you want html formatting
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Mail error:", error);
    return false;
  }
};

module.exports = MailSend;
