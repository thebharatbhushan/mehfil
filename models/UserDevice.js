import mongoose from "mongoose";

// Browsers/devices a member has signed in from. Only a one-way hash of the device id is stored, never the id itself.
const userDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fingerprint: { type: String, required: true },
    label: { type: String, default: "", maxlength: 80 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

userDeviceSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
userDeviceSchema.index({ userId: 1, lastSeenAt: -1 });

export default mongoose.models.UserDevice || mongoose.model("UserDevice", userDeviceSchema, "userdevices");
