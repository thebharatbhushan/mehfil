import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            trim: true
        },

        gender: {
            type: String,
            enum: ["male", "female", "non-binary", "prefer-not"],
            // Google sign-up does not provide gender/dob; the member can add them later from the profile page.
            required: function () { return !this.googleId; }
        },

        dob: {
            type: Date,
            required: function () { return !this.googleId; }
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        // Missing for accounts created through Google sign-in until the member sets one via "Forgot password".
        password: {
            type: String,
            required: function () { return !this.googleId; }
        },

        // Google account id ("sub"). Sparse-unique so password-only accounts are unaffected.
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },

        languagePref: {
            type: String,
            enum: ["hi", "ur", "en", "bilingual"],
            default: "en"
        },

        profilePic: {
            type: String,
            default: ""
        },

        // Temporary suspension (set only by the admin endpoint). Hidden everywhere public; data is kept.
        suspended: {
            type: Boolean,
            default: false,
            index: true
        },
        suspendedAt: { type: Date, default: null },
        suspendReason: { type: String, default: "", maxlength: 300 },


        isVerified: {
            type: Boolean,
            default: false
        },
        featuredWriter: {
            type: Boolean,
            default: false
        },
        bio: {
            type: String,
            default: "",
            maxlength: 500,
            trim: true
        },

        city: { type: String, default: "", trim: true, maxlength: 80 },
        state: { type: String, default: "", trim: true, maxlength: 80 },
        country: { type: String, default: "", trim: true, maxlength: 80 },

        highestEducation: { type: String, default: "", trim: true, maxlength: 120 },
        institution: { type: String, default: "", trim: true, maxlength: 160 },
        fieldOfStudy: { type: String, default: "", trim: true, maxlength: 120 },

        literaryInterests: {
            type: [String],
            default: []
        },
        languages: {
            type: [String],
            default: []
        },
        socialLinks: {
            instagram: { type: String, default: "", trim: true },
            x: { type: String, default: "", trim: true },
            website: { type: String, default: "", trim: true },
            linkedin: { type: String, default: "", trim: true }
        },

        username: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true // existing users without a username don't collide on the unique index
        },

        displayName: {
            type: String,
            trim: true
        },

        // Internal progression. xp is select:false so no existing query (public or authenticated) ever returns it;
        // only the admin progression API asks for it explicitly. Missing on old users = 0.
        xp: {
            type: Number,
            default: 0,
            min: 0,
            select: false
        },
        // Safe, public result of badge evaluation (default | bronze | silver | gold | special).
        profileFrame: {
            type: String,
            default: "default"
        },
    },

    {
        timestamps: true
    }
);

// export default mongoose.model("User", userSchema);
export default mongoose.model("User", userSchema, "userdata");