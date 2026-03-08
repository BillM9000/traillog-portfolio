import { parseDateKey } from "../utils/dates";
import { formatDateShort, formatDateFull } from "../utils/dates";
import { card, cardTitle, badge, tag } from "../utils/theme";

export default function Results({ members, analysis }) {
  if (members.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: 28, background: "#232e27", borderRadius: 10, border: "1px solid #2d3830" }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📊</div>
        <div style={{ fontSize: 13, color: "#9aaa9a" }}>Need at least 2 members with availability to show analysis.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Individual Dates */}
      <div style={card}>
        <div style={cardTitle}>Top Individual Dates</div>
        {analysis.bestDates.length === 0 && <div style={{ fontSize: 12, color: "#5a6a5a" }}>No overlap yet.</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {analysis.bestDates.map(d => (
            <div key={d.key} style={{
              padding: "5px 9px", borderRadius: 6, fontSize: 11,
              background: d.count === members.length ? "#2a3d2e" : "#282e28",
              border: d.count === members.length ? "1.5px solid #4a7a55" : "1px solid #2d3830",
            }}>
              <div style={{ fontWeight: 700, color: d.count === members.length ? "#7aba7a" : "#c0d0c0" }}>
                {formatDateShort(d.key)} <span style={{ fontWeight: 400, color: "#5a6a5a" }}>({d.dayName})</span>
              </div>
              <div style={{ fontSize: 10, color: "#6a7a6a", marginTop: 1 }}>
                {d.count}/{members.length} — {d.names.join(", ")}
                {d.missing.length > 0 && <span style={{ color: "#8a6a5a" }}> (w/o {d.missing.join(", ")})</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Windows */}
      <div style={{ ...cardTitle, marginTop: 14, marginBottom: 6 }}>Recommended Training Windows</div>
      {analysis.windows.length === 0 && <div style={{ ...card, fontSize: 12, color: "#5a6a5a" }}>No windows yet.</div>}
      {analysis.windows.map((w, i) => (
        <div key={i} style={{
          background: i === 0 ? "#2a3d2e" : "#232e27", borderRadius: 9, padding: 12, marginBottom: 6,
          border: i === 0 ? "1.5px solid #4a7a55" : "1px solid #2d3830",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={badge(w.pct === 100 ? "#3d6a45" : w.pct >= 70 ? "#5a7a3d" : "#7a6a30")}>{w.pct}% crew</span>
              <span style={badge("#2d3830")}>{w.length}d</span>
              {i === 0 && <span style={badge("#6a4a20")}>Top Pick</span>}
            </div>
            <span style={{ fontSize: 10, color: "#4a5a4a" }}>{w.suggestion}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#d4c8a8", margin: "6px 0 2px" }}>
            {formatDateFull(w.start)}{w.start !== w.end ? ` → ${formatDateFull(w.end)}` : ""}
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "#1a2420", overflow: "hidden", margin: "4px 0" }}>
            <div style={{ height: "100%", width: `${w.pct}%`, background: w.pct === 100 ? "#5aaa65" : w.pct >= 70 ? "#7aaa55" : "#aa8a44", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 11, color: "#7a8a7a" }}>
            {w.consistentNames.join(", ")}
            {w.missing.length > 0 && <span> &nbsp; <span style={{ color: "#b08070" }}>{w.missing.join(", ")}</span></span>}
          </div>
          {w.length >= 2 && (
            <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 3 }}>
              {["Loaded hike", "Bear bag drill"].map(t => <span key={t} style={tag()}>{t}</span>)}
              {w.length >= 2 && <span style={tag()}>Overnight shakedown</span>}
              {w.length >= 3 && <span style={tag("#302520")}>Dry camp water drill</span>}
            </div>
          )}
        </div>
      ))}

      {/* Member Summary */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={cardTitle}>Member Summary</div>
        {members.map((m, i) => {
          const fc = m.dates.filter(d => parseDateKey(d) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderBottom: i < members.length - 1 ? "1px solid #2a332c" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color.bg }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#d0ccc6", flex: 1 }}>{m.name}</span>
              <span style={{ fontSize: 11, color: "#6a7a6a" }}>{fc}d avail</span>
              <div style={{ width: 50, height: 3, borderRadius: 2, background: "#1a2420", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, fc * 1.5)}%`, background: m.color.bg, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
