// import slugify from "slugify";
import mongoose from "mongoose";
import Poem from "../models/Poem.js";
import Draft from "../models/Draft.js";
import User from "../models/User.js";
import generateSlug from "../utils/generateSlug.js";
import { parseYouTubeField } from "../utils/youtube.js";
import { onPoemPublished } from "../services/xpService.js";
import { purgePoemEngagement } from "../services/engagementService.js";
import { hideSuspendedAuthors, isSuspended } from "../services/suspension.js";
import { PUBLIC_POEM_FILTER, isPoemHidden } from "../utils/poemVisibility.js";
const DEFAULT_POEMS_PAGE_SIZE = 16;
const MAX_POEMS_PAGE_SIZE = 100;

export const createPoem = async (req, res) => {
  try {
    const { title, category, body, tags, copyrightDeclaration } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Poem body is required",
      });
    }
    if (!copyrightDeclaration) {
      return res.status(400).json({
        success: false,
        message:
          "Please accept the copyright declaration before publishing your poem.",
      });
    }
    const yt = parseYouTubeField(req.body);
    if (yt.error) {
      return res.status(400).json({ success: false, message: yt.error });
    }
    const slug = await generateSlug(title);
    const poem = await Poem.create({
      title,
      slug,
      category,
      body,
      tags,
      copyrightDeclaration,
      author: req.userId,
      ...(yt.present && yt.value ? { youtubeVideoId: yt.value } : {}),
    });
    // Publishing a saved draft: once the poem exists, remove that draft (scoped to this author).
    // Never blocks publishing if the cleanup fails; the draft can still be deleted from the profile.
    const { draftId } = req.body;
    if (draftId && mongoose.isValidObjectId(draftId)) {
      try {
        await Draft.deleteOne({ _id: draftId, author: req.userId });
      } catch (e) {
        console.error("Draft cleanup after publish failed:", e.message);
      }
    }
    // XP is decided entirely server-side; failures are swallowed inside so publishing never breaks.
    await onPoemPublished(req.userId, poem);
    const created = poem.toObject();
    delete created.views; // view count is private (admin only)
    res.status(201).json({
      success: true,
      poem: created,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyPoems = async (req, res) => {
  try {
    const poems = await Poem.find({
      author: req.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      poems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePoem = async (req, res) => {
  try {
    const poem = await Poem.findOne({
      _id: req.params.id,
      author: req.userId,
    });

    if (!poem) {
      return res.status(404).json({
        success: false,
      });
    }

    const { title, category, body, tags } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Poem body is required",
      });
    }

    const yt = parseYouTubeField(req.body);
    if (yt.error) {
      return res.status(400).json({ success: false, message: yt.error });
    }

    if (poem.title !== title) {
      poem.slug = await generateSlug(title, poem._id);
    }

    poem.title = title;
    poem.body = body;
    poem.category = category;
    poem.tags = tags;
    if (yt.present) poem.youtubeVideoId = yt.value;

    await poem.save();

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Private view counter: the client only says "a poem was opened"; the server does the atomic +1.
// timestamps:false so a view never bumps updatedAt (that date can feed sitemap/SEO "last modified").
export const incrementPoemView = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false });
    }
    const result = await Poem.updateOne(
      { _id: req.params.id },
      { $inc: { views: 1 } },
      { timestamps: false },
    );
    if (!result.matchedCount) return res.status(404).json({ success: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Paginated public list. Every request returns at most `limit` poems (default 16, hard cap 100) so the
// payload stays small however many poems exist. Optional filters: ?category=love&q=search text.
// Response: { success, poems, page, limit, total, totalPages, hasMore }.
export const getAllPoems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_POEMS_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_POEMS_PAGE_SIZE));

    const filter = { ...PUBLIC_POEM_FILTER, ...(await hideSuspendedAuthors()) };

    const category = String(req.query.category || "").trim();
    if (category && category.toLowerCase() !== "all") {
      filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    }

    const q = String(req.query.q || "").trim().slice(0, 100);
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      const or = [{ title: rx }, { body: rx }];
      const words = q.split(/\s+/).filter(Boolean).map((w) => new RegExp(escapeRegex(w), "i"));
      const nameMatch = words.map((w) => ({ $or: [{ firstName: w }, { lastName: w }, { username: w }] }));
      const authors = await User.find({ $and: nameMatch }).select("_id").limit(200).lean();
      if (authors.length) or.push({ author: { $in: authors.map((a) => a._id) } });
      filter.$and = [...(filter.$and || []), { $or: or }];
    }

    const [total, poems] = await Promise.all([
      Poem.countDocuments(filter),
      Poem.find(filter)
        .populate("author", "firstName lastName username profilePic")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      success: true,
      poems,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPoemById = async (req, res) => {
  try {
    const poem = await Poem.findById(req.params.id).populate(
      "author",
      "firstName lastName username profilePic",
    );

    if (poem && (isPoemHidden(poem) || (await isSuspended(poem.author?._id)))) {
      return res.status(404).json({ success: false, message: "Poem not found" });
    }

    res.json({
      success: true,
      poem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePoem = async (req, res) => {
  try {
    const poem = await Poem.findOneAndDelete({
      _id: req.params.id,
      author: req.userId,
    });

    if (!poem) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    // Private reader/save/like rows for a deleted poem are removed (best-effort; counts also ignore missing poems).
    try {
      await purgePoemEngagement(poem._id);
    } catch (e) {
      console.error("Engagement cleanup after poem delete failed:", e.message);
    }

    res.json({
      success: true,
      message: "Poem deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPoemBySlug = async (req, res) => {
  try {
    const poem = await Poem.findOne({
      slug: req.params.slug,
    }).populate("author", "firstName lastName username profilePic");

    if (!poem || isPoemHidden(poem) || (await isSuspended(poem.author?._id))) {
      return res.status(404).json({
        success: false,
        message: "Poem not found",
      });
    }

    res.json({
      success: true,
      poem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFeaturedPoems = async (req, res) => {
  try {
    const poems = await Poem.find({
      featuredPoem: true,
      ...PUBLIC_POEM_FILTER,
      ...(await hideSuspendedAuthors()),
    })
      .populate("author", "firstName lastName username")
      .limit(8);

    res.json({
      success: true,
      poems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
