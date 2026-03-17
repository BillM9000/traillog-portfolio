import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { card, fontBody, fontDisplay } from "../utils/theme";
import { formatDateFull, formatDateShort } from "../utils/dates";
import { CalendarCheck, MapPin, Clock, Trash2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Users, Zap, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_COLORS_DARK = {
  proposed: { bg: "#3E3510", border: "#FFB300", text: "#FFD54F" },
  scheduled: { bg: "#1B3A1B", border: "#4CAF50", text: "#81C784" },
  completed: { bg: "#0D2744", border: "#42A5F5", text: "#90CAF9" },
  cancelled: { bg: "#2A2A2A", border: "#757575", text: "#BDBDBD" },
};

const STATUS_COLORS_LIGHT = {
  proposed: { bg: "#FFF8E1", border: "#FFB300", text: "#F57F17" },
  scheduled: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32" },
  completed: { bg: "#E3F2FD", border: "#42A5F5", text: "#1565C0" },
  cancelled: { bg: "#FAFAFA", border: "#BDBDBD", text: "#757575" },
};

export default function TrainingEvents({ adventureId, isAdmin, currentUserId, members, bestDates }) {
  const { theme, mode } = useTheme();
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", period: "all", time_label: "", location: "", notes: "", type: "proposed" });
  const [showCompleted, setShowCompleted] = useState(false);

  const refresh = useCallback(() => {
    api.getTrainingEvents(adventureId).then(setEvents).catch(console.error);
  }, [adventureId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!form.date) { addToast("Date is required", "error"); return; }
    try {
      await api.createTrainingEvent(adventureId, form);
      const label = form.type === "scheduled" ? "Training scheduled! Members notified." : "Training date proposed.";
      addToast(label, "success");
      setShowForm(false);
      setForm({ date: "", period: "all", time_label: "", location: "", notes: "", type: "proposed" });
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

  const handleStatusChange = async (eventId, type, status) => {
    try {
      await api.updateTrainingEventStatus(adventureId, eventId, type, status);
      const label = type === "scheduled" && status === "active" ? "Training confirmed! Members notified." : status === "completed" ? "Marked as completed." : "Status updated.";
      addToast(label, "success");
      refresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleMarkAttendance = async (eventId, attendeeIds) => {
    try {
      await api.markAttendance(adventureId, eventId, attendeeIds);
      addToast("Attendance saved", "success");
      refresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleScheduleFromChip = (dateKey) => {
    setForm(f => ({ ...f, date: dateKey, type: "proposed" }));
    setShowForm(true);
  };

  const active = events.filter(e => e.status === "active" || !e.status);
  const completed = events.filter(e => e.status === "completed");
  const upcoming = active.filter(e => e.date >= new Date().toISOString().slice(0, 10));
  const pastActive = active.filter(e => e.date < new Date().toISOString().slice(0, 10));

  return (
    <div>
      {/* Best Dates chip bar */}
      {bestDates && bestDates.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Best Dates
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
            {bestDates.slice(0, 5).map(d => (
              <div key={d.key} style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                background: d.count === (members?.length || 0) ? theme.accentBg : theme.bgAlt,
                border: d.count === (members?.length || 0) ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
                color: d.count === (members?.length || 0) ? theme.accent : theme.text,
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
                <span>{formatDateShort(d.key)}</span>
                <span style={{ fontSize: 9, color: theme.textDimmer }}>
                  <Users size={9} style={{ verticalAlign: "middle", marginRight: 2 }} />{d.count}/{members?.length || 0}
                </span>
                {isAdmin && (
                  <button onClick={() => handleScheduleFromChip(d.key)} style={{
                    padding: "2px 8px", borderRadius: 10, border: `1px solid ${theme.accent}`,
                    background: "transparent", color: theme.accent, fontSize: 9, fontWeight: 700,
                    cursor: "pointer", fontFamily: fontBody,
                  }}>+ Propose</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>
          Training Events
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: "6px 14px", borderRadius: 8, border: `1px solid ${theme.accent}`,
            background: showForm ? theme.accent : "transparent", color: showForm ? "#fff" : theme.accent,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: fontBody,
          }}>
            {showForm ? "Cancel" : "+ New Event"}
          </button>
        )}
      </div>

      {/* Create form */}
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
              Type
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={inputStyle(theme)}>
                <option value="proposed">Proposed (no email)</option>
                <option value="scheduled">Confirmed (emails sent)</option>
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
            {form.type === "scheduled" ? "Schedule & Notify Crew" : "Propose Date"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && pastActive.length === 0 && !showForm && (
        <div style={{ ...card(theme), textAlign: "center", padding: 24 }}>
          <CalendarCheck size={28} color={theme.textDimmer} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: theme.textDim, marginTop: 6 }}>
            {isAdmin ? "No training events yet. Use Best Dates above or create one manually." : "No training events yet. Check back soon!"}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {upcoming.map(event => (
        <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
          currentUserId={currentUserId} members={members}
          onRsvp={handleRsvp} onDelete={handleDelete}
          onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} />
      ))}

      {/* Past active events that need completion */}
      {pastActive.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.warn, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Past — Needs Completion
          </div>
          {pastActive.map(event => (
            <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
              currentUserId={currentUserId} members={members} isPast
              onRsvp={handleRsvp} onDelete={handleDelete}
              onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} />
          ))}
        </>
      )}

      {/* Completed events (collapsible) */}
      {completed.length > 0 && (
        <>
          <button onClick={() => setShowCompleted(!showCompleted)} style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
            color: theme.textDimmest, marginTop: 14, marginBottom: 6, textTransform: "uppercase",
            letterSpacing: "0.5px", background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: fontBody,
          }}>
            {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Completed ({completed.length})
          </button>
          {showCompleted && completed.map(event => (
            <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
              currentUserId={currentUserId} members={members} isPast
              onRsvp={handleRsvp} onDelete={handleDelete}
              onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} />
          ))}
        </>
      )}
    </div>
  );
}

function EventCard({ event, theme, mode, isAdmin, currentUserId, members, isPast, onRsvp, onDelete, onStatusChange, onMarkAttendance }) {
  const myRsvp = event.rsvps?.find(r => r.user_id === currentUserId);
  const goingCount = event.rsvps?.filter(r => r.status === "going").length || 0;
  const cantCount = event.rsvps?.filter(r => r.status === "cant").length || 0;
  const noReply = (members?.length || 0) - goingCount - cantCount;
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendees, setAttendees] = useState(new Set());
  const { addToast } = useToast();

  // Initialize attendees from existing attendance data
  useEffect(() => {
    if (event.attendance) {
      setAttendees(new Set(event.attendance.filter(a => a.attended).map(a => a.user_id)));
    }
  }, [event.attendance]);

  const statusColors = mode === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const statusKey = event.status === "completed" ? "completed"
    : event.status === "cancelled" ? "cancelled"
    : event.type === "proposed" ? "proposed"
    : "scheduled";
  const statusInfo = statusColors[statusKey] || statusColors.scheduled;
  const statusLabel = statusKey === "proposed" ? "Proposed" : statusKey === "scheduled" ? "Scheduled" : statusKey === "completed" ? "Completed" : "Cancelled";
  const isCompleted = event.status === "completed";
  const datePassed = event.date < new Date().toISOString().slice(0, 10);

  const toggleAttendee = (userId) => {
    setAttendees(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const saveAttendance = () => {
    onMarkAttendance(event.id, [...attendees]);
    setShowAttendance(false);
  };

  return (
    <div style={{
      ...card(theme), marginBottom: 8, padding: 12,
      opacity: event.status === "cancelled" ? 0.5 : 1,
      borderLeft: `3px solid ${statusInfo.border}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading }}>
              {formatDateFull(event.date)}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
              background: statusInfo.bg,
              color: statusInfo.text,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {event.time_label && (
              <span style={{ fontSize: 11, color: theme.textDim, display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={11} strokeWidth={2.5} />
                {event.time_label}
              </span>
            )}
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
        <div style={{ display: "flex", gap: 4 }}>
          {isAdmin && event.status !== "cancelled" && event.status !== "completed" && (
            <button onClick={() => onDelete(event.id)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 4, color: theme.textDimmest,
            }} title="Delete event">
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* RSVP counts */}
      {event.status !== "cancelled" && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            background: goingCount > 0 ? (mode === "dark" ? "#2a3a20" : "#d4e4b820") : "transparent",
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
      )}

      {/* RSVP buttons */}
      {event.status !== "completed" && event.status !== "cancelled" && (
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
            <ThumbsDown size={12} strokeWidth={2.5} /> Can't
          </button>
        </div>
      )}

      {/* Admin action buttons */}
      {isAdmin && event.status !== "cancelled" && event.status !== "completed" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {event.type === "proposed" && (
            <button onClick={() => onStatusChange(event.id, "scheduled", "active")} style={{
              padding: "5px 12px", borderRadius: 8, border: `1px solid ${theme.accent}`,
              background: theme.accent, color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              <Zap size={11} /> Confirm & Notify
            </button>
          )}
          {datePassed && (
            <>
              <button onClick={() => { onStatusChange(event.id, event.type, "completed"); setShowAttendance(true); }} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid #42A5F5",
                background: "#42A5F5", color: "#fff",
                fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                <CheckCircle2 size={11} /> Complete & Mark Attendance
              </button>
              <button onClick={() => onStatusChange(event.id, event.type, "cancelled")} style={{
                padding: "5px 12px", borderRadius: 8, border: `1px solid ${theme.border}`,
                background: "transparent", color: theme.textDim,
                fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                <XCircle size={11} /> Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Attendance UI */}
      {isAdmin && (isCompleted || showAttendance) && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>Attendance</span>
            <button onClick={() => {
              setAttendees(new Set(members.map(m => m.user_id)));
            }} style={{
              fontSize: 10, fontWeight: 600, color: theme.accent, background: "none", border: "none", cursor: "pointer", fontFamily: fontBody,
            }}>Mark All Present</button>
          </div>
          {members?.map(m => {
            const attended = attendees.has(m.user_id);
            return (
              <div key={m.user_id} onClick={() => toggleAttendee(m.user_id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer",
                borderBottom: `1px solid ${theme.border}`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, border: `2px solid ${attended ? theme.accent : theme.borderLight}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: attended ? theme.accentBg : "transparent",
                }}>
                  {attended && <span style={{ fontSize: 12, color: theme.accent }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: attended ? theme.text : theme.textDim }}>{m.name}</span>
              </div>
            );
          })}
          <button onClick={saveAttendance} style={{
            marginTop: 8, padding: "6px 16px", borderRadius: 8, border: "none",
            background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Save Attendance</button>
        </div>
      )}

      {/* Attendance summary for non-admin on completed events */}
      {!isAdmin && isCompleted && event.attendance?.length > 0 && (
        <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 6 }}>
          Attended: {event.attendance.filter(a => a.attended).map(a => a.name).join(", ") || "None recorded"}
        </div>
      )}

      {/* Who's going for non-completed events */}
      {!isCompleted && event.rsvps && event.rsvps.length > 0 && (
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
