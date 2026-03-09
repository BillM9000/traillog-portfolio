import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import Logo from "./Logo";

export default function Lobby({ user, memberships, onRefresh, onLogout }) {
  const { theme } = useTheme();
  const [troops, setTroops] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTroop, setNewTroop] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTroops().then(setTroops).catch(console.error);
  }, []);

  const handleJoin = async (troopId) => {
    try {
      await api.joinTroop(troopId);
      await onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTroop.name.trim()) return setError("Troop name required");
    setLoading(true);
    setError("");
    try {
      await api.createTroop(newTroop);
      await onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = memberships.filter(m => m.status === "pending");

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody,
    outline: "none", marginBottom: 8, boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      fontFamily: fontBody, color: theme.text,
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 800, color: theme.heading, margin: 0 }}>
              Trail<span style={{ color: theme.accentLight }}>Log</span>
            </h1>
            <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>Welcome, {user.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
          <button onClick={onLogout} style={{
            fontSize: 11, color: theme.warn, background: "none", border: `1px solid ${theme.warnBg}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 20px" }}>
        {pendingRequests.length > 0 && (
          <div style={{ ...card(theme), border: `1px solid ${theme.gold}40` }}>
            <div style={{ ...cardTitle(theme), color: theme.gold }}>Pending Requests</div>
            {pendingRequests.map(m => (
              <div key={m.troop_id} style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>
                <strong>{m.troop_name}</strong> — waiting for admin approval...
              </div>
            ))}
          </div>
        )}

        <div style={card(theme)}>
          <div style={cardTitle(theme)}>Available Troops</div>
          {troops.length === 0 ? (
            <p style={{ fontSize: 12, color: theme.textDim, fontStyle: "italic" }}>No troops yet. Create one to get started!</p>
          ) : (
            troops.map(t => {
              const membership = memberships.find(m => m.troop_id === t.id);
              return (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, marginBottom: 6,
                  border: `1px solid ${theme.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 11, color: theme.textDim }}>{t.description}</div>}
                  </div>
                  {membership ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                      background: membership.status === "approved" ? theme.accentBg : `${theme.gold}20`,
                      color: membership.status === "approved" ? theme.accentLight : theme.gold,
                      border: `1px solid ${membership.status === "approved" ? theme.borderAccent : theme.gold}40`,
                    }}>
                      {membership.status === "approved" ? "Joined" : "Pending"}
                    </span>
                  ) : (
                    <button onClick={() => handleJoin(t.id)} style={{
                      padding: "5px 12px", borderRadius: 6, border: "none", background: theme.accent,
                      color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                    }}>Request to Join</button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!showCreate ? (
          <button onClick={() => setShowCreate(true)} style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
            background: "transparent", color: theme.accent, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: fontBody,
          }}>+ Create a New Troop</button>
        ) : (
          <div style={card(theme)}>
            <div style={cardTitle(theme)}>Create a Troop</div>
            <form onSubmit={handleCreate}>
              <input value={newTroop.name} onChange={e => setNewTroop({ ...newTroop, name: e.target.value })}
                placeholder="Troop or crew name (e.g. Crew 614)" style={inputStyle} required />
              <input value={newTroop.description} onChange={e => setNewTroop({ ...newTroop, description: e.target.value })}
                placeholder="Description (optional)" style={inputStyle} />
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
