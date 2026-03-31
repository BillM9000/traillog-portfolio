import React, { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { formatDateFull, formatDateShort } from "../utils/dates";
import { CalendarCheck, MapPin, Clock, Trash2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Users, Zap, ChevronDown, ChevronUp, Pencil, Download, Plus } from "lucide-react";
import PriorityAlertCard from "./PriorityAlertCard";
import type { AdventureMember, TrainingEvent, TrainingRSVP, TrainingAttendance, ThemeColors, ThemeMode } from "../types";

interface BestDate {
  key: string;
  count: number;
}

interface StatusColorSet {
  bg: string;
  border: string;
  text: string;
}

const STATUS_COLORS_DARK: Record<string, StatusColorSet> = {
  proposed: { bg: "#3E3510", border: "#FFB300", text: "#FFD54F" },
  scheduled: { bg: "#1B3A1B", border: "#4CAF50", text: "#81C784" },
  overdue: { bg: "#3A1010", border: "#CC3333", text: "#FF8080" },
  completed: { bg: "#0D2744", border: "#42A5F5", text: "#90CAF9" },
  cancelled: { bg: "#2A2A2A", border: "#757575", text: "#BDBDBD" },
};

const STATUS_COLORS_LIGHT: Record<string, StatusColorSet> = {
  proposed: { bg: "#FFF8E1", border: "#FFB300", text: "#F57F17" },
  scheduled: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32" },
  overdue: { bg: "#FFF0F0", border: "#CC3333", text: "#CC3333" },
  completed: { bg: "#E3F2FD", border: "#42A5F5", text: "#1565C0" },
  cancelled: { bg: "#FAFAFA", border: "#BDBDBD", text: "#757575" },
};

interface TrainingEventsProps {
  adventureId: number;
  isAdmin: boolean;
  currentUserId: number;
  members: AdventureMember[];
  bestDates: BestDate[] | null;
}

interface FormState {
  date: string;
  period: string;
  time_label: string;
  location: string;
  notes: string;
  type: string;
  repeat: string;
  repeatCount: number;
}

export default function TrainingEvents({ adventureId, isAdmin, currentUserId, members, bestDates }: TrainingEventsProps) {
  const { theme, mode } = useTheme();
  const { addToast } = useToast();
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ date: "", period: "all", time_label: "", location: "", notes: "", type: "proposed", repeat: "none", repeatCount: 4 });
  const [showCompleted, setShowCompleted] = useState(false);

  const refresh = useCallback(() => {
    api.getTrainingEvents(adventureId).then(setEvents).catch(console.error);
  }, [adventureId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!form.date) { addToast("Date is required", "error"); return; }
    try {
      // Generate dates for recurring events
      const dates = [form.date];
      if (form.repeat !== "none" && form.repeatCount > 1) {
        const interval = form.repeat === "weekly" ? 7 : form.repeat === "biweekly" ? 14 : 0;
        if (interval > 0) {
          for (let i = 1; i < form.repeatCount; i++) {
            const d = new Date(form.date + "T00:00:00");
            d.setDate(d.getDate() + interval * i);
            dates.push(d.toISOString().slice(0, 10));
          }
        }
      }

      const base = { period: form.period, time_label: form.time_label, location: form.location, notes: form.notes, type: form.type };
      for (const date of dates) {
        await api.createTrainingEvent(adventureId, { ...base, date });
      }

      const label = dates.length > 1
        ? `${dates.length} events created!${form.type === "scheduled" ? " Members notified." : ""}`
        : form.type === "scheduled" ? "Training scheduled! Members notified." : "Training date proposed.";
      addToast(label, "success");
      setShowForm(false);
      setForm({ date: "", period: "all", time_label: "", location: "", notes: "", type: "proposed", repeat: "none", repeatCount: 4 });
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleDelete = async (eventId: number) => {
    try {
      await api.deleteTrainingEvent(adventureId, eventId);
      addToast("Training event removed", "success");
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleRsvp = async (eventId: number, status: string) => {
    try {
      await api.rsvpTrainingEvent(adventureId, eventId, status);
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleStatusChange = async (eventId: number, type: string, status: string) => {
    try {
      await api.updateTrainingEventStatus(adventureId, eventId, type, status);
      const label = type === "scheduled" && status === "active" ? "Training confirmed! Members notified." : status === "completed" ? "Marked as completed." : "Status updated.";
      addToast(label, "success");
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleMarkAttendance = async (eventId: number, attendeeIds: number[]) => {
    try {
      await api.markAttendance(adventureId, eventId, attendeeIds);
      addToast("Attendance saved", "success");
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleEditEvent = async (eventId: number, data: Record<string, unknown>) => {
    try {
      await api.updateTrainingEvent(adventureId, eventId, data);
      addToast("Event updated", "success");
      refresh();
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleScheduleFromChip = (dateKey: string) => {
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
        <div className="mb-3.5">
          <div className="text-xs font-bold text-tl-text-muted mb-1.5 uppercase tracking-[0.5px]">
            Best Dates
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {bestDates.slice(0, 5).map(d => (
              <div key={d.key} className={clsx(
                "py-1.5 px-3 rounded-pill text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 shrink-0",
                d.count === (members?.length || 0)
                  ? "bg-tl-accent-bg border-[1.5px] border-tl-accent text-tl-accent"
                  : "bg-tl-bg-alt border border-tl-border text-tl-text"
              )}>
                <span>{formatDateShort(d.key)}</span>
                <span className="text-[9px] text-tl-text-dimmer">
                  <Users size={9} className="align-middle mr-0.5 inline" />{d.count}/{members?.length || 0}
                </span>
                {isAdmin && (
                  <button onClick={() => handleScheduleFromChip(d.key)}
                    className="py-0.5 px-2 rounded-badge border border-tl-accent bg-transparent text-tl-accent text-[9px] font-bold cursor-pointer font-body">+ Propose</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5">
        <div className="text-base font-[800] text-tl-heading font-display">
          Training Events
        </div>
        <div className="flex gap-1.5">
          {upcoming.length > 0 && (
            <a href={api.getCalendarExportUrl(adventureId)} download
              className="py-1.5 px-2.5 rounded-btn border border-tl-border bg-transparent text-tl-text-dim text-xs font-semibold cursor-pointer font-body flex items-center gap-1 no-underline"
              title="Export to Google Calendar / iCal">
              <Download size={12} /> .ics
            </a>
          )}
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)} className={clsx(
              "py-1.5 px-3.5 rounded-btn border border-tl-accent text-xs font-bold cursor-pointer font-body",
              showForm ? "bg-tl-accent text-white" : "bg-transparent text-tl-accent"
            )}>
              {showForm ? "Cancel" : "+ New Event"}
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showForm && isAdmin && (
        <div className="tl-card mb-3 p-4">
          <div className="text-[13px] font-bold text-tl-heading mb-2.5">New Training Event</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
              Date
              <input type="date" value={form.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, date: e.target.value }))}
                className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none" />
            </label>
            <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
              Type
              <select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, type: e.target.value }))}
                className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none">
                <option value="proposed">Proposed (no email)</option>
                <option value="scheduled">Confirmed (emails sent)</option>
              </select>
            </label>
            <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
              Time (optional)
              <select value={form.time_label} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, time_label: e.target.value }))}
                className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none">
                <option value="">Select time...</option>
                <option value="6:00 AM">6:00 AM</option>
                <option value="6:30 AM">6:30 AM</option>
                <option value="7:00 AM">7:00 AM</option>
                <option value="7:30 AM">7:30 AM</option>
                <option value="8:00 AM">8:00 AM</option>
                <option value="8:30 AM">8:30 AM</option>
                <option value="9:00 AM">9:00 AM</option>
                <option value="9:30 AM">9:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="12:30 PM">12:30 PM</option>
                <option value="1:00 PM">1:00 PM</option>
                <option value="1:30 PM">1:30 PM</option>
                <option value="2:00 PM">2:00 PM</option>
                <option value="2:30 PM">2:30 PM</option>
                <option value="3:00 PM">3:00 PM</option>
                <option value="3:30 PM">3:30 PM</option>
                <option value="4:00 PM">4:00 PM</option>
                <option value="4:30 PM">4:30 PM</option>
                <option value="5:00 PM">5:00 PM</option>
                <option value="5:30 PM">5:30 PM</option>
                <option value="6:00 PM">6:00 PM</option>
                <option value="6:30 PM">6:30 PM</option>
                <option value="7:00 PM">7:00 PM</option>
                <option value="7:30 PM">7:30 PM</option>
                <option value="8:00 PM">8:00 PM</option>
                <option value="8:30 PM">8:30 PM</option>
                <option value="9:00 PM">9:00 PM</option>
              </select>
            </label>
            <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
              Location
              <input type="text" placeholder="e.g. Busse Woods" value={form.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, location: e.target.value }))}
                className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none" />
            </label>
          </div>
          <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px] mt-2">
            Notes (optional)
            <input type="text" placeholder="What to bring, focus areas..." value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
              Repeat
              <select value={form.repeat} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, repeat: e.target.value }))}
                className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none">
                <option value="none">No repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
              </select>
            </label>
            {form.repeat !== "none" && (
              <label className="text-[11px] font-semibold text-tl-text-dim flex flex-col gap-[3px]">
                How many
                <select value={form.repeatCount} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, repeatCount: parseInt(e.target.value) }))}
                  className="py-[7px] px-2.5 rounded-badge-sm border border-tl-border bg-tl-bg-alt text-tl-text text-[13px] font-body outline-none">
                  {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                    <option key={n} value={n}>{n} events</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {form.repeat !== "none" && form.date && (
            <div className="text-[10px] text-tl-text-dim mt-1">
              Creates {form.repeatCount} events: {form.date} through{" "}
              {(() => {
                const interval = form.repeat === "weekly" ? 7 : 14;
                const d = new Date(form.date + "T00:00:00");
                d.setDate(d.getDate() + interval * (form.repeatCount - 1));
                return d.toISOString().slice(0, 10);
              })()}
            </div>
          )}
          <button onClick={handleCreate}
            className="mt-2.5 py-2 px-5 rounded-btn border-none bg-tl-accent text-white text-[13px] font-bold cursor-pointer">
            {form.type === "scheduled" ? "Schedule & Notify Crew" : "Propose Date"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && pastActive.length === 0 && !showForm && (
        isAdmin ? (
          <PriorityAlertCard
            title="No training events scheduled"
            body="Your crew needs group hikes before the trail. Philmont requires conditioning — aim for at least 5 outings with 40+ miles total before departure."
            ctaLabel="+ Schedule First Event"
            onCta={() => setShowForm(true)}
          />
        ) : (
          <div className="tl-card flex flex-col items-center text-center py-8 px-5">
            <CalendarCheck size={44} strokeWidth={1.3} className="text-tl-text-dimmer mb-3 opacity-50" />
            <div className="text-[14px] font-bold text-tl-heading font-display mb-1.5">No training events yet</div>
            <div className="text-[12px] text-tl-text-dim leading-relaxed max-w-[260px]">
              Your crew leader is working on scheduling group hikes. Check back soon — conditioning hikes are key to a successful trek.
            </div>
          </div>
        )
      )}

      {/* Upcoming events */}
      {upcoming.map(event => (
        <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
          currentUserId={currentUserId} members={members}
          onRsvp={handleRsvp} onDelete={handleDelete}
          adventureId={adventureId} onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} onEdit={handleEditEvent} onRefresh={refresh} />
      ))}

      {/* Past active events that need completion */}
      {pastActive.length > 0 && (
        <>
          <div className="text-xs font-bold text-tl-warn mt-3.5 mb-1.5 uppercase tracking-[0.5px]">
            Past — Needs Completion
          </div>
          {pastActive.map(event => (
            <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
              currentUserId={currentUserId} members={members} isPast
              onRsvp={handleRsvp} onDelete={handleDelete}
              adventureId={adventureId} onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} onEdit={handleEditEvent} onRefresh={refresh} />
          ))}
        </>
      )}

      {/* Completed events (collapsible) */}
      {completed.length > 0 && (
        <>
          <button onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-xs font-bold text-tl-text-dimmest mt-3.5 mb-1.5 uppercase tracking-[0.5px] bg-none border-none cursor-pointer p-0 font-body">
            {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Completed ({completed.length})
          </button>
          {showCompleted && completed.map(event => (
            <EventCard key={event.id} event={event} theme={theme} mode={mode} isAdmin={isAdmin}
              currentUserId={currentUserId} members={members} isPast
              onRsvp={handleRsvp} onDelete={handleDelete}
              adventureId={adventureId} onStatusChange={handleStatusChange} onMarkAttendance={handleMarkAttendance} onEdit={handleEditEvent} onRefresh={refresh} />
          ))}
        </>
      )}
    </div>
  );
}

