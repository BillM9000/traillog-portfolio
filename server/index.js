import express from "express";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import passport, { hashPassword, generateVerificationToken } from "./auth.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import db, {
  createSessionStore, findUserByEmail, findUserById, createUser, updateUserProfile, verifyUserEmail,
  setResetToken, findUserByResetToken, clearResetToken, updatePassword,
  getTroops, getTroop, createTroop, updateTroop, updateTroopAffiliateTag,
  getTroopMembers, getTroopMember, getUserMemberships, getUserAdventureMemberships,
  requestJoinTroop, approveTroopMember, denyTroopMember, removeTroopMember,
  updateMemberDates, updateMemberSkills, getTroopAdmins,
  getTroopSkills, addTroopSkill, removeTroopSkill,
  getAdventures, getAdventure, createAdventure, updateAdventure, deleteAdventure,
  getAdventureMembers, getAdventureMember, addAdventureMember, removeAdventureMember,
  updateAdventureMemberDates, updateAdventureMemberSkills,
  updateAdventureMemberGear, updateAdventureMemberMedical, updateAdventureMemberAdmin,
  updateAdventureMemberRole, updateAdventureMemberParticipation, linkMember,
  addManualMember, removeManualMember,
  getAdventureSkills, addAdventureSkill, removeAdventureSkill,
  createInvitation, getInvitationByToken, getInvitations, updateInvitationStatus, getInvitationsByEmail,
  earnBadge, getBadges, getCrewMilestones, addCrewMilestone,
  autoLinkAdult, autoLinkScout,
  createLinkRequest, getLinkRequests, getMyLinkRequests, approveLinkRequest, denyLinkRequest,
  getItineraries, getItinerary, getGearItems, getSetting, setSetting,
  // Gear System v5
  getGearCatalog, getGearCatalogItem, getGearCategories,
  getMemberGear, getAdventureMemberGearAll, upsertMemberGear, bulkSetMemberGear, removeMemberGearItem,
  getMemberPackWeight,
  createGearCatalogItem, updateGearCatalogItem, softDeleteGearCatalogItem, reorderGearCatalog,
  addProductOption, updateProductOption, deleteProductOption,
  setTroopGearOverride, getTroopGearOverrides,
  getTroopCustomGear, addTroopCustomGear, updateTroopCustomGearItem, deleteTroopCustomGear,
  logAIQuery, getAIUsage,
  getAllTroopsAdmin, getAllUsersAdmin, getAllSettings, trackAffiliateClick, getAffiliateStats,
  deleteTroop, getTroopMembersAdmin,
  createTrainingEvent, getTrainingEvents, getTrainingEvent, deleteTrainingEvent, upsertTrainingRsvp,
} from "./db.js";
import {
  sendJoinRequestEmail, sendParentNotificationEmail, sendVerificationEmail,
  sendInvitationEmail, sendMemberApprovedEmail, sendMemberDeniedEmail,
  sendDateChangedEmail, sendItineraryChangedEmail, sendBadgeEarnedEmail, sendLinkRequestEmail, sendPasswordResetEmail,
  sendTrainingScheduledEmail,
} from "./email.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3614;

// Safe parseInt — returns null if invalid, lets routes return 400
function parseId(val) { const n = parseInt(val); return isNaN(n) ? null : n; }

// Safe error response — hides internal details in production
function safeError(res, e, status = 500) {
  console.error(e);
  res.status(status).json({ error: process.env.NODE_ENV === "production" ? "Something went wrong" : e.message });
}

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

// ── Security Headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Rate Limiting ──
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many attempts, please try again later" }, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });
app.use("/api/", apiLimiter);

// ── Sessions ──
app.use(session({
  store: createSessionStore(session),
  secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET required in production"); return "dev-secret-local-only"; })(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve static frontend in production
app.use(express.static(join(__dirname, "../client/dist")));

// ── Middleware ──

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function isGlobalAdmin(req) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!(adminEmail && req.user?.email === adminEmail);
}

function requireTroopMember(requiredStatus = "approved") {
  return (req, res, next) => {
    if (isGlobalAdmin(req)) { req.membership = { role: "admin", status: "approved" }; return next(); }
    const troopId = parseId(req.params.troopId);
    const membership = getTroopMember(troopId, req.user.id);
    if (!membership || membership.status !== requiredStatus) {
      return res.status(403).json({ error: "Not an approved member of this troop" });
    }
    req.membership = membership;
    next();
  };
}

function requireTroopAdmin(req, res, next) {
  if (isGlobalAdmin(req)) { req.membership = { role: "admin", status: "approved" }; return next(); }
  const troopId = parseId(req.params.troopId);
  const membership = getTroopMember(troopId, req.user.id);
  if (!membership || membership.role !== "admin" || membership.status !== "approved") {
    return res.status(403).json({ error: "Admin access required" });
  }
  req.membership = membership;
  next();
}

function requireSelfOrAdmin(req, res, next) {
  const troopId = parseId(req.params.troopId);
  const targetUserId = parseId(req.params.userId);
  if (req.user.id === targetUserId) return next();
  const membership = getTroopMember(troopId, req.user.id);
  if (membership?.role === "admin" && membership.status === "approved") return next();
  res.status(403).json({ error: "Can only edit your own data" });
}

function requireAdventureMember(req, res, next) {
  const adventureId = parseId(req.params.adventureId);
  const member = getAdventureMember(adventureId, req.user.id);
  if (!member) return res.status(403).json({ error: "Not a member of this adventure" });
  req.adventureMembership = member;
  next();
}

function requireAdventureAdmin(req, res, next) {
  if (isGlobalAdmin(req)) return next();
  const adventureId = parseId(req.params.adventureId);
  const member = getAdventureMember(adventureId, req.user.id);
  // Adventure-level admin
  if (member && member.role === "admin") {
    req.adventureMembership = member;
    return next();
  }
  // Fall through: troop admins can manage all adventures in their troop
  const adventure = getAdventure(adventureId);
  if (adventure) {
    const troopMember = getTroopMember(adventure.troop_id, req.user.id);
    if (troopMember && troopMember.role === "admin" && troopMember.status === "approved") {
      req.adventureMembership = member; // may be null if not yet an adventure member
      return next();
    }
  }
  return res.status(403).json({ error: "Adventure admin access required" });
}

function requireAdventureSelfOrAdmin(req, res, next) {
  if (isGlobalAdmin(req)) return next();
  const adventureId = parseId(req.params.adventureId);
  const targetUserId = parseId(req.params.userId);
  if (req.user.id === targetUserId) return next();
  // Adventure-level admin
  const member = getAdventureMember(adventureId, req.user.id);
  if (member?.role === "admin") return next();
  // Fall through: troop admins can manage all adventure members
  const adventure = getAdventure(adventureId);
  if (adventure) {
    const troopMember = getTroopMember(adventure.troop_id, req.user.id);
    if (troopMember?.role === "admin" && troopMember.status === "approved") return next();
  }
  res.status(403).json({ error: "Can only edit your own data" });
}

// ═══════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/?error=auth" }),
  (req, res) => {
    // Check for pending invitation token
    if (req.session.pendingInviteToken) {
      const invitation = getInvitationByToken(req.session.pendingInviteToken);
      if (invitation && invitation.status === "pending") {
        processInvitation(req.user, invitation);
      }
      delete req.session.pendingInviteToken;
    }
    res.redirect("/");
  }
);

app.post("/api/auth/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password, tos_accepted } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: "Name, email, and password (8+ chars) required" });
    }
    if (!tos_accepted) {
      return res.status(400).json({ error: "You must agree to the Terms of Service and Privacy Policy" });
    }
    const existing = findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const token = generateVerificationToken();
    const hash = await hashPassword(password);
    createUser({
      email, name: name.trim(), password_hash: hash,
      email_verified: 0, verification_token: token,
      tos_accepted_at: new Date().toISOString(),
    });
    sendVerificationEmail(email, token).catch(e => console.error("Verification email failed:", e));
    res.status(201).json({ ok: true, message: "Check your email to verify your account" });
  } catch (e) { safeError(res, e); }
});

