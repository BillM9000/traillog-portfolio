import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { findUserByGoogleId, findUserByEmail, findUserById, createUser, bindGoogleProfile, updateUserNameAvatar, getSetting } from "./db.js";

// ── Serialize / Deserialize ──
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user || false);
  } catch (e) { done(e); }
});

// ── Helpers ──
function titleCase(str) {
  if (!str) return str;
  return str.replace(/\b\w+/g, w => {
    // Already properly mixed case (e.g. "McCoy", "McDonald") — preserve
    if (w.length > 1 && w[0] === w[0].toUpperCase() && w.slice(1) !== w.slice(1).toLowerCase()) return w;
    // Handle Mc/Mac prefixes: "Mccoy" -> "McCoy", "Macdonald" -> "MacDonald"
    const mcMatch = w.match(/^(mc)(.+)$/i);
    if (mcMatch) return "Mc" + mcMatch[2].charAt(0).toUpperCase() + mcMatch[2].slice(1).toLowerCase();
    const macMatch = w.match(/^(mac)([a-z]{3,})$/i);
    if (macMatch) return "Mac" + macMatch[2].charAt(0).toUpperCase() + macMatch[2].slice(1).toLowerCase();
    // Handle O' prefixes
    const oMatch = w.match(/^(o')(.+)$/i);
    if (oMatch) return "O'" + oMatch[2].charAt(0).toUpperCase() + oMatch[2].slice(1).toLowerCase();
    // Default: capitalize first letter
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

// ── Google OAuth Strategy ──
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = titleCase(profile.displayName) || email;
      const avatar = profile.photos?.[0]?.value || null;

      // Check if user exists by Google ID — refresh name/avatar on each login
      let user = await findUserByGoogleId(googleId);
      if (user) {
        await updateUserNameAvatar(user.id, name, avatar);
        return done(null, { ...user, name, avatar_url: avatar });
      }

      // Check if user exists by email (signed up with password, now linking Google)
      user = await findUserByEmail(email);
      if (user) {
        await bindGoogleProfile(user.id, googleId, avatar);
        return done(null, { ...user, google_id: googleId, avatar_url: avatar });
      }

      // Check if registration is open
      if (await getSetting("registration_enabled") === "false") {
        return done(null, false, { message: "Registration is currently closed" });
      }
      // Create new user
      user = await createUser({ google_id: googleId, email, name, avatar_url: avatar, email_verified: 1 });
      done(null, user);
    } catch (e) { done(e); }
  }));
}

// ── Local Strategy (email + password) ──
passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
  try {
    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) return done(null, false, { message: "Invalid email or password" });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return done(null, false, { message: "Invalid email or password" });
    done(null, user);
  } catch (e) { done(e); }
}));

// ── Helpers ──
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export default passport;
