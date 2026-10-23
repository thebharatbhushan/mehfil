import mongoose from "mongoose";

// Tiny counter store used to limit OTP sends / wrong guesses PER EMAIL. It lives in MongoDB (not in process memory),
// so limits survive restarts and are shared by every server instance. Rows delete themselves via the TTL index.
const otpThrottleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
otpThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpThrottle", otpThrottleSchema);
