import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    feedbackType: {
      type: String,
      enum: ["general", "suggestion", "bug", "content", "feature", "other"],
      default: "general",
    },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminReply: { type: String, default: "", maxlength: 600 },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: null, maxlength: 120 },
    status: { type: String, enum: ["new", "read", "resolved"], default: "new", index: true },
    // Badge verification (set ONLY by the admin verify endpoint; never by the submitter). Old documents lack these = unverified.
    verifyStatus: { type: String, enum: ["verified", "rejected", null], default: null },
    verifyKind: { type: String, enum: ["suggestion", "bug", "contribution", null], default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true }
);

feedbackSchema.index({ userId: 1, verifyStatus: 1 });

export default mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
