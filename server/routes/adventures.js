import { Router } from "express";
import crypto from "crypto";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import {
  requireAuth, requireAdventureMember, requireAdventureAdmin,
  requireAdventureSelfOrAdmin, requireTroopMember, requireTroopAdmin,
  parseId, safeError, processInvitation,
} from "../middleware.js";
import db, {
  getAdventures, getAdventure, createAdventure, updateAdventure, deleteAdventure,
  getAdventureMembers, getAdventureMember, addAdventureMember, removeAdventureMember,
  updateAdventureMemberDates, updateAdventureMemberSkills,
  updateAdventureMemberGear, updateAdventureMemberMedical, updateAdventureMemberAdmin,
  updateAdventureMemberRole, updateAdventureMemberParticipation, linkMember,
  addManualMember, removeManualMember,
  getAdventureSkills, addAdventureSkill, removeAdventureSkill, seedAdventureSkills,
  createInvitation, getInvitationByToken, getInvitations,
  earnBadge, getBadges, getCrewMilestones, addCrewMilestone,
  autoLinkAdult, autoLinkScout,
  createLinkRequest, getLinkRequests, getMyLinkRequests, approveLinkRequest, denyLinkRequest,
  getItineraries, getItinerary,
  getGearCatalog, getAdventureMemberGearAll,
  getTroop, getTroopMember, findUserById, updateUserProfile,
  getAdventureMilestoneConfig, setAdventureMilestoneConfig, syncAttendanceSkills,
  getAdventureDocuments, addAdventureDocument, getAdventureDocument, deleteAdventureDocument,
} from "../db.js";
import {
  sendInvitationEmail, sendDateChangedEmail, sendItineraryChangedEmail,
  sendBadgeEarnedEmail, sendLinkRequestEmail,
} from "../email.js";
import { logger } from "../logger.js";

const router = Router();

// ── Document storage setup ──
const DOCS_DIR = join(process.env.DATA_DIR || "./data", "adventure-documents");
if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

// ═══════════════════════════════════════════
// ITINERARY ROUTES
// ═══════════════════════════════════════════

router.get("/api/itineraries", requireAuth, (req, res) => {
  try { res.json(getItineraries()); }
  catch (e) { safeError(res, e); }
});

