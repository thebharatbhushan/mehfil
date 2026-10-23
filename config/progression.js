// Central configuration for the XP / badge / profile-frame system.
// Every XP amount and every default badge lives here, never inside controllers.

export const XP_EVENTS = Object.freeze({
  FIRST_POEM: "first_poem_published",
  POEM: "poem_published",
  PROFILE_COMPLETED: "profile_completed",
  POETRY_MILESTONE: "poetry_milestone",
  ADMIN_ADJUSTMENT: "admin_adjustment",
});

export const XP_RULES = Object.freeze({
  [XP_EVENTS.FIRST_POEM]: { amount: 20, reason: "Published first poem" },
  [XP_EVENTS.POEM]: { amount: 10, reason: "Published poetry" },
  [XP_EVENTS.PROFILE_COMPLETED]: { amount: 15, reason: "Completed profile" },
});

// poems published -> bonus XP (each milestone is awarded once per user, ever)
export const POETRY_MILESTONES = Object.freeze({ 10: 50, 25: 100, 50: 200, 100: 400 });

// Abuse guards for publish XP (publish -> delete -> publish loops).
export const POEM_XP_RULES = Object.freeze({
  minBodyChars: 20, // non-whitespace characters
  maxXpPoemsPerDay: 3, // IST calendar day
});

export const MAX_ADMIN_ADJUSTMENT = 100000;

export const CONDITION_TYPES = Object.freeze({
  XP_THRESHOLD: "xp_threshold",
  POEM_COUNT: "poem_count",
  POEM_STREAK_WEEKS: "poem_streak_weeks",
  MANUAL: "manual",
  // ---- extended badge set (all derived on the server from stored records) ----
  ELIGIBLE_POEM_COUNT: "eligible_poem_count", // valid, original, de-duplicated poems
  ELIGIBLE_POEM_DAYS: "eligible_poem_days", // eligible poems on distinct IST dates
  DISTINCT_READERS: "distinct_readers", // other members who genuinely read the author's poems
  READING_DAYS: "reading_days", // IST days with server-verified active reading
  POEMS_READ: "poems_read", // distinct poems with a qualified read
  POEMS_BOOKMARKED: "poems_bookmarked",
  POEMS_APPRECIATED: "poems_appreciated", // distinct poems liked
  VERIFIED_SUGGESTIONS: "verified_suggestions", // admin-approved suggestions
  VERIFIED_CONTRIBUTIONS: "verified_contributions", // admin-verified contributions of any kind
  VERIFIED_BUGS: "verified_bugs", // admin-verified, distinct bug reports
  EARLY_SUPPORTER: "early_supporter", // account created on/before a configured cutoff
});
export const CONDITION_TYPE_LIST = Object.values(CONDITION_TYPES);

/**
 * How a badge is awarded (shown in the admin panel):
 *  auto     - unlocked by the server when stored activity reaches the threshold
 *  approval - the count only includes items an administrator verified (feedback verification)
 *  config   - decided by a server setting (Early Supporter cutoff)
 *  manual   - only ever granted by an administrator / editorial action
 */
export const awardModeFor = (conditionType) => {
  switch (conditionType) {
    case CONDITION_TYPES.VERIFIED_SUGGESTIONS:
    case CONDITION_TYPES.VERIFIED_CONTRIBUTIONS:
    case CONDITION_TYPES.VERIFIED_BUGS:
      return "approval";
    case CONDITION_TYPES.EARLY_SUPPORTER:
      return "config";
    case CONDITION_TYPES.MANUAL:
      return "manual";
    default:
      return "auto";
  }
};

// Reading verification. The client only sends "still reading" heartbeats; the SERVER measures time between them.
export const READING_RULES = Object.freeze({
  minBeatGapSec: 10, // beats closer than this are ignored (flooding)
  maxBeatGapSec: 45, // a longer silence means the tab was idle/hidden: nothing is credited
  beatMaxCreditSec: 20, // most seconds one beat can ever add
  minPoemReadSec: 20, // active seconds on one poem before it counts as "read"
  minDayReadSec: 120, // active seconds in one IST day before that day counts as a reading day
  maxDayCreditSec: 3600, // daily cap on credited seconds
});

