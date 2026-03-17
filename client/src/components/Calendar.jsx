import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DAYS_ABBR, MONTH_NAMES } from "../utils/constants";
import { daysInMonth, dateKey, dayOfWeek, isPast } from "../utils/dates";
import { useTheme } from "../contexts/ThemeContext";
import { toolbarBtn, fontBody, fontDisplay } from "../utils/theme";

// Period cycle: off → all → am → pm → off
const PERIOD_CYCLE = [null, "all", "am", "pm"];

// Extract the period from a date entry like "2026-03-15:am" → "am"
export function parseDateEntry(entry) {
  const parts = entry.split(":");
  if (parts.length >= 4) {
    // "2026-03-15:am" split on ":" gives ["2026-03-15", "am"] BUT dateKey is "2026-03-15"
    // Actually dateKey has dashes not colons. Entry = "2026-03-15:am"
    const period = parts[parts.length - 1];
    const date = parts.slice(0, -1).join(":");
    return { date, period };
  }
  // Handle "YYYY-MM-DD:period"
  const idx = entry.lastIndexOf(":");
  if (idx > 0 && ["am", "pm", "all"].includes(entry.slice(idx + 1))) {
    return { date: entry.slice(0, idx), period: entry.slice(idx + 1) };
  }
  return { date: entry, period: "all" }; // legacy bare dates
}

// Get what period(s) a member has for a specific date key
export function getMemberPeriod(dates, key) {
  const periods = [];
  for (const d of dates) {
    const { date, period } = parseDateEntry(d);
    if (date === key) periods.push(period);
  }
  return periods;
}

