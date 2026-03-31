import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import passport, { hashPassword, generateVerificationToken } from "../auth.js";
import { requireAuth, safeError, processInvitation } from "../middleware.js";
import {
  findUserByEmail, findUserById, createUser, updateUserProfile, verifyUserEmail,
  setResetToken, findUserByResetToken, clearResetToken, updatePassword,
  getUserMemberships, getUserAdventureMemberships,
  getInvitationByToken, getSetting, pool,
} from "../db.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
import {
  validate, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  changePasswordSchema, profileUpdateSchema,
} from "../validation.js";
import { auditLog } from "../logger.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT ? parseInt(process.env.AUTH_RATE_LIMIT, 10) : 20,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/?error=auth" }),
  (req, res) => {
    // Regenerate session ID to prevent session fixation attacks
    const pendingToken = req.session.pendingInviteToken;
    const authenticatedUser = req.user;
    req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        console.error("Session regeneration failed:", regenErr);
        return res.redirect("/?error=session");
      }
      // Re-attach user to new session (Passport requires this)
      req.logIn(authenticatedUser, async (loginErr) => {
        if (loginErr) {
          console.error("Re-login after session regen failed:", loginErr);
          return res.redirect("/?error=session");
        }
        // Process pending invitation if present
        if (pendingToken) {
          const invitation = await getInvitationByToken(pendingToken);
          if (invitation && invitation.status === "pending") {
            await processInvitation(authenticatedUser, invitation);
          }
        }
        auditLog.login(authenticatedUser.id, authenticatedUser.email, "google");
        res.redirect("/");
      });
    });
  }
);

router.post("/api/auth/signup", authLimiter, validate(signupSchema), async (req, res) => {
  try {
    if ((await getSetting("registration_enabled")) === "false") {
      return res.status(403).json({ error: "Registration is currently closed. Please check back later." });
    }
    const { name, email, password, tos_accepted } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: "Name, email, and password (8+ chars) required" });
    }
    if (!tos_accepted) {
      return res.status(400).json({ error: "You must agree to the Terms of Service and Privacy Policy" });
    }
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const token = generateVerificationToken();
    const hash = await hashPassword(password);
    await createUser({
      email, name: name.trim(), password_hash: hash,
      email_verified: 0, verification_token: token,
      tos_accepted_at: new Date().toISOString(),
    });
    sendVerificationEmail(email, token).catch(e => console.error("Verification email failed:", e));
    const newUser = await findUserByEmail(email);
    auditLog.signup(newUser?.id, email);
    res.status(201).json({ ok: true, message: "Check your email to verify your account" });
  } catch (e) { safeError(res, e); }
});

router.post("/api/auth/login", authLimiter, validate(loginSchema), (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return safeError(res, err);
    if (!user) { auditLog.loginFailed(req.body.email, info?.message); return res.status(401).json({ error: info?.message || "Invalid credentials" }); }
    if (!user.email_verified) return res.status(403).json({ error: "Please verify your email first" });
    req.logIn(user, (err) => {
      if (err) return safeError(res, err);
      // Regenerate session ID to prevent session fixation attacks
      const pendingToken = req.session.pendingInviteToken;
      req.session.regenerate(async (regenErr) => {
        if (regenErr) return safeError(res, regenErr);
        // Re-attach user to new session (Passport requires this)
        req.logIn(user, async (loginErr) => {
          if (loginErr) return safeError(res, loginErr);
          // Process pending invitation if present
          if (pendingToken) {
            const invitation = await getInvitationByToken(pendingToken);
            if (invitation && invitation.status === "pending") {
              await processInvitation(user, invitation);
            }
          }
          auditLog.login(user.id, user.email, "email");
          const { password_hash, verification_token, reset_token, reset_token_expires, ...safe } = user;
          res.json(safe);
        });
      });
    });
  })(req, res, next);
});

router.get("/api/auth/verify/:token", async (req, res) => {
  const result = await verifyUserEmail(req.params.token);
  if (!result) return res.redirect("/?error=invalid-token");
  res.redirect("/?verified=1");
});

