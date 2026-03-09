import express from "express";
import session from "express-session";
import crypto from "crypto";
import passport, { hashPassword, generateVerificationToken } from "./auth.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  createSessionStore, findUserByEmail, findUserById, createUser, updateUserProfile, verifyUserEmail,
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
} from "./db.js";
import {
  sendJoinRequestEmail, sendParentNotificationEmail, sendVerificationEmail,
  sendInvitationEmail, sendMemberApprovedEmail, sendMemberDeniedEmail,
  sendDateChangedEmail, sendBadgeEarnedEmail, sendLinkRequestEmail,
} from "./email.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3614;

app.set("trust proxy", 1);
app.use(express.json());

// ── Sessions ──
app.use(session({
  store: createSessionStore(session),
  secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
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

function requireTroopMember(requiredStatus = "approved") {
  return (req, res, next) => {
    const troopId = parseInt(req.params.troopId);
    const membership = getTroopMember(troopId, req.user.id);
    if (!membership || membership.status !== requiredStatus) {
      return res.status(403).json({ error: "Not an approved member of this troop" });
    }
    req.membership = membership;
    next();
  };
}

function requireTroopAdmin(req, res, next) {
  const troopId = parseInt(req.params.troopId);
  const membership = getTroopMember(troopId, req.user.id);
  if (!membership || membership.role !== "admin" || membership.status !== "approved") {
    return res.status(403).json({ error: "Admin access required" });
  }
  req.membership = membership;
  next();
}

function requireSelfOrAdmin(req, res, next) {
  const troopId = parseInt(req.params.troopId);
  const targetUserId = parseInt(req.params.userId);
  if (req.user.id === targetUserId) return next();
  const membership = getTroopMember(troopId, req.user.id);
  if (membership?.role === "admin" && membership.status === "approved") return next();
  res.status(403).json({ error: "Can only edit your own data" });
}

function requireAdventureMember(req, res, next) {
  const adventureId = parseInt(req.params.adventureId);
  const member = getAdventureMember(adventureId, req.user.id);
  if (!member) return res.status(403).json({ error: "Not a member of this adventure" });
  req.adventureMembership = member;
  next();
}

function requireAdventureAdmin(req, res, next) {
  const adventureId = parseInt(req.params.adventureId);
  const member = getAdventureMember(adventureId, req.user.id);
  if (!member || member.role !== "admin") return res.status(403).json({ error: "Adventure admin access required" });
  req.adventureMembership = member;
  next();
}

function requireAdventureSelfOrAdmin(req, res, next) {
  const adventureId = parseInt(req.params.adventureId);
  const targetUserId = parseInt(req.params.userId);
  if (req.user.id === targetUserId) return next();
  const member = getAdventureMember(adventureId, req.user.id);
  if (member?.role === "admin") return next();
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

app.post("/api/auth/signup", (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: "Name, email, and password (6+ chars) required" });
    }
    const existing = findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const token = generateVerificationToken();
    createUser({
      email, name: name.trim(), password_hash: hashPassword(password),
      email_verified: 0, verification_token: token,
    });
    sendVerificationEmail(email, token).catch(e => console.error("Verification email failed:", e));
    res.status(201).json({ ok: true, message: "Check your email to verify your account" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
    if (!user.email_verified) return res.status(403).json({ error: "Please verify your email first" });
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const { password_hash, verification_token, ...safe } = user;
      res.json(safe);
    });
  })(req, res, next);
});

app.get("/api/auth/verify/:token", (req, res) => {
  const result = verifyUserEmail(req.params.token);
  if (!result) return res.redirect("/?error=invalid-token");
  res.redirect("/?verified=1");
});

app.get("/api/auth/me", (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  const { password_hash, verification_token, ...safe } = req.user;
  const memberships = getUserMemberships(req.user.id);
  const adventureMemberships = getUserAdventureMemberships(req.user.id);
  res.json({ user: safe, memberships, adventureMemberships });
});

