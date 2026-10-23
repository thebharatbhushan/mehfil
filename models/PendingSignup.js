import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, default: "", trim: true, maxlength: 80 },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "non-binary", "prefer-not"],
    },
    dob: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    languagePref: {
      type: String,
      enum: ["hi", "ur", "en", "bilingual"],
      default: "hi",
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

// MongoDB automatically removes an expired signup draft; expiry is also checked by the API.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingSignup", pendingSignupSchema);
