import mongoose from "mongoose";

// Single document (key "global") holding the master switch for the whole popup system.
const spotlightSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    enabled: { type: Boolean, default: true },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("SpotlightSettings", spotlightSettingsSchema);
