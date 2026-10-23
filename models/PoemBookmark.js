import mongoose from "mongoose";

// A member's saved poem. One row per (user, poem) so saving twice can never double count.
const poemBookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    poemId: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

poemBookmarkSchema.index({ userId: 1, poemId: 1 }, { unique: true });

export default mongoose.model("PoemBookmark", poemBookmarkSchema, "poembookmarks");
