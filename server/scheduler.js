import db from "./db.js";
import { sendTrainingReminderEmail } from "./email.js";
import { logger } from "./logger.js";

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Get tomorrow's date as YYYY-MM-DD string in local server time.
 */
function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Send reminder emails for training events happening tomorrow.
 * Only sends for active, scheduled events. Tracks sent reminders
 * in platform_settings to avoid duplicates.
 */
function sendTrainingReminders() {
  const tomorrow = getTomorrow();

  // Find scheduled (confirmed) events happening tomorrow that are still active
  const events = db.prepare(`
    SELECT te.id, te.date, te.time_label, te.location, te.notes,
           te.adventure_id, a.name as adventure_name, a.troop_id,
           t.name as troop_name
    FROM training_events te
    JOIN adventures a ON te.adventure_id = a.id
    JOIN troops t ON a.troop_id = t.id
    WHERE te.date = ? AND te.type = 'scheduled' AND te.status = 'active'
  `).all(tomorrow);

  if (events.length === 0) return;

  // Check which reminders we've already sent (stored as JSON array of event IDs)
  const sentKey = `reminders_sent_${tomorrow}`;
  const sentRaw = db.prepare("SELECT value FROM platform_settings WHERE key = ?").get(sentKey);
  const sentIds = new Set(sentRaw ? JSON.parse(sentRaw.value) : []);

  for (const event of events) {
    if (sentIds.has(event.id)) continue;

    // Get all non-manual members of this adventure
    const members = db.prepare(`
      SELECT u.id, u.email, u.name
      FROM adventure_members am
      JOIN users u ON am.user_id = u.id
      WHERE am.adventure_id = ? AND am.is_manual = 0 AND u.email IS NOT NULL
    `).all(event.adventure_id);

    for (const m of members) {
      sendTrainingReminderEmail(
        m.email, m.name, event.adventure_name,
        event.date, event.time_label, event.location, event.notes,
        { troopName: event.troop_name, troopId: event.troop_id, adventureId: event.adventure_id }
      ).then(() => {})
        .catch(e => logger.error({ err: e, userId: m.id, eventId: event.id }, "Training reminder email failed"));
    }

    sentIds.add(event.id);
    logger.info({ action: "training_reminder", eventId: event.id, date: tomorrow, memberCount: members.length }, "Training reminder emails queued");
  }

  // Persist sent IDs to avoid re-sending
  db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES (?, ?)").run(sentKey, JSON.stringify([...sentIds]));

  // Clean up old reminder keys (older than 7 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  db.prepare("DELETE FROM platform_settings WHERE key LIKE 'reminders_sent_%' AND key < ?").run(`reminders_sent_${cutoffStr}`);
}

/**
 * Start the reminder scheduler. Runs every hour.
 */
export function startReminderScheduler() {
  // Run once on startup (after 60s delay to let the server settle)
  setTimeout(() => {
    try { sendTrainingReminders(); } catch (e) { logger.error({ err: e }, "Reminder scheduler startup run failed"); }
  }, 60 * 1000);

  // Then run every hour
  setInterval(() => {
    try { sendTrainingReminders(); } catch (e) { logger.error({ err: e }, "Reminder scheduler failed"); }
  }, ONE_HOUR);

  logger.info("Training reminder scheduler started (hourly check)");
}
