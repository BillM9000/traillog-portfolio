import express from "express";
import session from "express-session";
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
  getAdventureSkills, addAdventureSkill, removeAdventureSkill,
  getItineraries, getItinerary, getGearItems, getSetting, setSetting,
} from "./db.js";
import { sendJoinRequestEmail, sendVerificationEmail } from "./email.js";

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
  (req, res) => res.redirect("/")
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
    const { user_type, parent_email } = req.body;
    if (!["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });
    if (user_type === "scout" && !parent_email?.trim()) return res.status(400).json({ error: "Scouts must provide parent/guardian email" });
    updateUserProfile(req.user.id, { user_type, parent_email });
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
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/troops/:troopId/members/:userId/deny", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    denyTroopMember(parseInt(req.params.troopId), parseInt(req.params.userId));
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
    const { name, description, trek_date, itinerary_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Adventure name required" });
    const adventure = createAdventure({
      troop_id: parseInt(req.params.troopId),
      name: name.trim(), description, trek_date, itinerary_id,
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
    const { name, description, trek_date, status } = req.body;
    updateAdventure(parseInt(req.params.adventureId), { name, description, trek_date, status });
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
    addAdventureMember(parseInt(req.params.adventureId), user_id, role || "member");
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

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TrekSync running on port ${PORT}`);
});
