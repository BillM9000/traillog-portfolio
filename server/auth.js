import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { findUserByGoogleId, findUserByEmail, findUserById, createUser, bindGoogleProfile } from "./db.js";

// ── Serialize / Deserialize ──
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    const user = findUserById(id);
    done(null, user || false);
  } catch (e) { done(e); }
});

// ── Google OAuth Strategy ──
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || email;
      const avatar = profile.photos?.[0]?.value || null;

      // Check if user exists by Google ID
      let user = findUserByGoogleId(googleId);
      if (user) return done(null, user);

      // Check if user exists by email (signed up with password, now linking Google)
      user = findUserByEmail(email);
      if (user) {
        bindGoogleProfile(user.id, googleId, avatar);
        return done(null, { ...user, google_id: googleId, avatar_url: avatar });
      }

      // Create new user
      user = createUser({ google_id: googleId, email, name, avatar_url: avatar, email_verified: 1 });
      done(null, user);
    } catch (e) { done(e); }
  }));
}

// ── Local Strategy (email + password) ──
passport.use(new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
  try {
    const user = findUserByEmail(email);
    if (!user || !user.password_hash) return done(null, false, { message: "Invalid email or password" });
    if (!bcrypt.compareSync(password, user.password_hash)) return done(null, false, { message: "Invalid email or password" });
    done(null, user);
  } catch (e) { done(e); }
}));

// ── Helpers ──
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export default passport;
