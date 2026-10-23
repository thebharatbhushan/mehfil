import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import generateUsername from "../utils/generateUsername.js";
import { recalculateBadges } from "../services/badgeService.js";
import { notifyWelcome } from "../services/notificationService.js";
import { recordLoginDevice } from "../services/deviceService.js";
import { SUSPENDED_MESSAGE } from "../services/suspension.js";

const client = new OAuth2Client();

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => {
  const object = user.toObject();
  delete object.password;
  delete object.xp; // internal progression value is never sent to clients
  delete object.googleId;
  return object;
};

/**
 * POST /api/auth/google  body: { credential }  (Google Identity Services ID token)
 * One endpoint for both "Sign in with Google" and "Sign up with Google":
 *  - known googleId or verified email  -> log in (links the Google id to an existing email account)
 *  - unknown email                     -> creates a verified account, then logs in
 */
export const googleAuth = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ success: false, message: "Google sign-in is not configured on the server." });
    }

    const credential = req.body?.credential;
    if (typeof credential !== "string" || !credential || credential.length > 4096) {
      return res.status(400).json({ success: false, message: "Google credential is required." });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, message: "Google sign-in could not be verified. Please try again." });
    }

    const email = String(payload?.email || "").trim().toLowerCase();
    if (!payload?.sub || !email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: "Your Google account email is not verified." });
    }

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) user = await User.findOne({ email });

    let isNewUser = false;

    if (user) {
      if (user.suspended) {
        return res.status(403).json({ success: false, suspended: true, message: SUSPENDED_MESSAGE });
      }
      const updates = {};
      if (!user.googleId) updates.googleId = payload.sub;
      if (!user.isVerified) updates.isVerified = true; // Google has verified this email
      if (!user.profilePic && payload.picture) updates.profilePic = payload.picture;
      if (!user.username) updates.username = await generateUsername(user.firstName, user.lastName, user.email);
      // updateOne (not save): older accounts may lack required fields and save() would reject them.
      if (Object.keys(updates).length) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        Object.assign(user, updates);
      }
    } else {
      const firstName = String(payload.given_name || payload.name || email.split("@")[0]).trim().slice(0, 60) || "Mehfil";
      const lastName = String(payload.family_name || "").trim().slice(0, 60);
      const username = await generateUsername(firstName, lastName, email);
      try {
        user = await User.create({
          username,
          firstName,
          lastName,
          email,
          googleId: payload.sub,
          profilePic: payload.picture || "",
          isVerified: true,
        });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ success: false, message: "This account already exists. Please try again." });
        }
        throw error;
      }
      isNewUser = true;
      try { await recalculateBadges(user._id); } catch (e) { console.error("Badge evaluation after Google signup failed:", e.message); }
      await notifyWelcome(user);
    }

    await recordLoginDevice(user._id, req);

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      isNewUser,
      message: isNewUser ? "Signup with Google successful" : "Login successful",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google auth failed", { message: error?.message });
    return res.status(500).json({ success: false, message: "Google sign-in failed. Please try again." });
  }
};
