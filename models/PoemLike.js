import mongoose from "mongoose";

// A member's like on a poem. One row per (user, poem). Never exposed as a public count.
const poemLikeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    poemId: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

poemLikeSchema.index({ userId: 1, poemId: 1 }, { unique: true });

export default mongoose.model("PoemLike", poemLikeSchema, "poemlikes");
