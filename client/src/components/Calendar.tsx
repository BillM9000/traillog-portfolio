import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DAYS_ABBR, MONTH_NAMES } from "../utils/constants";
import { daysInMonth, dateKey, dayOfWeek, isPast, normalizeDateEntry } from "../utils/dates";
import { useTheme } from "../contexts/ThemeContext";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Users, User, Check } from "lucide-react";
import { useIsDesktop } from "../hooks/useIsDesktop";
import type { AdventureMember, TrekDates, MonthRange } from "../types";

interface CalendarMember {
  name: string;
  dates: string[];
  color?: { bg: string };
  crew_name?: string;
}

interface HeatmapEntry {
  count: number;
  pct: number;
  names: string[];
  labels: string[];
  missing: string[];
  missingLabels: string[];
}

interface TooltipData {
  key: string;
  names: string[];
  missing: string[];
  x: number;
  y: number;
}

interface AnalysisData {
  bestDates?: Array<{ key: string; count: number }>;
}

// Legacy compat
export function getMemberPeriod(dates: string[], key: string): string[] {
  for (const d of dates) {
    if (normalizeDateEntry(d) === key) return ["all"];
  }
  return [];
}

interface CalendarProps {
  members: CalendarMember[];
  active: number | null;
  months: MonthRange[];
  analysis: AnalysisData | null;
  onToggleDate: (key: string, mode: string, period: string) => void;
  onBulkSelect: (type: string) => void;
  onClearAll: () => void;
  trekDates: TrekDates | null;
  allCrewsMode: boolean;
}

