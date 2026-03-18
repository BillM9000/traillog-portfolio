import { Router } from "express";
import { requireAuth, requireGlobalAdmin, parseId, safeError } from "../middleware.js";
import {
  getAllTroopsAdmin,
  getTroopMembersAdmin,
  deleteTroop,
  getTroop,
  getAllUsersAdmin,
  getAllSettings,
  getAffiliateStats,
  setSetting,
  promoteToAdmin,
  demoteFromAdmin,
  getSystemAdmins,
  findUserById,
  expireAllGearRecs,
  getLastGearRefreshTime,
} from "../db.js";
import { adminSettingSchema, validate } from "../validation.js";
import { refreshAllGearRecommendations, isRefreshInProgress } from "../gear-ai.js";
import { auditLog } from "../logger.js";

const router = Router();

router.get("/api/admin/troops", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllTroopsAdmin()); }
  catch (e) { safeError(res, e); }
});

router.get("/api/admin/troops/:troopId/members", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    res.json(getTroopMembersAdmin(troopId));
  } catch (e) { safeError(res, e); }
});

router.delete("/api/admin/troops/:troopId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const troopId = parseId(req.params.troopId);
    if (!troopId) return res.status(400).json({ error: "Invalid troop ID" });
    const troop = getTroop(troopId);
    if (!troop) return res.status(404).json({ error: "Troop not found" });
    deleteTroop(troopId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.get("/api/admin/users", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllUsersAdmin()); }
  catch (e) { safeError(res, e); }
});

router.get("/api/admin/settings", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAllSettings()); }
  catch (e) { safeError(res, e); }
});

router.get("/api/admin/affiliate-stats", requireAuth, requireGlobalAdmin, (req, res) => {
  try { res.json(getAffiliateStats()); }
  catch (e) { safeError(res, e); }
});

router.put("/api/admin/settings", requireAuth, requireGlobalAdmin, validate(adminSettingSchema), (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof key !== "string") return res.status(400).json({ error: "key is required" });
    const PROTECTED_KEYS = ["schema_version"];
    if (PROTECTED_KEYS.includes(key)) return res.status(403).json({ error: "This setting is system-managed and cannot be edited" });
    setSetting(key, value);
    auditLog.settingChanged(req.user.id, key);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ── System Admin Promote / Demote ──
router.put("/api/admin/users/:id/promote", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const userId = parseId(req.params.id);
    const user = findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    promoteToAdmin(userId);
    auditLog.adminPromoted(req.user.id, userId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/admin/users/:id/demote", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: "You cannot demote yourself" });
    const user = findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const admins = getSystemAdmins();
    if (admins.length <= 1) return res.status(400).json({ error: "Cannot demote the last system admin" });
    demoteFromAdmin(userId);
    auditLog.adminDemoted(req.user.id, userId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.get("/api/admin/system-admins", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    res.json(getSystemAdmins());
  } catch (e) { safeError(res, e); }
});

// Admin: Refresh AI gear recommendations (triggers background job)
router.post("/api/admin/refresh-gear-recs", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    if (isRefreshInProgress()) {
      return res.json({ ok: true, message: "Refresh already in progress" });
    }
    // Expire all cached recs so they get fully regenerated with latest prompt
    expireAllGearRecs();
    // Fire and forget — runs in background
    refreshAllGearRecommendations().catch(e =>
      console.error("[gear-ai] Admin-triggered refresh error:", e.message)
    );
    res.json({ ok: true, message: "Gear recommendation refresh started (all items will be regenerated)" });
  } catch (e) { safeError(res, e); }
});

// Admin: Get last gear refresh time
router.get("/api/admin/gear-refresh-status", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    res.json({ last_refresh: getLastGearRefreshTime(), in_progress: isRefreshInProgress() });
  } catch (e) { safeError(res, e); }
});

export default router;
