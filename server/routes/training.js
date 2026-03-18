import { Router } from "express";
import { requireAuth, requireAdventureMember, requireAdventureAdmin, parseId, safeError, icsEscape } from "../middleware.js";
import {
  getTrainingEvents, getTrainingEvent, createTrainingEvent, deleteTrainingEvent,
  upsertTrainingRsvp, updateTrainingEventStatus, updateTrainingEvent,
  markAttendance, bulkMarkAttendance, getEventAttendance, getMemberAttendanceCount,
  syncAttendanceSkills,
  getAdventure, getTroop, getAdventureMembers, findUserById,
} from "../db.js";
import { sendTrainingScheduledEmail } from "../email.js";
import { createTrainingEventSchema, updateTrainingEventSchema, rsvpSchema, validate } from "../validation.js";

const router = Router();

router.get("/api/adventures/:adventureId/training-events", requireAuth, requireAdventureMember, (req, res) => {
  try { res.json(getTrainingEvents(parseId(req.params.adventureId))); }
  catch (e) { safeError(res, e); }
});

// Export training events as .ics calendar file
router.get("/api/adventures/:adventureId/training-events/export.ics", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const advId = parseId(req.params.adventureId);
    const events = getTrainingEvents(advId).filter(e => e.status === "active" && e.type === "scheduled");
    const adventure = getAdventure(advId);
    const troop = adventure ? getTroop(adventure.troop_id) : null;

    const icsEvents = events.map(e => {
      const dtStart = e.date.replace(/-/g, "");
      const dtEnd = dtStart; // all-day event
      const uid = `traillog-event-${e.id}@traillog`;
      const summary = `Training: ${adventure?.name || "Crew Training"}`;
      const desc = [e.time_label, e.notes].filter(Boolean).join(" — ");
      const loc = e.location || "";
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${icsEscape(summary)}`,
        desc ? `DESCRIPTION:${icsEscape(desc)}` : "",
        loc ? `LOCATION:${icsEscape(loc)}` : "",
        `ORGANIZER:${icsEscape(troop?.name || "TrailLog")}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n");
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TrailLog//Training Events//EN",
      `X-WR-CALNAME:${adventure?.name || "Training"} Events`,
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${(adventure?.name || "training").replace(/[^a-zA-Z0-9]/g, "_")}_events.ics"`);
    res.send(ics);
  } catch (e) { safeError(res, e); }
});

router.post("/api/adventures/:adventureId/training-events", requireAuth, requireAdventureAdmin, validate(createTrainingEventSchema), (req, res) => {
  try {
    const advId = parseId(req.params.adventureId);
    const { date, period, time_label, location, notes, type } = req.body;
    if (!date) return res.status(400).json({ error: "date required" });
    if (period && !["am", "pm", "all"].includes(period)) return res.status(400).json({ error: "period must be am, pm, or all" });
    if (type && !["proposed", "scheduled"].includes(type)) return res.status(400).json({ error: "type must be proposed or scheduled" });
    const event = createTrainingEvent(advId, { date, period: period || "all", time_label, location, notes, type: type || "proposed" }, req.user.id);

    // Only email members when event is scheduled (not proposed)
    if (event.type === "scheduled") {
      const adventure = getAdventure(advId);
      const troopForEmail = adventure ? getTroop(adventure.troop_id) : null;
      const members = getAdventureMembers(advId).filter(m => !m.is_manual);
      const periodLabel = period === "am" ? "Morning" : period === "pm" ? "Afternoon" : "All Day";
      for (const m of members) {
        const user = findUserById(m.user_id);
        if (user?.email) {
          sendTrainingScheduledEmail(user.email, user.name, adventure?.name || "Adventure", date, periodLabel, time_label, location, notes, { troopName: troopForEmail?.name, troopId: adventure?.troop_id, adventureId: advId }).catch(console.error);
        }
      }
      console.log(`[training event] Adventure ${advId}: ${date} (${periodLabel}) at ${location || "TBD"} — ${members.length} members notified`);
    } else {
      console.log(`[training event] Adventure ${advId}: ${date} proposed (no email)`);
    }

    res.status(201).json(event);
  } catch (e) { safeError(res, e); }
});

