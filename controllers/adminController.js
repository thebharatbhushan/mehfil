import generateSlug from "../utils/generateSlug.js";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import { parseYouTubeField } from "../utils/youtube.js";
import XPTransaction from "../models/XPTransaction.js";
import UserBadge from "../models/UserBadge.js";
import { grantBadge } from "../services/badgeService.js";
import { purgeUserEngagement } from "../services/engagementService.js";
import { EDITORIAL_BADGE_KEYS } from "../config/progression.js";
import { invalidateSuspendedCache } from "../services/suspension.js";
import {
  notifyFeaturedWriter,
  notifyFeaturedPoem,
  notifyPoemModeration,
  notifyAccountRestored,
} from "../services/notificationService.js";
import mongoose from "mongoose";

export const getAllUsers = async (req, res) => {

  try {

    // The public /poets page also reads this list, so suspended members are left out unless the admin panel asks for them.
    const filter = req.query.includeSuspended === "1" ? {} : { suspended: { $ne: true } };
    const users = await User
      .find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



export const getAllPoems = async (req, res) => {

  try {

    const poems = await Poem
      .find()
      .select("+views")
      .populate(
        "author",
        "firstName lastName email profilePic"
      )
      .sort({
        createdAt: -1
      });

    res.json({
      success: true,
      poems
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



export const deleteUser = async (req, res) => {

  try {

    const userId = req.params.id;

    // Delete all poems written by this user
    await Poem.deleteMany({
      author: userId
    });

    await XPTransaction.deleteMany({ userId });
    await UserBadge.deleteMany({ userId });
    try { await purgeUserEngagement(userId); } catch (e) { console.error("Engagement cleanup failed:", e.message); }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User and all poems deleted successfully"
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



export const deletePoem = async (req, res) => {

  try {

    await Poem.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

export const updateUser = async (req, res) => {

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const body = req.body || {};

    // Basic account/profile fields
    if (body.firstName !== undefined) user.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) user.lastName = String(body.lastName).trim();

    if (body.username !== undefined) {
      const username = String(body.username).trim().replace(/^@/, "").toLowerCase();
      if (!username) return res.status(400).json({ success: false, message: "Username is required" });
      const taken = await User.exists({ username, _id: { $ne: user._id } });
      if (taken) return res.status(409).json({ success: false, message: "Username already taken" });
      user.username = username;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Valid email is required" });
      }
      const taken = await User.exists({ email, _id: { $ne: user._id } });
      if (taken) return res.status(409).json({ success: false, message: "Email already registered" });
      user.email = email;
    }

    if (body.gender !== undefined) {
      const allowed = ["male", "female", "non-binary", "prefer-not"];
      if (!allowed.includes(body.gender)) return res.status(400).json({ success: false, message: "Invalid gender" });
      user.gender = body.gender;
    }

    if (body.dob !== undefined && body.dob !== "") {
      const date = new Date(body.dob);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid date of birth" });
      user.dob = date;
    }

    // Extended profile fields collected by Mehfil Profile
    const textFields = [
      ["city", 80],
      ["state", 80],
      ["country", 80],
      ["highestEducation", 120],
      ["institution", 160],
      ["fieldOfStudy", 120],
      ["bio", 500]
    ];

    for (const [key, max] of textFields) {
      if (body[key] !== undefined) {
        const value = String(body[key] ?? "").trim();
        if (value.length > max) return res.status(400).json({ success: false, message: `${key} is too long` });
        user[key] = value;
      }
    }

    if (body.literaryInterests !== undefined) {
      if (!Array.isArray(body.literaryInterests)) return res.status(400).json({ success: false, message: "Literary interests must be an array" });
      user.literaryInterests = body.literaryInterests.map(v => String(v).trim()).filter(Boolean).slice(0, 30);
    }

    if (body.languages !== undefined) {
      if (!Array.isArray(body.languages)) return res.status(400).json({ success: false, message: "Languages must be an array" });
      user.languages = body.languages.map(v => String(v).trim()).filter(Boolean).slice(0, 20);
    }

    if (body.socialLinks !== undefined) {
      const links = body.socialLinks || {};
      user.socialLinks = {
        instagram: String(links.instagram ?? "").trim(),
        x: String(links.x ?? "").trim(),
        website: String(links.website ?? "").trim(),
        linkedin: String(links.linkedin ?? "").trim()
      };
    }

    if (body.profilePic !== undefined) user.profilePic = String(body.profilePic ?? "").trim();

    const updated = await user.save();
    const safeUser = updated.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      message: "User profile updated successfully",
      user: safeUser
    });

  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({ success: false, message: `${field} already exists` });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }

};

export const updatePoem = async (req, res) => {

  try {

    const poem = await Poem.findById(
      req.params.id
    );

    if (!poem) {

      return res.status(404).json({
        success: false,
        message: "Poem not found"
      });

    }

 const {
  title,
  category,
  body,
  tags
} = req.body;

const yt = parseYouTubeField(req.body);
if (yt.error) {
  return res.status(400).json({ success: false, message: yt.error });
}

if (poem.title !== title) {
  poem.slug = await generateSlug(title, poem._id);
}

poem.title = title;
poem.category = category;
poem.body = body;
poem.tags = tags;
if (yt.present) poem.youtubeVideoId = yt.value;

    await poem.save();

    res.json({
      success: true,
      message: "Poem updated"
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

export const toggleFeaturedWriter = async (req, res) => {

  try {

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.featuredWriter = !user.featuredWriter;

    await user.save();

    // Featuring a writer is an editorial selection -> Spotlight badge (best-effort, never blocks the toggle).
    if (user.featuredWriter) {
      try {
        await grantBadge(user._id, EDITORIAL_BADGE_KEYS.FEATURED_WRITER, { adminId: "featured-writer toggle", editorial: true });
      } catch (e) { console.error("Spotlight badge grant failed:", e.message); }
      await notifyFeaturedWriter(user._id); // once per member (never throws)
    }

    res.json({
      success: true,
      featuredWriter: user.featuredWriter
    });

  }

  catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

export const toggleFeaturedPoem = async (req, res) => {

    try {

        const poem = await Poem.findById(req.params.id);

        if (!poem) {
            return res.status(404).json({
                success: false,
                message: "Poem not found"
            });
        }

        poem.featuredPoem = !poem.featuredPoem;

        await poem.save();

        if (poem.featuredPoem) await notifyFeaturedPoem(poem); // once per poem (never throws)

        res.json({
            success: true,
            featuredPoem: poem.featuredPoem
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



/**
 * PUT /api/admin/users/:id/suspend   body: { suspended: true|false, reason?: string }
 * Temporary: hides the member and all of their poems from the public site and signs them out.
 * Nothing is deleted - restoring (suspended: false) brings back the same account, poems, badges and XP.
 */
export const setUserSuspended = async (req, res) => {
  try {
    const suspended = req.body?.suspended === true || req.body?.suspended === "true";
    const reason = String(req.body?.reason ?? "").trim().slice(0, 300);
    const update = suspended
      ? { suspended: true, suspendedAt: new Date(), suspendReason: reason }
      : { suspended: false, suspendedAt: null, suspendReason: "" };
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: "after" })
      .select("firstName lastName username suspended suspendedAt suspendReason");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    invalidateSuspendedCache();
    if (!suspended) await notifyAccountRestored(user._id); // a suspended member cannot read it until restored
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * PUT /api/admin/poems/:id/moderation   body: { status: "published"|"unpublished"|"rejected", reason?: string }
 * unpublished / rejected hide the poem from the whole public site (nothing is deleted); published restores it.
 * "rejected" requires a reason. The author is notified in-app with the reason.
 */
export const moderatePoem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const status = String(req.body?.status ?? "");
    if (!["published", "unpublished", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be published, unpublished or rejected." });
    }
    const reason = String(req.body?.reason ?? "").trim().slice(0, 300);
    if (status === "rejected" && reason.length < 3) {
      return res.status(400).json({ success: false, message: "Please give a reason (at least 3 characters) when rejecting a poem." });
    }

    const poem = await Poem.findById(req.params.id).select("title slug author status");
    if (!poem) return res.status(404).json({ success: false, message: "Poem not found" });

    const previous = poem.status || "published";
    await Poem.updateOne(
      { _id: poem._id },
      { $set: { status, moderationReason: status === "published" ? "" : reason, moderatedAt: new Date() } },
      { timestamps: false },
    );

    if (previous !== status || (status !== "published" && reason)) {
      await notifyPoemModeration(poem, status, reason);
    }
    res.json({ success: true, status, reason: status === "published" ? "" : reason });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
