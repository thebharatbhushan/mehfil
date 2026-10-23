import mongoose from "mongoose";
import { NOTIFICATION_TYPE_KEYS, NOTIFICATION_CATEGORY_KEYS, NOTIFICATION_LIMITS } from "../config/notifications.js";

const DAY = 24 * 60 * 60 * 1000;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPE_KEYS, required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORY_KEYS, required: true },
    priority: { type: String, enum: ["normal", "high"], default: "normal" },
    title: { type: String, required: true, trim: true, maxlength: NOTIFICATION_LIMITS.title },
    message: { type: String, default: "", trim: true, maxlength: NOTIFICATION_LIMITS.message },
    // Same-site path ("/poem/my-slug") or an http(s) URL; sanitised before saving.
    link: { type: String, default: "", maxlength: NOTIFICATION_LIMITS.link },
    // Small, non-sensitive extras the UI may use (badge key, poem id ...). Never XP or private data.
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    // Makes an event idempotent: the same (userId, dedupeKey) is only ever stored once.
    dedupeKey: { type: String, default: undefined },
    // Set for admin announcements so a whole broadcast can be retracted.
    broadcastId: { type: mongoose.Schema.Types.ObjectId, ref: "NotificationBroadcast", default: null },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + NOTIFICATION_LIMITS.retentionDays * DAY) },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);
notificationSchema.index({ broadcastId: 1 }, { sparse: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema, "notifications");
