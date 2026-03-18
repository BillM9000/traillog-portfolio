import { Router } from "express";
import { requireAuth, requireTroopMember, requireTroopAdmin, requireSelfOrAdmin, isGlobalAdmin, parseId, safeError } from "../middleware.js";
import {
  getTroops, getTroop, createTroop, updateTroop, updateTroopAffiliateTag,
  getTroopMembers, getTroopMember, getUserMemberships,
  requestJoinTroop, approveTroopMember, denyTroopMember, removeTroopMember,
  updateMemberDates, updateMemberSkills, getTroopAdmins,
  getTroopSkills, addTroopSkill, removeTroopSkill,
  getAdventures, getAdventureMember, addAdventureMember,
  findUserById, getSetting,
  setTroopGearOverride, getTroopGearOverrides,
  getTroopCustomGear, addTroopCustomGear, updateTroopCustomGearItem, deleteTroopCustomGear,
} from "../db.js";
import {
  sendJoinRequestEmail, sendParentNotificationEmail,
  sendMemberApprovedEmail, sendMemberDeniedEmail,
} from "../email.js";
import { validate, createTroopSchema } from "../validation.js";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";

const router = Router();

// ── Troop Logo directory ──
const LOGO_DIR = join(process.env.DATA_DIR || "./data", "troop-logos");
if (!existsSync(LOGO_DIR)) mkdirSync(LOGO_DIR, { recursive: true });

// ═══════════════════════════════════════════
// TROOP CRUD ROUTES
// ═══════════════════════════════════════════

router.get("/api/troops", requireAuth, async (req, res) => {
  try { res.json(await getTroops(req.user.id)); }
  catch (e) { safeError(res, e); }
});

router.get("/api/troops/:troopId", requireAuth, requireTroopMember(), async (req, res) => {
  try {
    const troop = await getTroop(parseId(req.params.troopId));
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    res.json(troop);
  } catch (e) { safeError(res, e); }
});

