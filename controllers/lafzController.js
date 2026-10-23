import DailyLafz from "../models/DailyLafz.js";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateKey = (value) => {
  if (!DATE_KEY_RE.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const getDateKey = (req) => {
  const dateKey = String(req.query.date || "").trim();
  return dateKey;
};

const serializeLafz = (lafz) => {
  if (!lafz) return null;
  return {
    dateKey: lafz.dateKey,
    word: lafz.word || "",
    urdu: lafz.urdu || "",
    roman: lafz.roman || "",
    meaning: lafz.meaning || "",
    english: lafz.english || "",
    explanation: lafz.explanation || "",
    example: lafz.example || "",
  };
};

export const getDailyLafz = async (req, res) => {
  try {
    const dateKey = getDateKey(req);

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "A valid date query is required in YYYY-MM-DD format",
      });
    }

    const lafz = await DailyLafz.findOne({ dateKey }).lean();

    res.json({
      success: true,
      configured: !!lafz,
      lafz: serializeLafz(lafz),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyLafzAdmin = async (req, res) => {
  try {
    const dateKey = getDateKey(req);

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "A valid date query is required in YYYY-MM-DD format",
      });
    }

    const lafz = await DailyLafz.findOne({ dateKey }).lean();

    res.json({
      success: true,
      lafz: serializeLafz(lafz),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveDailyLafz = async (req, res) => {
  try {
    const {
      dateKey,
      word,
      urdu,
      roman,
      meaning,
      english,
      explanation,
      example,
    } = req.body;

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "A valid date is required in YYYY-MM-DD format",
      });
    }

    if (!word?.trim() || !meaning?.trim() || !explanation?.trim() || !example?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Word, meaning, explanation and example are required",
      });
    }

    const payload = {
      dateKey,
      word: word.trim(),
      urdu: urdu?.trim() || "",
      roman: roman?.trim() || "",
      meaning: meaning.trim(),
      english: english?.trim() || "",
      explanation: explanation.trim(),
      example: example.trim(),
    };

    const lafz = await DailyLafz.findOneAndUpdate(
      { dateKey },
      { $set: payload },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    res.json({
      success: true,
      message: `आज का लफ़्ज़ updated successfully`,
      lafz: serializeLafz(lafz),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearDailyLafz = async (req, res) => {
  try {
    const dateKey = getDateKey(req);

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "A valid date query is required in YYYY-MM-DD format",
      });
    }

    await DailyLafz.deleteOne({ dateKey });

    res.json({
      success: true,
      message: "Daily lafz reset successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
