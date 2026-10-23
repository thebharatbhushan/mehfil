import mongoose from "mongoose";

// History of announcements sent from the admin panel (the per-member copies live in "notifications").
const broadcastSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, default: "", maxlength: 600 },
    link: { type: String, default: "", maxlength: 300 },
    priority: { type: String, enum: ["normal", "high"], default: "normal" },
    audience: { type: String, enum: ["all", "writers", "user"], required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    recipientCount: { type: Number, default: 0 },
    sentBy: { type: String, default: "admin", maxlength: 120 },
    retractedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

broadcastSchema.index({ createdAt: -1 });

export default mongoose.models.NotificationBroadcast ||
  mongoose.model("NotificationBroadcast", broadcastSchema, "notificationbroadcasts");