// ── Password Reset ──
router.post("/api/auth/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email is required" });

    // Always respond success to prevent email enumeration
    const user = await findUserByEmail(email);
    if (user && user.password_hash) {
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await setResetToken(email, token, expires);
      sendPasswordResetEmail(email, token).catch(e => console.error("Reset email failed:", e));
    }
    res.json({ ok: true, message: "If that email exists, a reset link has been sent" });
  } catch (e) { safeError(res, e); }
});

router.post("/api/auth/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: "Valid token and password (8+ chars) required" });
    }
    const user = await findUserByResetToken(token);
    if (!user) return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });

    const hash = await hashPassword(password);
    await updatePassword(user.id, hash);
    await clearResetToken(user.id);
    auditLog.passwordReset(user.id, user.email);
    res.json({ ok: true, message: "Password updated. You can now sign in." });
  } catch (e) { safeError(res, e); }
});

router.put("/api/auth/change-password", requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Current password and new password (8+ chars) required" });
    }
    const user = await findUserById(req.user.id);
    if (!user.password_hash) {
      return res.status(400).json({ error: "Your account uses Google sign-in. Password change is not available." });
    }
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: "Current password is incorrect" });
    const hash = await hashPassword(newPassword);
    await updatePassword(user.id, hash);
    // Invalidate all other sessions for this user
    try {
      const pattern = `%"passport":{"user":${user.id}}%`;
      await pool.query("DELETE FROM sessions WHERE sid != $1 AND sess LIKE $2", [req.sessionID, pattern]);
    } catch (sessionErr) {
      console.error("[change-password] Failed to invalidate other sessions:", sessionErr.message);
    }
    auditLog.passwordChange(req.user.id);
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (e) { safeError(res, e); }
});

router.get("/api/auth/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  const { password_hash, verification_token, reset_token, reset_token_expires, ...safe } = req.user;
  const has_password = !!password_hash;
  const memberships = await getUserMemberships(req.user.id);
  const adventureMemberships = await getUserAdventureMemberships(req.user.id);
  const is_global_admin = !!req.user.is_admin;
  res.json({ user: { ...safe, is_global_admin, has_password }, memberships, adventureMemberships });
});

router.put("/api/auth/profile", requireAuth, validate(profileUpdateSchema), async (req, res) => {
  try {
    const { name, user_type, parent_email, parent_email_2, age_confirmed } = req.body;

    // Age confirmation: can only be set once, must be "13+" or "18+"
    if (age_confirmed !== undefined) {
      if (!["13+", "18+"].includes(age_confirmed)) return res.status(400).json({ error: "age_confirmed must be '13+' or '18+'" });
      if (req.user.age_confirmed) return res.status(400).json({ error: "Age confirmation cannot be changed" });
    }

    if (user_type && !["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });

    const currentUser = await findUserById(req.user.id);
    const effectiveAge = age_confirmed || currentUser.age_confirmed;

    // Age gate enforcement: must confirm age before setting role (either already set or being set now)
    if (user_type && !effectiveAge) return res.status(400).json({ error: "You must confirm your age before selecting a role" });

    // 18+ required for adult role
    if (user_type === "adult" && effectiveAge === "13+") return res.status(400).json({ error: "You must be 18 or older to register as an adult leader" });

    // 13+ (youth) must be scout
    if (user_type === "scout" && effectiveAge === "18+") return res.status(400).json({ error: "Adults (18+) cannot register as scouts" });

    if (user_type === "scout" && !parent_email?.trim()) return res.status(400).json({ error: "Scouts must provide parent/guardian email" });

    // Build update object
    const updates = { name: name?.trim(), user_type, parent_email, parent_email_2: parent_email_2?.trim() || null };
    if (age_confirmed && !currentUser.age_confirmed) {
      updates.age_confirmed = age_confirmed;
      if (!currentUser.tos_accepted_at) {
        updates.tos_accepted_at = new Date().toISOString();
      }
    }
    await updateUserProfile(req.user.id, updates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.post("/api/auth/logout", (req, res) => {
  const userId = req.user?.id;
  req.logout(() => {
    if (userId) auditLog.logout(userId);
    res.json({ ok: true });
  });
});

export default router;
