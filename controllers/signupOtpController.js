import crypto from "crypto";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PendingSignup from "../models/PendingSignup.js";
import cloudinary from "../config/cloudinary.js";
import generateUsername from "../utils/generateUsername.js";
import { normalizeUsername, USERNAME_RULES_MESSAGE } from "../utils/usernameRules.js";
import { sendBrevoOtpEmail } from "../services/brevoEmail.js";
import { recalculateBadges } from "../services/badgeService.js";
import { notifyWelcome } from "../services/notificationService.js";
import { recordLoginDevice } from "../services/deviceService.js";
import { hit, isBlocked } from "../utils/throttle.js";

const HOUR_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_WRONG_GUESSES_PER_HOUR = 10;

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const ALLOWED_GENDERS = new Set(["male", "female", "non-binary", "prefer-not"]);
const ALLOWED_LANGUAGES = new Set(["hi", "ur", "en", "bilingual"]);

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function isValidDob(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date > new Date()) return false;
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear() -
    ((now.getMonth() < date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) ? 1 : 0);
  return age >= 13;
}

function hashOtp(email, otp) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_SECRET or JWT_SECRET must be configured");
  return crypto.createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  const object = user.toObject();
  delete object.password;
  delete object.xp; // internal progression value is never sent to clients
  return object;
}

/** POST /api/auth/send-signup-otp */
export async function sendSignupOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  try {
    const {
      firstName,
      lastName,
      gender,
      dob,
      password,
      languagePref = "hi",
    } = req.body || {};
    const cleanFirstName = String(firstName ?? "").trim();
    const cleanLastName = String(lastName ?? "").trim();

    if (!cleanFirstName || !gender || !dob || !email || !password) {
      return res.status(400).json({ success: false, message: "Please complete all required signup fields." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (cleanFirstName.length > 60 || cleanLastName.length > 80) {
      return res.status(400).json({ success: false, message: "Please shorten your name and try again." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }
    if (!ALLOWED_GENDERS.has(String(gender))) {
      return res.status(400).json({ success: false, message: "Please select a valid gender option." });
    }
    if (!ALLOWED_LANGUAGES.has(String(languagePref))) {
      return res.status(400).json({ success: false, message: "Please select a valid language preference." });
    }
    if (!isValidDob(dob)) {
      return res.status(400).json({ success: false, message: "Date of birth must be valid and you must be at least 13 years old." });
    }

    let username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ success: false, message: USERNAME_RULES_MESSAGE });
    }

    // TTL deletion runs asynchronously; clear expired records before checking unique pending usernames.
    const now = new Date();
    await PendingSignup.deleteMany({ expiresAt: { $lte: now } });

    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered. Please log in instead." });
    }

    const existingUsername = await User.findOne({ username }).select("_id");
    if (existingUsername) {
      return res.status(409).json({ success: false, message: "Username already taken" });
    }

    const pendingByEmail = await PendingSignup.findOne({ email });
    if (pendingByEmail && now.getTime() - pendingByEmail.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now.getTime() - pendingByEmail.lastSentAt.getTime())) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds,
      });
    }

    const pendingUsername = await PendingSignup.findOne({ username, email: { $ne: email } }).select("email");
    if (pendingUsername) {
      return res.status(409).json({ success: false, message: "Username is being used by another pending signup. Choose another username." });
    }

    const sendWindow = await hit(`su-send:${email}`, { windowMs: HOUR_MS, max: MAX_SENDS_PER_HOUR });
    if (!sendWindow.allowed) {
      return res.status(429).json({ success: false, message: "Too many verification requests for this email. Please try again in an hour." });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
    const otpHash = hashOtp(email, otp);

    let pending;
    try {
      pending = await PendingSignup.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            username,
            firstName: cleanFirstName,
            lastName: cleanLastName,
            gender,
            dob: new Date(dob),
            passwordHash,
            languagePref,
            otpHash,
            expiresAt,
            lastSentAt: now,
            attempts: 0,
          },
        },
        { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: "That email or username is already being used. Please check your details." });
      }
      throw error;
    }

    try {
      await sendBrevoOtpEmail({ email, firstName: cleanFirstName, otp });
    } catch (error) {
      await PendingSignup.deleteOne({ _id: pending._id });
      console.error("Unable to send signup OTP", { status: error?.status, message: error?.message });
      return res.status(502).json({
        success: false,
        message: "We couldn't send the verification email. Please check the Brevo sender setup and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent. Please check your inbox and spam folder.",
      email,
      expiresIn: 300,
      resendAfter: 60,
    });
  } catch (error) {
    console.error("Send signup OTP failed", { message: error?.message });
    return res.status(500).json({ success: false, message: "Could not start email verification. Please try again." });
  }
}

