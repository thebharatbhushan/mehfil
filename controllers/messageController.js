import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import ContactMessage from "../models/ContactMessage.js";
import Poem from "../models/Poem.js";
import { recalculateBadges } from "../services/badgeService.js";
import {
  notifyCopyrightReport,
  notifyReportAction,
  notifySupportReply,
  notifyFeedbackStatus,
} from "../services/notificationService.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FEEDBACK_TYPES = ["general", "suggestion", "bug", "content", "feature", "other"];
const STATUSES = ["new", "read", "resolved"];
const TEN_MIN = 10 * 60 * 1000;

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const clip = clean; // used by the content-report link and the admin reply
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message });

const REPORT_REASONS = ["copyright", "harassment", "hate", "obscene", "spam", "impersonation", "other"];

// "https://site/poem/my-slug?x=1" or "/poem/my-slug" -> "my-slug"
const poemSlugFromLink = (link) => {
  const m = /\/poem\/([^/?#\s]+)/.exec(String(link || ""));
  if (!m) return "";
  try { return decodeURIComponent(m[1]); } catch { return ""; }
};

const isDuplicate = (Model, email, message) =>
  Model.exists({ email, message, createdAt: { $gt: new Date(Date.now() - TEN_MIN) } });

/* ------------------------- public ------------------------- */

export const submitFeedback = async (req, res) => {
  try {
    const body = req.body || {};
    if (body.website) return res.json({ success: true, message: "Thank you!" }); // honeypot: bots

    const name = clean(body.name, 80);
    const email = clean(body.email, 120).toLowerCase();
    const message = clean(body.message, 2000);
    const feedbackType = FEEDBACK_TYPES.includes(body.feedbackType) ? body.feedbackType : "general";
    const rating = body.rating == null || body.rating === "" ? undefined : Number(body.rating);

    if (name.length < 2) return fail(res, "कृपया अपना नाम लिखें।");
    if (!EMAIL_RE.test(email)) return fail(res, "कृपया सही ईमेल लिखें।");
    if (message.length < 10) return fail(res, "कृपया कम से कम 10 अक्षरों में अपनी राय लिखें।");
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return fail(res, "रेटिंग 1 से 5 के बीच होनी चाहिए।");
    }
    if (await isDuplicate(Feedback, email, message)) return fail(res, "यह राय पहले ही भेजी जा चुकी है।", 409);

    await Feedback.create({ name, email, feedbackType, message, rating, userId: req.userId || null });
    res.status(201).json({ success: true, message: "Thank you for your feedback!" });
  } catch (error) {
    console.log("feedback error:", error);
    fail(res, "सर्वर में समस्या आई। कृपया बाद में प्रयास करें।", 500);
  }
};

export const submitContact = async (req, res) => {
  try {
    const body = req.body || {};
    if (body.website) return res.json({ success: true, message: "Thank you!" });

    const name = clean(body.name, 80);
    const email = clean(body.email, 120).toLowerCase();
    const subject = clean(body.subject, 150);
    const message = clean(body.message, 2000);

    if (name.length < 2) return fail(res, "कृपया अपना नाम लिखें।");
    if (!EMAIL_RE.test(email)) return fail(res, "कृपया सही ईमेल लिखें।");
    if (subject.length < 3) return fail(res, "कृपया विषय लिखें।");
    if (message.length < 10) return fail(res, "कृपया कम से कम 10 अक्षरों में संदेश लिखें।");
    if (await isDuplicate(ContactMessage, email, message)) return fail(res, "यह संदेश पहले ही भेजा जा चुका है।", 409);

    const doc = { name, email, subject, message, userId: req.userId || null };

    // Content reports: remember which poem it points at so the author can be told about a copyright report.
    let poem = null;
    if (body.kind === "content_report") {
      doc.kind = "content_report";
      doc.reportReason = REPORT_REASONS.includes(body.reportReason) ? body.reportReason : "other";
      doc.reportedLink = clip(body.link, 300);
      const slug = poemSlugFromLink(doc.reportedLink);
      if (slug) {
        try { poem = await Poem.findOne({ slug }).select("_id title slug author").lean(); } catch { poem = null; }
        if (poem) { doc.reportedPoem = poem._id; doc.reportedAuthor = poem.author; }
      }
    }

    await ContactMessage.create(doc);

    // Copyright report -> neutral heads-up to the poem's author. Only for signed-in reporters (so an anonymous form
    // cannot be used to push alarming notices at someone) and never to the reporter themselves.
    if (poem && doc.reportReason === "copyright" && req.userId && String(poem.author) !== String(req.userId)) {
      await notifyCopyrightReport(poem);
    }
    res.status(201).json({ success: true, message: "Message sent." });
  } catch (error) {
    console.log("contact error:", error);
    fail(res, "सर्वर में समस्या आई। कृपया बाद में प्रयास करें।", 500);
  }
};

/* ------------------------- admin ------------------------- */

const listFor = (Model, withType) => async (req, res) => {
  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (withType && FEEDBACK_TYPES.includes(req.query.type)) filter.feedbackType = req.query.type;
    const items = await Model.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("userId", "username firstName lastName")
      .lean();
    const counts = await Model.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    const summary = { new: 0, read: 0, resolved: 0 };
    counts.forEach((c) => { if (c._id in summary) summary[c._id] = c.n; });
    res.json({ success: true, items, summary });
  } catch (error) {
    console.log(error);
    fail(res, "Server error.", 500);
  }
};

