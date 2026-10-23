import SpotlightCampaign from "../models/SpotlightCampaign.js";
import SpotlightSettings from "../models/SpotlightSettings.js";
import cloudinary from "../config/cloudinary.js";
import { SPOTLIGHT_FOLDER, isSpotlightPublicId, campaignState, parseCampaign, selectCampaign, sniffImageType, toPublic } from "../utils/spotlight.js";

const isId = (id) => /^[0-9a-f]{24}$/i.test(String(id));
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const serverError = (res, error, what) => {
  console.error(`Spotlight ${what} failed:`, error?.message || error);
  return fail(res, 500, "Something went wrong. Please try again.");
};

const getSettings = async () => {
  const doc = await SpotlightSettings.findOne({ key: "global" }).lean();
  return { enabled: doc ? doc.enabled !== false : true };
};

// Admin shape: the whole document plus a computed lifecycle state.
const adminView = (c, now = new Date()) => ({ ...c, state: campaignState(c, now) });

// ------------------------------------------------------------------------------------------------
// PUBLIC
// ------------------------------------------------------------------------------------------------

/**
 * GET /api/spotlight/active?path=/poems&audience=guest|member
 * Returns { campaign } - at most ONE popup, already filtered for schedule, status, page and audience.
 * Unpublished, paused, scheduled and expired campaigns are excluded by the database query itself, never by the client.
 * Cache-Control: no-cache -> browsers may keep a copy but must revalidate (ETag -> cheap 304), so admin changes show up immediately.
 */
export const getActiveSpotlight = async (req, res) => {
  res.set("Cache-Control", "no-cache, must-revalidate");
  try {
    const settings = await getSettings();
    if (!settings.enabled) return res.json({ success: true, campaign: null });

    const now = new Date();
    const candidates = await SpotlightCampaign.find({
      status: "published",
      enabled: { $ne: false },
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
      ],
    })
      .select("-createdBy -updatedBy -name")
      .lean();

    const path = typeof req.query.path === "string" ? req.query.path.slice(0, 300) : "/";
    const audience = req.query.audience === "member" ? "member" : req.query.audience === "guest" ? "guest" : "";
    const winner = selectCampaign(candidates, { path, audience, now });
    return res.json({ success: true, campaign: winner ? toPublic(winner) : null });
  } catch (error) {
    // The site must never break because of a popup: report "nothing to show" with a 200-class failure flag handled by the client.
    console.error("Spotlight public fetch failed:", error?.message || error);
    return fail(res, 500, "Spotlight is temporarily unavailable.");
  }
};

// ------------------------------------------------------------------------------------------------
// ADMIN (mounted behind requireAdmin)
// ------------------------------------------------------------------------------------------------

export const adminList = async (req, res) => {
  try {
    const [items, settings] = await Promise.all([SpotlightCampaign.find().sort({ updatedAt: -1 }).lean(), getSettings()]);
    const now = new Date();
    res.json({ success: true, settings, items: items.map((c) => adminView(c, now)) });
  } catch (error) {
    serverError(res, error, "list");
  }
};

export const adminGet = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid campaign id.");
    const c = await SpotlightCampaign.findById(req.params.id).lean();
    if (!c) return fail(res, 404, "Campaign not found.");
    res.json({ success: true, item: adminView(c) });
  } catch (error) {
    serverError(res, error, "get");
  }
};

export const adminSettings = async (req, res) => {
  try {
    res.json({ success: true, settings: await getSettings() });
  } catch (error) {
    serverError(res, error, "settings");
  }
};

export const adminSaveSettings = async (req, res) => {
  try {
    if (typeof req.body?.enabled !== "boolean") return fail(res, 400, "`enabled` must be true or false.");
    const doc = await SpotlightSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { enabled: req.body.enabled, updatedBy: req.adminId || "admin" } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
    res.json({ success: true, settings: { enabled: doc.enabled !== false } });
  } catch (error) {
    serverError(res, error, "settings save");
  }
};

export const adminCreate = async (req, res) => {
  try {
    const { errors, value } = parseCampaign(req.body);
    if (errors.length) return fail(res, 400, errors[0], { errors });
    const doc = await SpotlightCampaign.create({ ...value, createdBy: req.adminId || "admin", updatedBy: req.adminId || "admin" });
    res.status(201).json({ success: true, item: adminView(doc.toObject()) });
  } catch (error) {
    serverError(res, error, "create");
  }
};

