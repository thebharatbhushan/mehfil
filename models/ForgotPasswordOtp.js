import mongoose from "mongoose";

const forgotPasswordOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    resetTokenHash: {
      type: String,
      default: "",
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

forgotPasswordOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
forgotPasswordOtpSchema.index({ resetTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ForgotPasswordOtp", forgotPasswordOtpSchema);