// A poem counts toward the writer badges only if it has real content (same non-space rule as publish XP).
export const ELIGIBLE_POEM_RULES = Object.freeze({ minBodyChars: POEM_XP_RULES.minBodyChars });

// The Founder badge is NEVER automatic. It can only be granted to account ids listed in FOUNDER_USER_IDS.
export const FOUNDER_BADGE_KEY = "sansthapak";
export const getFounderUserIds = () =>
  String(process.env.FOUNDER_USER_IDS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => /^[a-f0-9]{24}$/.test(x));

// Early Supporter cutoff (ISO date/time). Unset or invalid = nobody qualifies. Compared with the real account createdAt.
export const getEarlySupporterCutoff = () => {
  const raw = String(process.env.EARLY_SUPPORTER_CUTOFF || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Profile frames, lowest -> highest. The highest frame granted by an unlocked badge wins.
export const FRAMES = Object.freeze([
  { key: "default", name: "Default" },
  { key: "bronze", name: "Bronze" },
  { key: "silver", name: "Silver" },
  { key: "gold", name: "Gold" },
  { key: "special", name: "Special" },
]);
export const FRAME_KEYS = FRAMES.map((f) => f.key);
export const frameRank = (key) => Math.max(0, FRAME_KEYS.indexOf(key));
export const frameInfo = (key) => FRAMES.find((f) => f.key === key) || FRAMES[0];

// Seeded once (insert-if-missing). Admin edits are never overwritten by re-seeding.
export const DEFAULT_BADGES = Object.freeze([
  {
    key: "emerging_writer",
    name: "उभरता रचनाकार",
    description: "मेहफ़िल में आपकी रचनात्मक यात्रा की शुरुआत।",
    icon: "fa-seedling",
    conditionType: CONDITION_TYPES.XP_THRESHOLD,
    threshold: 50,
    frameKey: "bronze",
    sortOrder: 10,
  },
  {
    key: "shabd_sadhak",
    name: "शब्द साधक",
    description: "शब्दों के प्रति निरंतर साधना — कई रचनाएँ प्रकाशित।",
    icon: "fa-pen-nib",
    conditionType: CONDITION_TYPES.POEM_COUNT,
    threshold: 10,
    frameKey: "silver",
    sortOrder: 20,
  },
  {
    key: "nirantar_kalam",
    name: "निरंतर कलम",
    description: "हफ़्ते दर हफ़्ते लगातार लिखने वाली कलम।",
    icon: "fa-feather-alt",
    conditionType: CONDITION_TYPES.POEM_STREAK_WEEKS,
    threshold: 4,
    frameKey: "gold",
    sortOrder: 30,
  },
  {
    key: "mehfil_spotlight",
    name: "Mehfil Spotlight",
    description: "मेहफ़िल की संपादकीय टीम द्वारा चुने गए रचनाकार।",
    icon: "fa-star",
    conditionType: CONDITION_TYPES.MANUAL,
    threshold: null,
    frameKey: "special",
    sortOrder: 40,
  },
  {
    key: "saptah_ki_kalam",
    name: "सप्ताह की कलम",
    description: "किसी सप्ताह की चुनी हुई कलम।",
    icon: "fa-pen-fancy",
    conditionType: CONDITION_TYPES.MANUAL,
    threshold: null,
    frameKey: "gold",
    sortOrder: 50,
  },
  // ---------------- extended set (no profile-frame change) ----------------
  {
    key: "shabd_shilpi",
    name: "शब्द शिल्पी",
    description: "10 मौलिक रचनाएँ प्रकाशित करने पर मिलने वाला बैज।",
    icon: "fa-hammer",
    conditionType: CONDITION_TYPES.ELIGIBLE_POEM_COUNT,
    threshold: 10,
    frameKey: null,
    sortOrder: 60,
  },
  {
    key: "lokpriya_rachnakar",
    name: "लोकप्रिय रचनाकार",
    description: "25 अलग पाठकों ने आपकी रचनाएँ सच में पढ़ीं।",
    icon: "fa-fire",
    conditionType: CONDITION_TYPES.DISTINCT_READERS,
    threshold: 25,
    frameKey: null,
    sortOrder: 70,
  },
  {
    key: "sahitya_sadhak",
    name: "साहित्य साधक",
    description: "30 अलग-अलग दिनों पर रचनाएँ प्रकाशित करने की साधना।",
    icon: "fa-book-open",
    conditionType: CONDITION_TYPES.ELIGIBLE_POEM_DAYS,
    threshold: 30,
    frameKey: null,
    sortOrder: 80,
  },
  {
    key: "rasik_pathak",
    name: "रसिक पाठक",
    description: "7 अलग-अलग दिन मन लगाकर रचनाएँ पढ़ीं।",
    icon: "fa-glasses",
    conditionType: CONDITION_TYPES.READING_DAYS,
    threshold: 7,
    frameKey: null,
    sortOrder: 90,
  },
  {
    key: "sahitya_premi",
    name: "साहित्य प्रेमी",
    description: "25 अलग रचनाएँ पढ़ने वाले सच्चे साहित्य प्रेमी।",
    icon: "fa-heart",
    conditionType: CONDITION_TYPES.POEMS_READ,
    threshold: 25,
    frameKey: null,
    sortOrder: 100,
  },
  {
    key: "shabd_sangrahak",
    name: "शब्द संग्रहक",
    description: "20 रचनाएँ अपने संग्रह में सहेजीं।",
    icon: "fa-bookmark",
    conditionType: CONDITION_TYPES.POEMS_BOOKMARKED,
    threshold: 20,
    frameKey: null,
    sortOrder: 110,
  },
  {
    key: "kavya_prashansak",
    name: "काव्य प्रशंसक",
    description: "15 अलग रचनाओं को पसंद करके कवियों का हौसला बढ़ाया।",
    icon: "fa-thumbs-up",
    conditionType: CONDITION_TYPES.POEMS_APPRECIATED,
    threshold: 15,
    frameKey: null,
    sortOrder: 120,
  },
  {
    key: "behtareen_sujhav",
    name: "बेहतरीन सुझाव",
    description: "आपका सुझाव मेहफ़िल टीम ने उपयोगी पाकर स्वीकार किया।",
    icon: "fa-lightbulb",
    conditionType: CONDITION_TYPES.VERIFIED_SUGGESTIONS,
    threshold: 1,
    frameKey: null,
    sortOrder: 130,
  },
  {
    key: "mehfil_sahayak",
    name: "मेहफ़िल सहायक",
    description: "मेहफ़िल टीम द्वारा सत्यापित 5 सार्थक योगदान।",
    icon: "fa-life-ring",
    conditionType: CONDITION_TYPES.VERIFIED_CONTRIBUTIONS,
    threshold: 5,
    frameKey: null,
    sortOrder: 140,
  },
  {
    key: "sansthapak",
    name: "संस्थापक",
    description: "मेहफ़िल के संस्थापक सदस्यों के लिए आरक्षित विशेष बैज।",
    icon: "fa-crown",
    conditionType: CONDITION_TYPES.MANUAL,
    threshold: null,
    frameKey: null,
    sortOrder: 150,
  },
  {
    key: "bug_shikari",
    name: "बग शिकारी",
    description: "3 अलग-अलग असली बग रिपोर्ट, जिन्हें टीम ने सत्यापित किया।",
    icon: "fa-bug",
    conditionType: CONDITION_TYPES.VERIFIED_BUGS,
    threshold: 3,
    frameKey: null,
    sortOrder: 160,
  },
  {
    key: "shuruati_sathi",
    name: "शुरुआती साथी",
    description: "मेहफ़िल के शुरुआती दौर में जुड़ने वाले साथी।",
    icon: "fa-handshake",
    conditionType: CONDITION_TYPES.EARLY_SUPPORTER,
    threshold: null,
    frameKey: null,
    sortOrder: 170,
  },
]);

// Editorial badges granted automatically by existing admin actions.
export const EDITORIAL_BADGE_KEYS = Object.freeze({
  FEATURED_WRITER: "mehfil_spotlight",
  WEEKLY_WRITER: "saptah_ki_kalam",
});
