import mongoose from "mongoose";
import crypto from "crypto";
import { buildSearchKeys, canonicalKeyOf } from "../utils/dictionaryNormalize.js";
import { LANGUAGES, STATUSES, LIMITS, publishProblems } from "../utils/dictionaryInput.js";

// One document per dictionary CONCEPT (e.g. इंतज़ार). Hindi / Urdu / Roman spellings, English translations and
// synonyms are searchable routes to that single canonical page, never separate pages.
//
// Arrays are all bounded (see LIMITS in utils/dictionaryInput.js) so a document can never grow without limit.
// `keys` is a denormalised, indexed search projection that is rebuilt on every save (never edited by hand).

const maxLen = (n) => ({ validator: (arr) => !arr || arr.length <= n, message: `Too many items (max ${n}).` });

const exampleSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: LIMITS.example },
    translation: { type: String, default: "", trim: true, maxlength: LIMITS.example },
  },
  { _id: false },
);

const meaningSchema = new mongoose.Schema(
  {
    partOfSpeech: { type: String, default: "", trim: true, maxlength: 40 },
    hindi: { type: String, default: "", trim: true, maxlength: LIMITS.meaningText },
    urdu: { type: String, default: "", trim: true, maxlength: LIMITS.meaningText },
    english: { type: String, default: "", trim: true, maxlength: LIMITS.meaningText },
    examples: { type: [exampleSchema], default: [], validate: maxLen(LIMITS.examplesMax) },
  },
  { _id: false },
);

const translationSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true, maxlength: LIMITS.englishTerm },
    // Context for translations that only fit one sense, e.g. "noun" or "in the sense of anticipation".
    note: { type: String, default: "", trim: true, maxlength: LIMITS.englishTerm },
  },
  { _id: false },
);

const literarySchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: LIMITS.literaryText },
    author: { type: String, default: "", trim: true, maxlength: LIMITS.literaryMeta },
    source: { type: String, default: "", trim: true, maxlength: LIMITS.literaryMeta },
  },
  { _id: false },
);

const wordList = (itemMax, max) => ({ type: [{ type: String, trim: true, maxlength: itemMax }], default: [], validate: maxLen(max) });

const dictionaryEntrySchema = new mongoose.Schema(
  {
    // Stable identifier of the concept. Deterministic default (hash of the canonical key); never changes after creation.
    conceptId: { type: String, required: true, unique: true, immutable: true, trim: true },
    canonicalWord: { type: String, required: true, trim: true, maxlength: LIMITS.word },
    // normalised canonical word + language: blocks accidental duplicate pages (इंतज़ार / इन्तजार / इंतजार are one entry).
    canonicalKey: { type: String, required: true, unique: true, select: false },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: LIMITS.slug, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    language: { type: String, enum: LANGUAGES, default: "hi" },

    variants: {
      hindi: wordList(LIMITS.variant, LIMITS.variantsMax),
      urdu: wordList(LIMITS.variant, LIMITS.variantsMax),
      roman: wordList(LIMITS.variant, LIMITS.variantsMax),
      // Alternate spellings and common misspellings, in any script.
      aliases: wordList(LIMITS.variant, LIMITS.variantsMax),
    },
    englishTranslations: { type: [translationSchema], default: [], validate: maxLen(LIMITS.englishMax) },

    pronunciation: { type: String, default: "", trim: true, maxlength: LIMITS.pronunciation },
    partOfSpeech: wordList(40, 6),
    meanings: { type: [meaningSchema], default: [], validate: maxLen(LIMITS.meaningsMax) },

    synonyms: wordList(LIMITS.listWord, LIMITS.listMax),
    antonyms: wordList(LIMITS.listWord, LIMITS.listMax),
    relatedWords: wordList(LIMITS.listWord, LIMITS.listMax),
    literaryExamples: { type: [literarySchema], default: [], validate: maxLen(LIMITS.literaryMax) },
    etymology: { type: String, default: "", trim: true, maxlength: LIMITS.etymology },

    tags: wordList(LIMITS.tag, LIMITS.tagsMax),
    categories: wordList(LIMITS.tag, LIMITS.tagsMax),

    seoTitle: { type: String, default: "", trim: true, maxlength: LIMITS.seoTitle },
    seoDescription: { type: String, default: "", trim: true, maxlength: LIMITS.seoDescription },

    status: { type: String, enum: STATUSES, default: "draft" },
    featured: { type: Boolean, default: false },
    // Manual ordering weight for "popular words" (higher first). Never incremented by page views (no write on read).
    popularity: { type: Number, default: 0 },

    // Search projection (see utils/dictionaryNormalize.js buildSearchKeys). select:false keeps it out of normal reads.
    keys: {
      exact: { type: [String], default: [], select: false },
      synonym: { type: [String], default: [], select: false },
      english: { type: [String], default: [], select: false },
      phonetic: { type: [String], default: [], select: false },
    },
  },
  { timestamps: true },
);

// Search tiers (each query is `{ keys.<tier>: ..., status: "published" }`).
dictionaryEntrySchema.index({ "keys.exact": 1, status: 1 });
dictionaryEntrySchema.index({ "keys.english": 1, status: 1 });
dictionaryEntrySchema.index({ "keys.synonym": 1, status: 1 });
dictionaryEntrySchema.index({ "keys.phonetic": 1, status: 1 });
// Featured / popular list and the sitemap feed.
dictionaryEntrySchema.index({ status: 1, featured: -1, popularity: -1, updatedAt: -1 });
dictionaryEntrySchema.index({ status: 1, updatedAt: -1 });

// Synchronous hook (no `next`): derives the duplicate key, concept id and search keys, and blocks thin published pages.
dictionaryEntrySchema.pre("validate", function () {
  this.canonicalKey = canonicalKeyOf(this.canonicalWord, this.language);
  if (!this.conceptId) this.conceptId = `wd_${crypto.createHash("sha1").update(this.canonicalKey).digest("hex").slice(0, 12)}`;
  this.keys = buildSearchKeys(this.toObject({ depopulate: true }));
  for (const problem of publishProblems(this)) this.invalidate("status", problem);
});

export default mongoose.model("DictionaryEntry", dictionaryEntrySchema);
