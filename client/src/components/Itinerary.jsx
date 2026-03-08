import { ITINERARY } from "../utils/constants";
import { card, cardTitle, tag, fontDisplay } from "../utils/theme";

export default function Itinerary() {
  return (
    <div style={card}>
      <div style={cardTitle}>Itinerary 12-20 Quick Reference</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {[["Staffed", "#2a3530"], ["Dry Camp", "#302520"], ["Layover", "#302d20"], ["Trail/Base", "#252e28"]].map(([l, bg]) => (
          <span key={l} style={tag(bg)}>{l}</span>
        ))}
      </div>

      {ITINERARY.map(it => (
        <div key={it.day} style={{
          display: "flex", gap: 10, padding: "9px 10px", borderRadius: 7, marginBottom: 3, alignItems: "flex-start",
          background: it.type === "Dry Camp" ? "#2a2520" : it.type === "Staffed" ? "#202d28" : it.type === "Layover" ? "#2d2a20" : "#232e27",
          border: it.type === "Layover" ? "1.5px solid #aa8a44" : "1px solid #2a332c",
        }}>
          <div style={{ width: 30, textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#5a6a5a", fontWeight: 700 }}>DAY</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d4c8a8", fontFamily: fontDisplay }}>{it.day}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: it.type === "Layover" ? "#d4aa44" : it.type === "Dry Camp" ? "#c08a5a" : "#b8c8b8" }}>
              {it.camp}
            </div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 1 }}>{it.notes}</div>
          </div>
          <div style={{ textAlign: "right", minWidth: 55, flexShrink: 0 }}>
            {it.miles > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#90a090" }}>{it.miles}mi</div>}
            {it.gain > 0 && <div style={{ fontSize: 9, color: "#4a7a4a" }}>+{it.gain.toLocaleString()}'</div>}
            {it.loss > 0 && <div style={{ fontSize: 9, color: "#7a4a4a" }}>-{it.loss.toLocaleString()}'</div>}
          </div>
          <span style={{ ...tag(it.type === "Staffed" ? "#2a3530" : it.type === "Dry Camp" ? "#302520" : it.type === "Layover" ? "#302d20" : "#252e28"), fontSize: 9, whiteSpace: "nowrap" }}>
            {it.type}
          </span>
        </div>
      ))}

      <div style={{ marginTop: 10, padding: "10px 11px", background: "#2a2520", borderRadius: 7, border: "1px solid #3d3028" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#d4aa6a" }}>Key Training Priorities</div>
        <div style={{ fontSize: 11, color: "#a09080", lineHeight: 1.9, marginTop: 4 }}>
          {[
            ["Water carry:", "3 dry camps (Days 5, 6, 11) — practice hauling 4-6L/person"],
            ["Big days:", "Day 5 (8.2mi) + Day 9 (11.9mi Baldy) — build to loaded 10+ mi"],
            ["Elevation:", "Day 9 = 6,650' gain+loss — stair/hill training essential"],
            ["Heat:", "Days 5-6 burn zone, full sun — train in heat when possible"],
            ["Early starts:", "Multiple pre-dawn departures required"],
            ["Shakedowns:", "Min 2 full overnights with loaded packs before arrival"],
          ].map(([b, t]) => (
            <div key={b}><strong style={{ color: "#d4c8a8" }}>{b}</strong> {t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
