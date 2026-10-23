import mongoose from "mongoose";
import User from "../models/User.js";
import BadgeDefinition from "../models/BadgeDefinition.js";
import UserBadge from "../models/UserBadge.js";
import BadgeAuditLog from "../models/BadgeAuditLog.js";
import {
  CONDITION_TYPES,
  CONDITION_TYPE_LIST,
  FRAMES,
  FRAME_KEYS,
  XP_RULES,
  POETRY_MILESTONES,
  POEM_XP_RULES,
  awardModeFor,
  getEarlySupporterCutoff,
  getFounderUserIds,
} from "../config/progression.js";
import { adjustXPByAdmin, getXPHistory, getUserXP } from "../services/xpService.js";
import {
  getAdminProgression,
  grantBadge,
  revokeBadge,
  recalculateBadges,
  refreshProfileFrame,
} from "../services/badgeService.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const serverError = (res, error) => {
  console.error("Progression admin error:", error);
  return fail(res, 500, error.message || "Server error");
};
const validId = (id) => mongoose.isValidObjectId(id);

const SAFE_ICON = /^(fa-[a-z0-9-]{1,40}|https:\/\/[^\s"'<>]{1,280}|[^\s<>"'`]{1,12})$/u;

/* ------------------------------ per-user views ----------------------------- */

export const getUserProgression = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return fail(res, 400, "Invalid user id");
    const user = await User.findById(id).select("firstName lastName username profilePic").lean();
    if (!user) return fail(res, 404, "User not found");
    const [xp, progression, history] = await Promise.all([
      getUserXP(id),
      getAdminProgression(id),
      getXPHistory(id, { page: 1, limit: 50 }),
    ]);
    return res.json({
      success: true,
      user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, username: user.username, profilePic: user.profilePic },
      xp,
      ...progression,
      history,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

export const getUserXPHistory = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    const history = await getXPHistory(req.params.id, { page: req.query.page, limit: req.query.limit });
    return res.json({ success: true, ...history });
  } catch (error) {
    return serverError(res, error);
  }
};

export const adjustUserXP = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    const amount = Number(req.body?.amount);
    const result = await adjustXPByAdmin({
      userId: req.params.id,
      amount,
      reason: req.body?.reason,
      adminId: req.adminId,
    });
    if (!result.ok) return fail(res, result.status, result.message);
    return res.json({ success: true, xp: result.xp, newlyUnlocked: result.newlyUnlocked, transaction: result.transaction });
  } catch (error) {
    return serverError(res, error);
  }
};

export const recalculateUser = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    if ((await getUserXP(req.params.id)) === null) return fail(res, 404, "User not found");
    const result = await recalculateBadges(req.params.id);
    return res.json({ success: true, newlyUnlocked: result.newlyUnlocked, profileFrame: result.profileFrame });
  } catch (error) {
    return serverError(res, error);
  }
};

export const grantUserBadge = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    if ((await getUserXP(req.params.id)) === null) return fail(res, 404, "User not found");
    const result = await grantBadge(req.params.id, String(req.params.key).toLowerCase(), {
      adminId: req.adminId,
      reason: String(req.body?.reason ?? "").trim().slice(0, 300),
    });
    if (!result.ok) return fail(res, result.status, result.message);
    return res.json({ success: true, changed: result.changed, profileFrame: result.profileFrame });
  } catch (error) {
    return serverError(res, error);
  }
};

export const revokeUserBadge = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    if ((await getUserXP(req.params.id)) === null) return fail(res, 404, "User not found");
    const reason = String(req.body?.reason ?? "").trim().slice(0, 300);
    if (reason.length < 3) return fail(res, 400, "A reason (at least 3 characters) is required to revoke a badge.");
    const result = await revokeBadge(req.params.id, String(req.params.key).toLowerCase(), { adminId: req.adminId, reason });
    if (!result.ok) return fail(res, result.status, result.message);
    return res.json({ success: true, changed: result.changed, profileFrame: result.profileFrame });
  } catch (error) {
    return serverError(res, error);
  }
};

export const getUserBadgeAudit = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid user id");
    const items = await BadgeAuditLog.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, items });
  } catch (error) {
    return serverError(res, error);
  }
};

/** Admin-only: who holds a badge and when they got it (most recent 200). */
export const listBadgeHolders = async (req, res) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const rows = await UserBadge.find({ badgeKey: key, unlocked: true }).sort({ unlockedAt: -1 }).limit(201).lean();
    const truncated = rows.length > 200;
    const shown = rows.slice(0, 200);
    const users = await User.find({ _id: { $in: shown.map((r) => r.userId) } }).select("firstName lastName username").lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    return res.json({
      success: true,
      truncated,
      holders: shown.map((r) => {
        const u = byId.get(String(r.userId)) || {};
        return { userId: r.userId, firstName: u.firstName, lastName: u.lastName, username: u.username, unlockedAt: r.unlockedAt, source: r.source };
      }),
    });
  } catch (error) {
    return serverError(res, error);
  }
};

/* ---------------------------- badge definitions ---------------------------- */