interface EventCardProps {
  event: TrainingEvent;
  theme: ThemeColors;
  mode: ThemeMode;
  isAdmin: boolean;
  currentUserId: number;
  members: AdventureMember[];
  isPast?: boolean;
  adventureId: number;
  onRsvp: (eventId: number, status: string) => void;
  onDelete: (eventId: number) => void;
  onStatusChange: (eventId: number, type: string, status: string) => void;
  onMarkAttendance: (eventId: number, attendeeIds: number[]) => void;
  onEdit: (eventId: number, data: Record<string, unknown>) => void;
  onRefresh: () => void;
}

interface EditFormState {
  date: string;
  period: string;
  time_label: string;
  location: string;
  notes: string;
}

function EventCard({ event, theme, mode, isAdmin, currentUserId, members, isPast, adventureId, onRsvp, onDelete, onStatusChange, onMarkAttendance, onEdit, onRefresh }: EventCardProps) {
  const myRsvp = event.rsvps?.find(r => r.user_id === currentUserId);
  const goingCount = event.rsvps?.filter(r => r.status === "going").length || 0;
  const cantCount = event.rsvps?.filter(r => r.status === "cant").length || 0;
  const noReply = (members?.length || 0) - goingCount - cantCount;
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendees, setAttendees] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ date: "", period: "all", time_label: "", location: "", notes: "" });
  const { addToast } = useToast();

  // Initialize attendees from existing attendance data
  useEffect(() => {
    if (event.attendance) {
      setAttendees(new Set(event.attendance.filter(a => a.attended).map(a => a.user_id)));
    }
  }, [event.attendance]);

  const statusColors = mode === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const datePassed = event.date < new Date().toISOString().slice(0, 10);
  const statusKey = event.status === "completed" ? "completed"
    : event.status === "cancelled" ? "cancelled"
    : event.type === "proposed" ? "proposed"
    : datePassed ? "overdue"
    : "scheduled";
  const statusInfo = statusColors[statusKey] || statusColors.scheduled;
  const STATUS_LABELS: Record<string, string> = { proposed: "Proposed", scheduled: "Scheduled", overdue: "Overdue", completed: "Completed", cancelled: "Cancelled" };
  const statusLabel = STATUS_LABELS[statusKey] || "Scheduled";
  const isCompleted = event.status === "completed";

  const toggleAttendee = (userId: number) => {
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
    <div className="tl-card mb-2 p-3" style={{
      opacity: event.status === "cancelled" ? 0.5 : 1,
      borderLeft: `3px solid ${statusInfo.border}`,
    }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="text-sm font-bold text-tl-heading">
              {formatDateFull(event.date)}
            </div>
            <span className="text-[9px] font-bold py-0.5 px-[7px] rounded-badge uppercase tracking-[0.5px]"
              style={{ background: statusInfo.bg, color: statusInfo.text }}>
              {statusLabel}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {event.time_label && (
              <span className="text-[11px] text-tl-text-dim flex items-center gap-[3px]">
                <Clock size={11} strokeWidth={2.5} />
                {event.time_label}
              </span>
            )}
            {event.location && (
              <span className="text-[11px] text-tl-text-dim flex items-center gap-[3px]">
                <MapPin size={11} strokeWidth={2.5} />
                {event.location}
              </span>
            )}
          </div>
          {event.notes && (
            <div className="text-[11px] text-tl-text-dimmer mt-[3px] italic">{event.notes}</div>
          )}
        </div>
        <div className="flex gap-1">
          {isAdmin && event.status !== "cancelled" && event.status !== "completed" && (
            <>
              <button onClick={() => { setEditing(true); setEditForm({ date: event.date, period: event.period || "all", time_label: event.time_label || "", location: event.location || "", notes: event.notes || "" }); }}
                className="bg-none border-none cursor-pointer p-1 text-tl-text-dimmest" title="Edit event">
                <Pencil size={14} strokeWidth={2} />
              </button>
              <button onClick={() => onDelete(event.id)}
                className="bg-none border-none cursor-pointer p-1 text-tl-text-dimmest" title="Delete event">
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="mt-2 py-2.5 px-3 bg-tl-bg-alt rounded-btn border border-tl-border">
          <div className="flex flex-col gap-1.5">
            <input type="date" value={editForm.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="py-1.5 px-2.5 rounded-badge-sm border border-tl-border bg-tl-card text-tl-text text-xs font-body" />
            <input placeholder="Time (e.g. 9:00 AM)" value={editForm.time_label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, time_label: e.target.value }))}
              className="py-1.5 px-2.5 rounded-badge-sm border border-tl-border bg-tl-card text-tl-text text-xs font-body" />
            <input placeholder="Location" value={editForm.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, location: e.target.value }))}
              className="py-1.5 px-2.5 rounded-badge-sm border border-tl-border bg-tl-card text-tl-text text-xs font-body" />
            <input placeholder="Notes" value={editForm.notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, notes: e.target.value }))}
              className="py-1.5 px-2.5 rounded-badge-sm border border-tl-border bg-tl-card text-tl-text text-xs font-body" />
          </div>
          <div className="flex gap-1.5 mt-2">
            <button onClick={async () => { await onEdit(event.id, editForm as unknown as Record<string, unknown>); setEditing(false); }}
              className="py-[5px] px-3.5 rounded-btn border-none bg-tl-accent text-white text-[11px] font-bold cursor-pointer font-body">Save</button>
            <button onClick={() => setEditing(false)}
              className="py-[5px] px-3.5 rounded-btn border border-tl-border bg-transparent text-tl-text-dim text-[11px] font-semibold cursor-pointer font-body">Cancel</button>
          </div>
        </div>
      )}

      {/* RSVP counts */}
      {event.status !== "cancelled" && (
        <div className="flex gap-2 mt-2 items-center">
          <span className="text-[11px] font-bold py-0.5 px-2 rounded-badge border border-[#5B7A3A40] text-[#5B7A3A]"
            style={{ background: goingCount > 0 ? (mode === "dark" ? "#2a3a20" : "#d4e4b820") : "transparent" }}>
            {goingCount} going
          </span>
          {cantCount > 0 && (
            <span className="text-[11px] font-bold py-0.5 px-2 rounded-badge text-[#b07060] border border-[#b0706040]">
              {cantCount} can't
            </span>
          )}
          {noReply > 0 && (
            <span className="text-[10px] text-tl-text-dimmest">{noReply} no reply</span>
          )}
        </div>
      )}

      {/* RSVP buttons */}
      {event.status !== "completed" && event.status !== "cancelled" && (
        <div className="flex gap-1.5 mt-2">
          <button onClick={() => onRsvp(event.id, "going")} className="py-[5px] px-3.5 rounded-btn text-xs font-semibold cursor-pointer flex items-center gap-1"
            style={{
              border: `1px solid ${myRsvp?.status === "going" ? "#5B7A3A" : theme.border}`,
              background: myRsvp?.status === "going" ? "#5B7A3A" : "transparent",
              color: myRsvp?.status === "going" ? "#fff" : theme.textDim,
            }}>
            <ThumbsUp size={12} strokeWidth={2.5} /> Going
          </button>
          <button onClick={() => onRsvp(event.id, "cant")} className="py-[5px] px-3.5 rounded-btn text-xs font-semibold cursor-pointer flex items-center gap-1"
            style={{
              border: `1px solid ${myRsvp?.status === "cant" ? "#b07060" : theme.border}`,
              background: myRsvp?.status === "cant" ? "#b07060" : "transparent",
              color: myRsvp?.status === "cant" ? "#fff" : theme.textDim,
            }}>
            <ThumbsDown size={12} strokeWidth={2.5} /> Can't
          </button>
        </div>
      )}

      {/* Admin action buttons */}
      {isAdmin && event.status !== "cancelled" && event.status !== "completed" && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {event.type === "proposed" && (
            <button onClick={() => onStatusChange(event.id, "scheduled", "active")}
              className="py-[5px] px-3 rounded-btn border border-tl-accent bg-tl-accent text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
              <Zap size={11} /> Confirm & Notify
            </button>
          )}
          {datePassed && (
            <button onClick={() => { onStatusChange(event.id, event.type, "completed"); setShowAttendance(true); }}
              className="py-[5px] px-3 rounded-btn border border-[#42A5F5] bg-[#42A5F5] text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
              <CheckCircle2 size={11} /> Complete & Mark Attendance
            </button>
          )}
          <button onClick={() => onStatusChange(event.id, event.type, "cancelled")}
            className="py-[5px] px-3 rounded-btn border border-tl-border bg-transparent text-tl-text-dim text-[11px] font-semibold cursor-pointer flex items-center gap-1">
            <XCircle size={11} /> Cancel
          </button>
        </div>
      )}

      {/* Attendance UI */}
      {isAdmin && (isCompleted || showAttendance) && (
        <div className="mt-2.5 py-2.5 px-3 bg-tl-bg-alt rounded-btn border border-tl-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-tl-heading">Attendance</span>
            <button onClick={() => {
              setAttendees(new Set(members.map(m => m.user_id).filter((id): id is number => id !== null)));
            }} className="text-[10px] font-semibold text-tl-accent bg-none border-none cursor-pointer font-body">Mark All Present</button>
          </div>
          {members?.map(m => {
            const attended = m.user_id !== null && attendees.has(m.user_id);
            return (
              <div key={m.user_id} onClick={() => m.user_id !== null && toggleAttendee(m.user_id)}
                className="flex items-center gap-2 py-[5px] cursor-pointer border-b border-tl-border">
                <div className={clsx(
                  "w-[18px] h-[18px] rounded-[4px] flex items-center justify-center border-2",
                  attended ? "border-tl-accent bg-tl-accent-bg" : "border-tl-border-light bg-transparent"
                )}>
                  {attended && <span className="text-xs text-tl-accent">{"\u2713"}</span>}
                </div>
                <span className={clsx("text-xs font-medium", attended ? "text-tl-text" : "text-tl-text-dim")}>{m.name}</span>
              </div>
            );
          })}
          <button onClick={saveAttendance}
            className="mt-2 py-1.5 px-4 rounded-btn border-none bg-tl-accent text-white text-xs font-bold cursor-pointer">Save Attendance</button>
        </div>
      )}

      {/* Self-report + attendance summary for non-admin on completed events */}
      {!isAdmin && isCompleted && (
        <div className="mt-2">
          {(() => {
            const myRecord = event.attendance?.find(a => a.user_id === currentUserId);
            const iAttended = myRecord?.attended === 1;
            return (
              <button onClick={async () => {
                try {
                  await api.selfReportAttendance(adventureId, event.id, !iAttended);
                  addToast(iAttended ? "Attendance removed" : "Marked as attended!", iAttended ? "info" : "success");
                  onRefresh && onRefresh(); // trigger refresh
                } catch { addToast("Failed to update attendance", "error"); }
              }} className="py-[5px] px-3.5 rounded-btn text-xs font-semibold cursor-pointer flex items-center gap-[5px]"
                style={{
                  border: `1px solid ${iAttended ? "#5B7A3A" : theme.border}`,
                  background: iAttended ? "#5B7A3A" : "transparent",
                  color: iAttended ? "#fff" : theme.textDim,
                }}>
                <CheckCircle2 size={13} strokeWidth={2.5} />
                {iAttended ? "I attended \u2713" : "I attended this"}
              </button>
            );
          })()}
          {event.attendance?.filter(a => a.attended).length && event.attendance.filter(a => a.attended).length > 0 && (
            <div className="text-[10px] text-tl-text-dimmer mt-[5px]">
              Attended: {event.attendance.filter(a => a.attended).map(a => (a as TrainingAttendance & { name?: string }).name).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Who's going for non-completed events */}
      {!isCompleted && event.rsvps && event.rsvps.length > 0 && (
        <div className="text-[10px] text-tl-text-dimmer mt-1.5">
          {event.rsvps.filter(r => r.status === "going").map(r => r.user_name).join(", ")}
          {cantCount > 0 && (
            <span className="text-[#b08070]">
              {goingCount > 0 ? " \u00B7 " : ""}Can't: {event.rsvps.filter(r => r.status === "cant").map(r => r.user_name).join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
