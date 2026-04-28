/* ==========================================
   EMAIL SERVICE
========================================== */

const nodemailer = require("nodemailer");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* Send Verification Email */
exports.sendVerificationEmail = async (user, token) => {
  try {
    const url = `${process.env.CLIENT_URL}/verify-email/${token}`;

    await transporter.sendMail({
      from: `"MyTune" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify your MyTune account",
      html: `
        <h2>Hello ${user.username}</h2>
        <p>Please verify your email by clicking below:</p>
        <a href="${url}">${url}</a>
      `
    });

    logger.info("Verification email sent");
  } catch (error) {
    logger.error("Email error: " + error.message);
  }
};

/* Send Password Reset Email */
exports.sendPasswordResetEmail = async (user, token) => {
  try {
    const url = `${process.env.CLIENT_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: `"MyTune" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${url}">${url}</a>
      `
    });

    logger.info("Password reset email sent");
  } catch (error) {
    logger.error("Reset email error: " + error.message);
  }
};

/* Friend Request Notification */
exports.sendFriendRequestNotification = async (sender, recipient) => {
  try {
    await transporter.sendMail({
      from: `"MyTune" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: "New Friend Request",
      html: `
        <h2>Hi ${recipient.username}</h2>
        <p>${sender.username} sent you a friend request.</p>
      `
    });
  } catch (error) {
    logger.error("Friend notification error: " + error.message);
  }
};