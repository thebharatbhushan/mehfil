import mongoose from "mongoose";

// Private, unpublished work-in-progress. Drafts live in their own collection on purpose:
// every public query (poem lists, author pages, featured/selected poems, search, sitemap, XP/badge counts)
// reads the Poem collection, so a draft can never leak into them. Publishing a draft creates a Poem
// through the normal create flow and then removes the draft.
// Fields are deliberately lenient (no required body/category) because a draft is incomplete by nature.
const draftSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "", maxlength: 300 },
    category: { type: String, default: "" },
    body: { type: String, default: "", maxlength: 50000 },
    tags: [{ type: String }],
    copyrightDeclaration: { type: Boolean, default: false },
    // Optional: 11-character YouTube video ID (never a URL or HTML), same rule as published poems.
    youtubeVideoId: { type: String, default: null },
  },
  { timestamps: true },
);

draftSchema.index({ author: 1, updatedAt: -1 });

export default mongoose.model("Draft", draftSchema);
