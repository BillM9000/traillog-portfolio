import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { card, cardTitle, badge, fontBody, fontDisplay } from "../utils/theme";
import { formatDateFull } from "../utils/dates";
import { CalendarCheck, MapPin, Clock, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";

const PERIOD_LABELS = { am: "Morning (8am–12pm)", pm: "Afternoon (12pm–5pm)", all: "All Day" };
const PERIOD_SHORT = { am: "Morning", pm: "Afternoon", all: "All Day" };

export default function TrainingEvents({ adventureId, isAdmin, currentUserId, members }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", period: "all", time_label: "", location: "", notes: "" });

  const refresh = useCallback(() => {
    api.getTrainingEvents(adventureId).then(setEvents).catch(console.error);
  }, [adventureId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!form.date) { addToast("Date is required", "error"); return; }
    try {
      await api.createTrainingEvent(adventureId, form);
      addToast("Training scheduled! Members notified by email.", "success");
      setShowForm(false);
      setForm({ date: "", period: "all", time_label: "", location: "", notes: "" });
      refresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleDelete = async (eventId) => {
    try {
      await api.deleteTrainingEvent(adventureId, eventId);
      addToast("Training event removed", "success");
      refresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleRsvp = async (eventId, status) => {
    try {
      await api.rsvpTrainingEvent(adventureId, eventId, status);
      refresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const upcoming = events.filter(e => e.date >= new Date().toISOString().slice(0, 10));
  const past = events.filter(e => e.date < new Date().toISOString().slice(0, 10));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>
          Scheduled Training
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: "6px 14px", borderRadius: 8, border: `1px solid ${theme.accent}`,
            background: showForm ? theme.accent : "transparent", color: showForm ? "#fff" : theme.accent,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: fontBody,
          }}>
            {showForm ? "Cancel" : "+ Schedule Training"}
          </button>
        )}
      </div>

      {/* Schedule Form (admin only) */}
      {showForm && isAdmin && (
        <div style={{ ...card(theme), marginBottom: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading, marginBottom: 10 }}>New Training Event</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={labelStyle(theme)}>
              Date
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle(theme)} />
            </label>
            <label style={labelStyle(theme)}>
              Time of Day
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                style={inputStyle(theme)}>
                <option value="all">All Day</option>
                <option value="am">Morning (8am–12pm)</option>
                <option value="pm">Afternoon (12pm–5pm)</option>
              </select>
            </label>
            <label style={labelStyle(theme)}>
              Time (optional)
              <input type="text" placeholder="e.g. 9:00 AM" value={form.time_label}
                onChange={e => setForm(f => ({ ...f, time_label: e.target.value }))} style={inputStyle(theme)} />
            </label>
            <label style={labelStyle(theme)}>
              Location
              <input type="text" placeholder="e.g. Busse Woods" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle(theme)} />
            </label>
          </div>
          <label style={{ ...labelStyle(theme), marginTop: 8 }}>
            Notes (optional)
            <input type="text" placeholder="What to bring, focus areas..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle(theme)} />
          </label>
          <button onClick={handleCreate} style={{
            marginTop: 10, padding: "8px 20px", borderRadius: 8, border: "none",
            background: theme.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Schedule & Notify Crew
          </button>
        </div>
      )}

      {/* Upcoming Events */}
      {upcoming.length === 0 && !showForm && (
        <div style={{ ...card(theme), textAlign: "center", padding: 24 }}>
          <CalendarCheck size={28} color={theme.textDimmer} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: theme.textDim, marginTop: 6 }}>
            {isAdmin ? "No training sessions scheduled yet. Use Best Windows to find the best dates, then schedule here." : "No training sessions scheduled yet. Check back soon!"}
          </div>
        </div>
      )}

      {upcoming.map(event => (
        <EventCard key={event.id} event={event} theme={theme} isAdmin={isAdmin}
          currentUserId={currentUserId} members={members}
          onRsvp={handleRsvp} onDelete={handleDelete} />
      ))}

      {/* Past Events */}
      {past.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.textDimmest, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Past Training
          </div>
          {past.map(event => (
            <EventCard key={event.id} event={event} theme={theme} isAdmin={isAdmin}
              currentUserId={currentUserId} members={members} isPast
              onRsvp={handleRsvp} onDelete={handleDelete} />
          ))}
        </>
      )}
    </div>
  );
}

