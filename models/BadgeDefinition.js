import mongoose from "mongoose";
import { CONDITION_TYPE_LIST, FRAME_KEYS } from "../config/progression.js";

const badgeDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-z0-9_]{2,40}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    // Font Awesome class (fa-star), an https image URL, or a short emoji/text.
    icon: { type: String, default: "fa-award", trim: true, maxlength: 300 },
    active: { type: Boolean, default: true },
    conditionType: { type: String, enum: CONDITION_TYPE_LIST, required: true },
    // XP points / number of poems / number of consecutive weeks. null for manual badges.
    threshold: { type: Number, default: null, min: 1 },
    // Profile frame this badge contributes to (highest unlocked frame wins). null = none.
    frameKey: { type: String, enum: [...FRAME_KEYS.filter((k) => k !== "default"), null], default: null },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

export default mongoose.model("BadgeDefinition", badgeDefinitionSchema, "badgedefinitions");
