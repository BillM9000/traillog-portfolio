import { useState } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay } from "../utils/theme";

export default function AdminPanel({ troop, adventure, troopMembers, adventureMembers, onClose, onRefresh }) {
  const { theme } = useTheme();
  const [tab, setTab] = useState("adventure");
  const [troopName, setTroopName] = useState(troop?.name || "");
  const [troopDesc, setTroopDesc] = useState(troop?.description || "");
  const [advName, setAdvName] = useState(adventure?.name || "");
  const [advDate, setAdvDate] = useState(adventure?.trek_date || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const normalize = (s) => s.replace(/\s+/g, " ").trim();

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveTroop = async () => {
    setSaving(true);
    const cleanName = normalize(troopName);
    const cleanDesc = normalize(troopDesc);
    setTroopName(cleanName);
    setTroopDesc(cleanDesc);
    try {
      await api.updateTroop(troop.id, { name: cleanName, description: cleanDesc });
      onRefresh();
      showSaved();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const saveAdventure = async () => {
    setSaving(true);
    const cleanName = normalize(advName);
    setAdvName(cleanName);
    try {
      await api.updateAdventure(adventure.id, { name: cleanName, trek_date: advDate });
      onRefresh();
      showSaved();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const addMemberToAdventure = async (userId) => {
    try {
      await api.addAdventureMember(adventure.id, userId, "member");
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  const removeMemberFromAdventure = async (userId) => {
    try {
      await api.removeAdventureMember(adventure.id, userId);
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  // Troop members not yet in this adventure
  const advMemberIds = new Set((adventureMembers || []).map(m => m.user_id));
  const availableMembers = (troopMembers || []).filter(m => m.status === "approved" && !advMemberIds.has(m.user_id));

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody,
    outline: "none", marginBottom: 8, boxSizing: "border-box",
  };

  const tabs = [
    ["adventure", "Adventure"],
    ["members", "Members"],
    ["troop", "Troop"],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.bgCard, borderRadius: 14, padding: 0, width: 380, maxHeight: "80vh",
        overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: theme.heading }}>Admin Panel</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: theme.textDimmer, cursor: "pointer", lineHeight: 1 }}>&times;</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${theme.border}` }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
              background: tab === k ? theme.bgAlt : "transparent", color: tab === k ? theme.text : theme.textDimmer,
              border: "none", borderBottom: tab === k ? `2px solid ${theme.accent}` : "2px solid transparent",
            }}>{l}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          {tab === "adventure" && (
            <>
              <label style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Adventure Name</label>
              <input value={advName} onChange={e => setAdvName(e.target.value)} style={inputStyle} />
              <label style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Trek Date</label>
              <input value={advDate} onChange={e => setAdvDate(e.target.value)} type="date" style={inputStyle} />
              <button onClick={saveAdventure} disabled={saving} style={{
                width: "100%", padding: "10px 0", borderRadius: 7, border: "none",
                background: saved ? "#2a5a30" : theme.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: saving ? "wait" : "pointer", fontFamily: fontBody, marginTop: 4, transition: "background .3s",
              }}>{saving ? "Saving..." : saved ? "Saved \u2713" : "Save Adventure"}</button>
            </>
          )}

          {tab === "members" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 8 }}>Adventure Members</div>
              {(adventureMembers || []).map(m => (
                <div key={m.user_id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", background: theme.bgAlt, borderRadius: 7, marginBottom: 4,
                  border: `1px solid ${theme.border}`,
                }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: theme.textDim, marginLeft: 6 }}>{m.role}</span>
                  </div>
                  {m.role !== "admin" && (
                    <button onClick={() => removeMemberFromAdventure(m.user_id)} style={{
                      fontSize: 10, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`,
                      padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody,
                    }}>Remove</button>
                  )}
                </div>
              ))}

              {availableMembers.length > 0 ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 14, marginBottom: 8 }}>Add from Troop</div>
                  {availableMembers.map(m => (
                    <div key={m.user_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", background: theme.bgAlt, borderRadius: 7, marginBottom: 4,
                      border: `1px solid ${theme.border}`,
                    }}>
                      <span style={{ fontSize: 12, color: theme.text }}>{m.name}</span>
                      <button onClick={() => addMemberToAdventure(m.user_id)} style={{
                        fontSize: 10, color: theme.accent, background: "none", border: `1px solid ${theme.borderAccent}`,
                        padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody,
                      }}>Add</button>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ marginTop: 14, padding: "12px 14px", background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 6 }}>Invite New Members</div>
                  <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.5 }}>
                    All troop members are already in this adventure. To add new people:
                  </div>
                  <ol style={{ fontSize: 11, color: theme.textDim, margin: "6px 0 0 16px", padding: 0, lineHeight: 1.8 }}>
                    <li>Have them sign in at <strong style={{ color: theme.accent }}>treksync.gracezero.ai</strong></li>
                    <li>They search for and request to join your troop</li>
                    <li>You approve them on the troop page, then add them here</li>
                  </ol>
                </div>
              )}
            </>
          )}

          {tab === "troop" && (
            <>
              <label style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Troop Name</label>
              <input value={troopName} onChange={e => setTroopName(e.target.value)} style={inputStyle} />
              <label style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Description</label>
              <input value={troopDesc} onChange={e => setTroopDesc(e.target.value)} style={inputStyle} />
              <button onClick={saveTroop} disabled={saving} style={{
                width: "100%", padding: "10px 0", borderRadius: 7, border: "none",
                background: saved ? "#2a5a30" : theme.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: saving ? "wait" : "pointer", fontFamily: fontBody, marginTop: 4, transition: "background .3s",
              }}>{saving ? "Saving..." : saved ? "Saved \u2713" : "Save Troop"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
