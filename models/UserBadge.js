import mongoose from "mongoose";

const userBadgeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    badgeKey: { type: String, required: true, lowercase: true, trim: true },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date, default: null },
    source: { type: String, enum: ["auto", "admin", "editorial"], default: "auto" },
    // An admin revoke blocks automatic re-unlocking until an admin grants it again.
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

userBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

export default mongoose.model("UserBadge", userBadgeSchema, "userbadges");