router.get("/api/itineraries/:id", requireAuth, (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !/^[\d-]+$/.test(id)) return res.status(400).json({ error: "Invalid itinerary ID" });
    const itin = getItinerary(id);
    if (!itin) return res.status(404).json({ error: "Itinerary not found" });
    res.json(itin);
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ADVENTURE ROUTES
// ═══════════════════════════════════════════

// List adventures for a troop
router.get("/api/troops/:troopId/adventures", requireAuth, requireTroopMember(), (req, res) => {
  try { res.json(getAdventures(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

// Create adventure
router.post("/api/troops/:troopId/adventures", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, itinerary_id, adventure_type } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Adventure name required" });
    // Validate date sequence: depart ≤ arrive ≤ return ≤ home
    const dateSeq = [depart_date, arrive_date, return_date, home_date];
    const dateLabels = ["Depart Home", "Arrive", "Depart", "Return Home"];
    for (let i = 0; i < dateSeq.length - 1; i++) {
      if (dateSeq[i] && dateSeq[i + 1] && dateSeq[i] > dateSeq[i + 1]) {
        return res.status(400).json({ error: `${dateLabels[i + 1]} date cannot be before ${dateLabels[i]} date` });
      }
    }
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
router.get("/api/adventures/:adventureId", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adv = getAdventure(parseId(req.params.adventureId));
    if (!adv) return res.status(404).json({ error: "Adventure not found" });
    res.json(adv);
  } catch (e) { safeError(res, e); }
});

// Update adventure
router.put("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { name, description, trek_date, depart_date, arrive_date, return_date, home_date, status, itinerary_id, adventure_type } = req.body;
    const validTypes = ["philmont", "northern_tier", "sea_base", "summit"];
    const safeType = adventure_type && validTypes.includes(adventure_type) ? adventure_type : undefined;
    // Validate date sequence: depart ≤ arrive ≤ return ≤ home
    const oldAdv = getAdventure(adventureId);
    const troop = getTroop(oldAdv.troop_id);
    const effDates = [
      depart_date !== undefined ? depart_date : oldAdv.depart_date,
      arrive_date !== undefined ? arrive_date : oldAdv.arrive_date,
      return_date !== undefined ? return_date : oldAdv.return_date,
      home_date !== undefined ? home_date : oldAdv.home_date,
    ];
    const effLabels = ["Depart Home", "Arrive", "Depart", "Return Home"];
    for (let i = 0; i < effDates.length - 1; i++) {
      if (effDates[i] && effDates[i + 1] && effDates[i] > effDates[i + 1]) {
        return res.status(400).json({ error: `${effLabels[i + 1]} date cannot be before ${effLabels[i]} date` });
      }
    }
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
          sendDateChangedEmail(m.email, m.name, oldAdv.name, changeSummary, { troopName: troop?.name, troopId: oldAdv.troop_id, adventureId })
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
          sendItineraryChangedEmail(m.email, m.name, oldAdv.name, oldName, newName, { troopName: troop?.name, troopId: oldAdv.troop_id, adventureId })
            .catch(e => console.error("Itinerary change email failed:", e));
        }
      });

      // Seed default skills if adventure has none (e.g. switched from no itinerary)
      const adv = getAdventure(adventureId);
      if ((adv.adventure_type || "philmont") === "philmont") {
        seedAdventureSkills(adventureId, adv.troop_id);
      }
    }

    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Get attendance milestones config
router.get("/api/adventures/:adventureId/milestones-config", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const milestones = getAdventureMilestoneConfig(parseId(req.params.adventureId));
    res.json(milestones);
  } catch (e) { safeError(res, e); }
});

// Update attendance milestones config (admin only)
router.put("/api/adventures/:adventureId/milestones-config", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { milestones } = req.body;
    if (!Array.isArray(milestones) || milestones.length === 0 || milestones.length > 10) {
      return res.status(400).json({ error: "Provide 1-10 milestones" });
    }
    for (const ms of milestones) {
      if (!ms.count || typeof ms.count !== "number" || ms.count < 1 || ms.count > 100) {
        return res.status(400).json({ error: "Each milestone count must be 1-100" });
      }
    }
    // Deduplicate by count
    const unique = [...new Map(milestones.map(m => [m.count, { count: m.count, icon: m.icon || "⭐" }])).values()];
    unique.sort((a, b) => a.count - b.count);
    setAdventureMilestoneConfig(adventureId, unique);
    // Re-sync skills with new milestones
    syncAttendanceSkills(adventureId);
    res.json({ ok: true, milestones: unique });
  } catch (e) { safeError(res, e); }
});

