import { Router } from "express";
import { requireAuth, requireCrewMember, requireCrewAdmin, requireCrewSelfOrAdmin, requireAdventureMember, requireAdventureAdmin, parseId, safeError } from "../middleware.js";
import {
  getCrews, getCrew, createCrew, updateCrew, deleteCrew,
  getCrewMembers, addCrewMember, removeCrewMember,
  updateCrewMemberDates, updateCrewMemberSkills, updateCrewMemberGear,
  updateCrewMemberMedical, updateCrewMemberAdmin, updateCrewMemberRole,
  updateCrewMemberParticipation, linkCrewMember,
  addCrewManualMember, removeCrewManualMember,
  getAllCrewMembers, getAdventureMember,
  getBadges, getCrewMilestones, addCrewMilestone,
  getAssessment, upsertAssessment,
  getReadinessPlan, upsertReadinessPlan, deleteReadinessPlan,
  getReadinessProgress, upsertReadinessProgress,
  getCrewReadinessDashboard, getGearStatusSummary, getCrewAssessments,
  getAdventure, getItinerary, getMemberPackWeight, earnBadge,
  syncAttendanceSkills, getMemberAttendanceCount, getAdventureMilestoneConfig,
  getAdventureMemberGearAll, findUserById, getTroop,
} from "../db.js";
import { generateReadinessPlan } from "../ai-readiness.js";
import { readinessAssessSchema, validate } from "../validation.js";
import { sendBadgeEarnedEmail } from "../email.js";

const router = Router();

// ── Crew Routes ──