router.delete("/api/adventures/:adventureId/training-events/:eventId", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    deleteTrainingEvent(parseId(req.params.eventId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

router.put("/api/adventures/:adventureId/training-events/:eventId/rsvp", requireAuth, requireAdventureMember, validate(rsvpSchema), (req, res) => {
  try {
    const { status } = req.body;
    if (!["going", "cant"].includes(status)) return res.status(400).json({ error: "status must be going or cant" });
    upsertTrainingRsvp(parseId(req.params.eventId), req.user.id, status);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Update event type/status (propose → schedule → complete → cancel)
router.put("/api/adventures/:adventureId/training-events/:eventId/status", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const eventId = parseId(req.params.eventId);
    const advId = parseId(req.params.adventureId);
    const { type, status } = req.body;
    if (type && !["proposed", "scheduled"].includes(type)) return res.status(400).json({ error: "type must be proposed or scheduled" });
    if (status && !["active", "completed", "cancelled"].includes(status)) return res.status(400).json({ error: "status must be active, completed, or cancelled" });

    const event = getTrainingEvent(eventId);
    if (!event) return res.status(404).json({ error: "event not found" });

    const newType = type || event.type;
    const newStatus = status || event.status;
    updateTrainingEventStatus(eventId, newType, newStatus);

    // Send email when promoting from proposed to scheduled
    if (event.type === "proposed" && newType === "scheduled") {
      const adventure = getAdventure(advId);
      const troopForEmail = adventure ? getTroop(adventure.troop_id) : null;
      const members = getAdventureMembers(advId).filter(m => !m.is_manual);
      const periodLabel = event.period === "am" ? "Morning" : event.period === "pm" ? "Afternoon" : "All Day";
      for (const m of members) {
        const user = findUserById(m.user_id);
        if (user?.email) {
          sendTrainingScheduledEmail(user.email, user.name, adventure?.name || "Adventure", event.date, periodLabel, event.time_label, event.location, event.notes, { troopName: troopForEmail?.name, troopId: adventure?.troop_id, adventureId: advId }).catch(console.error);
        }
      }
      console.log(`[training event] Adventure ${advId}: ${event.date} confirmed — ${members.length} members notified`);
    }

    // Sync attendance skills when completing an event
    if (newStatus === "completed") {
      syncAttendanceSkills(advId);
    }

    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Edit training event details (admin only, not completed/cancelled)
router.put("/api/adventures/:adventureId/training-events/:eventId", requireAuth, requireAdventureAdmin, validate(updateTrainingEventSchema), (req, res) => {
  try {
    const eventId = parseId(req.params.eventId);
    const event = getTrainingEvent(eventId);
    if (!event) return res.status(404).json({ error: "event not found" });
    if (event.status === "completed" || event.status === "cancelled") return res.status(400).json({ error: "Cannot edit completed or cancelled events" });
    const { date, period, time_label, location, notes } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });
    updateTrainingEvent(eventId, { date, period, time_label, location, notes });
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Bulk mark attendance for a completed event
router.post("/api/adventures/:adventureId/training-events/:eventId/attendance", requireAuth, requireAdventureAdmin, (req, res) => {
  try {
    const eventId = parseId(req.params.eventId);
    const advId = parseId(req.params.adventureId);
    const { attendees } = req.body; // array of user IDs who attended
    if (!Array.isArray(attendees)) return res.status(400).json({ error: "attendees must be an array" });
    bulkMarkAttendance(eventId, attendees.map(id => parseId(id)), req.user.id);
    // Sync attendance milestone skills for all members
    syncAttendanceSkills(advId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Self-report attendance (any member can mark themselves)
router.put("/api/adventures/:adventureId/training-events/:eventId/attendance/self", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const eventId = parseId(req.params.eventId);
    const advId = parseId(req.params.adventureId);
    const { attended } = req.body; // boolean
    if (typeof attended !== "boolean") return res.status(400).json({ error: "attended must be a boolean" });
    // Only allow self-report on completed events
    const event = getTrainingEvent(eventId);
    if (!event || event.status !== "completed") return res.status(400).json({ error: "Can only report attendance on completed events" });
    markAttendance(eventId, req.user.id, attended ? 1 : 0, req.user.id);
    syncAttendanceSkills(advId);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Get attendance for a specific event
router.get("/api/adventures/:adventureId/training-events/:eventId/attendance", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getEventAttendance(parseId(req.params.eventId)));
  } catch (e) { safeError(res, e); }
});

// Get member attendance count for readiness
router.get("/api/adventures/:adventureId/members/:userId/attendance-count", requireAuth, requireAdventureMember, (req, res) => {
  try {
    const count = getMemberAttendanceCount(parseId(req.params.adventureId), parseId(req.params.userId));
    res.json({ count });
  } catch (e) { safeError(res, e); }
});

export default router;
