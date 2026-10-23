import DailySher from "../models/DailySher.js";
import Poem from "../models/Poem.js";
import { isSuspended } from "../services/suspension.js";

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

const getDateKey = (req) => String(req.query.date || req.body?.dateKey || "").trim();

const serializeSher = (config) => {
  if (!config) return null;

  if (config.sourceType === "poem") {
    const poem = config.poem;
    if (!poem) return null;

    const lines = getFirstTwoLines(poem.body);
    if (lines.length < 2) return null;

    const author = poem.author;
    const writerName = author
      ? `${author.firstName || ""} ${author.lastName || ""}`.trim() || "अज्ञात शायर"
      : config.writerName || "अज्ञात शायर";

    return {
      configured: true,
      dateKey: config.dateKey || null,
      sourceType: "poem",
      poemId: poem._id,
      lines,
      writerName,
      tag: poem.category || config.tag || "",
      href: poem.slug ? `/poem/${poem.slug}` : undefined,
      poemTitle: poem.title || "",
    };
  }

  if (!config.line1?.trim() || !config.line2?.trim() || !config.writerName?.trim()) {
    return null;
  }

  return {
    configured: true,
    dateKey: config.dateKey || null,
    sourceType: "manual",
    lines: [config.line1.trim(), config.line2.trim()],
    writerName: config.writerName.trim(),
    tag: config.tag?.trim() || "",
  };
};

const getFirstTwoLines = (body = "") =>
  body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);

const populateConfig = (query) =>
  query.populate({
    path: "poem",
    populate: { path: "author", select: "firstName lastName username" },
  });

const getIndiaDateKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const findConfigForDate = async (dateKey) => {
  if (!dateKey) return null;
  const dated = await populateConfig(DailySher.findOne({ dateKey }));
  if (dated) return dated;

  // Backward compatibility: the previous version stored one global sher.
  // Only treat that legacy entry as today's value; tomorrow must remain independent.
  if (dateKey === getIndiaDateKey()) {
    const legacy = await populateConfig(DailySher.findOne({ key: "sherOfTheDay" }));
    return legacy && !legacy.dateKey ? legacy : null;
  }

  return null;
};

export const getDailySher = async (req, res) => {
  try {
    const dateKey = getDateKey(req);
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ success: false, message: "A valid date query is required in YYYY-MM-DD format" });
    }

    const config = await findConfigForDate(dateKey);
    // A sher taken from a suspended member's poem is hidden until the account is restored.
    const hidden = config?.poem?.author?._id && (await isSuspended(config.poem.author._id));
    const sher = hidden ? null : serializeSher(config);
    res.json({ success: true, configured: !!sher, sher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailySherAdmin = async (req, res) => {
  try {
    const dateKey = getDateKey(req);
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ success: false, message: "A valid date query is required in YYYY-MM-DD format" });
    }

    const config = await findConfigForDate(dateKey);
    res.json({
      success: true,
      config: config
        ? {
            dateKey: config.dateKey || dateKey,
            sourceType: config.sourceType,
            poemId: config.poem?._id || null,
            line1: config.line1 || "",
            line2: config.line2 || "",
            writerName: config.writerName || "",
            tag: config.tag || "",
            sher: serializeSher(config),
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveDailySher = async (req, res) => {
  try {
    const { dateKey, sourceType, poemId, line1, line2, writerName, tag } = req.body;

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ success: false, message: "A valid date is required in YYYY-MM-DD format" });
    }

    if (!["manual", "poem"].includes(sourceType)) {
      return res.status(400).json({ success: false, message: "Invalid source type" });
    }

    const payload = {
      key: `sherOfTheDay:${dateKey}`,
      dateKey,
      sourceType,
      tag: tag?.trim() || "",
    };

    if (sourceType === "poem") {
      if (!poemId) return res.status(400).json({ success: false, message: "Please select a poem" });

      const poem = await Poem.findById(poemId);
      if (!poem) return res.status(404).json({ success: false, message: "Selected poem not found" });

      const lines = getFirstTwoLines(poem.body);
      if (lines.length < 2) {
        return res.status(400).json({ success: false, message: "Selected poem must contain at least two non-empty lines" });
      }

      payload.poem = poem._id;
      payload.line1 = "";
      payload.line2 = "";
      payload.writerName = "";
    } else {
      if (!line1?.trim() || !line2?.trim() || !writerName?.trim()) {
        return res.status(400).json({ success: false, message: "Both sher lines and writer name are required" });
      }

      payload.poem = null;
      payload.line1 = line1.trim();
      payload.line2 = line2.trim();
      payload.writerName = writerName.trim();
    }

    const config = await DailySher.findOneAndUpdate(
      { dateKey },
      { $set: payload },
      { returnDocument: 'after', upsert: true, runValidators: true },
    );

    res.json({ success: true, message: `शेर for ${dateKey} updated successfully`, config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearDailySher = async (req, res) => {
  try {
    const dateKey = getDateKey(req);
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ success: false, message: "A valid date query is required in YYYY-MM-DD format" });
    }

    await DailySher.deleteOne({ dateKey });
    res.json({ success: true, message: `Sher for ${dateKey} reset successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
