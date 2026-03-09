import { useCountdown } from "../hooks/useCountdown";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay } from "../utils/theme";

export default function Header({ user, troop, adventure, members, analysis, trekDate, saving, isAdmin, approvedTroops, onSwitchTroop, onBackToAdventures, onLogout, onAdminClick }) {
  const countdown = useCountdown(trekDate);
  const { theme, mode, toggle } = useTheme();

  const adventureName = adventure?.name || "Loading...";
  const troopName = troop?.name || "";
  const itinId = adventure?.itinerary_id;

  return (
    <div style={{ background: theme.bgHeader, borderBottom: `1px solid ${theme.borderLight}`, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          {/* Breadcrumb: Troop > Adventure */}
          {troopName && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <button onClick={onBackToAdventures} style={{
                fontSize: 11, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", background: "none", border: "none",
                cursor: "pointer", fontFamily: fontBody, padding: 0, textDecoration: "underline",
              }}>{troopName}</button>
              <span style={{ fontSize: 11, color: mode === "dark" ? "#5a6a5a" : "#a0b0a0" }}>/</span>
            </div>
          )}
          <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: mode === "dark" ? "#d4c8a8" : "#fff", margin: 0, letterSpacing: "-0.5px" }}>
            {adventureName}
          </h1>
          <div style={{ fontSize: 11, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", marginTop: 2 }}>
            {trekDate && new Date(trekDate).getFullYear()}
            {itinId && <> &bull; Itinerary {itinId}</>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {saving && <span style={{ fontSize: 10, color: "#8a9a5a" }}>saving...</span>}
          {isAdmin && (
            <button onClick={onAdminClick} style={{
              fontSize: 10, fontWeight: 700, color: "#7aba7a", background: "#2a3d2e",
              padding: "3px 8px", borderRadius: 5, border: "1px solid #3d5a45", cursor: "pointer",
              fontFamily: fontBody,
            }}>ADMIN</button>
          )}
          {approvedTroops.length > 1 && (
            <select onChange={e => onSwitchTroop(parseInt(e.target.value))} value={troop?.id || ""}
              style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: mode === "dark" ? "#a0b0a0" : "#d0e0d0", fontFamily: fontBody, cursor: "pointer" }}>
              {approvedTroops.map(t => (
                <option key={t.troop_id} value={t.troop_id}>{t.troop_name}</option>
              ))}
            </select>
          )}
          <button onClick={toggle} title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            style={{ fontSize: 14, background: "none", border: "1px solid rgba(255,255,255,0.2)", padding: "2px 7px", borderRadius: 5, cursor: "pointer", lineHeight: 1, color: mode === "dark" ? "#d4c8a8" : "#fff" }}>
            {mode === "dark" ? "\u2600" : "\u263D"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%" }} />}
            <span style={{ fontSize: 10, color: mode === "dark" ? "#8a9a8a" : "#c0d0c0", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name?.split(" ")[0]}
            </span>
            <button onClick={onLogout} style={{ fontSize: 10, color: "#e0c0b0", background: "none", border: "1px solid rgba(255,255,255,0.2)", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
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

      {/* Countdown */}
      {trekDate && !countdown.gone && countdown.days !== undefined && (
        <div style={{ marginTop: 10, background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#d4aa6a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
              Trek Countdown
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              [String(countdown.days).padStart(2, "0"), "days"],
              [String(countdown.hours).padStart(2, "0"), "hrs"],
              [String(countdown.minutes).padStart(2, "0"), "min"],
              [String(countdown.seconds).padStart(2, "0"), "sec"],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center", minWidth: 44 }}>
                <div style={{
                  fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, lineHeight: 1,
                  color: countdown.days <= 30 ? "#d4aa44" : countdown.days <= 60 ? "#c0b070" : mode === "dark" ? "#d4c8a8" : "#fff",
                }}>{v}</div>
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
    </div>
  );
}
