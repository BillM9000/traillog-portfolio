import { useState, useEffect, useCallback } from "react";
import { DAYS_ABBR, MONTH_NAMES } from "../utils/constants";
import { daysInMonth, dateKey, dayOfWeek, isPast } from "../utils/dates";
import { toolbarBtn } from "../utils/theme";

export default function Calendar({ members, active, months, analysis, onToggleDate, onBulkSelect, onClearAll }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const am = active !== null ? members[active] : null;

  const onDown = useCallback((key) => {
    if (active === null) return;
    setIsDragging(true);
    const mode = members[active].dates.includes(key) ? "remove" : "add";
    setDragMode(mode);
    onToggleDate(key, mode);
  }, [active, members, onToggleDate]);

  const onEnter = useCallback((key) => {
    if (isDragging && dragMode) onToggleDate(key, dragMode);
  }, [isDragging, dragMode, onToggleDate]);

  useEffect(() => {
    const up = () => { setIsDragging(false); setDragMode(null); };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  return (
    <div>
      {active !== null && (
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => onBulkSelect("weekends")} style={toolbarBtn("primary")}>+ All Weekends</button>
          <button onClick={() => onBulkSelect("all")} style={toolbarBtn()}>+ All Days</button>
          <button onClick={onClearAll} style={toolbarBtn()}>Clear Mine</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#4a5a4a" }}>Drag to select ranges</span>
        </div>
      )}

      {members.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, background: "#232e27", borderRadius: 10, border: "1px solid #2d3830" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏕️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#d4c8a8" }}>Waiting for crew admin to add members</div>
          <div style={{ fontSize: 12, color: "#6a7a6a", marginTop: 4 }}>Once added, select your name and mark available dates.</div>
        </div>
      )}

      {active === null && members.length > 0 && (
        <div style={{ padding: "10px 12px", background: "#232e27", borderRadius: 8, border: "1px solid #2d3830", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>👆</span>
          <span style={{ fontSize: 12, color: "#9aaa9a" }}>Select your name above to enter your availability. Heatmap shows group overlap.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {months.map(({ year, month }) => {
          const dim = daysInMonth(year, month);
          const start = dayOfWeek(year, month, 1);
          const cells = Array(start).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
          return (
            <div key={`${year}-${month}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#90a090", marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                {MONTH_NAMES[month]} {year}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", gap: 2 }}>
                {DAYS_ABBR.map((d, i) => (
                  <div key={i} style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4a5a4a" }}>{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const key = dateKey(year, month, d);
                  const past = isPast(year, month, d);
                  const wknd = dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6;
                  const sel = am?.dates.includes(key);
                  const heat = analysis.heatmap[key]?.pct || 0;
                  const hc = analysis.heatmap[key]?.count || 0;
                  return (
                    <div key={key}
                      onMouseDown={() => !past && onDown(key)}
                      onMouseEnter={() => !past && onEnter(key)}
                      title={analysis.heatmap[key] ? `${analysis.heatmap[key].names.join(", ")}` : ""}
                      style={{
                        width: 36, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: sel ? 700 : 500, borderRadius: 5,
                        cursor: past || active === null ? "default" : "pointer",
                        opacity: past ? 0.22 : 1,
                        background: sel ? (am?.color?.bg || "#4a7a55") : heat > 0 ? `rgba(74,122,85,${Math.min(heat * 0.3, 0.85)})` : wknd ? "#222b25" : "transparent",
                        color: sel ? "#fff" : heat > 0.5 ? "#b0d0b0" : "#7a8a7a",
                        border: !sel && heat >= 1 ? "1.5px solid #5a9a6580" : "1.5px solid transparent",
                        transition: "all .08s", position: "relative",
                      }}>
                      {d}
                      {hc > 0 && !sel && active === null && (
                        <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 1 }}>
                          {Array.from({ length: Math.min(hc, 6) }).map((_, j) => (
                            <div key={j} style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: hc === members.length ? "#5aaa65" : "#6a9a6a" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {members.length > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#4a5a4a" }}>Overlap:</span>
          {[["rgba(74,122,85,0.25)", "Some"], ["rgba(74,122,85,0.55)", "Most"], ["rgba(74,122,85,0.85)", "All"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
              <span style={{ fontSize: 10, color: "#5a6a5a" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