export const adminUpdate = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid campaign id.");
    const existing = await SpotlightCampaign.findById(req.params.id).lean();
    if (!existing) return fail(res, 404, "Campaign not found.");

    const { errors, value } = parseCampaign(req.body);
    if (errors.length) return fail(res, 400, errors[0], { errors });

    const update = { ...value, updatedBy: req.adminId || "admin" };
    // "Show again to everyone": bumping the revision makes browsers treat this as a brand-new popup.
    const inc = req.body?.resetDismissals === true ? { revision: 1 } : undefined;
    const saved = await SpotlightCampaign.findByIdAndUpdate(
      req.params.id,
      inc ? { $set: update, $inc: inc } : { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();

    // Free replaced images (only if no other campaign still uses them).
    await releaseImages([existing.image?.publicId, existing.backgroundImage?.publicId], [saved.image?.publicId, saved.backgroundImage?.publicId], saved._id);
    res.json({ success: true, item: adminView(saved) });
  } catch (error) {
    serverError(res, error, "update");
  }
};

/** PATCH /:id/status  { status?: "draft"|"published", enabled?: boolean } */
export const adminSetStatus = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid campaign id.");
    const { status, enabled } = req.body || {};
    const set = { updatedBy: req.adminId || "admin" };
    if (status !== undefined) {
      if (!["draft", "published"].includes(status)) return fail(res, 400, "status must be draft or published.");
      set.status = status;
    }
    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") return fail(res, 400, "enabled must be true or false.");
      set.enabled = enabled;
    }
    if (set.status === undefined && set.enabled === undefined) return fail(res, 400, "Nothing to change.");

    const existing = await SpotlightCampaign.findById(req.params.id).lean();
    if (!existing) return fail(res, 404, "Campaign not found.");
    if (set.status === "published") {
      // Re-run the publish rules on the stored data so an incomplete draft cannot go live.
      const check = parseCampaign({ ...existing, status: "published" });
      if (check.errors.length) return fail(res, 400, check.errors[0], { errors: check.errors });
    }
    const saved = await SpotlightCampaign.findByIdAndUpdate(req.params.id, { $set: set }, { returnDocument: "after" }).lean();
    res.json({ success: true, item: adminView(saved) });
  } catch (error) {
    serverError(res, error, "status");
  }
};

export const adminDelete = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid campaign id.");
    const removed = await SpotlightCampaign.findByIdAndDelete(req.params.id).lean();
    if (!removed) return fail(res, 404, "Campaign not found.");
    await releaseImages([removed.image?.publicId, removed.backgroundImage?.publicId], [], removed._id);
    res.json({ success: true, message: "Campaign deleted." });
  } catch (error) {
    serverError(res, error, "delete");
  }
};

// ------------------------------------------------------------------------------------------------
// IMAGES
// ------------------------------------------------------------------------------------------------

/** True when any campaign other than `exceptId` still points at this Cloudinary asset. */
const imageInUse = async (publicId, exceptId) => {
  const query = { $or: [{ "image.publicId": publicId }, { "backgroundImage.publicId": publicId }] };
  if (exceptId) query._id = { $ne: exceptId };
  return (await SpotlightCampaign.countDocuments(query)) > 0;
};

const destroyAsset = async (publicId) => {
  if (!isSpotlightPublicId(publicId)) return false; // never touch assets outside our folder
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    return true;
  } catch (error) {
    console.error("Spotlight image cleanup failed:", error?.message || error);
    return false;
  }
};

/** Deletes assets that were attached before and are not attached now, but only if no other campaign uses them. */
async function releaseImages(before, after, campaignId) {
  const keep = new Set((after || []).filter(Boolean));
  for (const id of new Set((before || []).filter(Boolean))) {
    if (keep.has(id)) continue;
    if (await imageInUse(id, campaignId)) continue;
    await destroyAsset(id);
  }
}

/** POST /upload  (multipart field "image") -> { image: {url, publicId, width, height, bytes, format} } */
export const adminUploadImage = async (req, res) => {
  try {
    if (!req.file?.buffer) return fail(res, 400, "Choose an image to upload.");
    const type = sniffImageType(req.file.buffer);
    if (!type) return fail(res, 400, "That file is not a valid JPG, PNG or WebP image.");

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: SPOTLIGHT_FOLDER, resource_type: "image", allowed_formats: ["jpg", "png", "webp"] },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
      stream.end(req.file.buffer);
    });
    res.status(201).json({
      success: true,
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width || 0,
        height: result.height || 0,
        bytes: result.bytes || req.file.size || 0,
        format: result.format || type,
      },
    });
  } catch (error) {
    console.error("Spotlight upload failed:", error?.message || error);
    fail(res, 502, "Image upload failed. Please try again.");
  }
};

/** DELETE /upload  { publicId } - discards an uploaded image that was never saved (or is no longer used anywhere). */
export const adminDiscardImage = async (req, res) => {
  try {
    const publicId = typeof req.body?.publicId === "string" ? req.body.publicId : "";
    if (!isSpotlightPublicId(publicId)) return fail(res, 400, "Invalid image id.");
    if (await imageInUse(publicId)) return res.json({ success: true, deleted: false, message: "Image is used by a campaign, so it was kept." });
    const deleted = await destroyAsset(publicId);
    res.json({ success: true, deleted });
  } catch (error) {
    serverError(res, error, "discard image");
  }
};