app.post("/api/auth/login", authLimiter, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return safeError(res, err);
    if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
    if (!user.email_verified) return res.status(403).json({ error: "Please verify your email first" });
    req.logIn(user, (err) => {
      if (err) return safeError(res, err);
      // Process pending invitation if present
      if (req.session.pendingInviteToken) {
        const invitation = getInvitationByToken(req.session.pendingInviteToken);
        if (invitation && invitation.status === "pending") {
          processInvitation(user, invitation);
        }
        delete req.session.pendingInviteToken;
      }
      const { password_hash, verification_token, reset_token, reset_token_expires, ...safe } = user;
      res.json(safe);
    });
  })(req, res, next);
});

app.get("/api/auth/verify/:token", (req, res) => {
  const result = verifyUserEmail(req.params.token);
  if (!result) return res.redirect("/?error=invalid-token");
  res.redirect("/?verified=1");
});

// ── Password Reset ──
app.post("/api/auth/forgot-password", authLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email is required" });

    // Always respond success to prevent email enumeration
    const user = findUserByEmail(email);
    if (user && user.password_hash) {
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      setResetToken(email, token, expires);
      sendPasswordResetEmail(email, token).catch(e => console.error("Reset email failed:", e));
    }
    res.json({ ok: true, message: "If that email exists, a reset link has been sent" });
  } catch (e) { safeError(res, e); }
});

app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: "Valid token and password (8+ chars) required" });
    }
    const user = findUserByResetToken(token);
    if (!user) return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });

    const hash = await hashPassword(password);
    updatePassword(user.id, hash);
    clearResetToken(user.id);
    res.json({ ok: true, message: "Password updated. You can now sign in." });
  } catch (e) { safeError(res, e); }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  const { password_hash, verification_token, reset_token, reset_token_expires, ...safe } = req.user;
  const memberships = getUserMemberships(req.user.id);
  const adventureMemberships = getUserAdventureMemberships(req.user.id);
  const adminEmail = process.env.ADMIN_EMAIL;
  const is_global_admin = !!(adminEmail && req.user.email === adminEmail);
  res.json({ user: { ...safe, is_global_admin }, memberships, adventureMemberships });
});