/** POST /api/auth/verify-signup-otp; accepts multipart/form-data for an optional profile picture. */
export async function verifySignupOtp(req, res) {
  const tempPath = req.file?.path;
  const email = normalizeEmail(req.body?.email);
  try {
    const otp = String(req.body?.otp ?? "").trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Enter the six-digit verification code sent to your email." });
    }

    if (await isBlocked(`su-fail:${email}`, MAX_WRONG_GUESSES_PER_HOUR)) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please try again in an hour." });
    }

    const pending = await PendingSignup.findOne({ email });
    if (!pending) {
      return res.status(400).json({ success: false, message: "Verification session not found or expired. Please request a new code." });
    }
    if (pending.expiresAt.getTime() <= Date.now()) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: "Your code has expired. Please request a new code." });
    }
    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please restart signup and request a new code." });
    }

    const submittedHash = hashOtp(email, otp);
    if (!safeEqual(pending.otpHash, submittedHash)) {
      await hit(`su-fail:${email}`, { windowMs: HOUR_MS, max: MAX_WRONG_GUESSES_PER_HOUR }).catch(() => {});
      // Atomic increment prevents parallel requests from bypassing the per-signup attempt limit.
      const updatedPending = await PendingSignup.findOneAndUpdate(
        { _id: pending._id, attempts: { $lt: MAX_OTP_ATTEMPTS } },
        { $inc: { attempts: 1 } },
        { returnDocument: 'after' }
      );
      if (!updatedPending || updatedPending.attempts >= MAX_OTP_ATTEMPTS) {
        await PendingSignup.deleteOne({ _id: pending._id });
        return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please restart signup and request a new code." });
      }
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${MAX_OTP_ATTEMPTS - updatedPending.attempts} attempt(s) remaining.`,
        attemptsRemaining: MAX_OTP_ATTEMPTS - updatedPending.attempts,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Authentication is not configured on the server." });
    }

    // Re-check uniqueness after verification to close the race between OTP send and account creation.
    const [emailTaken, usernameTaken] = await Promise.all([
      User.exists({ email }),
      User.exists({ username: pending.username }),
    ]);
    if (emailTaken || usernameTaken) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(409).json({
        success: false,
        message: emailTaken ? "Email already registered. Please log in instead." : "Username already taken. Please restart signup with a different username.",
      });
    }

    let profilePic = "";
    if (req.file?.path) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "mehfil/profilePics",
        resource_type: "image",
      });
      profilePic = uploadResult.secure_url;
    }

    let user;
    try {
      user = await User.create({
        username: pending.username,
        firstName: pending.firstName,
        lastName: pending.lastName,
        gender: pending.gender,
        dob: pending.dob,
        email: pending.email,
        password: pending.passwordHash,
        languagePref: pending.languagePref,
        profilePic,
        isVerified: true,
      });
    } catch (error) {
      if (error?.code === 11000) {
        await PendingSignup.deleteOne({ _id: pending._id });
        return res.status(409).json({ success: false, message: "Email or username is already registered. Please log in or use different details." });
      }
      throw error;
    }

    await PendingSignup.deleteOne({ _id: pending._id });
    // Early Supporter is decided from the real createdAt; best-effort, never blocks signup.
    try { await recalculateBadges(user._id); } catch (e) { console.error("Badge evaluation after signup failed:", e.message); }
    // Welcome notification + remember this browser as the member's first device (both best-effort, never throw).
    await notifyWelcome(user);
    await recordLoginDevice(user._id, req);
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      success: true,
      message: "Email verified and signup completed successfully.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Verify signup OTP failed", { message: error?.message });
    return res.status(500).json({ success: false, message: "We couldn't complete signup. Please try again." });
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
}
