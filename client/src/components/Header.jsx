import { useState, useRef, useEffect } from "react";
import { useCountdown } from "../hooks/useCountdown";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../api";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";

export default function Header({ user, troop, adventure, members, analysis, trekDates, trekDate, saving, isAdmin, approvedTroops, onSwitchTroop, onBackToAdventures, onLogout, onAdminClick, onRefreshAuth }) {
  const countdown = useCountdown(trekDates || trekDate);
  const { theme, mode, toggle } = useTheme();
  const { addToast } = useToast();
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const profileRef = useRef(null);

  const adventureName = adventure?.name || "Loading...";
  const troopName = troop?.name || "";

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    try {
      await api.updateProfile({ name: editName.trim() });
      if (onRefreshAuth) onRefreshAuth();
      addToast("Profile updated", "success");
      setShowProfile(false);
    } catch (e) { addToast(e.message, "error"); }
    setSavingProfile(false);
  };

  const showCountdown = countdown.days !== undefined && !countdown.gone && !countdown.onTrek;
  const showOnTrek = countdown.onTrek;
  const showComplete = countdown.gone && countdown.phase === "complete";

  return (
    <div style={{ background: theme.bgHeader, borderBottom: `1px solid ${theme.borderLight}`, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={28} />
          <div>
            {troopName && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <button onClick={onBackToAdventures} style={{ fontSize: 11, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", background: "none", border: "none", cursor: "pointer", fontFamily: fontBody, padding: 0, textDecoration: "underline" }}>{troopName}</button>
                <span style={{ fontSize: 11, color: mode === "dark" ? "#5a6a5a" : "#a0b0a0" }}>/</span>
              </div>
            )}
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: mode === "dark" ? "#d4c8a8" : "#fff", margin: 0, letterSpacing: "-0.5px" }}>{adventureName}</h1>
            <div style={{ fontSize: 11, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", marginTop: 2 }}>
              {trekDates?.arrive && new Date(trekDates.arrive).getFullYear()}
              {!trekDates?.arrive && trekDate && new Date(trekDate).getFullYear()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {saving && <span style={{ fontSize: 10, color: "#8a9a5a" }}>saving...</span>}
          {isAdmin && <button onClick={onAdminClick} style={{ fontSize: 10, fontWeight: 700, color: "#7aba7a", background: "#2a3d2e", padding: "3px 8px", borderRadius: 5, border: "1px solid #3d5a45", cursor: "pointer", fontFamily: fontBody }}>ADMIN</button>}
          {approvedTroops.length > 1 && (
            <select onChange={e => onSwitchTroop(parseInt(e.target.value))} value={troop?.id || ""} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: mode === "dark" ? "#a0b0a0" : "#d0e0d0", fontFamily: fontBody, cursor: "pointer" }}>
              {approvedTroops.map(t => <option key={t.troop_id} value={t.troop_id}>{t.troop_name}</option>)}
            </select>
          )}
          <button onClick={toggle} title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} style={{ fontSize: 14, background: "none", border: "1px solid rgba(255,255,255,0.2)", padding: "2px 7px", borderRadius: 5, cursor: "pointer", lineHeight: 1, color: mode === "dark" ? "#d4c8a8" : "#fff" }}>
            {mode === "dark" ? "\u2600" : "\u263D"}
          </button>
          <div ref={profileRef} style={{ position: "relative" }}>
            <div onClick={() => { setEditName(user.name || ""); setShowProfile(!showProfile); }} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "2px 6px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}>
              {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%" }} />}
              <span style={{ fontSize: 10, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name?.split(" ")[0]}</span>
            </div>
            {showProfile && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", padding: 14, width: 220, zIndex: 100 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 6 }}>Profile</div>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", boxSizing: "border-box", marginBottom: 6 }} onKeyDown={e => e.key === "Enter" && saveProfile()} />
                <div style={{ fontSize: 10, color: theme.textDimmer, marginBottom: 8 }}>{user.user_type === "adult" ? "Adult Leader" : "Scout"} &bull; {user.email}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, padding: "6px 0", borderRadius: 5, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>{savingProfile ? "..." : "Save"}</button>
                  <button onClick={onLogout} style={{ flex: 1, padding: "6px 0", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.warn, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[
          [`${members.length}`, "members"],
          [`${analysis.windows.length}`, "training windows"],
          [`${analysis.bestDates.filter(d => d.count === members.length).length}`, "full-crew dates"],
        ].map(([v, l], i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.15)", padding: "3px 9px", borderRadius: 6, fontSize: 11, color: mode === "dark" ? "#a0b0a0" : "#d0e0d0" }}>
            <strong style={{ color: mode === "dark" ? "#d4c8a8" : "#fff" }}>{v}</strong> {l}
          </span>
        ))}
      </div>

      {showCountdown && (
        <div style={{ marginTop: 10, background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#d4aa6a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{countdown.label} in</div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {[[String(countdown.days).padStart(2, "0"), "days"], [String(countdown.hours).padStart(2, "0"), "hrs"], [String(countdown.minutes).padStart(2, "0"), "min"], [String(countdown.seconds).padStart(2, "0"), "sec"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center", minWidth: 44 }}>
                <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, lineHeight: 1, color: countdown.days <= 30 ? "#d4aa44" : countdown.days <= 60 ? "#c0b070" : mode === "dark" ? "#d4c8a8" : "#fff" }}>{v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: "0 0 auto", textAlign: "right" }}>
            {countdown.days <= 14 && <div style={{ fontSize: 11, fontWeight: 700, color: "#c06040" }}>GO TIME</div>}
            {countdown.days > 14 && countdown.days <= 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#d4aa44" }}>Crunch time</div>}
            {countdown.days > 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9a6a" }}>{countdown.weeks}w {countdown.remDays}d</div>}
          </div>
        </div>
      )}

      {showOnTrek && (
        <div style={{ marginTop: 10, background: "rgba(74,122,85,0.3)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(74,122,85,0.5)", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#7aba7a", fontFamily: fontDisplay }}>{countdown.label}</div>
          <div style={{ fontSize: 11, color: "#a0c0a0", marginTop: 2 }}>On the trail!</div>
        </div>
      )}

      {showComplete && (
        <div style={{ marginTop: 10, background: "rgba(212,170,106,0.15)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(212,170,106,0.3)", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#d4aa6a", fontFamily: fontDisplay }}>{countdown.label}</div>
        </div>
      )}
    </div>
  );
}
