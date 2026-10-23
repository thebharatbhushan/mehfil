import mongoose from "mongoose";

const poemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    tags: [
      {
        type: String,
      },
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    copyrightDeclaration: {
      type: Boolean,
      required: true,
      default: false,
    },
    featuredPoem: {
      type: Boolean,
      default: false,
    },
    // Private view counter. select:false keeps it out of every normal query (public APIs never return it);
    // only the admin list asks for it explicitly with .select("+views"). Missing on old poems = 0.
    views: {
      type: Number,
      default: 0,
      select: false,
    },
    // Moderation. Missing on old poems = published. "unpublished" / "rejected" poems are hidden from every public
    // endpoint (the author still sees them, with the reason, in their own list). Set only by the admin moderation endpoint.
    status: {
      type: String,
      enum: ["published", "unpublished", "rejected"],
      default: "published",
    },
    moderationReason: { type: String, default: "", maxlength: 300 },
    moderatedAt: { type: Date, default: null },
    // Optional: 11-character YouTube video ID of the poet's recitation (never a URL or HTML).
    youtubeVideoId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Poem", poemSchema);
