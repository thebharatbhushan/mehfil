import mongoose from "mongoose";

// Audit trail for manual badge grants/revokes and badge-definition changes.
const badgeAuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    badgeKey: { type: String, required: true },
    action: { type: String, enum: ["grant", "revoke", "editorial_grant", "definition_create", "definition_update"], required: true },
    adminId: { type: String, default: null },
    reason: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
badgeAuditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("BadgeAuditLog", badgeAuditLogSchema, "badgeauditlogs");