function EventCard({ event, theme, isAdmin, currentUserId, members, isPast, onRsvp, onDelete }) {
  const myRsvp = event.rsvps?.find(r => r.user_id === currentUserId);
  const goingCount = event.rsvps?.filter(r => r.status === "going").length || 0;
  const cantCount = event.rsvps?.filter(r => r.status === "cant").length || 0;
  const noReply = (members?.length || 0) - goingCount - cantCount;

  return (
    <div style={{
      ...card(theme), marginBottom: 8, padding: 12, opacity: isPast ? 0.6 : 1,
      borderLeft: `3px solid ${goingCount >= (members?.length || 1) ? "#4a7a55" : "#aa8a44"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading }}>
            {formatDateFull(event.date)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: theme.textDim, display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={11} strokeWidth={2.5} />
              {PERIOD_SHORT[event.period] || "All Day"}
              {event.time_label && ` — ${event.time_label}`}
            </span>
            {event.location && (
              <span style={{ fontSize: 11, color: theme.textDim, display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={11} strokeWidth={2.5} />
                {event.location}
              </span>
            )}
          </div>
          {event.notes && (
            <div style={{ fontSize: 11, color: theme.textDimmer, marginTop: 3, fontStyle: "italic" }}>{event.notes}</div>
          )}
        </div>
        {isAdmin && !isPast && (
          <button onClick={() => onDelete(event.id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4, color: theme.textDimmest,
          }} title="Delete event">
            <Trash2 size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* RSVP counts */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
          background: goingCount > 0 ? "#d4e4b820" : "transparent",
          color: "#5B7A3A", border: `1px solid #5B7A3A40`,
        }}>
          {goingCount} going
        </span>
        {cantCount > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            color: "#b07060", border: `1px solid #b0706040`,
          }}>
            {cantCount} can't
          </span>
        )}
        {noReply > 0 && (
          <span style={{ fontSize: 10, color: theme.textDimmest }}>{noReply} no reply</span>
        )}
      </div>

      {/* RSVP buttons (for non-past events) */}
      {!isPast && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => onRsvp(event.id, "going")} style={{
            padding: "5px 14px", borderRadius: 8, border: `1px solid ${myRsvp?.status === "going" ? "#5B7A3A" : theme.border}`,
            background: myRsvp?.status === "going" ? "#5B7A3A" : "transparent",
            color: myRsvp?.status === "going" ? "#fff" : theme.textDim,
            fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <ThumbsUp size={12} strokeWidth={2.5} /> Going
          </button>
          <button onClick={() => onRsvp(event.id, "cant")} style={{
            padding: "5px 14px", borderRadius: 8, border: `1px solid ${myRsvp?.status === "cant" ? "#b07060" : theme.border}`,
            background: myRsvp?.status === "cant" ? "#b07060" : "transparent",
            color: myRsvp?.status === "cant" ? "#fff" : theme.textDim,
            fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <ThumbsDown size={12} strokeWidth={2.5} /> Can't Make It
          </button>
        </div>
      )}

      {/* Show who's going (expanded) */}
      {event.rsvps && event.rsvps.length > 0 && (
        <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 6 }}>
          {event.rsvps.filter(r => r.status === "going").map(r => r.name).join(", ")}
          {cantCount > 0 && (
            <span style={{ color: "#b08070" }}>
              {goingCount > 0 ? " · " : ""}Can't: {event.rsvps.filter(r => r.status === "cant").map(r => r.name).join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle = (theme) => ({
  fontSize: 11, fontWeight: 600, color: theme.textDim, display: "flex", flexDirection: "column", gap: 3,
});

const inputStyle = (theme) => ({
  padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.border}`,
  background: theme.bgAlt, color: theme.text, fontSize: 13, fontFamily: fontBody,
  outline: "none",
});
