import mongoose from "mongoose";
import Draft from "../models/Draft.js";
import { parseYouTubeField } from "../utils/youtube.js";

// All draft endpoints sit behind the auth middleware (req.userId is always set) and every query is scoped
// to that user, so one author can never read, change or delete another author's draft.

const isValidId = (id) => mongoose.isValidObjectId(id);

const asString = (v) => (typeof v === "string" ? v : "");

// Reads and validates the editable fields. Returns { error } or { fields }.
// A draft may be incomplete, but it must contain something worth saving (a title or some text).
const readDraftFields = (body = {}) => {
  const title = asString(body.title).trim();
  const text = asString(body.body);
  if (!title && !text.trim()) {
    return { error: "Add a title or some text before saving a draft." };
  }
  if (title.length > 300) return { error: "Title is too long." };
  if (text.length > 50000) return { error: "Poem body is too long." };

  const yt = parseYouTubeField(body);
  if (yt.error) return { error: yt.error };

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean).slice(0, 20)
    : [];

  return {
    fields: {
      title,
      category: asString(body.category).trim(),
      body: text,
      tags,
      copyrightDeclaration: body.copyrightDeclaration === true,
    },
    yt,
  };
};

export const createDraft = async (req, res) => {
  try {
    const parsed = readDraftFields(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const draft = await Draft.create({
      ...parsed.fields,
      author: req.userId,
      ...(parsed.yt.present && parsed.yt.value ? { youtubeVideoId: parsed.yt.value } : {}),
    });
    res.status(201).json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDrafts = async (req, res) => {
  try {
    const drafts = await Draft.find({ author: req.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, drafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDraftById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Draft not found" });
    }
    const draft = await Draft.findOne({ _id: req.params.id, author: req.userId });
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDraft = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Draft not found" });
    }
    const parsed = readDraftFields(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const draft = await Draft.findOne({ _id: req.params.id, author: req.userId });
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });

    draft.title = parsed.fields.title;
    draft.category = parsed.fields.category;
    draft.body = parsed.fields.body;
    draft.tags = parsed.fields.tags;
    draft.copyrightDeclaration = parsed.fields.copyrightDeclaration;
    if (parsed.yt.present) draft.youtubeVideoId = parsed.yt.value;

    await draft.save();
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Draft not found" });
    }
    const draft = await Draft.findOneAndDelete({ _id: req.params.id, author: req.userId });
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
    res.json({ success: true, message: "Draft deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
