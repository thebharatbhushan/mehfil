import mongoose from "mongoose";

// Append-only ledger. Every XP change is one row; User.xp is the running total (a cache of the sum).
const xpTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, validate: { validator: Number.isInteger, message: "amount must be an integer" } },
    eventType: { type: String, required: true, trim: true },
    // Idempotency key for automatic awards (poem id, "first", "milestone:10", ...). null for admin adjustments.
    referenceId: { type: String, default: null },
    reason: { type: String, default: "", trim: true, maxlength: 300 },
    // Only for manual adjustments: label of the admin who made the change.
    adminId: { type: String, default: null },
    balanceAfter: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

xpTransactionSchema.index({ userId: 1, createdAt: -1 });
// One award per (user, event, reference). Admin adjustments (referenceId null) are excluded.
xpTransactionSchema.index(
  { userId: 1, eventType: 1, referenceId: 1 },
  { unique: true, partialFilterExpression: { referenceId: { $type: "string" } } },
);

export default mongoose.model("XPTransaction", xpTransactionSchema, "xptransactions");
