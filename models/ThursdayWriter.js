import mongoose from "mongoose";

// One document per Thursday: `date` is that Thursday as YYYY-MM-DD (IST).
// The writer is live from 00:00 IST that Thursday until 00:00 IST the next Thursday.
const thursdayWriterSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true },
    writer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model("ThursdayWriterSlot", thursdayWriterSchema);
