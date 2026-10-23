import mongoose from "mongoose";

// One promotional popup ("Mehfil Spotlight" campaign). Images live in Cloudinary; only the durable URL and metadata are stored here.
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    format: { type: String, default: "" },
  },
  { _id: false },
);

const spotlightCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 }, // internal label, never shown to visitors
    mode: { type: String, enum: ["image", "custom"], default: "custom" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    enabled: { type: Boolean, default: true }, // quick pause switch, independent of draft/published
    revision: { type: Number, default: 1 }, // bumped to show the popup again to people who already dismissed it
    priority: { type: Number, default: 0, min: 0, max: 100 },

    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    targetMode: { type: String, enum: ["all", "selected"], default: "all" },
    targetRoutes: { type: [String], default: [] },
    audience: { type: String, enum: ["everyone", "guests", "members"], default: "everyone" },
    frequency: { type: String, enum: ["session", "day", "campaign"], default: "session" },
    persistDays: { type: Number, default: 30, min: 1, max: 365 },
    stayDismissed: { type: Boolean, default: false },

    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    image: { type: imageSchema, default: () => ({}) },
    backgroundImage: { type: imageSchema, default: () => ({}) },
    imageAlt: { type: String, default: "" },

    backgroundColor: { type: String, default: "" },
    headingColor: { type: String, default: "" },
    textColor: { type: String, default: "" },
    accentColor: { type: String, default: "" },

    ctaLabel: { type: String, default: "" },
    ctaUrl: { type: String, default: "" },
    ctaOpenInNewTab: { type: Boolean, default: false },
    ctaColor: { type: String, default: "" },
    ctaTextColor: { type: String, default: "" },
    secondaryLabel: { type: String, default: "" },
    secondaryUrl: { type: String, default: "" },

    closeStyle: { type: String, enum: ["dark", "light"], default: "dark" },
    closeOnBackdrop: { type: Boolean, default: true },

    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

spotlightCampaignSchema.index({ status: 1, enabled: 1, startAt: 1, endAt: 1 });
spotlightCampaignSchema.index({ "image.publicId": 1 });
spotlightCampaignSchema.index({ "backgroundImage.publicId": 1 });

export default mongoose.model("SpotlightCampaign", spotlightCampaignSchema);
