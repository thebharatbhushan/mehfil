import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // "content_report" = sent from the Report Content form (carries the reason key and the poem it points at).
    kind: { type: String, enum: ["contact", "content_report"], default: "contact" },
    reportReason: {
      type: String,
      enum: ["copyright", "harassment", "hate", "obscene", "spam", "impersonation", "other", null],
      default: null,
    },
    reportedLink: { type: String, default: "", maxlength: 300 },
    reportedPoem: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", default: null },
    reportedAuthor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Reply written by an admin; the member is notified in-app (only when the message is linked to an account).
    adminReply: { type: String, default: "", maxlength: 600 },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: null, maxlength: 120 },
    status: { type: String, enum: ["new", "read", "resolved"], default: "new", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
