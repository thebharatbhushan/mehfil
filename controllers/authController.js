import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Draft from "../models/Draft.js";
import WeeklyWriter from "../models/WeeklyWriter.js";
import ThursdayWriter from "../models/ThursdayWriter.js";
import SelectedPoem from "../models/SelectedPoem.js";
import Feedback from "../models/Feedback.js";
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import generateUsername from "../utils/generateUsername.js";
import { normalizeUsername, USERNAME_RULES_MESSAGE } from "../utils/usernameRules.js";
import XPTransaction from "../models/XPTransaction.js";
import Notification from "../models/Notification.js";
import UserDevice from "../models/UserDevice.js";
import ContactMessage from "../models/ContactMessage.js";
import UserBadge from "../models/UserBadge.js";
import { getPublicRecognition, recalculateBadges } from "../services/badgeService.js";
import { purgeUserEngagement } from "../services/engagementService.js";
import { SUSPENDED_MESSAGE } from "../services/suspension.js";
import { onProfileUpdated } from "../services/xpService.js";
import { matchesSearch } from "../utils/search.js";
import { PUBLIC_POEM_FILTER } from "../utils/poemVisibility.js";
import { notifyPasswordChanged } from "../services/notificationService.js";
import { recordLoginDevice } from "../services/deviceService.js";
import { hit as throttleHit, isBlocked } from "../utils/throttle.js";

// A real bcrypt hash of a random value: compared against when the email is unknown so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync("mehfil-dummy-password-not-a-real-account", 10);
const LOGIN_FAIL_MAX = 8; // wrong passwords per account per 15 minutes
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;

