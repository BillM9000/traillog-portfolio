import { useCountdown } from "../hooks/useCountdown";
import { fontBody, fontDisplay } from "../utils/theme";

export default function Header({ members, analysis, saving, isAdmin, onAdminLogin, onAdminLogout }) {
  const countdown = useCountdown();

  return (
    <div style={{ background: "linear-gradient(135deg,#2d3830 0%,#1a2420 100%)", borderBottom: "1px solid #3d4a40", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: "#d4c8a8", margin: 0, letterSpacing: "-0.5px" }}>
            Crew 614 Training Coordinator
          </h1>
          <div style={{ fontSize: 12, color: "#8a9a8a", marginTop: 3 }}>
            Philmont 2026 &bull; Itinerary 12-20 &bull; Super Strenuous &bull; 69 mi &bull; 12 Days
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {saving && <span style={{ fontSize: 10, color: "#8a9a5a" }}>saving...</span>}
          {isAdmin ? (
            <>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#7aba7a", background: "#2a3d2e", padding: "3px 8px", borderRadius: 5, border: "1px solid #3d5a45" }}>
                ADMIN
              </span>
              <button onClick={onAdminLogout} style={{ fontSize: 10, color: "#8a6a5a", background: "none", border: "1px solid #5a4030", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>
                Lock
              </button>
            </>
          ) : (
            <button onClick={onAdminLogin} style={{ fontSize: 10, color: "#6a7a6a", background: "#252e28", border: "1px solid #3d4a40", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[
          [`${members.length}`, "members"],
          [`${analysis.windows.length}`, "windows found"],
          [`${analysis.bestDates.filter(d => d.count === members.length).length}`, "full-crew dates"],
          ["12,441'", "Baldy summit"],
        ].map(([v, l], i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#2a352e", padding: "3px 9px", borderRadius: 6, fontSize: 11, color: "#a0b0a0" }}>
            <strong style={{ color: "#d4c8a8" }}>{v}</strong> {l}
          </span>
        ))}
      </div>

      {/* Countdown */}
      {!countdown.gone && countdown.days !== undefined && (
        <div style={{ marginTop: 10, background: "#1a2420", borderRadius: 10, padding: "12px 16px", border: "1px solid #3d4a40", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8a6a4a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
              Travel: Sat 6/13 &ndash; Sat 6/27
            </div>
            <div style={{ fontSize: 10, color: "#5a6a5a" }}>Expedition: Sun 6/14 &ndash; Fri 6/26</div>
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
                  color: countdown.days <= 30 ? "#d4aa44" : countdown.days <= 60 ? "#c0b070" : "#d4c8a8",
                }}>{v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#5a6a5a", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: "0 0 auto", textAlign: "right" }}>
            {countdown.days <= 14 && <div style={{ fontSize: 11, fontWeight: 700, color: "#c06040" }}>GO TIME</div>}
            {countdown.days > 14 && countdown.days <= 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#d4aa44" }}>Crunch time</div>}
            {countdown.days > 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9a6a" }}>{countdown.weeks}w {countdown.remDays}d to travel</div>}
          </div>
        </div>
      )}
    </div>
  );
}
