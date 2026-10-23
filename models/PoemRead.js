import mongoose from "mongoose";

// One row per (reader, poem). Private: used only to evaluate reader/writer badges, never returned by any API.
// activeSeconds is measured by the SERVER from spaced heartbeats (see services/engagementService.js).
const poemReadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    poemId: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activeSeconds: { type: Number, default: 0, min: 0 },
    lastBeatAt: { type: Date, default: null },
    qualified: { type: Boolean, default: false },
    qualifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

poemReadSchema.index({ userId: 1, poemId: 1 }, { unique: true });
poemReadSchema.index({ authorId: 1, qualified: 1 });
poemReadSchema.index({ userId: 1, qualified: 1 });

export default mongoose.model("PoemRead", poemReadSchema, "poemreads");
