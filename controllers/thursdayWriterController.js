import ThursdayWriter from "../models/ThursdayWriter.js";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import { isSuspended } from "../services/suspension.js";

const IST = "Asia/Kolkata";

const dateKeyInIndia = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

// Most recent Thursday on or before the given date key (so the writer flips at 00:00 IST on Thursday).
const thursdayOnOrBefore = (dateKey) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() - 4 + 7) % 7));
  return date.toISOString().slice(0, 10);
};

const isThursday = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key || "") && new Date(`${key}T00:00:00Z`).getUTCDay() === 4;

export const getCurrentThursday = () => thursdayOnOrBefore(dateKeyInIndia());

const serialize = (writer, poemsCount) => ({
  _id: writer._id,
  firstName: writer.firstName || "",
  lastName: writer.lastName || "",
  username: writer.username || "",
  profilePic: writer.profilePic || "",
  bio: writer.bio || "",
  city: writer.city || "",
  languagePref: writer.languagePref || "",
  poemsCount,
});

// Public: GET /api/auth/thursday-writer
export const getThursdayWriter = async (req, res) => {
  try {
    const date = getCurrentThursday();
    const config = await ThursdayWriter.findOne({ date }).populate("writer").lean();
    if (!config?.writer || (await isSuspended(config.writer._id))) {
      return res.json({ success: true, configured: false, date, writer: null });
    }
    const count = await Poem.countDocuments({ author: config.writer._id });
    res.json({ success: true, configured: true, date, writer: serialize(config.writer, count) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: GET /api/admin/thursday-writer
export const getThursdayWriterAdmin = async (req, res) => {
  try {
    const date = String(req.query.date || getCurrentThursday()).trim();
    const config = await ThursdayWriter.findOne({ date }).populate("writer").lean();
    res.json({
      success: true,
      date,
      configured: !!config?.writer,
      writerId: config?.writer?._id || null,
      writer: config?.writer || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: PUT /api/admin/thursday-writer  { date, writerId }  (empty writerId clears that Thursday)
export const saveThursdayWriter = async (req, res) => {
  try {
    const { date, writerId } = req.body;
    if (!isThursday(date)) {
      return res.status(400).json({ success: false, message: "date must be a Thursday (YYYY-MM-DD)" });
    }
    if (!writerId) {
      await ThursdayWriter.deleteOne({ date });
      return res.json({ success: true, message: "Thursday writer cleared", configured: false });
    }
    const writer = await User.findById(writerId).select("_id");
    if (!writer) return res.status(404).json({ success: false, message: "Writer not found" });
    await ThursdayWriter.findOneAndUpdate(
      { date },
      { $set: { date, writer: writer._id } },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    res.json({ success: true, message: "Thursday writer saved", configured: true, date, writerId: writer._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: DELETE /api/admin/thursday-writer
export const clearThursdayWriter = async (req, res) => {
  try {
    const date = String(req.query.date || getCurrentThursday()).trim();
    await ThursdayWriter.deleteOne({ date });
    res.json({ success: true, message: "Thursday writer cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
