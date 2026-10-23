import WeeklyWriter from "../models/WeeklyWriter.js";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import { grantBadge } from "../services/badgeService.js";
import { notifyWeeklyWriter } from "../services/notificationService.js";
import { getSuspendedIds, isSuspended } from "../services/suspension.js";
import { EDITORIAL_BADGE_KEYS } from "../config/progression.js";

const IST = "Asia/Kolkata";

const dateKeyInIndia = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const mondayForDateKey = (dateKey) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // Sunday = 0
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
};

export const getCurrentWeekStart = () => mondayForDateKey(dateKeyInIndia());

/**
 * Badge + notification go out only once the week is published (i.e. the week has started in IST).
 * Selecting a writer for a future week stores the choice only, so the admin can still change it.
 * Claimed atomically via rewardsGranted so it runs once per (week, writer).
 */
const deliverWeeklyWriterRewards = async (weekStart, writerId) => {
  if (weekStart > getCurrentWeekStart()) return false;
  const claimed = await WeeklyWriter.findOneAndUpdate(
    { weekStart, writer: writerId, rewardsGranted: { $ne: true } },
    { $set: { rewardsGranted: true } },
    { returnDocument: "after" },
  );
  if (!claimed) return false;
  try {
    const result = await grantBadge(writerId, EDITORIAL_BADGE_KEYS.WEEKLY_WRITER, { adminId: "weekly-writer selection", editorial: true, reason: `Week of ${weekStart}` });
    if (result && result.ok === false) throw new Error(result.message || "badge grant failed");
  } catch (e) {
    console.error("Weekly writer badge grant failed:", e.message);
    await WeeklyWriter.updateOne({ _id: claimed._id }, { $set: { rewardsGranted: false } }).catch(() => {});
    return false;
  }
  await notifyWeeklyWriter(writerId, weekStart); // once per writer per week (never throws)
  return true;
};

const serializeWriter = (writer, mode, weekStart) => {
  if (!writer) return null;
  return {
    _id: writer._id,
    firstName: writer.firstName || "",
    lastName: writer.lastName || "",
    username: writer.username || "",
    profilePic: writer.profilePic || "",
    bio: writer.bio || "",
    city: writer.city || "",
    poemsCount: writer.poemsCount || 0,
    mode,
    weekStart,
  };
};

const getEligibleWriters = async () => {
  const suspendedIds = await getSuspendedIds();
  const authorIds = (await Poem.distinct("author")).filter((id) => !suspendedIds.includes(String(id)));
  if (!authorIds.length) return [];

  const users = await User.find({ _id: { $in: authorIds } })
    .select("firstName lastName username profilePic bio city createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  if (!users.length) return [];

  const counts = await Poem.aggregate([
    { $match: { author: { $in: users.map((u) => u._id) } } },
    { $group: { _id: "$author", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  return users.map((user) => ({ ...user, poemsCount: countMap.get(String(user._id)) || 0 }));
};

const getAutoWriter = async (weekStart) => {
  const writers = await getEligibleWriters();
  if (!writers.length) return null;

  const epoch = Date.UTC(2020, 0, 6); // Monday
  const [y, m, d] = weekStart.split("-").map(Number);
  const current = Date.UTC(y, m - 1, d);
  const weekIndex = Math.floor((current - epoch) / 604800000);
  const index = ((weekIndex % writers.length) + writers.length) % writers.length;
  return writers[index];
};

export const getWeeklyWriter = async (req, res) => {
  try {
    const weekStart = getCurrentWeekStart();
    const config = await WeeklyWriter.findOne({ weekStart }).populate("writer").lean();

    if (config?.writer && !(await isSuspended(config.writer._id))) {
      // The week has started -> now is the time the selected writer receives the badge (no-op if already done)
      try { await deliverWeeklyWriterRewards(weekStart, config.writer._id); } catch (e) { console.error("Weekly writer rewards failed:", e.message); }
      const count = await Poem.countDocuments({ author: config.writer._id });
      return res.json({
        success: true,
        configured: true,
        mode: "manual",
        weekStart,
        weekStartsOn: "Monday",
        writer: serializeWriter({ ...config.writer, poemsCount: count }, "manual", weekStart),
      });
    }

    const writer = await getAutoWriter(weekStart);
    return res.json({
      success: true,
      configured: false,
      mode: "automatic",
      weekStart,
      weekStartsOn: "Monday",
      writer: serializeWriter(writer, "automatic", weekStart),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeeklyWriterAdmin = async (req, res) => {
  try {
    const weekStart = String(req.query.weekStart || getCurrentWeekStart()).trim();
    const config = await WeeklyWriter.findOne({ weekStart }).populate("writer").lean();
    res.json({
      success: true,
      weekStart,
      weekStartsOn: "Monday",
      configured: !!config?.writer,
      writerId: config?.writer?._id || null,
      writer: config?.writer || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveWeeklyWriter = async (req, res) => {
  try {
    const { weekStart, writerId } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart || "")) {
      return res.status(400).json({ success: false, message: "Valid weekStart is required" });
    }

    const monday = mondayForDateKey(weekStart);
    if (monday !== weekStart) {
      return res.status(400).json({ success: false, message: "weekStart must be a Monday" });
    }

    if (!writerId) {
      await WeeklyWriter.deleteOne({ weekStart });
      return res.json({ success: true, message: "Automatic weekly writer enabled", configured: false });
    }

    const writer = await User.findById(writerId).select("firstName lastName username profilePic bio city");
    if (!writer) return res.status(404).json({ success: false, message: "Writer not found" });

    const existing = await WeeklyWriter.findOne({ weekStart }).select("writer rewardsGranted").lean();
    const sameWriter = existing && String(existing.writer) === String(writer._id);
    await WeeklyWriter.findOneAndUpdate(
      { weekStart },
      { $set: { weekStart, writer: writer._id, rewardsGranted: sameWriter ? !!existing.rewardsGranted : false } },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );

    // Future week: only store the selection. Badge/notification are delivered when that week starts.
    await deliverWeeklyWriterRewards(weekStart, writer._id);

    res.json({ success: true, message: "Weekly writer saved", configured: true, weekStart, writerId: writer._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearWeeklyWriter = async (req, res) => {
  try {
    const weekStart = String(req.query.weekStart || getCurrentWeekStart()).trim();
    await WeeklyWriter.deleteOne({ weekStart });
    res.json({ success: true, message: "Weekly writer reset to automatic mode" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