// Delete adventure
router.delete("/api/adventures/:adventureId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    deleteAdventure(parseId(req.params.adventureId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// DOCUMENT ROUTES
// ═══════════════════════════════════════════

// List documents for an adventure
router.get("/api/adventures/:adventureId/documents", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getAdventureDocuments(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// Upload document (admin only, base64 in JSON body)
router.post("/api/adventures/:adventureId/documents", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const { file, originalName, description } = req.body;
    if (!file || !originalName) return res.status(400).json({ error: "file and originalName required" });

    // Parse base64 data URL
    const match = file.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Invalid file format (expected base64 data URL)" });
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    if (!ALLOWED_DOC_TYPES.has(mimeType)) return res.status(400).json({ error: "File type not allowed" });
    if (buffer.length > MAX_DOC_SIZE) return res.status(400).json({ error: "File too large (max 5MB)" });

    // Create adventure-specific directory
    const advDir = join(DOCS_DIR, String(adventureId));
    if (!existsSync(advDir)) mkdirSync(advDir, { recursive: true });

    // Generate unique filename
    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
    const storedName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const filePath = join(advDir, storedName);
    writeFileSync(filePath, buffer);

    const result = addAdventureDocument(adventureId, storedName, originalName, filePath, mimeType, buffer.length, description || "", req.user.id);
    logger.info({ action: "document_upload", adventureId, docId: result.lastInsertRowid, originalName, size: buffer.length, userId: req.user.id }, "Document uploaded");
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) { safeError(res, e); }
});

// Download/view document
router.get("/api/adventures/:adventureId/documents/:docId/download", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const doc = getAdventureDocument(parseId(req.params.docId));
    if (!doc || doc.adventure_id !== parseId(req.params.adventureId)) return res.status(404).json({ error: "Document not found" });
    if (!existsSync(doc.file_path)) return res.status(404).json({ error: "File not found on disk" });
    res.setHeader("Content-Disposition", `inline; filename="${doc.original_name}"`);
    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.sendFile(doc.file_path);
  } catch (e) { safeError(res, e); }
});