router.post("/api/troops", requireAuth, validate(createTroopSchema), async (req, res) => {
  try {
    if (req.user.user_type === "scout") return res.status(403).json({ error: "Scouts cannot create troops" });
    // Troop creation limit (global admin exempt)
    if (!isGlobalAdmin(req)) {
      const maxTroops = parseInt((await getSetting("max_troops_per_user")) || "2", 10);
      const userTroops = (await getUserMemberships(req.user.id)).filter(m => m.role === "admin" && m.status === "approved");
      if (userTroops.length >= maxTroops) {
        return res.status(403).json({ error: `You can create a maximum of ${maxTroops} troops` });
      }
    }
    const { name, description, council, council_id, location, is_public } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Troop name required" });
    if (!council_id && !council?.trim()) return res.status(400).json({ error: "Council is required" });
    if (council && council.trim().length > 60) return res.status(400).json({ error: "Council name too long (60 char max)" });
    const troop = await createTroop({ name: name.trim(), description, council: council?.trim(), council_id, location: location?.trim(), is_public, created_by: req.user.id });
    res.status(201).json(troop);
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const { name, description, council, council_id, location, is_public } = req.body;
    if (council_id === undefined && council !== undefined && !council?.trim()) return res.status(400).json({ error: "Council is required" });
    await updateTroop(parseId(req.params.troopId), { name, description, council, council_id, location, is_public });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ── Troop Logo Upload & Serve ──

// Serve logo (no auth — logos are public)
router.get("/api/troops/:troopId/logo", (req, res) => {
  const troopId = parseId(req.params.troopId);
  const logoPath = join(LOGO_DIR, `${troopId}.png`);
  if (!existsSync(logoPath)) return res.status(404).json({ error: "No logo" });
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(logoPath);
});

// Upload logo (admin only, base64 PNG/JPG in JSON body)
router.put("/api/troops/:troopId/logo", requireAuth, requireTroopAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const { image } = req.body; // "data:image/png;base64,..."

    if (!image) {
      // Delete logo
      const logoPath = join(LOGO_DIR, `${troopId}.png`);
      if (existsSync(logoPath)) unlinkSync(logoPath);
      return res.json({ ok: true, deleted: true });
    }

    // Validate data URL format
    const match = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Invalid image format. Use PNG, JPG, or WebP" });

    const buffer = Buffer.from(match[2], "base64");

    // Max 500KB
    if (buffer.length > 500 * 1024) return res.status(400).json({ error: "Image too large. Maximum 500KB" });

    // Validate PNG/JPG magic bytes
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJPG = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isWebP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    if (!isPNG && !isJPG && !isWebP) return res.status(400).json({ error: "Invalid image data" });

    writeFileSync(join(LOGO_DIR, `${troopId}.png`), buffer);
    console.log(`[logo upload] Troop ${troopId}: ${(buffer.length / 1024).toFixed(1)}KB`);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Get troop info for join modal (adventures list)
router.get("/api/troops/:troopId/join-info", requireAuth, async (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const troop = await getTroop(troopId);
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    const adventures = (await getAdventures(troopId)).filter(a => a.status === "active").map(a => ({
      id: a.id, name: a.name, adventure_type: a.adventure_type,
      depart_date: a.depart_date, arrive_date: a.arrive_date,
      return_date: a.return_date, home_date: a.home_date,
    }));
    res.json({ troop: { id: troop.id, name: troop.name }, adventures });
  } catch (e) { safeError(res, e); }
});

router.post("/api/troops/:troopId/join", requireAuth, async (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const existing = await getTroopMember(troopId, req.user.id);
    if (existing) return res.status(409).json({ error: "Already requested or joined", status: existing.status });

    const { participation, adventure_ids } = req.body || {};
    const validParticipation = participation === "support" ? "support" : "trekking";
    // Validate adventure_ids if provided
    let validAdventureIds = null;
    if (Array.isArray(adventure_ids) && adventure_ids.length > 0) {
      const troopAdventures = (await getAdventures(troopId)).filter(a => a.status === "active");
      const troopAdvIds = new Set(troopAdventures.map(a => a.id));
      validAdventureIds = adventure_ids.map(id => parseId(id)).filter(id => troopAdvIds.has(id));
      if (validAdventureIds.length === 0) validAdventureIds = null;
    }

    await requestJoinTroop(req.user.id, troopId, { participation: validParticipation, requestedAdventures: validAdventureIds });

    const troop = await getTroop(troopId);
    const admins = await getTroopAdmins(troopId);
    const user = await findUserById(req.user.id);

    // Build adventure names for email
    let adventureNames = [];
    if (validAdventureIds) {
      const allAdv = await getAdventures(troopId);
      adventureNames = validAdventureIds.map(id => allAdv.find(a => a.id === id)?.name).filter(Boolean);
    }

    admins.forEach(admin => {
      sendJoinRequestEmail(admin.email, admin.name, user.name, user.user_type, troop.name, user.parent_email, {
        participation: validParticipation,
        adventureNames,
      }).catch(e => console.error("Join notification failed:", e));
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

router.get("/api/troops/:troopId/members", requireAuth, requireTroopMember(), async (req, res) => {
  try {
    const status = req.membership.role === "admin" ? null : "approved";
    res.json(await getTroopMembers(parseId(req.params.troopId), status));
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId/members/:userId/approve", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    const userId = parseId(req.params.userId);

    // Check if the member requested specific adventures
    const membership = await getTroopMember(troopId, userId);
    const requestedAdvIds = membership?.requested_adventures || null;

    await approveTroopMember(troopId, userId);

    // Add to requested adventures only, or all if none specified
    const allAdventures = (await getAdventures(troopId)).filter(a => a.status === "active");
    const adventuresToJoin = requestedAdvIds
      ? allAdventures.filter(a => requestedAdvIds.includes(a.id))
      : allAdventures;

    // Set participation type from join request
    const participation = membership?.participation || "trekking";

    for (const adv of adventuresToJoin) {
      const existing = await getAdventureMember(adv.id, userId);
      if (!existing) await addAdventureMember(adv.id, userId, "member", participation);
    }
    const user = await findUserById(userId);
    const troop = await getTroop(troopId);
    const firstAdv = adventuresToJoin[0] || allAdventures[0];
    if (user?.email) {
      sendMemberApprovedEmail(user.email, user.name, troop.name, {
        council: troop.council, adventureName: firstAdv?.name,
        adventureType: firstAdv?.adventure_type, departDate: firstAdv?.depart_date, returnDate: firstAdv?.return_date,
        troopId, adventureId: firstAdv?.id,
      }).catch(e => console.error("Approval email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId/members/:userId/deny", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    await denyTroopMember(parseId(req.params.troopId), parseId(req.params.userId));
    const user = await findUserById(parseId(req.params.userId));
    const troop = await getTroop(parseId(req.params.troopId));
    if (user?.email) {
      sendMemberDeniedEmail(user.email, user.name, troop.name)
        .catch(e => console.error("Denial email failed:", e));
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.delete("/api/troops/:troopId/members/:userId", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    await removeTroopMember(parseId(req.params.troopId), parseId(req.params.userId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.post("/api/troops/:troopId/leave", requireAuth, async (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    const membership = await getTroopMember(troopId, req.user.id);
    if (!membership || membership.status !== "approved") {
      return res.status(400).json({ error: "You are not a member of this troop" });
    }
    // Prevent sole admin from leaving
    if (membership.role === "admin") {
      const admins = await getTroopAdmins(troopId);
      if (admins.length <= 1) {
        return res.status(400).json({ error: "Cannot leave: you are the only admin. Promote another member first or delete the troop." });
      }
    }
    await removeTroopMember(troopId, req.user.id);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId/members/:userId/dates", requireAuth, requireTroopMember(), requireSelfOrAdmin, async (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    await updateMemberDates(parseId(req.params.troopId), parseId(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId/members/:userId/skills", requireAuth, requireTroopMember(), requireSelfOrAdmin, async (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    await updateMemberSkills(parseId(req.params.troopId), parseId(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP SKILLS ROUTES (legacy, kept for compat)
// ═══════════════════════════════════════════

router.get("/api/troops/:troopId/skills", requireAuth, requireTroopMember(), async (req, res) => {
  try { res.json(await getTroopSkills(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

router.post("/api/troops/:troopId/skills", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const { name, desc } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Skill name required" });
    res.status(201).json(await addTroopSkill(parseId(req.params.troopId), name, desc));
  } catch (e) { safeError(res, e); }
});

router.delete("/api/troops/:troopId/skills/:skillId", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const result = await removeTroopSkill(parseId(req.params.troopId), req.params.skillId);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP SETTINGS (admin)
// ═══════════════════════════════════════════

router.put("/api/troops/:troopId/settings", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const { amazon_affiliate_tag } = req.body;
    if (amazon_affiliate_tag !== undefined) {
      // Sanitize: Amazon tags are alphanumeric + hyphens only
      const safeTag = amazon_affiliate_tag ? String(amazon_affiliate_tag).replace(/[^a-zA-Z0-9\-]/g, "") : "";
      await updateTroopAffiliateTag(parseId(req.params.troopId), safeTag);
    }
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// TROOP GEAR OVERRIDES & CUSTOM GEAR
// ═══════════════════════════════════════════

router.put("/api/troops/:troopId/gear-overrides/:gearId", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const { hidden } = req.body;
    await setTroopGearOverride(parseId(req.params.troopId), parseId(req.params.gearId), hidden);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Troop admin: get overrides
router.get("/api/troops/:troopId/gear-overrides", requireAuth, requireTroopAdmin, async (req, res) => {
  try { res.json(await getTroopGearOverrides(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

// Troop admin: custom gear items
router.get("/api/troops/:troopId/custom-gear", requireAuth, requireTroopMember(), async (req, res) => {
  try { res.json(await getTroopCustomGear(parseId(req.params.troopId))); }
  catch (e) { safeError(res, e); }
});

router.post("/api/troops/:troopId/custom-gear", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    const item = await addTroopCustomGear(parseId(req.params.troopId), req.body);
    res.status(201).json(item);
  } catch (e) { safeError(res, e); }
});

router.put("/api/troops/:troopId/custom-gear/:id", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    await updateTroopCustomGearItem(parseId(req.params.troopId), parseId(req.params.id), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.delete("/api/troops/:troopId/custom-gear/:id", requireAuth, requireTroopAdmin, async (req, res) => {
  try {
    await deleteTroopCustomGear(parseId(req.params.troopId), parseId(req.params.id));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

export default router;