const buildDefinitionFields = (body, { partial }) => {
  const out = {};
  const errors = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 80) errors.push("Name is required (max 80 characters).");
    else out.name = name;
  }
  if (has("description")) {
    const d = String(body.description ?? "").trim();
    if (d.length > 300) errors.push("Description is too long (max 300).");
    else out.description = d;
  }
  if (has("icon")) {
    const icon = String(body.icon ?? "").trim();
    if (!icon) out.icon = "fa-award";
    else if (!SAFE_ICON.test(icon)) errors.push("Icon must be a Font Awesome class (fa-star), an https image URL, or a short emoji.");
    else out.icon = icon;
  }
  if (has("active")) out.active = body.active === true || body.active === "true";
  if (has("sortOrder")) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n)) errors.push("Sort order must be a number.");
    else out.sortOrder = Math.trunc(n);
  }
  if (has("frameKey")) {
    const f = body.frameKey === "" || body.frameKey === "default" ? null : body.frameKey;
    if (f !== null && !FRAME_KEYS.includes(f)) errors.push("Unknown frame.");
    else out.frameKey = f;
  }
  if (!partial || has("conditionType")) {
    if (!CONDITION_TYPE_LIST.includes(body.conditionType)) errors.push("Unknown condition type.");
    else out.conditionType = body.conditionType;
  }
  return { out, errors };
};

export const listBadgeDefinitions = async (req, res) => {
  try {
    const [defs, counts] = await Promise.all([
      BadgeDefinition.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
      UserBadge.aggregate([{ $match: { unlocked: true } }, { $group: { _id: "$badgeKey", count: { $sum: 1 } } }]),
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    return res.json({
      success: true,
      badges: defs.map((d) => ({ ...d, awardMode: awardModeFor(d.conditionType), unlockedCount: countMap.get(d.key) || 0 })),
      options: {
        conditionTypes: CONDITION_TYPE_LIST,
        frames: FRAMES,
        xpRules: XP_RULES,
        poetryMilestones: POETRY_MILESTONES,
        poemXpRules: POEM_XP_RULES,
        // Read-only view of the server settings that drive the special badges (set via environment variables).
        earlySupporterCutoff: getEarlySupporterCutoff()?.toISOString() || null,
        founderAccountsConfigured: getFounderUserIds().length,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

const resolveThreshold = (conditionType, raw) => {
  if (conditionType === CONDITION_TYPES.MANUAL || conditionType === CONDITION_TYPES.EARLY_SUPPORTER) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1000000) return { error: "Threshold must be a whole number of at least 1." };
  return { value: n };
};

export const createBadgeDefinition = async (req, res) => {
  try {
    const body = req.body || {};
    const key = String(body.key ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_]{2,40}$/.test(key)) return fail(res, 400, "Key must be 2–40 characters: lowercase letters, digits, underscore.");
    const { out, errors } = buildDefinitionFields(body, { partial: false });
    const t = resolveThreshold(out.conditionType, body.threshold);
    if (t.error) errors.push(t.error);
    if (errors.length) return fail(res, 400, errors.join(" "));
    if (await BadgeDefinition.exists({ key })) return fail(res, 409, "A badge with this key already exists.");

    const def = await BadgeDefinition.create({ key, ...out, threshold: t.value, active: out.active ?? true });
    await BadgeAuditLog.create({ badgeKey: key, action: "definition_create", adminId: req.adminId, reason: "Created badge definition" });
    return res.status(201).json({ success: true, badge: def });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "A badge with this key already exists.");
    return serverError(res, error);
  }
};

export const updateBadgeDefinition = async (req, res) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const def = await BadgeDefinition.findOne({ key });
    if (!def) return fail(res, 404, "Badge not found");
    const body = req.body || {};
    const { out, errors } = buildDefinitionFields(body, { partial: true });
    const conditionType = out.conditionType ?? def.conditionType;
    if (out.conditionType !== undefined || body.threshold !== undefined) {
      const t = resolveThreshold(conditionType, body.threshold !== undefined ? body.threshold : def.threshold);
      if (t.error) errors.push(t.error);
      else out.threshold = t.value;
    }
    if (errors.length) return fail(res, 400, errors.join(" "));
    Object.assign(def, out);
    await def.save();
    await BadgeAuditLog.create({
      badgeKey: key,
      action: "definition_update",
      adminId: req.adminId,
      reason: `Updated: ${Object.keys(out).join(", ") || "nothing"}`.slice(0, 300),
    });
    // Frame mapping / activation / thresholds may change who qualifies; re-derive frames for holders.
    if (out.frameKey !== undefined || out.active !== undefined) {
      const holders = await UserBadge.find({ badgeKey: key, unlocked: true }).select("userId").limit(5000).lean();
      for (const h of holders) await refreshProfileFrame(h.userId);
    }
    return res.json({ success: true, badge: def });
  } catch (error) {
    return serverError(res, error);
  }
};

export const setBadgeActive = async (req, res) => {
  req.body = { active: req.body?.active === true || req.body?.active === "true" };
  return updateBadgeDefinition(req, res);
};
