import mongoose from "mongoose";

const dailyLafzSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    word: { type: String, required: true, trim: true },
    urdu: { type: String, default: "", trim: true },
    roman: { type: String, default: "", trim: true },
    meaning: { type: String, required: true, trim: true },
    english: { type: String, default: "", trim: true },
    explanation: { type: String, required: true, trim: true },
    example: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("DailyLafz", dailyLafzSchema);