export default function Calendar({ members, active, months, analysis, onToggleDate, onBulkSelect, onClearAll, trekDates, allCrewsMode }: CalendarProps) {
  const dragRef = useRef<{ active: boolean; mode: string | null }>({ active: false, mode: null });
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const { theme, mode } = useTheme();
  const isDesktop = useIsDesktop();
  const am = active !== null ? members[active] : null;
  const [viewMode, setViewMode] = useState<"my" | "group">("my");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [mobileMonthIndex, setMobileMonthIndex] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Build set of blocked trek dates
  const trekDateSet = useMemo(() => {
    const set = new Map<string, string>();
    if (!trekDates) return set;
    const { depart, arrive, return: ret, home } = trekDates;
    const addRange = (start: Date, end: Date, type: string) => {
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
  const getMemberAvailable = useCallback((memberDates: string[], key: string): boolean => {
    return memberDates.some(d => normalizeDateEntry(d) === key);
  }, []);

  const onDown = useCallback((key: string) => {
    if (active === null || trekDateSet.has(key)) return;
    const isSelected = getMemberAvailable(members[active].dates, key);
    const dragMode = isSelected ? "remove" : "add";
    dragRef.current = { active: true, mode: dragMode };
    onToggleDate(key, dragMode, "all");
  }, [active, members, onToggleDate, trekDateSet, getMemberAvailable]);

  const onEnter = useCallback((key: string) => {
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
    const dismiss = (e: PointerEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setTooltip(null);
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
    const hm: Record<string, HeatmapEntry> = {};
    const total = members.length;
    if (total === 0) return hm;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const { year, month } of months) {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        const key = dateKey(year, month, d);
        const keyDate = new Date(year, month, d);
        if (keyDate < today) continue;

        const available: string[] = [];
        const availableLabels: string[] = [];
        for (const m of members) {
          if (getMemberAvailable(m.dates, key)) {
            available.push(m.name);
            availableLabels.push(allCrewsMode && m.crew_name ? `${m.name} (${m.crew_name})` : m.name);
          }
        }
        if (available.length > 0) {
          const missingLabels = members.filter(m => !available.includes(m.name))
            .map(m => allCrewsMode && m.crew_name ? `${m.name} (${m.crew_name})` : m.name);
          hm[key] = {
            count: available.length,
            pct: available.length / total,
            names: available,
            labels: availableLabels,
            missing: members.filter(m => !available.includes(m.name)).map(m => m.name),
            missingLabels,
          };
        }
      }
    }
    return hm;
  }, [members, months, getMemberAvailable, allCrewsMode]);

  // Best dates (top 5)
  const bestDates = useMemo(() => {
    return Object.entries(heatmap)
      .filter(([, v]) => v.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count || 0)
      .slice(0, 5)
      .map(([key, val]) => ({ key, ...val }));
  }, [heatmap]);

  const showGroupView = allCrewsMode || viewMode === "group" || active === null;

  return (
    <div>
      {/* Header card */}
      <div className="py-4 px-[18px] bg-tl-card rounded-[14px] border border-tl-border mb-3 shadow-card">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-base font-extrabold text-tl-heading font-display">Training Availability</div>
            <div className="text-[13px] text-tl-text-muted mt-1 leading-normal font-body">
              {allCrewsMode
                ? "Viewing combined availability across all crews. Select a specific crew to edit dates."
                : active !== null
                  ? "Tap dates you're available for training. Drag to select ranges."
                  : "Select your name above, then tap dates you're available."}
            </div>
          </div>
          {active !== null && members.length > 1 && !allCrewsMode && (
            <div className="flex gap-0.5 bg-tl-bg-alt rounded-btn p-0.5">
              <button onClick={() => setViewMode("my")}
                className={clsx(
                  "py-[5px] px-2.5 rounded-badge-sm border-none text-[11px] font-semibold cursor-pointer font-body flex items-center gap-[3px]",
                  viewMode === "my" ? "bg-tl-accent text-white" : "bg-transparent text-tl-text-dim"
                )}><User size={11} /> Mine</button>
              <button onClick={() => setViewMode("group")}
                className={clsx(
                  "py-[5px] px-2.5 rounded-badge-sm border-none text-[11px] font-semibold cursor-pointer font-body flex items-center gap-[3px]",
                  viewMode === "group" ? "bg-tl-accent text-white" : "bg-transparent text-tl-text-dim"
                )}><Users size={11} /> Group</button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {active !== null && viewMode === "my" && (
        <div className="flex gap-[5px] mb-2.5 flex-wrap items-center">
          <button onClick={() => onBulkSelect("weekends")} className="tl-btn-primary">+ Weekends</button>
          <button onClick={() => onBulkSelect("all")} className="tl-btn">+ All Days</button>
          <button onClick={onClearAll} className="tl-btn">Clear Mine</button>
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center p-[30px] bg-tl-card rounded-[10px] border border-tl-border shadow-card">
          <div className="text-[28px] mb-1.5">{"\u{1F3D5}\uFE0F"}</div>
          <div className="text-sm font-semibold text-tl-heading">Waiting for crew members</div>
          <div className="text-xs text-tl-text-dim mt-1">Once members are added, select your name and mark dates you're available for group training.</div>
        </div>
      )}

      {active === null && members.length > 0 && (
        <div className="py-2.5 px-3 bg-tl-card rounded-btn border border-tl-border mb-3 flex items-center gap-2 shadow-card">
          <span className="text-lg">{"\u{1F446}"}</span>
          <span className="text-xs text-tl-text-muted">Select your name above to mark dates. The heat map below shows group overlap.</span>
        </div>
      )}

      {/* Mobile month navigation */}
      {!isDesktop && months.length > 1 && (
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            onClick={() => setMobileMonthIndex(i => Math.max(0, i - 1))}
            disabled={mobileMonthIndex === 0}
            className={clsx(
              "p-1.5 rounded-full border-none cursor-pointer",
              mobileMonthIndex === 0 ? "opacity-30 cursor-default text-tl-text-dimmest" : "text-tl-accent bg-tl-bg-alt"
            )}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-tl-heading">
            {MONTH_NAMES[months[mobileMonthIndex].month]} {months[mobileMonthIndex].year}
          </span>
          <button
            onClick={() => setMobileMonthIndex(i => Math.min(months.length - 1, i + 1))}
            disabled={mobileMonthIndex >= months.length - 1}
            className={clsx(
              "p-1.5 rounded-full border-none cursor-pointer",
              mobileMonthIndex >= months.length - 1 ? "opacity-30 cursor-default text-tl-text-dimmest" : "text-tl-accent bg-tl-bg-alt"
            )}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Calendar grid */}
      <div ref={calendarRef} className={clsx(
        "grid gap-3 relative",
        isDesktop ? "grid-cols-2" : "grid-cols-1"
      )} style={{ gap: isDesktop ? 12 : 14 }}>
        {(isDesktop ? months : months.length > 1 ? [months[mobileMonthIndex]] : months).map(({ year, month }) => {
          const dim = daysInMonth(year, month);
          const start = dayOfWeek(year, month, 1);
          const cells: (number | null)[] = Array(start).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
          return (
            <div key={`${year}-${month}`} className="mb-2">
              <div className="text-[13px] font-bold text-tl-text-muted mb-[5px] tracking-[0.5px] uppercase">
                {MONTH_NAMES[month]} {year}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {DAYS_ABBR.map((d, i) => (
                  <div key={i} className="h-5 flex items-center justify-center text-[10px] font-bold text-tl-text-dimmest">{d}</div>
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

                  let bg: string, color: string, borderStyle: string;
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
                      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
                        if (past || blocked) return;
                        pointerStartRef.current = { x: e.clientX, y: e.clientY };
                        if (isDesktop) {
                          // Desktop: immediate interaction (drag-to-select)
                          if (showGroupView && (active !== null || allCrewsMode)) {
                            if (hmData) {
                              if (isTooltipTarget) { setTooltip(null); }
                              else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  key,
                                  names: hmData.labels || hmData.names,
                                  missing: hmData.missingLabels || hmData.missing,
                                  x: rect.left + rect.width / 2,
                                  y: rect.bottom + 6,
                                });
                              }
                            }
                            return;
                          }
                          if (active !== null) { e.preventDefault(); onDown(key); }
                        }
                      }}
                      onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
                        if (past || blocked || isDesktop) return;
                        const start = pointerStartRef.current;
                        pointerStartRef.current = null;
                        if (start) {
                          const dx = e.clientX - start.x;
                          const dy = e.clientY - start.y;
                          if (Math.sqrt(dx * dx + dy * dy) > 10) return; // scroll/drag, not a tap
                        }
                        // Mobile tap confirmed
                        if (showGroupView && (active !== null || allCrewsMode)) {
                          if (hmData) {
                            if (isTooltipTarget) { setTooltip(null); }
                            else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                key,
                                names: hmData.labels || hmData.names,
                                missing: hmData.missingLabels || hmData.missing,
                                x: rect.left + rect.width / 2,
                                y: rect.bottom + 6,
                              });
                            }
                          }
                          return;
                        }
                        if (active !== null) { onDown(key); }
                      }}
                      onPointerEnter={() => {
                        if (!past && !blocked && !showGroupView && active !== null) onEnter(key);
                      }}
                      title={blocked ? (trekType === "adventure" ? "On Trek" : "Travel Day")
                        : hmData ? `${heatCount}/${members.length}: ${hmData.names.join(", ")}` : ""}
                      className="w-full flex flex-col items-center justify-center text-xs rounded-badge-sm select-none relative"
                      style={{
                        aspectRatio: "1", minHeight: 36, maxHeight: 44,
                        fontWeight: mySelected && !showGroupView ? 700 : 500,
                        touchAction: isDesktop ? "none" : "auto",
                        cursor: past || (active === null && !showGroupView && !allCrewsMode) || blocked ? "default" : "pointer",
                        opacity: past ? 0.22 : 1,
                        background: bg, color,
                        border: borderStyle,
                        transition: "all .08s",
                        backgroundImage: trekType === "travel" ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)" : undefined,
                      }}>
                      {blocked ? (trekType === "adventure" ? "\u26FA" : "\u{1F690}") : (
                        <>
                          {!showGroupView && mySelected && (
                            <Check size={14} strokeWidth={3} className="absolute top-0.5 right-0.5 text-tl-selected-text opacity-70" />
                          )}
                          <span>{d}</span>
                          {showGroupView && heatCount > 0 && (
                            <span className="text-[8px] font-extrabold leading-none opacity-80 -mt-px">
                              {heatCount}
                            </span>
                          )}
                          {!showGroupView && heatCount > 0 && !mySelected && (
                            <div className="absolute bottom-px left-1/2 -translate-x-1/2 flex gap-px">
                              {Array.from({ length: Math.min(heatCount, 6) }).map((_, j) => (
                                <div key={j} className="w-[2.5px] h-[2.5px] rounded-full"
                                  style={{ background: heatCount === members.length ? theme.heatFull : theme.memberDot }} />
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
        <div className="fixed p-2 px-3 bg-tl-card rounded-[10px] border border-tl-border z-[1000] min-w-[140px] max-w-[260px] pointer-events-auto"
          style={{
            left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)",
            boxShadow: `0 4px 16px ${mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"}`,
          }}>
          <div className="flex justify-between items-center mb-[3px]">
            <span className="text-[11px] font-bold text-tl-heading">{tooltip.key}</span>
            <button onClick={() => setTooltip(null)} className="bg-transparent border-none cursor-pointer text-tl-text-dimmer text-[13px] leading-none p-0 ml-2">{"\u2715"}</button>
          </div>
          <div className="text-[11px] text-tl-accent mb-0.5">
            Available ({tooltip.names.length}): {tooltip.names.join(", ")}
          </div>
          {tooltip.missing?.length > 0 && (
            <div className="text-[11px] text-tl-warn">
              Unavailable ({tooltip.missing.length}): {tooltip.missing.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3.5 items-center mt-2 flex-wrap">
        {showGroupView ? (
          <>
            <span className="text-[11px] text-tl-text-dimmest">Overlap:</span>
            {([
              [0.2, "Few"],
              [0.5, "Some"],
              [0.85, "Most"],
              [1.0, "All"],
            ] as [number, string][]).map(([opacity, label]) => {
              const baseGreen = mode === "dark" ? "76, 175, 80" : "56, 142, 60";
              return (
                <div key={label} className="flex items-center gap-[3px]">
                  <div className="w-3 h-3 rounded-[3px]" style={{ background: `rgba(${baseGreen}, ${0.15 + opacity * 0.85})` }} />
                  <span className="text-[11px] text-tl-text-dimmer">{label}</span>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex items-center gap-[3px]">
              <div className="w-3 h-3 rounded-[3px] flex items-center justify-center" style={{ background: am?.color?.bg || theme.selectedBg }}>
                <Check size={8} className="text-tl-selected-text" strokeWidth={3} />
              </div>
              <span className="text-[11px] text-tl-text-dimmer">Available</span>
            </div>
            <div className="flex items-center gap-[3px]">
              <div className="w-3 h-3 rounded-[3px] bg-tl-weekend-bg border border-tl-border" />
              <span className="text-[11px] text-tl-text-dimmer">Weekend</span>
            </div>
          </>
        )}
        {trekDateSet.size > 0 && (
          <>
            <div className="flex items-center gap-[3px]">
              <span className="text-[10px]">{"\u26FA"}</span>
              <span className="text-[11px] text-tl-text-dimmer">On Trek</span>
            </div>
            <div className="flex items-center gap-[3px]">
              <span className="text-[10px]">{"\u{1F690}"}</span>
              <span className="text-[11px] text-tl-text-dimmer">Travel</span>
            </div>
          </>
        )}
      </div>

      {/* Empty state for group view */}
      {showGroupView && Object.keys(heatmap).length === 0 && members.length > 0 && (
        <div className="text-center py-3 px-4 mt-2 text-xs text-tl-text-dimmer bg-tl-bg-alt rounded-[10px] border border-tl-border">
          No one has marked availability yet. Ask your crew to tap dates they're free to train.
        </div>
      )}
    </div>
  );
}