// Delete document (admin only)
router.delete("/api/adventures/:adventureId/documents/:docId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const doc = getAdventureDocument(parseId(req.params.docId));
    if (!doc || doc.adventure_id !== parseId(req.params.adventureId)) return res.status(404).json({ error: "Document not found" });
    if (existsSync(doc.file_path)) { try { unlinkSync(doc.file_path); } catch {} }
    deleteAdventureDocument(doc.id);
    logger.info({ action: "document_delete", adventureId: doc.adventure_id, docId: doc.id, originalName: doc.original_name, userId: req.user.id }, "Document deleted");
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ADVENTURE MEMBER ROUTES
// ═══════════════════════════════════════════

router.get("/api/adventures/:adventureId/members", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getAdventureMembers(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

router.post("/api/adventures/:adventureId/members", requireAuth, requireAdventureAdmin, (req, res) => {
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

router.delete("/api/adventures/:adventureId/members/:userId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeAdventureMember(parseId(req.params.adventureId), parseId(req.params.userId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update adventure member data (dates, skills, gear, medical, admin)
router.put("/api/adventures/:adventureId/members/:userId/dates", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    updateAdventureMemberDates(parseId(req.params.adventureId), parseId(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/adventures/:adventureId/members/:userId/skills", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    updateAdventureMemberSkills(parseId(req.params.adventureId), parseId(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/adventures/:adventureId/members/:userId/gear", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { gear } = req.body;
    if (!Array.isArray(gear)) return res.status(400).json({ error: "gear must be array" });
    updateAdventureMemberGear(parseId(req.params.adventureId), parseId(req.params.userId), gear);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/adventures/:adventureId/members/:userId/medical", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { medical } = req.body;
    if (!Array.isArray(medical)) return res.status(400).json({ error: "medical must be array" });
    updateAdventureMemberMedical(parseId(req.params.adventureId), parseId(req.params.userId), medical);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/adventures/:adventureId/members/:userId/admin", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
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

router.get("/api/adventures/:adventureId/skills", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const category = req.query.category || null;
    res.json(getAdventureSkills(parseId(req.params.adventureId), category));
  } catch (e) { safeError(res, e); }
});

router.post("/api/adventures/:adventureId/skills", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name, desc, category, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(addAdventureSkill(parseId(req.params.adventureId), name, desc, category, icon));
  } catch (e) { safeError(res, e); }
});

router.delete("/api/adventures/:adventureId/skills/:skillId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = removeAdventureSkill(parseId(req.params.adventureId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// INVITATION ROUTES
// ═══════════════════════════════════════════

// Send invitation email
router.post("/api/adventures/:adventureId/invitations", requireAuth, requireAdventureAdmin, (req, res) => {
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
    sendInvitationEmail(email.trim(), req.user.name, troop.name, adv.name, inviteUrl, {
      council: troop.council, location: troop.location, adventureType: adv.adventure_type,
      departDate: adv.depart_date, returnDate: adv.return_date,
    })
      .catch(e => console.error("Invitation email failed:", e));
    res.status(201).json({ ok: true, token });
  } catch (e) { safeError(res, e); }
});

// List invitations for an adventure
router.get("/api/adventures/:adventureId/invitations", requireAuth, requireAdventureAdmin, (req, res) => {
  try { res.json(getInvitations(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// Accept invitation (browser visits this link from email)
router.get("/api/invitations/:token", (req, res) => {
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
router.put("/api/adventures/:adventureId/members/:userId/role", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) return res.status(400).json({ error: "role must be 'admin' or 'member'" });
    updateAdventureMemberRole(parseId(req.params.adventureId), parseId(req.params.userId), role);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update member user_type (admin can change adult <-> scout)
router.put("/api/adventures/:adventureId/members/:userId/user-type", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { user_type } = req.body;
    if (!["adult", "scout"].includes(user_type)) return res.status(400).json({ error: "user_type must be 'adult' or 'scout'" });
    updateUserProfile(parseId(req.params.userId), { user_type });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update member participation type
router.put("/api/adventures/:adventureId/members/:userId/participation", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { participation } = req.body;
    if (!["trekking", "support"].includes(participation)) return res.status(400).json({ error: "participation must be 'trekking' or 'support'" });
    updateAdventureMemberParticipation(parseId(req.params.adventureId), parseId(req.params.userId), participation);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Link adult to scouts (admin override — up to 3 scouts, registered or manual)
// Convention: positive = user_id (registered scout), negative = -adventure_members.id (manual scout)
router.put("/api/adventures/:adventureId/members/:userId/link", requireAuth, requireAdventureAdmin, (req, res) => {
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
router.post("/api/adventures/:adventureId/manual-members", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const member = addManualMember(parseId(req.params.adventureId), name.trim());
    res.status(201).json(member);
  } catch (e) { safeError(res, e); }
});

// Remove manual member
router.delete("/api/adventures/:adventureId/manual-members/:memberId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    removeManualMember(parseId(req.params.adventureId), parseId(req.params.memberId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// PARENT-SCOUT LINK REQUESTS
// ═══════════════════════════════════════════

// Adult requests to link to a scout (admin approval required)
router.post("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
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
router.get("/api/adventures/:adventureId/link-requests", requireAuth, requireAdventureMember, (req, res) => {
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
router.put("/api/adventures/:adventureId/link-requests/:requestId/approve", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const result = approveLinkRequest(parseId(req.params.requestId), req.user.id);
    if (!result) return res.status(404).json({ error: "Pending request not found" });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Deny link request
router.put("/api/adventures/:adventureId/link-requests/:requestId/deny", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    denyLinkRequest(parseId(req.params.requestId), req.user.id);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// ACHIEVEMENTS & MILESTONES ROUTES
// ═══════════════════════════════════════════

// Get badges + milestones for an adventure
router.get("/api/adventures/:adventureId/achievements", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const badges = getBadges(adventureId);
    const milestones = getCrewMilestones(adventureId);
    res.json({ badges, milestones });
  } catch (e) { safeError(res, e); }
});

// Check and award badges/milestones after readiness changes
router.post("/api/adventures/:adventureId/check-milestones", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const adventureId = parseId(req.params.adventureId);
    const members = getAdventureMembers(adventureId);
    const adv = getAdventure(adventureId);
    const badgeTroop = adv ? getTroop(adv.troop_id) : null;
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
              sendBadgeEarnedEmail(m.email, m.name, badge, adv.name, { troopName: badgeTroop?.name, troopId: adv.troop_id, adventureId })
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
            sendBadgeEarnedEmail(m.email, m.name, "fully_prepared", adv.name, { troopName: badgeTroop?.name, troopId: adv.troop_id, adventureId })
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

export default router;
