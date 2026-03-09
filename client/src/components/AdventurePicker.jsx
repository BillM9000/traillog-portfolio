import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import Logo from "./Logo";

export default function AdventurePicker({ user, troop, isAdmin, onSelect, onBack, onLogout, skipAutoSelect }) {
  const { theme } = useTheme();
  const [adventures, setAdventures] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getAdventures(troop.id).then(advs => {
      setAdventures(advs);
      // Auto-enter if only 1 active adventure (unless user explicitly navigated back)
      const active = advs.filter(a => a.status === "active");
      if (active.length === 1 && !skipAutoSelect) onSelect(active[0].id);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [troop.id]);

  const openCreate = async () => {
    if (itineraries.length === 0) {
      try { setItineraries(await api.getItineraries()); } catch {}
    }
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Adventure name required");
    setLoading(true);
    setError("");
    try {
      const adv = await api.createAdventure(troop.id, form);
      onSelect(adv.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
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
            <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>Select an adventure</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{
            fontSize: 11, color: theme.accent, background: "none", border: `1px solid ${theme.borderAccent}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Back</button>
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
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
                    {a.itinerary_id && `Itinerary ${a.itinerary_id}`}
                    {(a.arrive_date || a.trek_date) && ` \u2022 ${a.arrive_date || a.trek_date}`}
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
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Adventure name (e.g. Philmont 2026)" style={inputStyle} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>Depart Home</label>
                  <input value={form.depart_date} onChange={e => setForm({ ...form, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>Arrive Philmont</label>
                  <input value={form.arrive_date} onChange={e => setForm({ ...form, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>Depart Philmont</label>
                  <input value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>Return Home</label>
                  <input value={form.home_date} onChange={e => setForm({ ...form, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
              </div>
              <select value={form.itinerary_id} onChange={e => setForm({ ...form, itinerary_id: e.target.value })}
                style={{ ...inputStyle, color: form.itinerary_id ? theme.text : theme.textDim }}>
                <option value="">Select itinerary...</option>
                {itineraries.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.days} days, {it.miles} mi, {it.rating})
                  </option>
                ))}
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
