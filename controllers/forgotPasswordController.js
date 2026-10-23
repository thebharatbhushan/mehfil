import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ForgotPasswordOtp from "../models/ForgotPasswordOtp.js";
import { sendBrevoForgotPasswordOtpEmail } from "../services/brevoEmail.js";
import { notifyPasswordChanged } from "../services/notificationService.js";
import { hit, isBlocked } from "../utils/throttle.js";

const HOUR_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_HOUR = 5; // codes emailed per address per hour
const MAX_WRONG_GUESSES_PER_HOUR = 10; // wrong codes per address per hour, across ALL codes (a new code does not reset this)

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function hashValue(value) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_SECRET or JWT_SECRET must be configured");
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function hashOtp(email, otp) {
  return hashValue(`${email}:${otp}`);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function genericOtpResponse(res) {
  return res.status(200).json({
    success: true,
    message: "OTP sent successfully. Please check your email.",
    expiresIn: 300,
    resendAfter: 60,
  });
}


/** POST /api/auth/forgot-password/send-otp */
export async function sendForgotPasswordOtp(req, res) {
  const email = normalizeEmail(req.body?.email);

  try {
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email }).select("_id firstName");
    // Forgot-password recovery intentionally tells the user when the email is not registered.
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "EMAIL_NOT_FOUND",
        message: "Email not found. Please enter the email registered with Mehfil.",
      });
    }

    const now = new Date();
    const existing = await ForgotPasswordOtp.findOne({ email });

    if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now.getTime() - existing.lastSentAt.getTime())) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds,
      });
    }

    // Hourly cap per address: stops mail-bombing a victim and stops "request a fresh code, guess 5 more" loops.
    const sendWindow = await hit(`fp-send:${email}`, { windowMs: HOUR_MS, max: MAX_SENDS_PER_HOUR });
    if (!sendWindow.allowed) {
      return res.status(429).json({ success: false, message: "Too many reset requests for this email. Please try again in an hour." });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    const record = await ForgotPasswordOtp.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          otpHash: hashOtp(email, otp),
          expiresAt,
          lastSentAt: now,
          attempts: 0,
          resetTokenHash: "",
          resetTokenExpiresAt: null,
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    try {
      await sendBrevoForgotPasswordOtpEmail({
        email,
        firstName: user.firstName,
        otp,
      });
    } catch (error) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      console.error("Unable to send password-reset OTP", {
        status: error?.status,
        message: error?.message,
      });
      return res.status(502).json({
        success: false,
        message: "We couldn't send the password reset email. Please try again.",
      });
    }

    return genericOtpResponse(res);
  } catch (error) {
    console.error("Send forgot-password OTP failed", { message: error?.message });
    return res.status(500).json({
      success: false,
      message: "Could not start password recovery. Please try again.",
    });
  }
}

/** POST /api/auth/forgot-password/verify-otp */
export async function verifyForgotPasswordOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp ?? "").trim();

  try {
    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter the six-digit verification code sent to your email.",
      });
    }

    if (await isBlocked(`fp-fail:${email}`, MAX_WRONG_GUESSES_PER_HOUR)) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please try again in an hour." });
    }

    const record = await ForgotPasswordOtp.findOne({ email });
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Verification session not found or expired. Please request a new code.",
      });
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: "Your code has expired. Please request a new code.",
      });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    const submittedHash = hashOtp(email, otp);
    if (!safeEqual(record.otpHash, submittedHash)) {
      await hit(`fp-fail:${email}`, { windowMs: HOUR_MS, max: MAX_WRONG_GUESSES_PER_HOUR }).catch(() => {});
      const updated = await ForgotPasswordOtp.findOneAndUpdate(
        { _id: record._id, attempts: { $lt: MAX_OTP_ATTEMPTS } },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
      );

      if (!updated || updated.attempts >= MAX_OTP_ATTEMPTS) {
        await ForgotPasswordOtp.deleteOne({ _id: record._id });
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Please request a new code.",
        });
      }

      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${MAX_OTP_ATTEMPTS - updated.attempts} attempt(s) remaining.`,
        attemptsRemaining: MAX_OTP_ATTEMPTS - updated.attempts,
      });
    }

    const userExists = await User.exists({ email });
    if (!userExists) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: "Password reset session is no longer available. Please request a new code.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await ForgotPasswordOtp.updateOne(
      { _id: record._id },
      {
        $set: {
          resetTokenHash: hashValue(resetToken),
          resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
        $unset: {
          otpHash: 1,
          expiresAt: 1,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
      resetTokenExpiresIn: 600,
    });
  } catch (error) {
    console.error("Verify forgot-password OTP failed", { message: error?.message });
    return res.status(500).json({
      success: false,
      message: "Could not verify the code. Please try again.",
    });
  }
}

/** POST /api/auth/forgot-password/reset-password */
export async function resetPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  const resetToken = String(req.body?.resetToken ?? "").trim();
  const newPassword = String(req.body?.newPassword ?? "");
  const confirmPassword = String(req.body?.confirmPassword ?? "");

  try {
    if (!isValidEmail(email) || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset session and both password fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    const record = await ForgotPasswordOtp.findOne({ email });
    if (!record?.resetTokenHash || !record.resetTokenExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Password reset session is invalid. Please request a new code.",
      });
    }

    if (record.resetTokenExpiresAt.getTime() <= Date.now()) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: "Password reset session has expired. Please request a new code.",
      });
    }

    if (!safeEqual(record.resetTokenHash, hashValue(resetToken))) {
      return res.status(400).json({
        success: false,
        message: "Password reset session is invalid. Please request a new code.",
      });
    }

    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      await ForgotPasswordOtp.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: "Password reset session is no longer available. Please request a new code.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    await ForgotPasswordOtp.deleteOne({ _id: record._id });
    await notifyPasswordChanged(user._id, { via: "reset" });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password failed", { message: error?.message });
    return res.status(500).json({
      success: false,
      message: "Could not reset your password. Please try again.",
    });
  }
}
