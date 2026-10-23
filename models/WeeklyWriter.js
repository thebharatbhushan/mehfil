import mongoose from "mongoose";

const weeklyWriterSchema = new mongoose.Schema(
  {
    weekStart: { type: String, required: true, unique: true, index: true },
    writer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // true once the badge + notification were delivered (only happens once the week has started)
    rewardsGranted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("WeeklyWriter", weeklyWriterSchema);