router.get("/api/adventures/:adventureId/crews", requireAuth, requireAdventureMember, async (req, res) => {
  try { res.json(await getCrews(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// All crew members for an adventure (multi-crew view)
router.get("/api/adventures/:adventureId/all-crew-members", requireAuth, requireAdventureMember, async (req, res) => {
  try { res.json(await getAllCrewMembers(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// Create crew (admin only)
// Sister crews MUST share adventure dates — only name and itinerary can differ.
// If different dates are needed, that's a separate adventure.
router.post("/api/adventures/:adventureId/crews", requireAuth, requireAdventureAdmin, async (req, res) => {
  try {
    const { name, itinerary_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Crew name required" });
    // Inherit dates from the adventure — crews share dates
    const adventureId = parseId(req.params.adventureId);
    const adventure = await getAdventure(adventureId);
    if (!adventure) return res.status(404).json({ error: "Adventure not found" });
    const crew = await createCrew({
      adventure_id: adventureId,
      name: name.trim(), itinerary_id,
      depart_date: adventure.depart_date,
      arrive_date: adventure.arrive_date,
      return_date: adventure.return_date,
      home_date: adventure.home_date,
      leader_id: req.user.id,
    });
    res.status(201).json(crew);
  } catch (e) { safeError(res, e); }
});

// Get crew details
router.get("/api/crews/:crewId", requireAuth, requireCrewMember, async (req, res) => {
  try { res.json(req.crew); }
  catch (e) { safeError(res, e); }
});

// Update crew (name and itinerary only — dates come from adventure)
router.put("/api/crews/:crewId", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { name, itinerary_id } = req.body;
    // Only allow name and itinerary changes — dates are adventure-level
    await updateCrew(parseId(req.params.crewId), { name, itinerary_id });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Delete crew (can't delete the last one)
router.delete("/api/crews/:crewId", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const crew = req.crew;
    const allCrews = await getCrews(crew.adventure_id);
    if (allCrews.length <= 1) return res.status(400).json({ error: "Cannot delete the last crew in an adventure" });
    await deleteCrew(parseId(req.params.crewId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ── Crew Member Routes ──

router.get("/api/crews/:crewId/members", requireAuth, requireCrewMember, async (req, res) => {
  try { res.json(await getCrewMembers(parseId(req.params.crewId))); }
  catch (e) { safeError(res, e); }
});

router.post("/api/crews/:crewId/members", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    await addCrewMember(parseId(req.params.crewId), user_id, role || "member");
    res.status(201).json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.delete("/api/crews/:crewId/members/:userId", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    await removeCrewMember(parseId(req.params.crewId), parseId(req.params.userId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/dates", requireAuth, requireCrewSelfOrAdmin, async (req, res) => {
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates)) return res.status(400).json({ error: "dates must be array" });
    await updateCrewMemberDates(parseId(req.params.crewId), parseId(req.params.userId), dates);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/skills", requireAuth, requireCrewSelfOrAdmin, async (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: "skills must be array" });
    await updateCrewMemberSkills(parseId(req.params.crewId), parseId(req.params.userId), skills);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/gear", requireAuth, requireCrewSelfOrAdmin, async (req, res) => {
  try {
    const { gear } = req.body;
    if (!Array.isArray(gear)) return res.status(400).json({ error: "gear must be array" });
    await updateCrewMemberGear(parseId(req.params.crewId), parseId(req.params.userId), gear);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/medical", requireAuth, requireCrewSelfOrAdmin, async (req, res) => {
  try {
    const { medical } = req.body;
    if (!Array.isArray(medical)) return res.status(400).json({ error: "medical must be array" });
    await updateCrewMemberMedical(parseId(req.params.crewId), parseId(req.params.userId), medical);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/admin", requireAuth, requireCrewSelfOrAdmin, async (req, res) => {
  try {
    const { admin_tasks } = req.body;
    if (!Array.isArray(admin_tasks)) return res.status(400).json({ error: "admin_tasks must be array" });
    await updateCrewMemberAdmin(parseId(req.params.crewId), parseId(req.params.userId), admin_tasks);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/role", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) return res.status(400).json({ error: "role must be 'admin' or 'member'" });
    await updateCrewMemberRole(parseId(req.params.crewId), parseId(req.params.userId), role);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/participation", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { participation } = req.body;
    if (!["trekking", "support"].includes(participation)) return res.status(400).json({ error: "participation must be 'trekking' or 'support'" });
    await updateCrewMemberParticipation(parseId(req.params.crewId), parseId(req.params.userId), participation);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/crews/:crewId/members/:userId/link", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { linked_scouts } = req.body;
    const userId = parseId(req.params.userId);
    const memberUser = await findUserById(userId);
    if (memberUser?.user_type !== "adult") return res.status(400).json({ error: "Only adults can be linked to scouts" });
    const scouts = Array.isArray(linked_scouts) ? linked_scouts.slice(0, 3) : [];
    await linkCrewMember(parseId(req.params.crewId), userId, scouts);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.post("/api/crews/:crewId/manual-members", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const member = await addCrewManualMember(parseId(req.params.crewId), name.trim());
    res.status(201).json(member);
  } catch (e) { safeError(res, e); }
});

router.delete("/api/crews/:crewId/manual-members/:memberId", requireAuth, requireCrewAdmin, async (req, res) => {
  try {
    await removeCrewManualMember(parseId(req.params.crewId), parseId(req.params.memberId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ── Crew Gear Routes ──

router.get("/api/crews/:crewId/gear", requireAuth, requireCrewMember, async (req, res) => {
  try {
    // Crew-scoped gear: uses adventure_id from crew for now (gear is adventure-scoped in member_gear)
    res.json(await getAdventureMemberGearAll(req.crew.adventure_id));
  } catch (e) { safeError(res, e); }
});

router.get("/api/crews/:crewId/members/:userId/pack-weight", requireAuth, requireCrewMember, async (req, res) => {
  try {
    res.json(await getMemberPackWeight(req.crew.adventure_id, parseId(req.params.userId)));
  } catch (e) { safeError(res, e); }
});

// ── Crew Achievements ──

router.get("/api/crews/:crewId/achievements", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const adventureId = req.crew.adventure_id;
    const badges = await getBadges(adventureId);
    const milestones = await getCrewMilestones(adventureId);
    res.json({ badges, milestones });
  } catch (e) { safeError(res, e); }
});

router.post("/api/crews/:crewId/check-milestones", requireAuth, requireCrewMember, async (req, res) => {
  try {
    // Delegate to adventure-scoped milestone check for now
    // Stage 3 will make this fully crew-scoped
    const adventureId = req.crew.adventure_id;
    // Forward to the adventure check-milestones logic
    req.params.adventureId = String(adventureId);
    req.adventureMembership = await getAdventureMember(adventureId, req.user.id);
    // Reuse the existing milestone check (handled by the adventure route above)
    res.json({ message: "Use POST /api/adventures/:advId/check-milestones for now" });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// AI READINESS ENGINE ROUTES
// ═══════════════════════════════════════════

// Submit or update self-assessment
router.post("/api/crews/:crewId/readiness/assess", requireAuth, requireCrewMember, validate(readinessAssessSchema), async (req, res) => {
  try {
    const { current_distance_miles, pack_experience, elevation_access, activity_level } = req.body;
    if (current_distance_miles == null || !pack_experience || !elevation_access || !activity_level) {
      return res.status(400).json({ error: "All assessment fields required" });
    }
    const validPack = ["none", "day_pack", "loaded"];
    const validElev = ["flat_only", "some_hills", "real_elevation"];
    const validActivity = ["sedentary", "lightly_active", "regularly_active", "very_active"];
    if (!validPack.includes(pack_experience)) return res.status(400).json({ error: "Invalid pack_experience" });
    if (!validElev.includes(elevation_access)) return res.status(400).json({ error: "Invalid elevation_access" });
    if (!validActivity.includes(activity_level)) return res.status(400).json({ error: "Invalid activity_level" });
    const dist = parseFloat(current_distance_miles);
    if (isNaN(dist) || dist < 0 || dist > 50) return res.status(400).json({ error: "Distance must be 0-50 miles" });

    await upsertAssessment(req.crew.id, req.user.id, { current_distance_miles: dist, pack_experience, elevation_access, activity_level });
    // Clear any existing plan so it regenerates with new assessment
    await deleteReadinessPlan(req.crew.id, req.user.id);
    const assessment = await getAssessment(req.crew.id, req.user.id);
    res.json({ message: "Assessment saved", assessment });
  } catch (e) { safeError(res, e); }
});

// Get self-assessment for current user
router.get("/api/crews/:crewId/readiness/assess", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const assessment = await getAssessment(req.crew.id, req.user.id);
    res.json({ assessment });
  } catch (e) { safeError(res, e); }
});

// Get or generate readiness plan for a member
router.get("/api/crews/:crewId/readiness/plan/:userId", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });

    // Check if plan exists and is recent enough
    let plan = await getReadinessPlan(req.crew.id, userId);
    if (plan) {
      const progress = await getReadinessProgress(req.crew.id, userId);
      return res.json({ plan: plan.plan, priorities: plan.priorities, progress, generated_at: plan.generated_at, cached: true });
    }

    // Need to generate — check assessment exists
    const assessment = await getAssessment(req.crew.id, userId);
    if (!assessment) {
      return res.status(404).json({ error: "No assessment found. Complete the self-assessment first." });
    }

    // Get crew/adventure/itinerary context
    const crew = req.crew;
    const adventure = await getAdventure(crew.adventure_id);
    const itinerary = crew.itinerary_id ? await getItinerary(crew.itinerary_id) : null;
    const departureDate = crew.depart_date || adventure?.depart_date;
    if (!departureDate) {
      return res.status(400).json({ error: "No departure date set for this crew" });
    }

    const gearStatus = await getGearStatusSummary(req.crew.id, userId);

    const result = await generateReadinessPlan({
      adventureType: adventure?.adventure_type || "philmont",
      itinerary,
      departureDate,
      assessment,
      gearStatus,
    });

    const weeksRemaining = Math.max(0, Math.round((new Date(departureDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)));
    await upsertReadinessPlan(req.crew.id, userId, result.plan, result.priorities, weeksRemaining);

    // Award AI Ready badge on first plan generation
    const badgeEarned = await earnBadge(crew.adventure_id, userId, "ai_ready");
    if (badgeEarned) {
      const badgeUser = await findUserById(userId);
      const badgeTroop = adventure ? await getTroop(adventure.troop_id) : null;
      if (badgeUser?.email) {
        sendBadgeEarnedEmail(badgeUser.email, badgeUser.name, "ai_ready", adventure?.name || "Adventure", { troopName: badgeTroop?.name, troopId: adventure?.troop_id, adventureId: crew.adventure_id })
          .catch(e => console.error("AI Ready badge email failed:", e));
      }
      console.log(`[badge] AI Ready earned by user ${userId} in adventure ${crew.adventure_id}`);
    }

    const progress = await getReadinessProgress(req.crew.id, userId);
    res.json({ plan: result.plan, priorities: result.priorities, progress, generated_at: new Date().toISOString(), cached: false, tokens_used: result.tokens_used, badge_earned: badgeEarned ? "ai_ready" : null });
  } catch (e) { safeError(res, e); }
});

// Update phase progress
router.put("/api/crews/:crewId/readiness/progress", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const { phase_number, status, note } = req.body;
    if (phase_number == null || !status) return res.status(400).json({ error: "phase_number and status required" });
    const validStatuses = ["not_started", "working", "complete"];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const phaseNum = parseInt(phase_number);
    if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 10) return res.status(400).json({ error: "Invalid phase number" });

    await upsertReadinessProgress(req.crew.id, req.user.id, phaseNum, status, note || null);
    const progress = await getReadinessProgress(req.crew.id, req.user.id);
    res.json({ progress });
  } catch (e) { safeError(res, e); }
});

// Crew readiness dashboard (leader view)
router.get("/api/crews/:crewId/readiness/dashboard", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const dashboard = await getCrewReadinessDashboard(req.crew.id);
    res.json({ dashboard });
  } catch (e) { safeError(res, e); }
});

// Force regenerate plan for a member
router.post("/api/crews/:crewId/readiness/regenerate", requireAuth, requireCrewMember, async (req, res) => {
  try {
    const userId = req.user.id;
    const assessment = await getAssessment(req.crew.id, userId);
    if (!assessment) {
      return res.status(404).json({ error: "No assessment found. Complete the self-assessment first." });
    }

    // Delete old plan + progress
    await deleteReadinessPlan(req.crew.id, userId);

    const crew = req.crew;
    const adventure = await getAdventure(crew.adventure_id);
    const itinerary = crew.itinerary_id ? await getItinerary(crew.itinerary_id) : null;
    const departureDate = crew.depart_date || adventure?.depart_date;
    if (!departureDate) {
      return res.status(400).json({ error: "No departure date set" });
    }

    const gearStatus = await getGearStatusSummary(req.crew.id, userId);
    const result = await generateReadinessPlan({
      adventureType: adventure?.adventure_type || "philmont",
      itinerary,
      departureDate,
      assessment,
      gearStatus,
    });

    const weeksRemaining = Math.max(0, Math.round((new Date(departureDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)));
    await upsertReadinessPlan(req.crew.id, userId, result.plan, result.priorities, weeksRemaining);

    // Award AI Ready badge (INSERT OR IGNORE — only fires once)
    const badgeEarned = await earnBadge(crew.adventure_id, userId, "ai_ready");
    if (badgeEarned) {
      const badgeUser = await findUserById(userId);
      const badgeTroop = adventure ? await getTroop(adventure.troop_id) : null;
      if (badgeUser?.email) {
        sendBadgeEarnedEmail(badgeUser.email, badgeUser.name, "ai_ready", adventure?.name || "Adventure", { troopName: badgeTroop?.name, troopId: adventure?.troop_id, adventureId: crew.adventure_id })
          .catch(e => console.error("AI Ready badge email failed:", e));
      }
      console.log(`[badge] AI Ready earned by user ${userId} in adventure ${crew.adventure_id}`);
    }

    res.json({ plan: result.plan, priorities: result.priorities, progress: [], generated_at: new Date().toISOString(), tokens_used: result.tokens_used, badge_earned: badgeEarned ? "ai_ready" : null });
  } catch (e) { safeError(res, e); }
});

export default router;