app.put("/api/auth/profile", requireAuth, (req, res) => {
  try {
    const { name, user_type, parent_email, parent_email_2, age_confirmed } = req.body;

    // Age confirmation: can only be set once, must be "13+" or "18+"
    if (age_confirmed !== undefined) {
      if (!["13+", "18+"].includes(age_confirmed)) return res.status(400).json({ error: "age_confirmed must be '13+' or '18+'" });
      if (req.user.age_confirmed) return res.status(400).json({ error: "Age confirmation cannot be changed" });
      // Record TOS acceptance if not already set (Google OAuth users accept during age gate)
      const updates = { age_confirmed };
      const currentUser = findUserById(req.user.id);
      if (!currentUser.tos_accepted_at) {
        updates.tos_accepted_at = new Date().toISOString();
      }
      updateUserProfile(req.user.id, updates);
      return res.json({ ok: true });
    }

    if (user_type && !["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });

    // Age gate enforcement: must confirm age before setting role
    const currentUser = findUserById(req.user.id);
    if (user_type && !currentUser.age_confirmed) return res.status(400).json({ error: "You must confirm your age before selecting a role" });

    // 18+ required for adult role
    if (user_type === "adult" && currentUser.age_confirmed === "13+") return res.status(400).json({ error: "You must be 18 or older to register as an adult leader" });

    if (user_type === "scout" && !parent_email?.trim()) return res.status(400).json({ error: "Scouts must provide parent/guardian email" });
    updateUserProfile(req.user.id, { name: name?.trim(), user_type, parent_email, parent_email_2: parent_email_2?.trim() || null });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.post("/api/auth/logout", (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// ═══════════════════════════════════════════
// ITINERARY ROUTES
// ═══════════════════════════════════════════

app.get("/api/itineraries", requireAuth, (req, res) => {
  try { res.json(getItineraries()); }
  catch (e) { safeError(res, e); }
});

app.get("/api/itineraries/:id", requireAuth, (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !/^[\d-]+$/.test(id)) return res.status(400).json({ error: "Invalid itinerary ID" });
    const itin = getItinerary(id);
    if (!itin) return res.status(404).json({ error: "Itinerary not found" });
    res.json(itin);
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP ROUTES
// ═══════════════════════════════════════════

app.get("/api/troops", requireAuth, (req, res) => {
  try { res.json(getTroops(req.user.id)); }
  catch (e) { safeError(res, e); }
});

app.get("/api/troops/:troopId", requireAuth, requireTroopMember(), (req, res) => {
  try {
    const troop = getTroop(parseId(req.params.troopId));
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    res.json(troop);
  } catch (e) { safeError(res, e); }
});

app.post("/api/troops", requireAuth, (req, res) => {
  try {
    const { name, description, council, location, is_public } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Troop name required" });
    if (!council?.trim()) return res.status(400).json({ error: "Council is required" });
    if (council.trim().length > 60) return res.status(400).json({ error: "Council name too long (60 char max)" });
    const troop = createTroop({ name: name.trim(), description, council: council.trim(), location: location?.trim(), is_public, created_by: req.user.id });
    res.status(201).json(troop);
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, description, council, location, is_public } = req.body;
    if (council !== undefined && !council?.trim()) return res.status(400).json({ error: "Council is required" });
    updateTroop(parseId(req.params.troopId), { name, description, council, location, is_public });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.post("/api/troops/:troopId/join", requireAuth, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const existing = getTroopMember(troopId, req.user.id);
    if (existing) return res.status(409).json({ error: "Already requested or joined", status: existing.status });

    requestJoinTroop(req.user.id, troopId);

    const troop = getTroop(troopId);
    const admins = getTroopAdmins(troopId);
    const user = findUserById(req.user.id);
    admins.forEach(admin => {
      sendJoinRequestEmail(admin.email, admin.name, user.name, user.user_type, troop.name, user.parent_email)
        .catch(e => console.error("Join notification failed:", e));
    });

    // Notify parent/guardian if scout has parent_email
    if (user.user_type === "scout" && user.parent_email) {
      sendParentNotificationEmail(user.parent_email, user.name, troop.name)
        .catch(e => console.error("Parent notification failed:", e));
    }

    res.status(201).json({ ok: true, status: "pending" });
  } catch (e) {
    if (e.message.includes("UNIQUE")) return res.status(409).json({ error: "Already requested" });
    safeError(res, e);
  }
});

// ═══════════════════════════════════════════
// TROOP MEMBER ROUTES
// ═══════════════════════════════════════════

app.get("/api/troops/:troopId/members", requireAuth, requireTroopMember(), (req, res) => {
  try {
    const status = req.membership.role === "admin" ? null : "approved";
    res.json(getTroopMembers(parseId(req.params.troopId), status));
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId/members/:userId/approve", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const userId = parseId(req.params.userId);
    approveTroopMember(troopId, userId);
    // Auto-add to all active adventures in this troop
    const adventures = getAdventures(troopId).filter(a => a.status === "active");
    for (const adv of adventures) {
      const existing = getAdventureMember(adv.id, userId);
      if (!existing) addAdventureMember(adv.id, userId, "member");
    }
    const user = findUserById(userId);
    const troop = getTroop(troopId);
    if (user?.email) {
      sendMemberApprovedEmail(user.email, user.name, troop.name)
        .catch(e => console.error("Approval email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId/members/:userId/deny", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    denyTroopMember(parseId(req.params.troopId), parseId(req.params.userId));
    const user = findUserById(parseId(req.params.userId));
    const troop = getTroop(parseId(req.params.troopId));
    if (user?.email) {
      sendMemberDeniedEmail(user.email, user.name, troop.name)
        .catch(e => console.error("Denial email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.delete("/api/troops/:troopId/members/:userId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    removeTroopMember(parseId(req.params.troopId), parseId(req.params.userId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.post("/api/troops/:troopId/leave", requireAuth, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    const membership = getTroopMember(troopId, req.user.id);
    if (!membership || membership.status !== "approved") {
      return res.status(400).json({ error: "You are not a member of this troop" });
    }
    // Prevent sole admin from leaving
    if (membership.role === "admin") {
      const admins = getTroopAdmins(troopId);
      if (admins.length <= 1) {
        return res.status(400).json({ error: "Cannot leave: you are the only admin. Promote another member first or delete the troop." });
      }
    }
    removeTroopMember(troopId, req.user.id);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId/members/:userId/dates", requireAuth, requireTroopMember(), requireSelfOrAdmin, (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateMemberDates(parseId(req.params.troopId), parseId(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId/members/:userId/skills", requireAuth, requireTroopMember(), requireSelfOrAdmin, (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateMemberSkills(parseId(req.params.troopId), parseId(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP SKILLS ROUTES (legacy, kept for compat)
// ═══════════════════════════════════════════

app.get("/api/troops/:troopId/skills", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getTroopSkills(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

app.post("/api/troops/:troopId/skills", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, desc } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(addTroopSkill(parseId(req.params.troopId), name, desc));
  } catch (e) { safeError(res, e); }
});

app.delete("/api/troops/:troopId/skills/:skillId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const result = removeTroopSkill(parseId(req.params.troopId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ADVENTURE ROUTES
// ═══════════════════════════════════════════

// List adventures for a troop
app.get("/api/troops/:troopId/adventures", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getAdventures(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

// Create adventure
app.post("/api/troops/:troopId/adventures", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Adventure name required" });
    const validTypes = ["philmont", "northern_tier", "sea_base", "summit"];
    const type = validTypes.includes(adventure_type) ? adventure_type : "philmont";
    const adventure = createAdventure({
      troop_id: parseId(req.params.troopId),
      name: name.trim(), description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type: type,
      created_by: req.user.id,
    });
    res.status(201).json(adventure);
  } catch (e) { safeError(res, e); }
});

// Get adventure detail
app.get("/api/adventures/:adventureId", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adv = getAdventure(parseId(req.params.adventureId));
    if (!adv) return res.status(404).json({ error: "Adventure not found" });
    res.json(adv);
  } catch (e) { safeError(res, e); }
});

// Update adventure
app.put("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id, adventure_type } = req.body;
    const validTypes = ["philmont", "northern_tier", "sea_base", "summit"];
    const safeType = adventure_type && validTypes.includes(adventure_type) ? adventure_type : undefined;
    const oldAdv = getAdventure(adventureId);
    updateAdventure(adventureId, { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id, adventure_type: safeType });

    // Send date change emails if any date changed
    const dateFields = ["depart_date", "arrive_date", "return_date", "home_date"];
    const changes = [];
    const labels = { depart_date: "Depart Home", arrive_date: "Arrive at Philmont", return_date: "Depart Philmont", home_date: "Return Home" };
    const safeDate = (v) => v ? String(v).replace(/[^0-9\-]/g, "") : null;
    for (const f of dateFields) {
      if (req.body[f] !== undefined && req.body[f] !== oldAdv[f]) {
        changes.push(`<strong>${labels[f]}:</strong> ${safeDate(oldAdv[f]) || "not set"} → ${safeDate(req.body[f]) || "removed"}`);
      }
    }
    if (changes.length > 0) {
      const members = getAdventureMembers(adventureId);
      const changeSummary = changes.join("<br>");
      members.forEach(m => {
        if (m.email && !m.is_manual) {
          sendDateChangedEmail(m.email, m.name, oldAdv.name, changeSummary)
            .catch(e => console.error("Date change email failed:", e));
        }
      });
    }

    // Send itinerary change emails if itinerary changed
    if (itinerary_id !== undefined && itinerary_id !== oldAdv.itinerary_id) {
      const oldItin = oldAdv.itinerary_id ? getItinerary(oldAdv.itinerary_id) : null;
      const newItin = itinerary_id ? getItinerary(itinerary_id) : null;
      const oldName = oldItin ? `${oldItin.name} (${oldItin.days}-day)` : "None";
      const newName = newItin ? `${newItin.name} (${newItin.days}-day)` : "None";
      console.log(`[itinerary change] Adventure ${adventureId}: ${oldName} → ${newName}`);
      const members = getAdventureMembers(adventureId);
      members.forEach(m => {
        if (m.email && !m.is_manual) {
          sendItineraryChangedEmail(m.email, m.name, oldAdv.name, oldName, newName)
            .catch(e => console.error("Itinerary change email failed:", e));
        }
      });
    }

    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Delete adventure
app.delete("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    deleteAdventure(parseId(req.params.adventureId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ADVENTURE MEMBER ROUTES
// ═══════════════════════════════════════════

app.get("/api/adventures/:adventureId/members", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getAdventureMembers(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

app.post("/api/adventures/:adventureId/members", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const advId = parseId(req.params.adventureId);
    // Auto-promote troop admins to adventure admin
    let memberRole = role || "member";
    if (memberRole === "member") {
      const adventure = getAdventure(advId);
      if (adventure) {
        const troopMember = getTroopMember(adventure.troop_id, user_id);
        if (troopMember?.role === "admin" && troopMember.status === "approved") {
          memberRole = "admin";
        }
      }
    }
    addAdventureMember(advId, user_id, memberRole);
    // Auto-link parent-scout by email match
    const addedUser = findUserById(user_id);
    if (addedUser?.user_type === "adult") autoLinkAdult(advId, user_id);
    else if (addedUser?.user_type === "scout") autoLinkScout(advId, user_id);
    res.status(201).json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.delete("/api/adventures/:adventureId/members/:userId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeAdventureMember(parseId(req.params.adventureId), parseId(req.params.userId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update adventure member data (dates, skills, gear, medical, admin)
app.put("/api/adventures/:adventureId/members/:userId/dates", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateAdventureMemberDates(parseId(req.params.adventureId), parseId(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/adventures/:adventureId/members/:userId/skills", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateAdventureMemberSkills(parseId(req.params.adventureId), parseId(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/adventures/:adventureId/members/:userId/gear", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { gear } = req.body;
    if (!Array.isArray(gear)) return res.status(400).json({ error: "gear must be array" });
    updateAdventureMemberGear(parseId(req.params.adventureId), parseId(req.params.userId), gear);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/adventures/:adventureId/members/:userId/medical", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { medical } = req.body;
    if (!Array.isArray(medical)) return res.status(400).json({ error: "medical must be array" });
    updateAdventureMemberMedical(parseId(req.params.adventureId), parseId(req.params.userId), medical);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/adventures/:adventureId/members/:userId/admin", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { admin_tasks } = req.body;
    if (!Array.isArray(admin_tasks)) return res.status(400).json({ error: "admin_tasks must be array" });
    updateAdventureMemberAdmin(parseId(req.params.adventureId), parseId(req.params.userId), admin_tasks);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ADVENTURE SKILLS ROUTES
// ═══════════════════════════════════════════

app.get("/api/adventures/:adventureId/skills", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const category = req.query.category || null;
    res.json(getAdventureSkills(parseId(req.params.adventureId), category));
  } catch (e) { safeError(res, e); }
});

app.post("/api/adventures/:adventureId/skills", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name, desc, category, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(addAdventureSkill(parseId(req.params.adventureId), name, desc, category, icon));
  } catch (e) { safeError(res, e); }
});

app.delete("/api/adventures/:adventureId/skills/:skillId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = removeAdventureSkill(parseId(req.params.adventureId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TRAINING EVENT ROUTES
// ═══════════════════════════════════════════

app.get("/api/adventures/:adventureId/training-events", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getTrainingEvents(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

app.post("/api/adventures/:adventureId/training-events", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const advId = parseId(req.params.adventureId);
    const { date, period, time_label, location, notes } = req.body;
    if (!date) return res.status(400).json({ error: "date required" });
    if (period && !["am", "pm", "all"].includes(period)) return res.status(400).json({ error: "period must be am, pm, or all" });
    const event = createTrainingEvent(advId, { date, period: period || "all", time_label, location, notes }, req.user.id);

    // Email all members about the scheduled training
    const adventure = getAdventure(advId);
    const members = getAdventureMembers(advId).filter(m => !m.is_manual);
    const periodLabel = period === "am" ? "Morning" : period === "pm" ? "Afternoon" : "All Day";
    for (const m of members) {
      const user = findUserById(m.user_id);
      if (user?.email) {
        sendTrainingScheduledEmail(user.email, user.name, adventure?.name || "Adventure", date, periodLabel, time_label, location, notes).catch(console.error);
      }
    }
    console.log(`[training event] Adventure ${advId}: ${date} (${periodLabel}) at ${location || "TBD"} — ${members.length} members notified`);

    res.status(201).json(event);
  } catch (e) { safeError(res, e); }
});

app.delete("/api/adventures/:adventureId/training-events/:eventId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    deleteTrainingEvent(parseId(req.params.eventId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/adventures/:adventureId/training-events/:eventId/rsvp", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const { status } = req.body;
    if (!["going", "cant"].includes(status)) return res.status(400).json({ error: "status must be going or cant" });
    upsertTrainingRsvp(parseId(req.params.eventId), req.user.id, status);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// GEAR ROUTES (legacy — kept for backward compat)
// ═══════════════════════════════════════════

app.get("/api/gear", requireAuth, (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(",") : null;
    const items = getGearItems(tags);

    const troopId = req.query.troop ? parseId(req.query.troop) : null;
    if (troopId) {
      const troop = getTroop(troopId);
      const tag = troop?.amazon_affiliate_tag || getSetting("amazon_affiliate_tag");
      if (tag) {
        items.forEach(item => {
          if (item.affiliate_url && !item.affiliate_url.includes("tag=")) {
            item.affiliate_url += (item.affiliate_url.includes("?") ? "&" : "?") + `tag=${tag}`;
          }
        });
      }
    }
    res.json(items);
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// GEAR CATALOG ROUTES (v5)
// ═══════════════════════════════════════════

// Global admin middleware (platform owner)
function requireGlobalAdmin(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || req.user.email !== adminEmail) {
    return res.status(403).json({ error: "Platform admin only" });
  }
  next();
}

// Get full gear catalog (with product options and retailers)
app.get("/api/gear-catalog", requireAuth, (req, res) => {
  try {
    const troopId = req.query.troop ? parseId(req.query.troop) : null;
    res.json(getGearCatalog(troopId));
  } catch (e) { safeError(res, e); }
});

// Get gear categories with counts
app.get("/api/gear-catalog/categories", requireAuth, (req, res) => {
  try { res.json(getGearCategories()); }
  catch (e) { safeError(res, e); }
});

// Get single gear item with all details
app.get("/api/gear-catalog/:id", requireAuth, (req, res) => {
  try {
    const item = getGearCatalogItem(parseId(req.params.id));
    if (!item) return res.status(404).json({ error: "Gear item not found" });
    res.json(item);
  } catch (e) { safeError(res, e); }
});

// Admin: Create gear item
app.post("/api/gear-catalog", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: "Gear item name is required" });
    if (!req.body.category?.trim()) return res.status(400).json({ error: "Category is required" });
    const item = createGearCatalogItem(req.body);
    res.status(201).json(item);
  } catch (e) { safeError(res, e); }
});

// Admin: Update gear item
app.put("/api/gear-catalog/:id", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    updateGearCatalogItem(parseId(req.params.id), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Soft-delete gear item
app.delete("/api/gear-catalog/:id", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    softDeleteGearCatalogItem(parseId(req.params.id));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Reorder gear items
app.put("/api/gear-catalog-reorder", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be array" });
    reorderGearCatalog(orderedIds);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Add product option to gear item
app.post("/api/gear-catalog/:id/options", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const option = addProductOption(parseId(req.params.id), req.body);
    res.status(201).json(option);
  } catch (e) { safeError(res, e); }
});

// Admin: Update product option
app.put("/api/gear-catalog/options/:optId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    updateProductOption(parseId(req.params.optId), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Delete product option
app.delete("/api/gear-catalog/options/:optId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    deleteProductOption(parseId(req.params.optId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// GLOBAL ADMIN ROUTES
// ═══════════════════════════════════════════

app.get("/api/admin/troops", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllTroopsAdmin()); }
  catch (e) { safeError(res, e); }
});

app.get("/api/admin/troops/:troopId/members", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    res.json(getTroopMembersAdmin(troopId));
  } catch (e) { safeError(res, e); }
});

app.delete("/api/admin/troops/:troopId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    const troop = getTroop(troopId);
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    deleteTroop(troopId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.get("/api/admin/users", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllUsersAdmin()); }
  catch (e) { safeError(res, e); }
});

app.get("/api/admin/settings", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllSettings()); }
  catch (e) { safeError(res, e); }
});

app.get("/api/admin/affiliate-stats", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAffiliateStats()); }
  catch (e) { safeError(res, e); }
});

app.post("/api/affiliate/click", requireAuth, (req, res) => {
  try {
    const { product_option_id, gear_catalog_id, url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });
    trackAffiliateClick(req.user.id, product_option_id, gear_catalog_id, url, req.headers.referer);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// MEMBER GEAR ROUTES (adventure-scoped)
// ═══════════════════════════════════════════

// Get all member gear for an adventure
app.get("/api/adventures/:adventureId/gear", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getAdventureMemberGearAll(parseId(req.params.adventureId)));
  } catch (e) { safeError(res, e); }
});

// Get single member's gear selections
app.get("/api/adventures/:adventureId/members/:userId/gear", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getMemberGear(parseId(req.params.adventureId), parseId(req.params.userId)));
  } catch (e) { safeError(res, e); }
});

// Update a single gear item selection for a member
app.put("/api/adventures/:adventureId/members/:userId/gear-item/:gearId", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const id = upsertMemberGear(
      parseId(req.params.adventureId),
      parseId(req.params.userId),
      parseId(req.params.gearId),
      req.body
    );
    res.json({ ok: true, id });
  } catch (e) { safeError(res, e); }
});

// Bulk set member gear (initial setup / quick-add)
app.post("/api/adventures/:adventureId/members/:userId/gear-bulk", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { selections } = req.body;
    if (!Array.isArray(selections)) return res.status(400).json({ error: "selections must be array" });
    bulkSetMemberGear(parseId(req.params.adventureId), parseId(req.params.userId), selections);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Remove a gear selection from a member
app.delete("/api/adventures/:adventureId/members/:userId/gear-item/:gearId", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    removeMemberGearItem(parseId(req.params.adventureId), parseId(req.params.userId), parseId(req.params.gearId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Get pack weight breakdown for a member
app.get("/api/adventures/:adventureId/members/:userId/pack-weight", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getMemberPackWeight(parseId(req.params.adventureId), parseId(req.params.userId)));
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP GEAR OVERRIDES & CUSTOM GEAR
// ═══════════════════════════════════════════

// Troop admin: hide/show a global gear item
app.put("/api/troops/:troopId/gear-overrides/:gearId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { hidden } = req.body;
    setTroopGearOverride(parseId(req.params.troopId), parseId(req.params.gearId), hidden);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Troop admin: get overrides
app.get("/api/troops/:troopId/gear-overrides", requireAuth, requireTroopAdmin, (req, res) => {
  try { res.json(getTroopGearOverrides(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

// Troop admin: custom gear items
app.get("/api/troops/:troopId/custom-gear", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getTroopCustomGear(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

app.post("/api/troops/:troopId/custom-gear", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const item = addTroopCustomGear(parseId(req.params.troopId), req.body);
    res.status(201).json(item);
  } catch (e) { safeError(res, e); }
});

app.put("/api/troops/:troopId/custom-gear/:id", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    updateTroopCustomGearItem(parseId(req.params.troopId), parseId(req.params.id), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.delete("/api/troops/:troopId/custom-gear/:id", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    deleteTroopCustomGear(parseId(req.params.troopId), parseId(req.params.id));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// AI GEAR ROUTES (premium features)
// ═══════════════════════════════════════════

app.post("/api/gear/ai/weight-lookup", requireAuth, (req, res) => {
  try {
    // Premium check
    const userMemberships = getUserMemberships(req.user.id);
    const hasPremium = userMemberships.some(m => {
      const troop = getTroop(m.troop_id);
      return troop?.tier === "premium";
    });
    if (!hasPremium) return res.status(403).json({ error: "Premium feature", upgrade: true });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI weight lookup not configured" });

    // Stub: AI weight lookup will be implemented with Anthropic API
    const { product_name } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ error: "product_name required" });
    res.json({ product_name, estimated_weight_oz: null, confidence: "unavailable", source: "ai_lookup_pending" });
  } catch (e) { safeError(res, e); }
});

app.post("/api/gear/ai/chat", requireAuth, (req, res) => {
  try {
    const userMemberships = getUserMemberships(req.user.id);
    const hasPremium = userMemberships.some(m => {
      const troop = getTroop(m.troop_id);
      return troop?.tier === "premium";
    });
    if (!hasPremium) return res.status(403).json({ error: "Premium feature", upgrade: true });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI chatbot not configured" });

    const { message, adventure_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    // Stub: AI chatbot will be implemented with Anthropic API
    const response = "AI gear chatbot is being set up. Check back soon for personalized gear advice!";
    logAIQuery(req.user.id, adventure_id, message, response, 0);
    res.json({ response, tokens_used: 0 });
  } catch (e) { safeError(res, e); }
});

app.get("/api/gear/ai/usage", requireAuth, (req, res) => {
  try { res.json(getAIUsage(req.user.id)); }
  catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP SETTINGS (admin)
// ═══════════════════════════════════════════

app.put("/api/troops/:troopId/settings", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { amazon_affiliate_tag } = req.body;
    if (amazon_affiliate_tag !== undefined) {
      // Sanitize: Amazon tags are alphanumeric + hyphens only
      const safeTag = amazon_affiliate_tag ? String(amazon_affiliate_tag).replace(/[^a-zA-Z0-9\-]/g, "") : "";
      updateTroopAffiliateTag(parseId(req.params.troopId), safeTag);
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// PLATFORM SETTINGS (super admin)
// ═══════════════════════════════════════════

app.put("/api/admin/settings", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof key !== "string") return res.status(400).json({ error: "key is required" });
    const PROTECTED_KEYS = ["schema_version"];
    if (PROTECTED_KEYS.includes(key)) return res.status(403).json({ error: "This setting is system-managed and cannot be edited" });
    setSetting(key, value);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// INVITATION ROUTES
// ═══════════════════════════════════════════

function processInvitation(user, invitation) {
  try {
    // Auto-join troop if not already a member
    const troopMember = getTroopMember(invitation.troop_id, user.id);
    if (!troopMember) {
      requestJoinTroop(user.id, invitation.troop_id);
      approveTroopMember(invitation.troop_id, user.id);
    } else if (troopMember.status === "pending") {
      approveTroopMember(invitation.troop_id, user.id);
    }
    // Auto-join adventure if specified
    if (invitation.adventure_id) {
      const advMember = getAdventureMember(invitation.adventure_id, user.id);
      if (!advMember) {
        addAdventureMember(invitation.adventure_id, user.id, "member");
        // Auto-link parent-scout by email match
        if (user.user_type === "adult") autoLinkAdult(invitation.adventure_id, user.id);
        else if (user.user_type === "scout") autoLinkScout(invitation.adventure_id, user.id);
      }
    }
    updateInvitationStatus(invitation.id, "accepted");
  } catch (e) {
    console.error("processInvitation error:", e);
  }
}

// Send invitation email
app.post("/api/adventures/:adventureId/invitations", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { email } = req.body;
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: "Valid email required" });
    const adv = getAdventure(adventureId);
    if (!adv) return res.status(404).json({ error: "Adventure not found" });
    const troop = getTroop(adv.troop_id);
    const token = crypto.randomUUID();
    createInvitation({ troop_id: adv.troop_id, adventure_id: adventureId, email: email.trim(), invited_by: req.user.id, token });
    const inviteUrl = `${process.env.APP_URL || "https://traillog.gracezero.ai"}/api/invitations/${token}`;
    sendInvitationEmail(email.trim(), req.user.name, troop.name, adv.name, inviteUrl)
      .catch(e => console.error("Invitation email failed:", e));
    res.status(201).json({ ok: true, token });
  } catch (e) { safeError(res, e); }
});

// List invitations for an adventure
app.get("/api/adventures/:adventureId/invitations", requireAuth, requireAdventureAdmin, (req, res) => {
  try { res.json(getInvitations(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// Accept invitation (browser visits this link from email)
app.get("/api/invitations/:token", (req, res) => {
  try {
    const invitation = getInvitationByToken(req.params.token);
    if (!invitation) return res.redirect("/?error=invalid-invite");
    if (invitation.status !== "pending") return res.redirect("/?error=invite-used");
    // If user is logged in, process immediately
    if (req.isAuthenticated()) {
      processInvitation(req.user, invitation);
      return res.redirect("/");
    }
    // Store token in session, redirect to login page (supports Google + email/password)
    req.session.pendingInviteToken = req.params.token;
    res.redirect("/?invite=pending");
  } catch (e) { res.redirect("/?error=invite-error"); }
});

// ═══════════════════════════════════════════
// ADVENTURE MEMBER MANAGEMENT ROUTES
// ═══════════════════════════════════════════

// Update member role (promote/demote)
app.put("/api/adventures/:adventureId/members/:userId/role", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) return res.status(400).json({ error: "role must be 'admin' or 'member'" });
    updateAdventureMemberRole(parseId(req.params.adventureId), parseId(req.params.userId), role);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update member user_type (admin can change adult <-> scout)
app.put("/api/adventures/:adventureId/members/:userId/user-type", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { user_type } = req.body;
    if (!["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });
    updateUserProfile(parseId(req.params.userId), { user_type });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update member participation type
app.put("/api/adventures/:adventureId/members/:userId/participation", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { participation } = req.body;
    if (!["trekking", "support"].includes(participation)) return res.status(400).json({ error: "participation must be 'trekking' or 'support'" });
    updateAdventureMemberParticipation(parseId(req.params.adventureId), parseId(req.params.userId), participation);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Link adult to scouts (admin override — up to 3 scouts, registered or manual)
// Convention: positive = user_id (registered scout), negative = -adventure_members.id (manual scout)
app.put("/api/adventures/:adventureId/members/:userId/link", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const userId = parseId(req.params.userId);
    const { linked_scouts } = req.body;
    // Validate: member being linked must be an adult
    const memberUser = findUserById(userId);
    if (memberUser?.user_type !== "adult") return res.status(400).json({ error: "Only adults can be linked to scouts" });
    // Accept array of scout IDs (max 3), or empty array to unlink all
    const scouts = Array.isArray(linked_scouts) ? linked_scouts.slice(0, 3) : [];
    // Validate each target
    for (const scoutId of scouts) {
      if (typeof scoutId !== "number" || scoutId === 0) return res.status(400).json({ error: "Invalid scout ID" });
      if (scoutId > 0) {
        // Registered scout: validate user_id is a scout in this adventure
        const targetMember = getAdventureMember(adventureId, scoutId);
        if (!targetMember) return res.status(400).json({ error: "Target scout not in this adventure" });
        const targetUser = findUserById(scoutId);
        if (targetUser?.user_type !== "scout") return res.status(400).json({ error: "Can only link to scouts" });
      } else {
        // Manual scout: validate adventure_members row exists and is manual
        const memberId = Math.abs(scoutId);
        const row = db.prepare("SELECT * FROM adventure_members WHERE id = ? AND adventure_id = ? AND is_manual = 1").get(memberId, adventureId);
        if (!row) return res.status(400).json({ error: "Manual scout not found in this adventure" });
      }
    }
    linkMember(adventureId, userId, scouts);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Add manual member (scout without account)
app.post("/api/adventures/:adventureId/manual-members", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const member = addManualMember(parseId(req.params.adventureId), name.trim());
    res.status(201).json(member);
  } catch (e) { safeError(res, e); }
});

// Remove manual member
app.delete("/api/adventures/:adventureId/manual-members/:memberId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeManualMember(parseId(req.params.adventureId), parseId(req.params.memberId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// PARENT-SCOUT LINK REQUESTS
// ═══════════════════════════════════════════

// Adult requests to link to a scout (admin approval required)
app.post("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { scout_id } = req.body;
    // Must be an adult
    const requester = findUserById(req.user.id);
    if (requester?.user_type !== "adult") return res.status(400).json({ error: "Only adults can request to link to a scout" });
    if (!scout_id) return res.status(400).json({ error: "scout_id required" });
    // Target must be a scout in this adventure
    const targetMember = getAdventureMember(adventureId, scout_id);
    if (!targetMember) return res.status(400).json({ error: "Scout not found in this adventure" });
    const targetUser = findUserById(scout_id);
    if (targetUser?.user_type !== "scout") return res.status(400).json({ error: "Target must be a scout" });

    const result = createLinkRequest(adventureId, req.user.id, scout_id);
    if (!result) return res.status(409).json({ error: "Link request already exists" });

    // Notify adventure admins
    const members = getAdventureMembers(adventureId);
    const admins = members.filter(m => m.role === "admin" && !m.is_manual);
    const adv = getAdventure(adventureId);
    admins.forEach(admin => {
      if (admin.email) {
        sendLinkRequestEmail(admin.email, admin.name, requester.name, targetUser.name, adv.name)
          .catch(e => console.error("Link request email failed:", e));
      }
    });
    res.status(201).json({ ok: true, id: result.id });
  } catch (e) { safeError(res, e); }
});

// Get link requests (admin: all, member: own only)
app.get("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const member = getAdventureMember(adventureId, req.user.id);
    if (member?.role === "admin") {
      res.json(getLinkRequests(adventureId));
    } else {
      res.json(getMyLinkRequests(adventureId, req.user.id));
    }
  } catch (e) { safeError(res, e); }
});

// Approve link request
app.put("/api/adventures/:adventureId/link-requests/:requestId/approve", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = approveLinkRequest(parseId(req.params.requestId), req.user.id);
    if (!result) return res.status(404).json({ error: "Pending request not found" });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Deny link request
app.put("/api/adventures/:adventureId/link-requests/:requestId/deny", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    denyLinkRequest(parseId(req.params.requestId), req.user.id);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ACHIEVEMENTS & MILESTONES ROUTES
// ═══════════════════════════════════════════

// Get badges + milestones for an adventure
app.get("/api/adventures/:adventureId/achievements", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const badges = getBadges(adventureId);
    const milestones = getCrewMilestones(adventureId);
    res.json({ badges, milestones });
  } catch (e) { safeError(res, e); }
});

// Check and award badges/milestones after readiness changes
app.post("/api/adventures/:adventureId/check-milestones", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const members = getAdventureMembers(adventureId);
    const adv = getAdventure(adventureId);
    const skills = getAdventureSkills(adventureId);
    const newBadges = [];
    const newMilestones = [];

    // Categorize skills
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills = skills.filter(s => s.category === "medical");
    const adminSkills = skills.filter(s => s.category === "admin");

    // Gear: use new gear_catalog (v5) with member_gear table
    const gearCatalogItems = getGearCatalog();
    const essentialGearCount = gearCatalogItems.filter(g => g.priority === "essential").length || gearCatalogItems.length;
    const allMemberGear = getAdventureMemberGearAll(adventureId);
    // Group member gear by user_id
    const memberGearByUser = {};
    for (const mg of allMemberGear) {
      if (!memberGearByUser[mg.user_id]) memberGearByUser[mg.user_id] = [];
      memberGearByUser[mg.user_id].push(mg);
    }

    // Check each trekking member for individual badges
    const trekkingMembers = members.filter(m => m.participation === "trekking" && !m.is_manual);
    for (const m of trekkingMembers) {
      const memberSkills = m.skills || [];
      const memberMedical = m.medical || [];
      const memberAdmin = m.admin_tasks || [];
      const memberGearItems = memberGearByUser[m.user_id] || [];
      // Gear readiness: count items with status "owned" or "packed"
      const gearDone = memberGearItems.filter(g => g.status === "owned" || g.status === "packed").length;

      const checks = [
        { badge: "training_complete", total: trainingSkills.length, done: trainingSkills.filter(s => memberSkills.includes(s.id)).length },
        { badge: "gear_ready", total: essentialGearCount, done: gearDone },
        { badge: "trail_medic", total: medicalSkills.length, done: medicalSkills.filter(s => memberMedical.includes(s.id)).length },
        { badge: "admin_pro", total: adminSkills.length, done: adminSkills.filter(s => memberAdmin.includes(s.id)).length },
      ];

      for (const { badge, total, done } of checks) {
        if (total > 0 && done >= total) {
          const earned = earnBadge(adventureId, m.user_id, badge);
          if (earned) {
            newBadges.push({ user_id: m.user_id, name: m.name, badge });
            if (m.email) {
              sendBadgeEarnedEmail(m.email, m.name, badge, adv.name)
                .catch(e => console.error("Badge email failed:", e));
            }
          }
        }
      }

      // Fully prepared = all 4 categories complete
      const allDone = checks.every(c => c.total === 0 || c.done >= c.total);
      if (allDone && checks.some(c => c.total > 0)) {
        const earned = earnBadge(adventureId, m.user_id, "fully_prepared");
        if (earned) {
          newBadges.push({ user_id: m.user_id, name: m.name, badge: "fully_prepared" });
          if (m.email) {
            sendBadgeEarnedEmail(m.email, m.name, "fully_prepared", adv.name)
              .catch(e => console.error("Badge email failed:", e));
          }
        }
      }
    }

    // Check crew milestones (overall readiness %)
    if (trekkingMembers.length > 0) {
      const totalSkillCount = trainingSkills.length + medicalSkills.length + adminSkills.length + essentialGearCount;
      if (totalSkillCount > 0) {
        let totalDone = 0;
        let totalPossible = 0;
        for (const m of trekkingMembers) {
          const ms = m.skills || [];
          const mm = m.medical || [];
          const ma = m.admin_tasks || [];
          const mgItems = memberGearByUser[m.user_id] || [];
          const mgDone = mgItems.filter(g => g.status === "owned" || g.status === "packed").length;
          totalDone += trainingSkills.filter(s => ms.includes(s.id)).length;
          totalDone += mgDone;
          totalDone += medicalSkills.filter(s => mm.includes(s.id)).length;
          totalDone += adminSkills.filter(s => ma.includes(s.id)).length;
          totalPossible += totalSkillCount;
        }
        const pct = Math.round((totalDone / totalPossible) * 100);
        const thresholds = [
          { pct: 25, type: "crew_25" }, { pct: 50, type: "crew_50" },
          { pct: 75, type: "crew_75" }, { pct: 100, type: "crew_100" },
        ];
        for (const t of thresholds) {
          if (pct >= t.pct) {
            const added = addCrewMilestone(adventureId, t.type);
            if (added) newMilestones.push(t.type);
          }
        }

        // Category-specific crew milestones
        const catChecks = [
          { type: "all_training", items: trainingSkills, field: "skills" },
          { type: "all_medical", items: medicalSkills, field: "medical" },
          { type: "all_admin", items: adminSkills, field: "admin_tasks" },
        ];
        for (const cc of catChecks) {
          if (cc.items.length > 0) {
            const allComplete = trekkingMembers.every(m => {
              const arr = m[cc.field] || [];
              return cc.items.every(i => arr.includes(i.id));
            });
            if (allComplete) {
              const added = addCrewMilestone(adventureId, cc.type);
              if (added) newMilestones.push(cc.type);
            }
          }
        }
        // Gear crew milestone: all trekking members have all essential gear owned/packed
        if (essentialGearCount > 0) {
          const allGearComplete = trekkingMembers.every(m => {
            const mgItems = memberGearByUser[m.user_id] || [];
            return mgItems.filter(g => g.status === "owned" || g.status === "packed").length >= essentialGearCount;
          });
          if (allGearComplete) {
            const added = addCrewMilestone(adventureId, "all_gear");
            if (added) newMilestones.push("all_gear");
          }
        }
      }
    }

    res.json({ newBadges, newMilestones });
  } catch (e) { safeError(res, e); }
});

// Health check (no auth — for uptime monitoring)
const startedAt = new Date().toISOString();
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", started: startedAt, uptime: Math.floor(process.uptime()) });
});

// ── Legal Pages (standalone HTML, no auth required, crawlable) ──

const legalStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', Helvetica, sans-serif; background: #1A2412; color: #D4E4B8; line-height: 1.7; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px 60px; }
    h1 { font-family: 'Zilla Slab', Georgia, serif; font-size: 28px; font-weight: 900; color: #FDFAF5; margin-bottom: 8px; }
    .updated { font-size: 12px; color: #7A9A5A; margin-bottom: 32px; }
    h2 { font-size: 18px; font-weight: 700; color: #B8CC9A; margin: 28px 0 10px; }
    p, li { font-size: 14px; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    a { color: #B8CC9A; }
    .back { display: inline-block; margin-bottom: 24px; color: #7A9A5A; font-size: 13px; text-decoration: none; }
    .back:hover { color: #B8CC9A; }
  </style>
`;

app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — TrailLog</title>${legalStyle}</head><body><div class="wrap">
<a href="/" class="back">&larr; Back to TrailLog</a>
<h1>Privacy Policy</h1>
<p class="updated">Last updated: March 13, 2026</p>

<p>TrailLog ("we," "our," or "the app") is a free planning tool for Scouting America high adventure crews, operated by GraceZero.ai. This policy explains what data we collect, why, and how we protect it.</p>

<h2>1. Information We Collect</h2>
<p><strong>Account information:</strong> Name, email address, and age category (13+ or 18+). If you sign in with Google, we also receive your Google profile photo.</p>
<p><strong>Scout-specific:</strong> If you register as a scout, we collect a parent/guardian email address (required).</p>
<p><strong>Usage data:</strong> Training availability dates, gear selections, RSVP responses, and crew coordination data you enter into the app.</p>
<p><strong>Technical data:</strong> We use session cookies to keep you logged in. We do not use tracking cookies, analytics scripts, or third-party advertising.</p>

<h2>2. How We Use Your Information</h2>
<ul>
  <li>To provide the TrailLog service (crew coordination, gear planning, training scheduling)</li>
  <li>To send you email notifications about your crew's activities (training events, itinerary changes, badge awards)</li>
  <li>To notify parent/guardian emails when a scout joins a troop</li>
  <li>To enforce age-based access controls (BSA high adventure requires age 13+)</li>
</ul>

<h2>3. Information We Do NOT Collect</h2>
<ul>
  <li>Date of birth or exact age (only age category: 13+ or 18+)</li>
  <li>Payment or financial information</li>
  <li>Precise geolocation</li>
  <li>Health or medical records</li>
  <li>Social Security numbers or government IDs</li>
</ul>

<h2>4. Data Sharing</h2>
<p>We do <strong>not</strong> sell, rent, or share your personal information with third parties. Your data is only visible to:</p>
<ul>
  <li>Other members of troops and adventures you join</li>
  <li>Troop administrators (who manage membership and training)</li>
  <li>The global platform administrator</li>
</ul>

<h2>5. Data Storage & Security</h2>
<p>Your data is stored in an encrypted database on a secured virtual private server. We use:</p>
<ul>
  <li>HTTPS/TLS encryption for all connections</li>
  <li>Bcrypt password hashing (for email/password accounts)</li>
  <li>HTTP-only, secure session cookies</li>
  <li>Rate limiting to prevent abuse</li>
  <li>Daily automated backups</li>
</ul>

<h2>6. Children's Privacy (COPPA)</h2>
<p>TrailLog is designed for BSA high adventure participants aged 13 and older. We do not knowingly collect information from children under 13. All users must confirm they are at least 13 years old before creating an account. See our <a href="/privacy#coppa">COPPA compliance documentation</a> for details.</p>

<h2>7. Your Rights</h2>
<p>You may request to:</p>
<ul>
  <li>View the personal data we hold about you</li>
  <li>Correct inaccurate information</li>
  <li>Delete your account and associated data</li>
</ul>
<p>Contact us at the email below to make a request.</p>

<h2>8. Changes to This Policy</h2>
<p>We may update this policy as the app evolves. Material changes will be noted with an updated date at the top of this page.</p>

<h2>9. Contact</h2>
<p>For privacy questions or data requests, email: <strong>privacy@gracezero.ai</strong></p>
</div></body></html>`);
});

app.get("/terms", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terms of Service — TrailLog</title>${legalStyle}</head><body><div class="wrap">
<a href="/" class="back">&larr; Back to TrailLog</a>
<h1>Terms of Service</h1>
<p class="updated">Last updated: March 13, 2026</p>

<p>By using TrailLog ("the app"), you agree to these terms. If you do not agree, do not use the app.</p>

<h2>1. What TrailLog Is</h2>
<p>TrailLog is a free planning and coordination tool for Scouting America high adventure crews. It helps crews organize training schedules, gear lists, and itinerary planning. TrailLog is <strong>not affiliated with or endorsed by</strong> Scouting America (BSA).</p>

<h2>2. Eligibility</h2>
<p>You must be at least 13 years old to create an account. Users under 18 must have a parent or guardian's email on file. By creating an account, you confirm that you meet these requirements.</p>

<h2>3. Your Account</h2>
<ul>
  <li>You are responsible for keeping your login credentials secure</li>
  <li>You must provide accurate information (name, email, age category)</li>
  <li>You may not create accounts for others without their knowledge</li>
  <li>One person, one account — do not create duplicate accounts</li>
</ul>

<h2>4. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
  <li>Use the app for any purpose unrelated to crew coordination and high adventure planning</li>
  <li>Submit false information (especially age confirmation)</li>
  <li>Attempt to access other users' accounts or data</li>
  <li>Interfere with or disrupt the service</li>
  <li>Use automated tools to scrape or interact with the app</li>
</ul>

<h2>5. Content You Provide</h2>
<p>You retain ownership of any content you submit (training notes, gear selections, etc.). By using TrailLog, you grant us permission to store and display this content to other members of your troops and adventures as part of the service.</p>

<h2>6. Service Availability</h2>
<p>TrailLog is provided "as is" without warranty. We strive for reliable uptime but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time.</p>

<h2>7. Limitation of Liability</h2>
<p>TrailLog is a planning tool, not a substitute for official BSA guidance. We are not responsible for:</p>
<ul>
  <li>Decisions made based on information in the app</li>
  <li>Physical preparation or safety during high adventure treks</li>
  <li>Gear suitability, fitness, or medical readiness</li>
  <li>Any loss of data, though we take reasonable precautions to prevent it</li>
</ul>

<h2>8. Account Termination</h2>
<p>We may suspend or delete accounts that violate these terms. You may delete your own account by contacting us.</p>

<h2>9. Changes to These Terms</h2>
<p>We may update these terms as the app evolves. Continued use after changes constitutes acceptance.</p>

<h2>10. Contact</h2>
<p>Questions about these terms? Email: <strong>support@gracezero.ai</strong></p>
</div></body></html>`);
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TrailLog running on port ${PORT}`);
});