const statusFor = (Model, onChange) => async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) return fail(res, "Invalid status.");
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid id.");
    const before = await Model.findById(req.params.id).select("status").lean();
    const item = await Model.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!item) return fail(res, "Not found.", 404);
    // Tell the member only when the status really moved forward (read / resolved), never on "new" or no-op saves.
    if (onChange && item.userId && before?.status !== status && status !== "new") {
      try { await onChange(item, status); } catch (e) { console.error("Status notification failed:", e.message); }
    }
    res.json({ success: true, item });
  } catch (error) {
    console.log(error);
    fail(res, "Server error.", 500);
  }
};

const removeFor = (Model) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid id.");
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return fail(res, "Not found.", 404);
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    fail(res, "Server error.", 500);
  }
};

export const listFeedback = listFor(Feedback, true);
export const updateFeedbackStatus = statusFor(Feedback, (item, status) =>
  notifyFeedbackStatus(item.userId, { feedbackId: item._id, feedbackType: item.feedbackType, status }));
export const deleteFeedback = removeFor(Feedback);
export const listContact = listFor(ContactMessage, false);
export const updateContactStatus = statusFor(ContactMessage, async (item, status) => {
  if (status !== "resolved") return; // "read" alone is not worth a notification for a support request
  if (item.adminReply) return; // a written reply already told the member
  if (item.kind === "content_report") return notifyReportAction(item.userId, { reportId: item._id });
  return notifySupportReply(item.userId, {
    subject: item.subject,
    messageId: item._id,
    reply: "आपके संदेश पर हमारी टीम ने कार्रवाई पूरी कर दी है और इसे हल मान लिया गया है। कोई और सवाल हो तो फिर लिखें।",
  });
});
export const deleteContact = removeFor(ContactMessage);

/* ------------- admin reply (notifies the member in-app) ------------- */

const replyFor = (Model, kind) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid id.");
    const reply = clip(req.body?.message, 600);
    if (reply.length < 3) return fail(res, "Reply must be at least 3 characters (max 600).");
    const item = await Model.findById(req.params.id);
    if (!item) return fail(res, "Not found.", 404);

    item.adminReply = reply;
    item.repliedAt = new Date();
    item.repliedBy = req.adminId || "admin";
    if (req.body?.resolve !== false) item.status = "resolved";
    await item.save();

    // Guests have no account, so there is nobody to notify in-app (they are not linked by email on purpose).
    let notified = false;
    if (item.userId) {
      const n = item.kind === "content_report"
        ? await notifyReportAction(item.userId, { note: reply, reportId: item._id })
        : await notifySupportReply(item.userId, {
            reply,
            messageId: item._id,
            subject: kind === "feedback" ? "आपकी राय पर उत्तर" : item.subject,
          });
      notified = !!n;
    }
    res.json({ success: true, item, notified });
  } catch (error) {
    console.log(error);
    fail(res, "Server error.", 500);
  }
};

export const replyFeedback = replyFor(Feedback, "feedback");
export const replyContact = replyFor(ContactMessage, "contact");

/* ------------- badge verification (suggestions / bug reports / contributions) ------------- */

const VERIFY_KINDS = ["suggestion", "bug", "contribution"];
const defaultKind = (type) => (type === "suggestion" ? "suggestion" : type === "bug" ? "bug" : "contribution");

/**
 * PATCH /api/admin/feedback/:id/verify   body: { action: "verify" | "reject" | "reset", kind?: "suggestion"|"bug"|"contribution" }
 * Only a verified item from a signed-in member counts toward Good Suggestion / Community Helper / Bug Hunter.
 * Verifying re-evaluates that member's badges on the server. Rejecting or resetting never takes an earned badge away
 * (use the badge revoke action for that).
 */
export const verifyFeedback = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid id.");
    const { action } = req.body || {};
    if (!["verify", "reject", "reset"].includes(action)) return fail(res, "Invalid action.");
    const item = await Feedback.findById(req.params.id);
    if (!item) return fail(res, "Not found.", 404);

    if (action === "verify") {
      if (!item.userId) return fail(res, "This submission is not linked to a member account, so it cannot earn a badge.");
      const kind = req.body.kind ? String(req.body.kind) : defaultKind(item.feedbackType);
      if (!VERIFY_KINDS.includes(kind)) return fail(res, "Invalid kind.");
      item.verifyStatus = "verified";
      item.verifyKind = kind;
      item.verifiedAt = new Date();
    } else if (action === "reject") {
      item.verifyStatus = "rejected";
      item.verifyKind = null;
      item.verifiedAt = new Date();
    } else {
      item.verifyStatus = null;
      item.verifyKind = null;
      item.verifiedAt = null;
    }
    item.verifiedBy = req.adminId || "admin";
    await item.save();

    if (item.userId && (action === "verify" || action === "reject")) {
      await notifyFeedbackStatus(item.userId, {
        feedbackId: item._id,
        feedbackType: item.feedbackType,
        status: action === "verify" ? "verified" : "rejected",
      });
    }

    let newlyUnlocked = [];
    if (item.userId) {
      try {
        newlyUnlocked = (await recalculateBadges(item.userId)).newlyUnlocked;
      } catch (e) {
        console.error("Badge recalculation after verify failed:", e.message);
      }
    }
    res.json({ success: true, item, newlyUnlocked });
  } catch (error) {
    console.log(error);
    fail(res, "Server error.", 500);
  }
};
