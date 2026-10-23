import mongoose from "mongoose";

// Server-credited active reading seconds per user per IST day ("YYYY-MM-DD"). Private; badge evaluation only.
const readingDaySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    activeSeconds: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

readingDaySchema.index({ userId: 1, day: 1 }, { unique: true });

export default mongoose.model("ReadingDay", readingDaySchema, "readingdays");