export const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      dob,
      email,
      password,
      languagePref,
      username: rawUsername,
    } = req.body;

    if (!firstName || !gender || !dob || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    let profilePic = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "mehfil/profilePics",
        }
      );

      profilePic = result.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Username chosen at signup; if the client didn't send one, generate it from the name.
    let username;
    if (rawUsername !== undefined && String(rawUsername).trim() !== "") {
      username = normalizeUsername(rawUsername);
      if (!username) {
        return res.status(400).json({ success: false, message: USERNAME_RULES_MESSAGE });
      }
      if (await User.exists({ username })) {
        return res.status(409).json({ success: false, message: "Username already taken" });
      }
    } else {
      username = await generateUsername(firstName, lastName, email);
    }

    const newUser = await User.create({
      username,
      firstName,
      lastName,
      gender,
      dob,
      email,
      password: hashedPassword,
      languagePref,
      profilePic,
    });

    // Early Supporter is decided from the real createdAt; best-effort, never blocks signup.
    try { await recalculateBadges(newUser._id); } catch (e) { console.error("Badge evaluation after signup failed:", e.message); }

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: (({ password, xp, ...rest }) => rest)(newUser.toObject()),
    });

  } catch (error) {
    console.log("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const login = async (req, res) => {
  try {

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    // Only plain strings: objects/arrays (e.g. {"$ne":""}) are rejected before they can reach a query.
    if (typeof email !== "string" || typeof password !== "string" || password.length > 200) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const failKey = `login-fail:${cleanEmail}`;
    if (await isBlocked(failKey, LOGIN_FAIL_MAX)) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please try again in 15 minutes or reset your password.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    // Account created with Google and no password set yet: tell the member how to get in.
    if (user && !user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google sign-in. Please continue with Google, or use 'Forgot password' to set a password.",
      });
    }

    // Same response (and similar timing) whether the email exists or the password is wrong -> no account enumeration.
    const isPasswordCorrect = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !isPasswordCorrect) {
      await throttleHit(failKey, { windowMs: LOGIN_FAIL_WINDOW_MS, max: LOGIN_FAIL_MAX }).catch(() => {});
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.suspended) {
      return res.status(403).json({ success: false, suspended: true, message: SUSPENDED_MESSAGE });
    }

    if (!user.username) {
      user.username = await generateUsername(user.firstName, user.lastName, user.email);
      await User.updateOne({ _id: user._id }, { $set: { username: user.username } });
    }

    // New-device detection (best-effort; never blocks login). The very first device is recorded silently.
    await recordLoginDevice(user._id, req);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        gender: user.gender,
        languagePref: user.languagePref,
        createdAt: user.createdAt
      }
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const getUserById = async (req, res) => {
  try {

    // Accepts either a Mongo id or a username (e.g. /api/auth/user/rahul_sharma).
    const ident = String(req.params.id);
    const user = /^[0-9a-fA-F]{24}$/.test(ident)
      ? await User.findById(ident).select("-password")
      : await User.findOne({ username: ident.replace(/^@/, "").toLowerCase() }).select("-password");

    // A suspended member is invisible to the public (404, same as a profile that does not exist).
    if (!user || user.suspended) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Paginated: a poet with hundreds of poems never loads them all in one response.
    // ?page=1&limit=12 (limit hard-capped at 50) and optional ?q= to search this author's poems by title/body.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const q = String(req.query.q || "").trim().slice(0, 80);
    const filter = { author: user._id, ...PUBLIC_POEM_FILTER };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { body: rx }];
    }

    const [poems, total, allCount] = await Promise.all([
      Poem.find(filter)
        .populate("author", "firstName lastName username profilePic")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Poem.countDocuments(filter),
      q ? Poem.countDocuments({ author: user._id, ...PUBLIC_POEM_FILTER }) : null,
    ]);
    const poemsCount = allCount ?? total; // author's real total, even while searching
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Public endpoint: never expose private account data (email, date of birth).
    const { email, dob, gender, suspended, suspendedAt, suspendReason, ...publicUser } = user.toObject();

    // Safe recognition only (badges + frame). XP and progress numbers are never part of public responses.
    let recognition = { badges: [], profileFrame: { key: "default", name: "Default" } };
    try { recognition = await getPublicRecognition(user._id); } catch (e) { console.error("Recognition load failed:", e.message); }

    res.json({
      success: true,
      user: {
        ...publicUser,
        poemsCount,
        ...recognition
      },
      poems,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// Public, paginated writers directory (/poets page). Never returns the whole user table:
//   GET /api/auth/writers?page=1&limit=12&style=all&q=
// Only public fields are returned (no email / dob / password). poemCount is computed for the current page only.
export const getWritersList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const style = String(req.query.style || "all").toLowerCase().slice(0, 30);
    const q = String(req.query.q || "").trim().replace(/^@/, "").slice(0, 60);

    const filter = { suspended: { $ne: true } };
    if (style !== "all") filter.languagePref = style === "shayari" ? { $in: ["shayari", null, ""] } : style;

    const PUBLIC_FIELDS = "firstName lastName username profilePic bio city languagePref socialLinks createdAt";
    let users;
    let total;

    if (q) {
      // Search keeps the Hindi <-> Roman matching of the old client-side search, so candidates are matched in memory
      // using only a few small text fields (never sent to the browser); only the matching page is loaded in full.
      const rows = await User.find(filter).select("firstName lastName username city bio").sort({ createdAt: -1 }).lean();
      const matched = rows.filter((r) =>
        matchesSearch(q, r.username || "", `${r.firstName} ${r.lastName || ""}`, r.firstName || "", r.lastName || "", r.city || "", r.bio || "")
      );
      total = matched.length;
      const ids = matched.slice((page - 1) * limit, page * limit).map((r) => r._id);
      const found = await User.find({ _id: { $in: ids } }).select(PUBLIC_FIELDS).lean();
      const byId = new Map(found.map((u) => [String(u._id), u]));
      users = ids.map((id) => byId.get(String(id))).filter(Boolean);
    } else {
      [users, total] = await Promise.all([
        User.find(filter).select(PUBLIC_FIELDS).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
      ]);
    }

    const counts = users.length
      ? await Poem.aggregate([
          { $match: { author: { $in: users.map((u) => u._id) }, ...PUBLIC_POEM_FILTER } },
          { $group: { _id: "$author", n: { $sum: 1 } } },
        ])
      : [];
    const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

    const writers = users.map((u) => ({
      ...u,
      poemCount: countMap.get(String(u._id)) || 0,
      style: (u.languagePref || "shayari").toLowerCase(),
    }));
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({ success: true, writers, page, limit, total, totalPages, hasMore: page < totalPages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req, res) => {

  try {

    let user = await User.findById(
      req.userId
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Users created before usernames existed get one the first time they open their profile.
    if (!user.username) {
      const username = await generateUsername(user.firstName, user.lastName, user.email);
      user = await User.findByIdAndUpdate(
        user._id,
        { $set: { username } },
        { returnDocument: 'after' }
      ).select("-password");
    }

    let recognition = {};
    try { recognition = await getPublicRecognition(user._id); } catch (e) { console.error("Recognition load failed:", e.message); }

    return res.status(200).json({
      success: true,
      user: { ...user.toObject(), ...recognition }
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

export const getFeaturedWriters = async (req,res)=>{

    try{

        const writers = await User.find({
            featuredWriter:true,
            suspended: { $ne: true }
        })
        .select("firstName lastName username profilePic")
        .limit(4);

        res.json({
            success:true,
            writers
        });

    }

    catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};

const cleanText = (value, max = 120) => String(value ?? "").trim().slice(0, max);

const parseArrayField = (value, maxItems = 20, itemMax = 60) => {
  if (value === undefined || value === null || value === "") return [];
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { parsed = value.split(","); }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.map((item) => cleanText(item, itemMax)).filter(Boolean))].slice(0, maxItems);
};

const parseSocialLinks = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const result = {};
  for (const key of ["instagram", "x", "website", "linkedin"]) {
    const raw = cleanText(parsed[key], 300);
    if (!raw) { result[key] = ""; continue; }
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      result[key] = url.toString();
    } catch {
      return null;
    }
  }
  return result;
};

const isValidDob = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return false;
  if (date > new Date()) return false;
  const age = new Date().getFullYear() - date.getFullYear() -
    ((new Date().getMonth() < date.getMonth() ||
      (new Date().getMonth() === date.getMonth() && new Date().getDate() < date.getDate())) ? 1 : 0);
  return age >= 13;
};

export const updateProfile = async (req, res) => {
  const tempPath = req.file?.path;
  try {
    const body = req.body || {};
    const updates = {};

    if (body.username !== undefined && String(body.username).trim() !== "") {
      const clean = normalizeUsername(body.username);
      if (!clean) return res.status(400).json({ success: false, message: USERNAME_RULES_MESSAGE });
      const taken = await User.exists({ username: clean, _id: { $ne: req.userId } });
      if (taken) return res.status(409).json({ success: false, message: "Username already taken" });
      updates.username = clean;
    }

    if (body.firstName !== undefined) {
      const firstName = cleanText(body.firstName, 60);
      if (!firstName) return res.status(400).json({ success: false, message: "First name is required." });
      updates.firstName = firstName;
    }
    if (body.lastName !== undefined) updates.lastName = cleanText(body.lastName, 80);
    if (body.bio !== undefined) updates.bio = cleanText(body.bio, 500);

    for (const key of ["city", "state", "country", "highestEducation", "institution", "fieldOfStudy"]) {
      if (body[key] !== undefined) updates[key] = cleanText(body[key], key === "institution" ? 160 : key === "bio" ? 500 : 120);
    }

    if (body.gender !== undefined) {
      const allowed = ["male", "female", "non-binary", "prefer-not"];
      if (!allowed.includes(String(body.gender))) return res.status(400).json({ success: false, message: "Invalid gender." });
      updates.gender = String(body.gender);
    }

    if (body.dob !== undefined) {
      if (!isValidDob(body.dob)) return res.status(400).json({ success: false, message: "Date of birth must be valid and the user must be at least 13 years old." });
      updates.dob = new Date(body.dob);
    }

    if (body.languagePref !== undefined) {
      const allowed = ["hi", "ur", "en", "bilingual"];
      if (!allowed.includes(String(body.languagePref))) return res.status(400).json({ success: false, message: "Invalid language preference." });
      updates.languagePref = String(body.languagePref);
    }

    if (body.literaryInterests !== undefined) updates.literaryInterests = parseArrayField(body.literaryInterests, 12, 60);
    if (body.languages !== undefined) updates.languages = parseArrayField(body.languages, 12, 50);

    if (body.socialLinks !== undefined) {
      const links = parseSocialLinks(body.socialLinks);
      if (links === null) return res.status(400).json({ success: false, message: "Please provide valid http/https social links." });
      updates.socialLinks = links;
    }

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "mehfil/profilePics",
        resource_type: "image",
      });
      updates.profilePic = result.secure_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await onProfileUpdated(req.userId); // awards profile-completion XP once (swallows its own errors)

    let recognition = {};
    try { recognition = await getPublicRecognition(req.userId); } catch (e) { console.error("Recognition load failed:", e.message); }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: { ...user.toObject(), ...recognition },
    });
  } catch (error) {
    console.log("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { email, username, currentPassword } = req.body || {};
    if (!currentPassword) return res.status(400).json({ success: false, message: "Current password is required." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.password) return res.status(400).json({ success: false, message: "Your account has no password yet. Use 'Forgot password' on the login page to set one first." });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const updates = {};
    if (username !== undefined) {
      const clean = normalizeUsername(username);
      if (!clean) return res.status(400).json({ success: false, message: USERNAME_RULES_MESSAGE });
      const taken = await User.exists({ username: clean, _id: { $ne: req.userId } });
      if (taken) return res.status(409).json({ success: false, message: "Username already taken" });
      updates.username = clean;
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ success: false, message: "Please provide a valid email." });
      const taken = await User.exists({ email: cleanEmail, _id: { $ne: req.userId } });
      if (taken) return res.status(409).json({ success: false, message: "Email already registered" });
      updates.email = cleanEmail;
    }

    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "Nothing to update." });

    const updated = await User.findByIdAndUpdate(req.userId, { $set: updates }, { returnDocument: 'after', runValidators: true }).select("-password");
    return res.json({ success: true, message: "Account information updated.", user: updated.toObject() });
  } catch (error) {
    console.log("Update Account Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: "All password fields are required." });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: "New passwords do not match." });
    if (String(newPassword).length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.password) return res.status(400).json({ success: false, message: "Your account has no password yet. Use 'Forgot password' on the login page to set one first." });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ success: false, message: "Current password is incorrect." });

    // updateOne (not save): older accounts may lack required fields like dob/gender, and save() would reject them.
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
    await notifyPasswordChanged(user._id, { via: "profile" });
    return res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.log("Change Password Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// GET /api/auth/username-available?username=foo  -> { available, message }
export const checkUsername = async (req, res) => {
  try {
    const username = normalizeUsername(req.query.username);
    if (!username) {
      return res.json({ success: true, available: false, message: USERNAME_RULES_MESSAGE });
    }
    const taken = await User.exists({ username });
    return res.json({
      success: true,
      available: !taken,
      username,
      message: taken ? "Username already taken" : "Username available",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// DELETE /api/auth/account  body: { password }
// Permanently deletes the authenticated user's account and the data tied to it.
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ success: false, message: "Password is required to delete your account." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.password) return res.status(400).json({ success: false, message: "Your account has no password yet. Use 'Forgot password' on the login page to set one first." });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Password is incorrect." });
    }

    // Remove content that references this user so nothing dangles.
    const poemIds = (await Poem.find({ author: user._id }).select("_id").lean()).map((p) => p._id);
    if (poemIds.length) {
      await SelectedPoem.deleteMany({ poem: { $in: poemIds } });
      await Poem.deleteMany({ author: user._id });
    }
    await Draft.deleteMany({ author: user._id });
    await WeeklyWriter.deleteMany({ writer: user._id });
    await ThursdayWriter.deleteMany({ writer: user._id });
    // Keep feedback text for the admins, but unlink it from the deleted account.
    await Feedback.updateMany({ userId: user._id }, { $set: { userId: null } });
    await ContactMessage.updateMany({ userId: user._id }, { $set: { userId: null } });
    await Notification.deleteMany({ userId: user._id });
    await UserDevice.deleteMany({ userId: user._id });

    // Best-effort cleanup of the Cloudinary profile picture; never block deletion on it.
    if (user.profilePic && user.profilePic.includes("/mehfil/profilePics/")) {
      try {
        const m = user.profilePic.match(/\/(mehfil\/profilePics\/[^./]+)\.[a-z0-9]+(?:\?.*)?$/i);
        if (m) await cloudinary.uploader.destroy(m[1]);
      } catch (e) {
        console.log("Delete Account: profile picture cleanup failed", e.message);
      }
    }

    await XPTransaction.deleteMany({ userId: user._id });
    await UserBadge.deleteMany({ userId: user._id });
    try { await purgeUserEngagement(user._id); } catch (e) { console.error("Engagement cleanup failed:", e.message); }
    await User.deleteOne({ _id: user._id });
    return res.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    console.log("Delete Account Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};
