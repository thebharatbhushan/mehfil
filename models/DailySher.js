import mongoose from "mongoose";

const dailySherSchema = new mongoose.Schema(
  {
    // Kept for backward compatibility with the original single-entry config.
    // New entries use a date-specific key so today and tomorrow can coexist.
    key: { type: String, unique: true, default: "sherOfTheDay" },
    dateKey: { type: String, unique: true, sparse: true, index: true },
    sourceType: { type: String, enum: ["manual", "poem"], required: true, default: "manual" },
    poem: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", default: null },
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    writerName: { type: String, default: "" },
    tag: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("DailySher", dailySherSchema);
