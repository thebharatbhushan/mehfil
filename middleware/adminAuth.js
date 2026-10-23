import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "./rateLimit.js";

// ---------------------------------------------------------------------------------------------
// Admin panel authentication (separate from member login).
//
// Environment variables (set them in Render, never in source control):
//   ADMIN_EMAIL          admin login id (e.g. admin@mehfil.com)
//   ADMIN_PASSWORD_HASH  bcrypt hash of the password (preferred)   -> node -e "console.log(require('bcryptjs').hashSync('YourPassword',12))"
//   ADMIN_PASSWORD       plain password (fallback, only used when no hash is set)
//   ADMIN_JWT_SECRET     optional; falls back to a value derived from JWT_SECRET
//   ADMIN_SESSION_HOURS  optional session length, default 8
//
// Fail-closed: if no admin credentials are configured, nobody can log in and every protected admin route returns 401/503.
// A member's normal login token can NEVER open the admin panel (different secret + role claim).
// ---------------------------------------------------------------------------------------------

const sessionHours = () => Math.min(72, Math.max(1, Number(process.env.ADMIN_SESSION_HOURS) || 8));

const secret = () => {
  const s = process.env.ADMIN_JWT_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}:admin-panel` : "");
  return s;
};

const credentialsConfigured = () =>
  Boolean(process.env.ADMIN_EMAIL && (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD) && secret());

const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// Strict limiter for password guessing: 10 attempts / 15 minutes / IP.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const adminRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 600 });

export const adminLogin = [
  loginLimit,
  async (req, res) => {
    try {
      if (!credentialsConfigured()) {
        return res.status(503).json({ success: false, message: "Admin login is not configured on the server." });
      }
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      const emailOk = safeEqual(email, String(process.env.ADMIN_EMAIL).trim().toLowerCase());
      let passOk = false;
      if (process.env.ADMIN_PASSWORD_HASH) passOk = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
      else passOk = safeEqual(password, process.env.ADMIN_PASSWORD);

      if (!emailOk || !passOk) {
        return res.status(401).json({ success: false, message: "Invalid admin email or password." });
      }

      const token = jwt.sign({ role: "admin", aud: "mehfil-admin", sub: email }, secret(), {
        expiresIn: `${sessionHours()}h`,
      });
      res.json({ success: true, token, expiresInHours: sessionHours() });
    } catch (error) {
      res.status(500).json({ success: false, message: "Login failed." });
    }
  },
];

/** Verifies the admin bearer token. Used on every /api/admin route except login and the public writers list. */
export const requireAdmin = (req, res, next) => {
  if (!credentialsConfigured()) {
    return res.status(503).json({ success: false, message: "Admin access is not configured on the server." });
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Admin login required." });
  try {
    const decoded = jwt.verify(token, secret(), { audience: "mehfil-admin" });
    if (decoded.role !== "admin") throw new Error("not admin");
    req.adminId = decoded.sub || "admin";
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Admin session expired or invalid. Please log in again." });
  }
};

/** GET /api/admin/verify — lets the panel check a stored token before showing anything. */
export const adminVerify = (req, res) => res.json({ success: true, admin: req.adminId });

// Kept for the XP / badge routes: per-IP rate limit. Identity now comes from the verified admin token.
export const requireAdminKey = [
  adminRateLimit,
  (req, res, next) => {
    req.adminId = req.adminId || "admin";
    next();
  },
];

export default requireAdminKey;
