import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DAYS_ABBR, MONTH_NAMES } from "../utils/constants";
import { daysInMonth, dateKey, dayOfWeek, isPast } from "../utils/dates";
import { useTheme } from "../contexts/ThemeContext";
import { toolbarBtn, fontBody, fontDisplay } from "../utils/theme";
import { ChevronLeft, ChevronRight, Users, User, Check } from "lucide-react";

// Strip legacy period suffixes: "2026-03-15:am" → "2026-03-15"
export function normalizeDateEntry(entry) {
  const idx = entry.lastIndexOf(":");
  if (idx > 0 && ["am", "pm", "all"].includes(entry.slice(idx + 1))) {
    return entry.slice(0, idx);
  }
  return entry;
}

// Backward-compat: legacy parseDateEntry for any imports that still need it
export function parseDateEntry(entry) {
  return { date: normalizeDateEntry(entry), period: "all" };
}

// Legacy compat
export function getMemberPeriod(dates, key) {
  for (const d of dates) {
    if (normalizeDateEntry(d) === key) return ["all"];
  }
  return [];
}

export default function Calendar({ members, active, months, analysis, onToggleDate, onBulkSelect, onClearAll, trekDates }) {
  const dragRef = useRef({ active: false, mode: null });
  const { theme, mode } = useTheme();
  const am = active !== null ? members[active] : null;
  const [viewMode, setViewMode] = useState("my"); // "my" or "group"
  const [tooltip, setTooltip] = useState(null); // { key, names, x, y }
  const calendarRef = useRef(null);

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

  // Normalize member dates (strip :am/:pm/:all suffixes)
  const getMemberAvailable = useCallback((memberDates, key) => {
    return memberDates.some(d => normalizeDateEntry(d) === key);
  }, []);

  const onDown = useCallback((key) => {
    if (active === null || trekDateSet.has(key)) return;
    const isSelected = getMemberAvailable(members[active].dates, key);
    const dragMode = isSelected ? "remove" : "add";
    dragRef.current = { active: true, mode: dragMode };
    onToggleDate(key, dragMode, "all");
  }, [active, members, onToggleDate, trekDateSet, getMemberAvailable]);

  const onEnter = useCallback((key) => {
    const { active: dragging, mode } = dragRef.current;
    if (dragging && mode && !trekDateSet.has(key)) onToggleDate(key, mode, "all");
  }, [onToggleDate, trekDateSet]);

  useEffect(() => {
    const up = () => { dragRef.current = { active: false, mode: null }; };
    window.addEventListener("mouseup", up);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("pointerup", up); };
  }, []);

  // Dismiss tooltip when clicking outside the calendar or scrolling
  useEffect(() => {
    if (!tooltip) return;
    const dismiss = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setTooltip(null);
    };
    const dismissScroll = () => setTooltip(null);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("scroll", dismissScroll, true);
    return () => { document.removeEventListener("pointerdown", dismiss); window.removeEventListener("scroll", dismissScroll, true); };
  }, [tooltip]);

  // Auto-switch to "my" view when a member is selected
  useEffect(() => {
    if (active !== null) setViewMode("my");
  }, [active]);

  // Compute heat map data
  const heatmap = useMemo(() => {
    const hm = {};
    const total = members.length;
    if (total === 0) return hm;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const { year, month } of months) {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        const key = dateKey(year, month, d);
        const keyDate = new Date(year, month, d);
        if (keyDate < today) continue;

        const available = [];
        for (const m of members) {
          if (getMemberAvailable(m.dates, key)) available.push(m.name);
        }
        if (available.length > 0) {
          hm[key] = {
            count: available.length,
            pct: available.length / total,
            names: available,
            missing: members.filter(m => !available.includes(m.name)).map(m => m.name),
          };
        }
      }
    }
    return hm;
  }, [members, months, getMemberAvailable]);

  // Best dates (top 5)
  const bestDates = useMemo(() => {
    return Object.entries(heatmap)
      .filter(([, v]) => v.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count || 0)
      .slice(0, 5)
      .map(([key, val]) => ({ key, ...val }));
  }, [heatmap]);

  const showGroupView = viewMode === "group" || active === null;

  return (
    <div>
      {/* Header card */}
      <div style={{ padding: "16px 18px", background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, marginBottom: 12, boxShadow: theme.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>Training Availability</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 1.5, fontFamily: fontBody }}>
              {active !== null
                ? "Tap dates you're available for training. Drag to select ranges."
                : "Select your name above, then tap dates you're available."}
            </div>
          </div>
          {active !== null && members.length > 1 && (
            <div style={{ display: "flex", gap: 2, background: theme.bgAlt, borderRadius: 8, padding: 2 }}>
              <button onClick={() => setViewMode("my")} style={{
                padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: fontBody, display: "flex", alignItems: "center", gap: 3,
                background: viewMode === "my" ? theme.accent : "transparent",
                color: viewMode === "my" ? "#fff" : theme.textDim,
              }}><User size={11} /> Mine</button>
              <button onClick={() => setViewMode("group")} style={{
                padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: fontBody, display: "flex", alignItems: "center", gap: 3,
                background: viewMode === "group" ? theme.accent : "transparent",
                color: viewMode === "group" ? "#fff" : theme.textDim,
              }}><Users size={11} /> Group</button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {active !== null && viewMode === "my" && (
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => onBulkSelect("weekends")} style={toolbarBtn(theme, "primary")}>+ Weekends</button>
          <button onClick={() => onBulkSelect("all")} style={toolbarBtn(theme)}>+ All Days</button>
          <button onClick={onClearAll} style={toolbarBtn(theme)}>Clear Mine</button>
        </div>
      )}

      {members.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏕️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.heading }}>Waiting for crew members</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>Once members are added, select your name and mark dates you're available for group training.</div>
        </div>
      )}

      {active === null && members.length > 0 && (
        <div style={{ padding: "10px 12px", background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}`, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, boxShadow: theme.shadow }}>
          <span style={{ fontSize: 18 }}>👆</span>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Select your name above to mark dates. The heat map below shows group overlap.</span>
        </div>
      )}

      {/* Calendar grid */}
      <div ref={calendarRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14, position: "relative" }}>
        {months.map(({ year, month }) => {
          const dim = daysInMonth(year, month);
          const start = dayOfWeek(year, month, 1);
          const cells = Array(start).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
          return (
            <div key={`${year}-${month}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                {MONTH_NAMES[month]} {year}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {DAYS_ABBR.map((d, i) => (
                  <div key={i} style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: theme.textDimmest }}>{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const key = dateKey(year, month, d);
                  const past = isPast(year, month, d);
                  const wknd = dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6;
                  const trekType = trekDateSet.get(key);
                  const blocked = !!trekType;

                  // My selection
                  const mySelected = am ? getMemberAvailable(am.dates, key) : false;

                  // Heat map data
                  const hmData = heatmap[key];
                  const heatCount = hmData?.count || 0;
                  const heatPct = hmData?.pct || 0;

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
                  } else if (!showGroupView && mySelected) {
                    // Editing mode — show my selection
                    const selColor = am?.color?.bg || theme.selectedBg;
                    bg = selColor;
                    color = theme.selectedText;
                    borderStyle = "1.5px solid transparent";
                  } else if (showGroupView && heatCount > 0) {
                    // Group heat map view
                    const opacity = 0.15 + (heatPct * 0.85);
                    const baseGreen = mode === "dark" ? "76, 175, 80" : "56, 142, 60";
                    bg = `rgba(${baseGreen}, ${opacity})`;
                    color = heatPct > 0.5 ? (mode === "dark" ? "#e0f0e0" : "#1a3a1a") : theme.textDim;
                    borderStyle = heatPct >= 1 ? `1.5px solid ${theme.heatFull}60` : "1.5px solid transparent";
                  } else if (!showGroupView && heatCount > 0 && !mySelected) {
                    // My view but showing faint heat map for context
                    const opacity = 0.08 + (heatPct * 0.15);
                    const baseGreen = mode === "dark" ? "76, 175, 80" : "56, 142, 60";
                    bg = `rgba(${baseGreen}, ${opacity})`;
                    color = theme.textDim;
                    borderStyle = "1.5px solid transparent";
                  } else {
                    bg = wknd ? theme.weekendBg : "transparent";
                    color = theme.textDim;
                    borderStyle = "1.5px solid transparent";
                  }

                  const isTooltipTarget = tooltip?.key === key;

                  return (
                    <div key={key}
                      onPointerDown={(e) => {
                        if (past || blocked) return;
                        if (showGroupView && active !== null) {
                          // In group view, tapping shows tooltip
                          if (hmData) {
                            if (isTooltipTarget) { setTooltip(null); }
                            else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                key, names: hmData.names, missing: hmData.missing,
                                x: rect.left + rect.width / 2,
                                y: rect.bottom + 6,
                              });
                            }
                          }
                          return;
                        }
                        if (active !== null) { e.preventDefault(); onDown(key); }
                      }}
                      onPointerEnter={() => {
                        if (!past && !blocked && !showGroupView && active !== null) onEnter(key);
                      }}
                      title={blocked ? (trekType === "adventure" ? "On Trek" : "Travel Day")
                        : hmData ? `${heatCount}/${members.length}: ${hmData.names.join(", ")}` : ""}
                      style={{
                        width: "100%", aspectRatio: "1", minHeight: 36, maxHeight: 44,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: mySelected && !showGroupView ? 700 : 500, borderRadius: 6, touchAction: "none", userSelect: "none",
                        cursor: past || (active === null && !showGroupView) || blocked ? "default" : "pointer",
                        opacity: past ? 0.22 : 1,
                        background: bg, color,
                        border: borderStyle,
                        transition: "all .08s", position: "relative",
                        backgroundImage: trekType === "travel" ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)" : undefined,
                      }}>
                      {blocked ? (trekType === "adventure" ? "⛺" : "🚐") : (
                        <>
                          {!showGroupView && mySelected && (
                            <Check size={14} strokeWidth={3} style={{ position: "absolute", top: 2, right: 2, color: theme.selectedText, opacity: 0.7 }} />
                          )}
                          <span>{d}</span>
                          {showGroupView && heatCount > 0 && (
                            <span style={{ fontSize: 8, fontWeight: 800, lineHeight: 1, opacity: 0.8, marginTop: -1 }}>
                              {heatCount}
                            </span>
                          )}
                          {!showGroupView && heatCount > 0 && !mySelected && (
                            <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 1 }}>
                              {Array.from({ length: Math.min(heatCount, 6) }).map((_, j) => (
                                <div key={j} style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: heatCount === members.length ? theme.heatFull : theme.memberDot }} />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

      {/* Tooltip popover for group view — fixed position near clicked cell */}
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)",
          padding: "8px 12px", background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`,
          boxShadow: `0 4px 16px ${mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"}`,
          zIndex: 1000, minWidth: 140, maxWidth: 260, pointerEvents: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.heading }}>{tooltip.key}</span>
            <button onClick={() => setTooltip(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDimmer, fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 8 }}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: theme.accent, marginBottom: 2 }}>
            Available ({tooltip.names.length}): {tooltip.names.join(", ")}
          </div>
          {tooltip.missing?.length > 0 && (
            <div style={{ fontSize: 11, color: theme.warn }}>
              Unavailable ({tooltip.missing.length}): {tooltip.missing.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        {showGroupView ? (
          <>
            <span style={{ fontSize: 11, color: theme.textDimmest }}>Overlap:</span>
            {[
              [0.2, "Few"],
              [0.5, "Some"],
              [0.85, "Most"],
              [1.0, "All"],
            ].map(([opacity, label]) => {
              const baseGreen = mode === "dark" ? "76, 175, 80" : "56, 142, 60";
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(${baseGreen}, ${0.15 + opacity * 0.85})` }} />
                  <span style={{ fontSize: 11, color: theme.textDimmer }}>{label}</span>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: am?.color?.bg || theme.selectedBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={8} color={theme.selectedText} strokeWidth={3} />
              </div>
              <span style={{ fontSize: 11, color: theme.textDimmer }}>Available</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.weekendBg, border: `1px solid ${theme.border}` }} />
              <span style={{ fontSize: 11, color: theme.textDimmer }}>Weekend</span>
            </div>
          </>
        )}
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

      {/* Empty state for group view */}
      {showGroupView && Object.keys(heatmap).length === 0 && members.length > 0 && (
        <div style={{ textAlign: "center", padding: "12px 16px", marginTop: 8, fontSize: 12, color: theme.textDimmer, background: theme.bgAlt, borderRadius: 10, border: `1px solid ${theme.border}` }}>
          No one has marked availability yet. Ask your crew to tap dates they're free to train.
        </div>
      )}
    </div>
  );
}