export default function Calendar({ members, active, months, analysis, onToggleDate, onBulkSelect, onClearAll, trekDates }) {
  const dragRef = useRef({ active: false, mode: null, period: null });
  const { theme, mode } = useTheme();
  const am = active !== null ? members[active] : null;

  // Build set of blocked trek dates
  const trekDateSet = useMemo(() => {
    const set = new Map();
    if (!trekDates) return set;
    const { depart, arrive, return: ret, home } = trekDates;
    const addRange = (start, end, type) => {
      if (!start || !end) return;
      const d = new Date(start);
      const e = new Date(end);
      while (d <= e) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        set.set(key, type);
        d.setDate(d.getDate() + 1);
      }
    };
    if (depart && arrive) addRange(depart, new Date(arrive.getTime() - 86400000), "travel");
    if (ret && home) addRange(new Date(ret.getTime() + 86400000), home, "travel");
    if (arrive && ret) addRange(arrive, ret, "adventure");
    if (arrive && !ret) set.set(`${arrive.getFullYear()}-${String(arrive.getMonth() + 1).padStart(2, "0")}-${String(arrive.getDate()).padStart(2, "0")}`, "adventure");
    return set;
  }, [trekDates]);

  const onDown = useCallback((key) => {
    if (active === null || trekDateSet.has(key)) return;
    const currentPeriods = getMemberPeriod(members[active].dates, key);
    let nextPeriod, dragMode;
    if (currentPeriods.length === 0) {
      // Not selected → add as "all"
      nextPeriod = "all";
      dragMode = "add";
    } else {
      // Cycle: all → am → pm → off
      const current = currentPeriods[0]; // use first
      const idx = PERIOD_CYCLE.indexOf(current);
      nextPeriod = PERIOD_CYCLE[(idx + 1) % PERIOD_CYCLE.length];
      dragMode = nextPeriod ? "add" : "remove";
    }
    dragRef.current = { active: true, mode: dragMode, period: nextPeriod || "all" };
    onToggleDate(key, dragMode, nextPeriod);
  }, [active, members, onToggleDate, trekDateSet]);

  const onEnter = useCallback((key) => {
    const { active: dragging, mode, period } = dragRef.current;
    if (dragging && mode && !trekDateSet.has(key)) onToggleDate(key, mode, period);
  }, [onToggleDate, trekDateSet]);

  useEffect(() => {
    const up = () => { dragRef.current = { active: false, mode: null, period: null }; };
    window.addEventListener("mouseup", up);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("pointerup", up); };
  }, []);

  return (
    <div>
      <div style={{ padding: "16px 18px", background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, marginBottom: 12, boxShadow: theme.shadow }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>Training Hike Coordinator</div>
        <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 1.5, fontFamily: fontBody }}>
          Tap dates to cycle availability: <strong>All Day</strong> → <strong>Morning</strong> → <strong>Afternoon</strong> → Off. Drag to select ranges.
        </div>
      </div>

      {active !== null && (
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => onBulkSelect("weekends")} style={toolbarBtn(theme, "primary")}>+ All Weekends</button>
          <button onClick={() => onBulkSelect("all")} style={toolbarBtn(theme)}>+ All Days</button>
          <button onClick={onClearAll} style={toolbarBtn(theme)}>Clear Mine</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: theme.textDimmest }}>Tap to cycle · Drag to select</span>
        </div>
      )}

      {members.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏕️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.heading }}>Waiting for crew members</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>Once members are added, select your name and mark dates you're available for group training hikes.</div>
        </div>
      )}

      {active === null && members.length > 0 && (
        <div style={{ padding: "10px 12px", background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}`, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, boxShadow: theme.shadow }}>
          <span style={{ fontSize: 18 }}>👆</span>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Select your name above to mark dates you're available for training hikes. Heatmap shows group overlap.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {months.map(({ year, month }) => {
          const dim = daysInMonth(year, month);
          const start = dayOfWeek(year, month, 1);
          const cells = Array(start).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
          return (
            <div key={`${year}-${month}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                {MONTH_NAMES[month]} {year}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", gap: 2 }}>
                {DAYS_ABBR.map((d, i) => (
                  <div key={i} style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: theme.textDimmest }}>{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const key = dateKey(year, month, d);
                  const past = isPast(year, month, d);
                  const wknd = dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6;
                  const memberPeriods = am ? getMemberPeriod(am.dates, key) : [];
                  const sel = memberPeriods.length > 0;
                  const selPeriod = memberPeriods[0] || null; // "am", "pm", "all"
                  const heat = analysis.heatmap[key]?.pct || 0;
                  const hc = analysis.heatmap[key]?.count || 0;
                  const trekType = trekDateSet.get(key);
                  const blocked = !!trekType;

                  let bg, color, borderStyle;
                  if (blocked) {
                    if (trekType === "adventure") {
                      bg = mode === "dark" ? "#2A3620" : "#D4E4B8";
                      color = mode === "dark" ? "#B8CC9A" : "#3A4D2A";
                    } else {
                      bg = mode === "dark" ? "#2E2618" : "#FFF3E0";
                      color = mode === "dark" ? "#E8A84C" : "#C47A2A";
                    }
                    borderStyle = "1.5px solid transparent";
                  } else if (sel) {
                    const selColor = am?.color?.bg || theme.selectedBg;
                    // For am/pm partial, use gradient
                    if (selPeriod === "am") {
                      bg = `linear-gradient(to bottom, ${selColor} 50%, ${wknd ? theme.weekendBg : "transparent"} 50%)`;
                    } else if (selPeriod === "pm") {
                      bg = `linear-gradient(to bottom, ${wknd ? theme.weekendBg : "transparent"} 50%, ${selColor} 50%)`;
                    } else {
                      bg = selColor;
                    }
                    color = theme.selectedText;
                    borderStyle = "1.5px solid transparent";
                  } else if (heat > 0) {
                    // Show heatmap with period info
                    const hmData = analysis.heatmap[key];
                    const amPct = hmData?.amPct || 0;
                    const pmPct = hmData?.pmPct || 0;
                    if (amPct > 0 && pmPct > 0 && amPct === pmPct) {
                      // Even overlap both halves
                      bg = heat > 0.66 ? theme.heatHigh : heat > 0.33 ? theme.heatMed : theme.heatLow;
                    } else if (amPct > pmPct && pmPct === 0) {
                      const heatColor = amPct > 0.66 ? theme.heatHigh : amPct > 0.33 ? theme.heatMed : theme.heatLow;
                      bg = `linear-gradient(to bottom, ${heatColor} 50%, ${wknd ? theme.weekendBg : "transparent"} 50%)`;
                    } else if (pmPct > amPct && amPct === 0) {
                      const heatColor = pmPct > 0.66 ? theme.heatHigh : pmPct > 0.33 ? theme.heatMed : theme.heatLow;
                      bg = `linear-gradient(to bottom, ${wknd ? theme.weekendBg : "transparent"} 50%, ${heatColor} 50%)`;
                    } else {
                      bg = heat > 0.66 ? theme.heatHigh : heat > 0.33 ? theme.heatMed : theme.heatLow;
                    }
                    color = heat > 0.5 ? theme.accentLight : theme.textDim;
                    borderStyle = heat >= 1 ? `1.5px solid ${theme.heatFull}40` : "1.5px solid transparent";
                  } else {
                    bg = wknd ? theme.weekendBg : "transparent";
                    color = theme.textDim;
                    borderStyle = "1.5px solid transparent";
                  }

                  // Period label for selected cells
                  const periodLabel = sel ? (selPeriod === "am" ? "AM" : selPeriod === "pm" ? "PM" : "") : "";

                  return (
                    <div key={key}
                      onPointerDown={(e) => { if (!past && !blocked) { e.preventDefault(); onDown(key); } }}
                      onPointerEnter={() => !past && !blocked && onEnter(key)}
                      title={blocked ? (trekType === "adventure" ? "On Trek" : "Travel Day")
                        : sel ? `${key} (${selPeriod === "am" ? "Morning" : selPeriod === "pm" ? "Afternoon" : "All Day"})`
                        : analysis.heatmap[key] ? analysis.heatmap[key].names.join(", ") : ""}
                      style={{
                        width: 36, height: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: sel || blocked ? 700 : 500, borderRadius: 5, touchAction: "none", userSelect: "none",
                        cursor: past || active === null || blocked ? "default" : "pointer",
                        opacity: past ? 0.22 : 1,
                        background: bg, color,
                        border: borderStyle,
                        transition: "all .08s", position: "relative",
                        backgroundImage: trekType === "travel" ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)" : undefined,
                      }}>
                      {blocked ? (trekType === "adventure" ? "⛺" : "🚐") : d}
                      {sel && periodLabel && (
                        <div style={{ fontSize: 6, fontWeight: 800, lineHeight: 1, opacity: 0.8, marginTop: -1 }}>{periodLabel}</div>
                      )}
                      {hc > 0 && !sel && !blocked && active === null && (
                        <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 1 }}>
                          {Array.from({ length: Math.min(hc, 6) }).map((_, j) => (
                            <div key={j} style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: hc === members.length ? theme.heatFull : theme.memberDot }} />
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

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: theme.textDimmest }}>Overlap:</span>
        {[[theme.heatLow, "Some"], [theme.heatMed, "Most"], [theme.heatHigh, "All"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
            <span style={{ fontSize: 11, color: theme.textDimmer }}>{l}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(to bottom, ${theme.heatMed} 50%, transparent 50%)`, border: `1px solid ${theme.border}` }} />
          <span style={{ fontSize: 11, color: theme.textDimmer }}>AM only</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(to bottom, transparent 50%, ${theme.heatMed} 50%)`, border: `1px solid ${theme.border}` }} />
          <span style={{ fontSize: 11, color: theme.textDimmer }}>PM only</span>
        </div>
        {trekDateSet.size > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10 }}>⛺</span>
              <span style={{ fontSize: 11, color: theme.textDimmer }}>On Trek</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10 }}>🚐</span>
              <span style={{ fontSize: 11, color: theme.textDimmer }}>Travel</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