app.put("/api/auth/profile", requireAuth, (req, res) => {
  try {
    const { name, user_type, parent_email, parent_email_2 } = req.body;
    if (user_type && !["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });
    if (user_type === "scout" && !parent_email?.trim()) return res.status(400).json({ error: "Scouts must provide parent/guardian email" });
    updateUserProfile(req.user.id, { name: name?.trim(), user_type, parent_email, parent_email_2: parent_email_2?.trim() || null });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/logout", (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// ═══════════════════════════════════════════
// ITINERARY ROUTES
// ═══════════════════════════════════════════

app.get("/api/itineraries", (req, res) => {
  try { res.json(getItineraries()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/itineraries/:id", (req, res) => {
  try {
    const itin = getItinerary(req.params.id);
    if (!itin) return res.status(404).json({ error: "Itinerary not found" });
    res.json(itin);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// TROOP ROUTES
// ═══════════════════════════════════════════

app.get("/api/troops", requireAuth, (req, res) => {
  try { res.json(getTroops()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/troops/:troopId", requireAuth, requireTroopMember(), (req, res) => {
  try {
    const troop = getTroop(parseInt(req.params.troopId));
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    res.json(troop);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/troops", requireAuth, (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Troop name required" });
    const troop = createTroop({ name: name.trim(), description, created_by: req.user.id });
    res.status(201).json(troop);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    updateTroop(parseInt(req.params.troopId), { name, description });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/troops/:troopId/join", requireAuth, (req, res) => {
  try {
    const troopId = parseInt(req.params.troopId);
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
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════
// TROOP MEMBER ROUTES
// ═══════════════════════════════════════════

app.get("/api/troops/:troopId/members", requireAuth, requireTroopMember(), (req, res) => {
  try {
    const status = req.membership.role === "admin" ? null : "approved";
    res.json(getTroopMembers(parseInt(req.params.troopId), status));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId/members/:userId/approve", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    approveTroopMember(parseInt(req.params.troopId), parseInt(req.params.userId));
    const user = findUserById(parseInt(req.params.userId));
    const troop = getTroop(parseInt(req.params.troopId));
    if (user?.email) {
      sendMemberApprovedEmail(user.email, user.name, troop.name)
        .catch(e => console.error("Approval email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId/members/:userId/deny", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    denyTroopMember(parseInt(req.params.troopId), parseInt(req.params.userId));
    const user = findUserById(parseInt(req.params.userId));
    const troop = getTroop(parseInt(req.params.troopId));
    if (user?.email) {
      sendMemberDeniedEmail(user.email, user.name, troop.name)
        .catch(e => console.error("Denial email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/troops/:troopId/members/:userId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    removeTroopMember(parseInt(req.params.troopId), parseInt(req.params.userId));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId/members/:userId/dates", requireAuth, requireTroopMember(), requireSelfOrAdmin, (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateMemberDates(parseInt(req.params.troopId), parseInt(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId/members/:userId/skills", requireAuth, requireTroopMember(), requireSelfOrAdmin, (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateMemberSkills(parseInt(req.params.troopId), parseInt(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// TROOP SKILLS ROUTES (legacy, kept for compat)
// ═══════════════════════════════════════════

app.get("/api/troops/:troopId/skills", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getTroopSkills(parseInt(req.params.troopId))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/troops/:troopId/skills", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, desc } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(addTroopSkill(parseInt(req.params.troopId), name, desc));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/troops/:troopId/skills/:skillId", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const result = removeTroopSkill(parseInt(req.params.troopId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// ADVENTURE ROUTES
// ═══════════════════════════════════════════

// List adventures for a troop
app.get("/api/troops/:troopId/adventures", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getAdventures(parseInt(req.params.troopId))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Create adventure
app.post("/api/troops/:troopId/adventures", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Adventure name required" });
    const adventure = createAdventure({
      troop_id: parseInt(req.params.troopId),
      name: name.trim(), description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id,
      created_by: req.user.id,
    });
    res.status(201).json(adventure);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get adventure detail
app.get("/api/adventures/:adventureId", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adv = getAdventure(parseInt(req.params.adventureId));
    if (!adv) return res.status(404).json({ error: "Adventure not found" });
    res.json(adv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update adventure
app.put("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id } = req.body;
    const oldAdv = getAdventure(adventureId);
    updateAdventure(adventureId, { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id });

    // Send date change emails if any date changed
    const dateFields = ["depart_date", "arrive_date", "return_date", "home_date"];
    const changes = [];
    const labels = { depart_date: "Depart Home", arrive_date: "Arrive at Philmont", return_date: "Depart Philmont", home_date: "Return Home" };
    for (const f of dateFields) {
      if (req.body[f] !== undefined && req.body[f] !== oldAdv[f]) {
        changes.push(`<strong>${labels[f]}:</strong> ${oldAdv[f] || "not set"} → ${req.body[f] || "removed"}`);
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

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete adventure
app.delete("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    deleteAdventure(parseInt(req.params.adventureId));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// ADVENTURE MEMBER ROUTES
// ═══════════════════════════════════════════

app.get("/api/adventures/:adventureId/members", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getAdventureMembers(parseInt(req.params.adventureId))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/adventures/:adventureId/members", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const advId = parseInt(req.params.adventureId);
    addAdventureMember(advId, user_id, role || "member");
    // Auto-link parent-scout by email match
    const addedUser = findUserById(user_id);
    if (addedUser?.user_type === "adult") autoLinkAdult(advId, user_id);
    else if (addedUser?.user_type === "scout") autoLinkScout(advId, user_id);
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/adventures/:adventureId/members/:userId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeAdventureMember(parseInt(req.params.adventureId), parseInt(req.params.userId));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update adventure member data (dates, skills, gear, medical, admin)
app.put("/api/adventures/:adventureId/members/:userId/dates", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateAdventureMemberDates(parseInt(req.params.adventureId), parseInt(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/adventures/:adventureId/members/:userId/skills", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateAdventureMemberSkills(parseInt(req.params.adventureId), parseInt(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/adventures/:adventureId/members/:userId/gear", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { gear } = req.body;
    if (!Array.isArray(gear)) return res.status(400).json({ error: "gear must be array" });
    updateAdventureMemberGear(parseInt(req.params.adventureId), parseInt(req.params.userId), gear);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/adventures/:adventureId/members/:userId/medical", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { medical } = req.body;
    if (!Array.isArray(medical)) return res.status(400).json({ error: "medical must be array" });
    updateAdventureMemberMedical(parseInt(req.params.adventureId), parseInt(req.params.userId), medical);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/adventures/:adventureId/members/:userId/admin", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { admin_tasks } = req.body;
    if (!Array.isArray(admin_tasks)) return res.status(400).json({ error: "admin_tasks must be array" });
    updateAdventureMemberAdmin(parseInt(req.params.adventureId), parseInt(req.params.userId), admin_tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// ADVENTURE SKILLS ROUTES
// ═══════════════════════════════════════════

app.get("/api/adventures/:adventureId/skills", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const category = req.query.category || null;
    res.json(getAdventureSkills(parseInt(req.params.adventureId), category));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/adventures/:adventureId/skills", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name, desc, category, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(addAdventureSkill(parseInt(req.params.adventureId), name, desc, category, icon));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/adventures/:adventureId/skills/:skillId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = removeAdventureSkill(parseInt(req.params.adventureId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// GEAR ROUTES
// ═══════════════════════════════════════════

app.get("/api/gear", (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(",") : null;
    const items = getGearItems(tags);

    const troopId = req.query.troop ? parseInt(req.query.troop) : null;
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// TROOP SETTINGS (admin)
// ═══════════════════════════════════════════

app.put("/api/troops/:troopId/settings", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { amazon_affiliate_tag } = req.body;
    if (amazon_affiliate_tag !== undefined) {
      updateTroopAffiliateTag(parseInt(req.params.troopId), amazon_affiliate_tag);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// PLATFORM SETTINGS (super admin)
// ═══════════════════════════════════════════

app.put("/api/admin/settings", requireAuth, (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || req.user.email !== adminEmail) return res.status(403).json({ error: "Platform admin only" });
  try {
    Object.entries(req.body).forEach(([k, v]) => setSetting(k, v));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const adventureId = parseInt(req.params.adventureId);
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email required" });
    const adv = getAdventure(adventureId);
    if (!adv) return res.status(404).json({ error: "Adventure not found" });
    const troop = getTroop(adv.troop_id);
    const token = crypto.randomUUID();
    createInvitation({ troop_id: adv.troop_id, adventure_id: adventureId, email: email.trim(), invited_by: req.user.id, token });
    const inviteUrl = `${process.env.APP_URL || "https://traillog.gracezero.ai"}/invite/${token}`;
    sendInvitationEmail(email.trim(), req.user.name, troop.name, adv.name, inviteUrl)
      .catch(e => console.error("Invitation email failed:", e));
    res.status(201).json({ ok: true, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List invitations for an adventure
app.get("/api/adventures/:adventureId/invitations", requireAuth, requireAdventureAdmin, (req, res) => {
  try { res.json(getInvitations(parseInt(req.params.adventureId))); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
    // Store token in session, redirect to OAuth
    req.session.pendingInviteToken = req.params.token;
    res.redirect("/auth/google");
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
    updateAdventureMemberRole(parseInt(req.params.adventureId), parseInt(req.params.userId), role);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update member user_type (admin can change adult <-> scout)
app.put("/api/adventures/:adventureId/members/:userId/user-type", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { user_type } = req.body;
    if (!["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });
    updateUserProfile(parseInt(req.params.userId), { user_type });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update member participation type
app.put("/api/adventures/:adventureId/members/:userId/participation", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { participation } = req.body;
    if (!["trekking", "support"].includes(participation)) return res.status(400).json({ error: "participation must be 'trekking' or 'support'" });
    updateAdventureMemberParticipation(parseInt(req.params.adventureId), parseInt(req.params.userId), participation);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Link adult to scout (admin override — any adult, any scout)
app.put("/api/adventures/:adventureId/members/:userId/link", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
    const userId = parseInt(req.params.userId);
    const { linked_to } = req.body;
    // Validate: member being linked must be an adult
    const memberUser = findUserById(userId);
    if (memberUser?.user_type !== "adult") return res.status(400).json({ error: "Only adults can be linked to scouts" });
    // Validate: target must be a scout in this adventure (or null to unlink)
    if (linked_to) {
      const targetMember = getAdventureMember(adventureId, linked_to);
      if (!targetMember) return res.status(400).json({ error: "Target scout not in this adventure" });
      const targetUser = findUserById(linked_to);
      if (targetUser?.user_type !== "scout") return res.status(400).json({ error: "Can only link to scouts" });
    }
    linkMember(adventureId, userId, linked_to || null);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add manual member (scout without account)
app.post("/api/adventures/:adventureId/manual-members", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const member = addManualMember(parseInt(req.params.adventureId), name.trim());
    res.status(201).json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove manual member
app.delete("/api/adventures/:adventureId/manual-members/:memberId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeManualMember(parseInt(req.params.adventureId), parseInt(req.params.memberId));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// PARENT-SCOUT LINK REQUESTS
// ═══════════════════════════════════════════

// Adult requests to link to a scout (admin approval required)
app.post("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get link requests (admin: all, member: own only)
app.get("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
    const member = getAdventureMember(adventureId, req.user.id);
    if (member?.role === "admin") {
      res.json(getLinkRequests(adventureId));
    } else {
      res.json(getMyLinkRequests(adventureId, req.user.id));
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve link request
app.put("/api/adventures/:adventureId/link-requests/:requestId/approve", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = approveLinkRequest(parseInt(req.params.requestId), req.user.id);
    if (!result) return res.status(404).json({ error: "Pending request not found" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Deny link request
app.put("/api/adventures/:adventureId/link-requests/:requestId/deny", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    denyLinkRequest(parseInt(req.params.requestId), req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════
// ACHIEVEMENTS & MILESTONES ROUTES
// ═══════════════════════════════════════════

// Get badges + milestones for an adventure
app.get("/api/adventures/:adventureId/achievements", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
    const badges = getBadges(adventureId);
    const milestones = getCrewMilestones(adventureId);
    res.json({ badges, milestones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Check and award badges/milestones after readiness changes
app.post("/api/adventures/:adventureId/check-milestones", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseInt(req.params.adventureId);
    const members = getAdventureMembers(adventureId);
    const adv = getAdventure(adventureId);
    const skills = getAdventureSkills(adventureId);
    const newBadges = [];
    const newMilestones = [];

    // Categorize skills
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills = skills.filter(s => s.category === "medical");
    const adminSkills = skills.filter(s => s.category === "admin");
    const gearItems = getGearItems();

    // Check each trekking member for individual badges
    const trekkingMembers = members.filter(m => m.participation === "trekking" && !m.is_manual);
    for (const m of trekkingMembers) {
      const memberSkills = m.skills || [];
      const memberGear = m.gear || [];
      const memberMedical = m.medical || [];
      const memberAdmin = m.admin_tasks || [];

      const checks = [
        { badge: "training_complete", total: trainingSkills.length, done: trainingSkills.filter(s => memberSkills.includes(s.id)).length },
        { badge: "gear_ready", total: gearItems.length, done: gearItems.filter(g => memberGear.includes(g.id)).length },
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
      const totalSkillCount = trainingSkills.length + medicalSkills.length + adminSkills.length + gearItems.length;
      if (totalSkillCount > 0) {
        let totalDone = 0;
        let totalPossible = 0;
        for (const m of trekkingMembers) {
          const ms = m.skills || [];
          const mg = m.gear || [];
          const mm = m.medical || [];
          const ma = m.admin_tasks || [];
          totalDone += trainingSkills.filter(s => ms.includes(s.id)).length;
          totalDone += gearItems.filter(g => mg.includes(g.id)).length;
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
          { type: "all_gear", items: gearItems, field: "gear" },
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
      }
    }

    res.json({ newBadges, newMilestones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TrailLog running on port ${PORT}`);
});
