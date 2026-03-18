import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import type { User, Adventure, AdventureType } from "../types";

interface Troop {
  id: number;
  name: string;
  council?: string;
  location?: string;
}

interface Itinerary {
  id: string;
  name: string;
  days: number;
  miles: number;
  rating: string;
  stops?: unknown[];
}

interface AdventureForm {
  name: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
  adventure_type: string;
}

interface AdventureWithStatus extends Adventure {
  status?: "active" | "archived";
}

interface AdventurePickerProps {
  user: User;
  troop: Troop;
  isAdmin: boolean;
  onSelect: (adventureId: number) => void;
  onBack: () => void;
  onLogout: () => void;
  skipAutoSelect?: boolean;
  isGlobalAdmin?: boolean;
  onGlobalAdminClick?: () => void;
}

export default function AdventurePicker({ user, troop, isAdmin, onSelect, onBack, onLogout, skipAutoSelect, isGlobalAdmin, onGlobalAdminClick }: AdventurePickerProps) {
  const { theme } = useTheme();
  const [adventures, setAdventures] = useState<AdventureWithStatus[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AdventureForm>({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getAdventures(troop.id).then((advs: AdventureWithStatus[]) => {
      setAdventures(advs);
      // Auto-enter if only 1 active adventure (unless user explicitly navigated back)
      const active = advs.filter(a => a.status === "active");
      if (active.length === 1 && !skipAutoSelect) onSelect(active[0].id);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [troop.id]);

  const openCreate = async () => {
    if (itineraries.length === 0) {
      try { setItineraries(await api.getItineraries() as unknown as Itinerary[]); } catch {}
    }
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Adventure name required");
    setLoading(true);
    setError("");
    try {
      const adv = await api.createAdventure(troop.id, form as unknown as Record<string, unknown>);
      onSelect(adv.id);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody,
    outline: "none", marginBottom: 8, boxSizing: "border-box",
  };

  if (fetching) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: theme.textDim, fontSize: 14, fontFamily: fontBody }}>Loading adventures...</div>
      </div>
    );
  }

  const activeAdventures = adventures.filter(a => a.status === "active");

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: fontBody, color: theme.text }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 800, color: theme.heading, margin: 0 }}>
              {troop.name}
            </h1>
            {troop.council && (
              <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: fontBody }}>
                {[troop.council, troop.location].filter(Boolean).join(" · ")}
              </div>
            )}
            <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>Select an adventure</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{
            fontSize: 11, color: theme.accent, background: "none", border: `1px solid ${theme.borderAccent}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Back</button>
          {isGlobalAdmin && (
            <button onClick={onGlobalAdminClick} style={{
              fontSize: 11, color: theme.accent, background: "none", border: `1px solid ${theme.accent}40`,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
            }}>🌐 Platform Admin</button>
          )}
          <button onClick={onLogout} style={{
            fontSize: 11, color: theme.warn, background: "none", border: `1px solid ${theme.warnBg}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 20px" }}>
        <div style={card(theme)}>
          <div style={cardTitle(theme)}>Adventures</div>
          {activeAdventures.length === 0 && !showCreate ? (
            <p style={{ fontSize: 12, color: theme.textDim, fontStyle: "italic" }}>
              No adventures yet. {isAdmin ? "Create one to get started!" : "Ask an admin to create an adventure."}
            </p>
          ) : (
            activeAdventures.map(a => (
              <div key={a.id} onClick={() => onSelect(a.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", background: theme.bgAlt, borderRadius: 8, marginBottom: 6,
                border: `1px solid ${theme.border}`, cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{(ADVENTURE_TYPES as AdventureType[]).find(t => t.id === a.adventure_type)?.icon || "🏔️"}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
                      {a.itinerary_id && `Itinerary ${a.itinerary_id}`}
                      {(a.arrive_date || a.trek_date) && ` \u2022 ${a.arrive_date || a.trek_date}`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 18, color: theme.textDimmer }}>›</span>
              </div>
            ))
          )}
        </div>

        {isAdmin && !showCreate && (
          <button onClick={openCreate} style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
            background: "transparent", color: theme.accent, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: fontBody,
          }}>+ Create Adventure</button>
        )}

        {isAdmin && showCreate && (
          <div style={card(theme)}>
            <div style={cardTitle(theme)}>New Adventure</div>
            <form onSubmit={handleCreate}>
              {/* Adventure Type Selector */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Adventure Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {(ADVENTURE_TYPES as AdventureType[]).map(t => (
                    <button key={t.id} type="button" disabled={!t.enabled}
                      onClick={() => t.enabled && setForm({ ...form, adventure_type: t.id })}
                      style={{
                        padding: "10px 12px", borderRadius: 8, cursor: t.enabled ? "pointer" : "default",
                        border: form.adventure_type === t.id ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                        background: form.adventure_type === t.id ? theme.accentBg : t.enabled ? theme.bgAlt : theme.bgAlt,
                        opacity: t.enabled ? 1 : 0.45, textAlign: "left", fontFamily: fontBody,
                        position: "relative",
                      }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.enabled ? theme.heading : theme.textDim }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>{t.location}</div>
                      {!t.enabled && (
                        <div style={{
                          position: "absolute", top: 6, right: 8, fontSize: 8, fontWeight: 700,
                          color: theme.textDim, background: theme.border, padding: "2px 6px", borderRadius: 4,
                          textTransform: "uppercase", letterSpacing: 0.5,
                        }}>Coming Soon</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={`Adventure name (e.g. ${((ADVENTURE_TYPES as AdventureType[]).find(t => t.id === form.adventure_type)?.name || "Philmont")} 2026)`}
                style={inputStyle} required />
              {(() => {
                const labels = (ADVENTURE_TYPES as AdventureType[]).find(t => t.id === form.adventure_type)?.dateLabels || (ADVENTURE_TYPES as AdventureType[])[0].dateLabels;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.depart}</label>
                      <input value={form.depart_date} onChange={e => setForm({ ...form, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.arrive}</label>
                      <input value={form.arrive_date} onChange={e => setForm({ ...form, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.return}</label>
                      <input value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.home}</label>
                      <input value={form.home_date} onChange={e => setForm({ ...form, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                  </div>
                );
              })()}
              <select value={form.itinerary_id} onChange={e => setForm({ ...form, itinerary_id: e.target.value })}
                style={{ ...inputStyle, color: form.itinerary_id ? theme.text : theme.textDim }}>
                <option value="">Select itinerary...</option>
                {[12, 9, 7].map(days => {
                  const group = itineraries.filter(it => it.days === days).sort((a, b) => {
                    const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                    return na - nb;
                  });
                  return group.length > 0 ? (
                    <optgroup key={days} label={`${days}-Day Treks`}>
                      {group.map(it => <option key={it.id} value={it.id}>{it.name} ({it.miles} mi, {it.rating})</option>)}
                    </optgroup>
                  ) : null;
                })}
              </select>
              {error && <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                }}>Cancel</button>
                <button type="submit" disabled={loading} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                  cursor: loading ? "wait" : "pointer", fontFamily: fontBody,
                }}>{loading ? "..." : "Create"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
