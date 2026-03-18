import React, { useState, useEffect } from "react";
import { Download, Mountain, Droplets, MapPin, ChevronDown, ChevronUp, Star, TreePine, Tent, Footprints, Compass } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { card, cardTitle, fontDisplay, fontBody } from "../utils/theme";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { exportXLSX } from "../utils/exportUtils";
import PrintCheatSheet from "./PrintCheatSheet";
import type { Adventure, ThemeColors, ThemeMode } from "../types";

// ── Local types for itinerary data ──
interface ItineraryProgram {
  name: string;
  type: string;
  description: string;
  time?: string;
}

interface WaterStrategy {
  strategy: string;
  fill_location: string;
  next_source: string;
  carry_liters: number;
}

interface OptionalHike {
  name: string;
  description: string;
}

interface RouteDay {
  day: number;
  camp: string;
  type: string;
  miles: number;
  elevation?: number;
  gain?: number;
  loss?: number;
  notes?: string;
  programs?: ItineraryProgram[] | string[];
  water?: WaterStrategy | null;
  warnings?: string[];
  optional_hikes?: OptionalHike[];
  showers?: boolean;
  food_pickup?: string | null;
}

interface BaldyGuide {
  start_time: string;
  round_trip_miles: number;
  total_elevation_change: number;
  daypack_essentials: string[];
  ams_warning: string;
  lightning_protocol: string;
}

interface ConservationProject {
  day?: number;
  time?: string;
  description?: string;
  what_to_bring?: string;
  camp?: string;
}

interface ReadinessReminder {
  item: string;
  details: string;
}

interface TrainingPriority {
  icon: string;
  label: string;
  detail: string;
}

interface GlobalInfo {
  conservation_project?: ConservationProject;
  baldy_guide?: BaldyGuide;
  prohibited_items?: string[];
  readiness_reminders?: ReadinessReminder[];
  staffed_camps?: string[];
}

interface ItineraryData {
  id: string;
  name: string;
  days: number;
  miles?: number;
  rating?: string;
  difficulty?: string;
  route_data?: RouteDay[];
  global_info?: GlobalInfo | string;
  training_priorities?: TrainingPriority[];
}

interface ItineraryListItem {
  id: string;
  name: string;
  days: number;
  miles: number;
  rating: string;
}

interface ItineraryProps {
  adventureId: number;
  adventure: Adventure | null;
  isAdmin: boolean;
  onRefresh?: () => void;
}

interface InfoCardData {
  programs: string[];
  peaks: string[];
  conservation: { day: number; camp?: string } | ConservationProject | null;
  maxElev: number;
  totalGain: number;
  totalLoss: number;
  dryCampDays: number[];
  foodPickups: { day: number; location: string | null }[];
  staffedWithPrograms: RouteDay[];
  hasBaldy: boolean;
}

export default function Itinerary({ adventureId, adventure, isAdmin, onRefresh }: ItineraryProps) {
  const { theme, mode } = useTheme();
  const isDesktop = useIsDesktop();
  const { addToast } = useToast();
  const [itin, setItin] = useState<ItineraryData | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [itineraries, setItineraries] = useState<ItineraryListItem[]>([]);
  const [selectingItin, setSelectingItin] = useState(false);

  useEffect(() => {
    if (!adventureId) return;
    api.getAdventure(adventureId).then(adv => {
      if (adv.itinerary_id) api.getItinerary(adv.itinerary_id).then(data => setItin(data as unknown as ItineraryData)).catch(console.error);
      else api.getItineraries().then(data => setItineraries(data as unknown as ItineraryListItem[])).catch(console.error);
    }).catch(console.error);
  }, [adventureId]);

  const handleSelectItinerary = async (itinId: string) => {
    if (!itinId) return;
    setSelectingItin(true);
    try {
      await api.updateAdventure(adventureId, { itinerary_id: itinId });
      const data = await api.getItinerary(itinId);
      setItin(data as unknown as ItineraryData);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      addToast((e as Error).message || "Failed to set itinerary", "error");
    }
    setSelectingItin(false);
  };

  if (!itin) {
    const grouped: Record<number, ItineraryListItem[]> = { 12: [], 9: [], 7: [] };
    itineraries.forEach(it => { if (grouped[it.days]) grouped[it.days].push(it); });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => {
      const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
      return na - nb;
    }));
    return (
      <div style={{ ...card(theme), textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>{"\u{1F5FA}\uFE0F"}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginBottom: 6 }}>No itinerary selected</div>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16, lineHeight: 1.5 }}>
          {isAdmin
            ? "Choose a trail itinerary to see daily route details, camps, and program highlights."
            : "Your crew leader hasn't selected an itinerary yet. Check back soon!"}
        </div>
        {isAdmin && itineraries.length > 0 && (
          <div style={{ maxWidth: 360, margin: "0 auto" }}>
            <select
              defaultValue=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectItinerary(e.target.value)}
              disabled={selectingItin}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${theme.borderAccent}`, background: theme.bgAlt, color: theme.text, fontSize: 13, fontFamily: fontBody, cursor: selectingItin ? "wait" : "pointer" }}
            >
              <option value="">Select itinerary...</option>
              {[12, 9, 7].map(days => grouped[days]?.length > 0 && (
                <optgroup key={days} label={`${days}-Day Treks`}>
                  {grouped[days].map(it => (
                    <option key={it.id} value={it.id}>{it.name} \u2014 {it.miles} mi, {it.rating}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectingItin && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>Loading itinerary...</div>}
          </div>
        )}
      </div>
    );
  }

  // Normalize route data: new format (from PDF) has simple fields, adapt to rich format
  const rawRoute = itin.route_data || [];
  const route: RouteDay[] = rawRoute.map(day => {
    // Already rich format (has 'type' field) — use as-is
    if (day.type) return day;
    // New simple format — derive type from camp name conventions
    const campUpper = (day.camp || "").toUpperCase();
    const progStr = Array.isArray(day.programs)
      ? day.programs.map(p => typeof p === "string" ? p : p.name).join("; ")
      : "";
    const isDry = progStr.toLowerCase().includes("dry camp");
    const isStaffed = campUpper === day.camp && day.camp !== "Camping HQ" && !isDry;
    const isLayover = day.miles === 0 && day.day > 1;
    const type = day.camp === "Camping HQ" ? "Base Camp"
      : isLayover ? "Layover"
      : isDry ? "Dry Camp"
      : isStaffed ? "Staffed"
      : "Trail";
    const foodPickup = progStr.match(/Food Pickup|pick up/i) ? progStr : null;
    // Parse program string into array of objects
    const programs: ItineraryProgram[] = progStr ? progStr.split(/;\s*/).filter(Boolean).map(p => ({
      name: p.trim(), type: "program", description: "",
    })) : [];
    return {
      ...day,
      type,
      notes: progStr,
      showers: false,
      food_pickup: foodPickup,
      programs,
      water: isDry ? { strategy: "Dry camp \u2014 carry extra water", fill_location: "", next_source: "", carry_liters: 4 } : null,
      warnings: isDry ? ["DRY CAMP \u2014 carry minimum 4-6 liters per person"] : [],
      optional_hikes: [],
    };
  });
  const rawGlobal = itin.global_info || {};
  const global: GlobalInfo = typeof rawGlobal === "string" ? (() => { try { return JSON.parse(rawGlobal); } catch { return {}; } })() : rawGlobal as GlobalInfo;
  const toggle = (day: number) => setExpanded(p => { const s = new Set(p); s.has(day) ? s.delete(day) : s.add(day); return s; });
  const expandAll = () => setExpanded(new Set(route.map(d => d.day)));
  const collapseAll = () => setExpanded(new Set());

  const typeBg = (type: string): string => {
    if (type === "Dry Camp") return mode === "dark" ? "#2a2520" : "#fdf6f0";
    if (type === "Staffed") return mode === "dark" ? "#202d28" : "#f0f8f2";
    if (type === "Layover") return mode === "dark" ? "#2d2a20" : "#faf5e8";
    return theme.bgAlt;
  };

  const typeBorder = (type: string): string => {
    if (type === "Layover") return `1.5px solid ${theme.gold}60`;
    if (type === "Dry Camp") return `1.5px solid ${theme.warn}40`;
    return `1px solid ${theme.border}`;
  };

  const typeColor = (type: string): string => {
    if (type === "Layover") return theme.gold;
    if (type === "Dry Camp") return theme.warn;
    if (type === "Staffed") return theme.accent;
    return theme.textMuted;
  };

  // Stats bar
  const totalMiles = route.reduce((s, d) => s + d.miles, 0);
  const dryCamps = route.filter(d => d.type === "Dry Camp").length;
  const staffedCamps = route.filter(d => d.type === "Staffed").length;

  // ── Derive info card data from route + global_info ──
  const infoCardData: InfoCardData = (() => {
    // Collect unique programs (not required/passthrough)
    const programSet = new Set<string>();
    const peakSet = new Set<string>();
    route.forEach(d => {
      ((d.programs || []) as ItineraryProgram[]).forEach(p => {
        if (p.type === "program" || p.type === "optional") programSet.add(p.name);
      });
      (d.optional_hikes || []).forEach(h => peakSet.add(h.name));
    });
    // Check for Baldy
    const hasBaldy = route.some(d => ((d.programs || []) as ItineraryProgram[]).some(p => p.name?.includes("Baldy")));
    if (hasBaldy) peakSet.add("Baldy Mountain \u2014 12,441'");
    // Conservation
    const consDay = route.find(d => ((d.programs || []) as ItineraryProgram[]).some(p => p.name?.includes("Conservation")));
    // Highest elevation
    const maxElev = Math.max(...route.map(d => d.elevation || 0));
    // Total gain
    const totalGain = route.reduce((s, d) => s + (d.gain || 0), 0);
    const totalLoss = route.reduce((s, d) => s + (d.loss || 0), 0);
    // Dry camp days
    const dryCampDays = route.filter(d => d.type === "Dry Camp").map(d => d.day);
    // Food pickups
    const foodPickups = route.filter(d => d.food_pickup).map(d => ({ day: d.day, location: d.food_pickup }));
    // Staffed camps with programs
    const staffedWithPrograms = route.filter(d => d.type === "Staffed" && d.programs && d.programs.length > 0);

    return {
      programs: [...programSet],
      peaks: [...peakSet],
      conservation: consDay ? { day: consDay.day, camp: consDay.camp } : (global.conservation_project || null),
      maxElev,
      totalGain,
      totalLoss,
      dryCampDays,
      foodPickups,
      staffedWithPrograms,
      hasBaldy,
    };
  })();

  // Rating to color/icon
  const ratingStyle = (rating: string | undefined) => {
    const r = (rating || "").toLowerCase();
    if (r.includes("super")) return { color: "#B91C1C", bg: "#FEE2E2", label: "Super Strenuous" };
    if (r.includes("strenuous")) return { color: "#D97706", bg: "#FEF3C7", label: "Strenuous" };
    if (r.includes("moderate")) return { color: "#059669", bg: "#D1FAE5", label: "Moderate" };
    return { color: "#6B7280", bg: "#F3F4F6", label: rating || "" };
  };
  const rs = ratingStyle(itin?.rating);

  return (
    <div>
      {/* ── Itinerary Info Card ── */}
      <div style={{
        borderRadius: 12, overflow: "hidden", marginBottom: 8,
        background: mode === "dark"
          ? "linear-gradient(135deg, #1a2a1a 0%, #2a3520 40%, #1e2a28 100%)"
          : "linear-gradient(135deg, #2C3E2C 0%, #3D5A3D 40%, #2A4038 100%)",
        color: "#fff", position: "relative",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 0 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9DC49D", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 2 }}>
                ITINERARY
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: fontDisplay, lineHeight: 1.1 }}>
                {itin.id}
              </div>
              <div style={{ fontSize: 13, color: "#C8DEC8", marginTop: 2, fontWeight: 500 }}>
                {itin.name}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 6,
                background: rs.bg, color: rs.color, fontSize: 11, fontWeight: 800,
                letterSpacing: "0.5px",
              }}>
                {rs.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: fontDisplay, marginTop: 4 }}>
                {Math.round(totalMiles)} miles
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12,
            paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}>
            {[
              { icon: <Tent size={12} />, val: route.length + " days", label: "Duration" },
              { icon: <Mountain size={12} />, val: (infoCardData?.totalGain || 0).toLocaleString() + "'", label: "Total Gain" },
              { icon: <Footprints size={12} />, val: (infoCardData?.totalLoss || 0).toLocaleString() + "'", label: "Total Loss" },
              { icon: <Droplets size={12} />, val: dryCamps + " nights", label: "Dry Camps" },
              { icon: <MapPin size={12} />, val: String(staffedCamps), label: "Staffed" },
            ].map(s => (
              <div key={s.label} style={{
                flex: "1 1 0", minWidth: 55, textAlign: "center",
                background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 4px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, color: "#9DC49D", marginBottom: 1 }}>
                  {s.icon}
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.val}</span>
                </div>
                <div style={{ fontSize: 8, color: "#8AB88A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable highlights */}
        <div
          onClick={() => setShowInfoCard(!showInfoCard)}
          style={{
            padding: "8px 16px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9DC49D", letterSpacing: "0.5px" }}>
            {showInfoCard ? "HIDE DETAILS" : "TRAIL HIGHLIGHTS & PROGRAMS"}
          </span>
          {showInfoCard
            ? <ChevronUp size={14} color="#9DC49D" />
            : <ChevronDown size={14} color="#9DC49D" />
          }
        </div>

        {showInfoCard && infoCardData && (
          <div style={{ padding: "12px 16px 16px 16px" }}>
              <div>
                {/* Program Highlights */}
                {infoCardData.programs.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9DC49D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Star size={10} /> Program Highlights
                    </div>
                    {infoCardData.programs.map(p => (
                      <div key={p} style={{ fontSize: 11, color: "#D4E8D4", marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: "#9DC49D" }}>{"\u2022"}</span>
                        {p}
                      </div>
                    ))}
                  </div>
                )}

                {/* Camping & Hiking Highlights */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9DC49D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <TreePine size={10} /> Camping & Hiking
                  </div>
                  {infoCardData.peaks.map(p => (
                    <div key={p} style={{ fontSize: 11, color: "#D4E8D4", marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "#9DC49D" }}>{"\u2022"}</span>
                      {p}
                    </div>
                  ))}
                  {infoCardData.dryCampDays.length > 0 && (
                    <div style={{ fontSize: 11, color: "#F0C878", marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0 }}>{"\u2022"}</span>
                      {infoCardData.dryCampDays.length} Dry Camp{infoCardData.dryCampDays.length > 1 ? "s" : ""} (Day{infoCardData.dryCampDays.length > 1 ? "s" : ""} {infoCardData.dryCampDays.join(", ")})
                    </div>
                  )}
                  {infoCardData.maxElev > 0 && (
                    <div style={{ fontSize: 11, color: "#D4E8D4", marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "#9DC49D" }}>{"\u2022"}</span>
                      Max Elevation: {infoCardData.maxElev.toLocaleString()}'
                    </div>
                  )}
                </div>

                {/* Conservation */}
                {infoCardData.conservation && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 6, marginBottom: 8,
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(157,196,157,0.3)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9DC49D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Compass size={10} /> Conservation
                    </div>
                    <div style={{ fontSize: 11, color: "#D4E8D4" }}>
                      Day {infoCardData.conservation.day}
                      {global.conservation_project?.time ? ` \u2014 ${global.conservation_project.time}` : ""}
                      {(infoCardData.conservation as { camp?: string }).camp ? ` at ${(infoCardData.conservation as { camp?: string }).camp}` : ""}
                    </div>
                    {global.conservation_project?.description && (
                      <div style={{ fontSize: 10, color: "#A8C8A8", marginTop: 2 }}>
                        {global.conservation_project.description.split(".")[0]}.
                      </div>
                    )}
                  </div>
                )}

                {/* Food Pickups */}
                {infoCardData.foodPickups.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#F0C878", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      Food Pickups
                    </div>
                    {infoCardData.foodPickups.map(fp => (
                      <div key={fp.day} style={{ fontSize: 11, color: "#D4E8D4", marginBottom: 2, paddingLeft: 10, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: "#F0C878" }}>{"\u2022"}</span>
                        Day {fp.day}: {fp.location}
                  </div>
                ))}
              </div>
            )}

            {/* Staffed camp list */}
            {global.staffed_camps && global.staffed_camps.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 10, color: "#A8C8A8" }}>
                <span style={{ fontWeight: 700, color: "#9DC49D" }}>Staffed Camps: </span>
                {global.staffed_camps.join(" \u2192 ")}
              </div>
            )}
              </div>
          </div>
        )}
      </div>

      {/* Overview card */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={cardTitle(theme)}>{itin.name} Quick Reference</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setShowPrint(true)} style={{ ...tinyBtn(theme), background: theme.accent, color: "#fff", border: `1px solid ${theme.accent}` }}>Print</button>
            <button onClick={async () => {
              const rows = route.map(d => ({
                Day: d.day, Camp: d.camp || "", Type: d.type || "", Miles: d.miles || 0,
                Elevation: d.elevation || "", Gain: d.gain || 0, Loss: d.loss || 0,
                Programs: ((d.programs || []) as ItineraryProgram[]).map(p => typeof p === "string" ? p : p.name).join("; "),
                Notes: d.notes || "", Warnings: (d.warnings || []).join("; "),
              }));
              await exportXLSX([{ name: "Itinerary", rows, title: `${itin.name || "Itinerary"} \u2014 Day by Day` }], `itinerary-${itin.id || "export"}-${new Date().toISOString().slice(0,10)}.xlsx`);
            }} style={{ ...tinyBtn(theme), display: "flex", alignItems: "center", gap: 3 }}>
              <Download size={10} /> Excel
            </button>
            <button onClick={expandAll} style={tinyBtn(theme)}>Expand All</button>
            <button onClick={collapseAll} style={tinyBtn(theme)}>Collapse</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: isDesktop ? 6 : 8, marginBottom: isDesktop ? 8 : 10 }}>
          {[
            [totalMiles.toFixed(0) + " mi", "Total"],
            [route.length + " days", "Duration"],
            [dryCamps + " dry", "Carry Water"],
            [String(staffedCamps), "Staffed Camps"],
            [itin.rating || "", "Rating"],
          ].map(([val, label]) => (
            <div key={label} style={{ background: theme.statBg, borderRadius: 6, padding: isDesktop ? "4px 8px" : "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{val}</div>
              <div style={{ fontSize: 10, color: theme.textDimmer }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {([["All", null], ["Staffed", "Staffed"], ["Dry Camp", "Dry Camp"], ["Layover", "Layover"], ["Trail/Base", "other"]] as [string, string | null][]).map(([label, val]) => {
            const isActive = typeFilter === val;
            return (
              <button key={label} onClick={() => setTypeFilter(isActive ? null : val)} style={{
                fontSize: 9, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontWeight: 700,
                background: isActive ? theme.accent : (val === "Staffed" ? theme.accentBg : val === "Dry Camp" ? theme.warnBg : val === "Layover" ? (mode === "dark" ? "#302d20" : "#faf5e8") : theme.bgAlt),
                color: isActive ? "#fff" : theme.textMuted,
                border: isActive ? `1.5px solid ${theme.accent}` : "1.5px solid transparent",
                fontFamily: fontBody, transition: "all .15s",
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* Day cards */}
      {route.filter(day => {
        if (!typeFilter) return true;
        if (typeFilter === "other") return !["Staffed", "Dry Camp", "Layover"].includes(day.type);
        return day.type === typeFilter;
      }).map(day => {
        const isOpen = expanded.has(day.day);
        const dayPrograms = (day.programs || []) as ItineraryProgram[];
        const hasPrograms = dayPrograms.length > 0;
        const hasWater = !!day.water;
        const hasWarnings = (day.warnings?.length || 0) > 0;
        const hasOptional = (day.optional_hikes?.length || 0) > 0;
        const hasDetail = hasPrograms || hasWater || hasWarnings || hasOptional;

        return (
          <div key={day.day} style={{
            background: typeBg(day.type), borderRadius: isDesktop ? 8 : 9, marginBottom: isDesktop ? 3 : 5,
            border: typeBorder(day.type), overflow: "hidden",
          }}>
            {/* Day header — always visible */}
            <div onClick={() => hasDetail && toggle(day.day)} style={{
              display: "flex", gap: isDesktop ? 8 : 10, padding: isDesktop ? "7px 10px" : "10px 12px", alignItems: "flex-start",
              cursor: hasDetail ? "pointer" : "default",
            }}>
              <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: theme.textDimmer, fontWeight: 700 }}>DAY</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{day.day}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: typeColor(day.type) }}>{day.camp}</span>
                  {day.elevation && <span style={{ fontSize: 9, color: theme.textDimmer }}>{day.elevation.toLocaleString()}'</span>}
                </div>
                <div style={{ fontSize: 12, color: theme.textDim, marginTop: 1 }}>{day.notes}</div>
                {/* Indicator badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {hasWater && <ItinBadge color={theme.warn} bg={theme.warnBg}>DRY CAMP</ItinBadge>}
                  {day.showers && <ItinBadge color={theme.accent} bg={theme.accentBg}>SHOWERS</ItinBadge>}
                  {day.food_pickup && <ItinBadge color={theme.gold} bg={mode === "dark" ? "#302d20" : "#faf5e8"}>FOOD PICKUP</ItinBadge>}
                  {hasPrograms && <ItinBadge color={theme.textMuted} bg={theme.statBg}>{dayPrograms.length} PROGRAMS</ItinBadge>}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 55, flexShrink: 0 }}>
                {day.miles > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted }}>{day.miles}mi</div>}
                {(day.gain || 0) > 0 && <div style={{ fontSize: 9, color: theme.accent }}>+{(day.gain || 0).toLocaleString()}'</div>}
                {(day.loss || 0) > 0 && <div style={{ fontSize: 9, color: theme.danger }}>-{(day.loss || 0).toLocaleString()}'</div>}
              </div>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                  background: typeBg(day.type), color: typeColor(day.type), whiteSpace: "nowrap",
                  border: `1px solid ${theme.border}`,
                }}>{day.type}</span>
                {hasDetail && <span style={{ fontSize: 12, color: theme.textDimmer, transition: "transform .2s", transform: isOpen ? "rotate(90deg)" : "none" }}>{"\u203A"}</span>}
              </div>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div style={{ padding: "0 12px 12px 54px", borderTop: `1px solid ${theme.border}` }}>
                {/* Programs */}
                {hasPrograms && (
                  <DetailSection title="Programs" theme={theme}>
                    {dayPrograms.map((p, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{p.name}</span>
                          <ProgramTag type={p.type} theme={theme} mode={mode} />
                          {p.time && <span style={{ fontSize: 10, color: theme.textDimmer }}>{p.time}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{p.description}</div>
                      </div>
                    ))}
                  </DetailSection>
                )}

                {/* Water strategy */}
                {hasWater && day.water && (
                  <DetailSection title="Water Strategy" theme={theme} warn>
                    <div style={{ fontSize: 11, color: theme.text, marginBottom: 4 }}>{day.water.strategy}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {day.water.fill_location && (
                        <WaterStat label="Fill At" value={day.water.fill_location} theme={theme} />
                      )}
                      {day.water.next_source && (
                        <WaterStat label="Next Source" value={day.water.next_source} theme={theme} />
                      )}
                      {day.water.carry_liters && (
                        <WaterStat label="Carry Min" value={`${day.water.carry_liters}L per person`} theme={theme} />
                      )}
                    </div>
                  </DetailSection>
                )}

                {/* Warnings */}
                {hasWarnings && (
                  <DetailSection title="Warnings" theme={theme} danger>
                    {(day.warnings || []).map((w, i) => (
                      <div key={i} style={{ fontSize: 11, color: theme.danger, marginBottom: 3, paddingLeft: 12, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0 }}>!</span> {w}
                      </div>
                    ))}
                  </DetailSection>
                )}

                {/* Optional hikes */}
                {hasOptional && (
                  <DetailSection title="Optional Side Hikes" theme={theme}>
                    {(day.optional_hikes || []).map((h, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.accent }}>{h.name}</span>
                        <span style={{ fontSize: 11, color: theme.textDim, marginLeft: 6 }}>{h.description}</span>
                      </div>
                    ))}
                  </DetailSection>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Training priorities */}
      {itin.training_priorities && itin.training_priorities.length > 0 && (
        <div style={{ ...card(theme), marginTop: 8 }}>
          <div style={{ ...cardTitle(theme), color: theme.gold }}>Key Training Priorities</div>
          <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.9 }}>
            {itin.training_priorities.map(p => (
              <div key={p.label}><strong style={{ color: theme.heading }}>{p.icon} {p.label}:</strong> {p.detail}</div>
            ))}
          </div>
        </div>
      )}

      {/* Global info sections */}
      {global.baldy_guide && (
        <div style={{ ...card(theme), marginTop: 4 }}>
          <div style={{ ...cardTitle(theme), color: theme.gold }}>Baldy Summit Guide (12,441')</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <InfoChip label="Start" value={global.baldy_guide.start_time} theme={theme} />
            <InfoChip label="Distance" value={global.baldy_guide.round_trip_miles + " mi RT"} theme={theme} />
            <InfoChip label="Elev Change" value={global.baldy_guide.total_elevation_change.toLocaleString() + "'"} theme={theme} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 4 }}>Daypack Essentials</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            {global.baldy_guide.daypack_essentials.map(item => (
              <span key={item} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: theme.statBg, color: theme.textMuted }}>{item}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: theme.danger, background: mode === "dark" ? "#3a2020" : "#fde8e0", padding: "8px 10px", borderRadius: 6, marginBottom: 4 }}>
            <strong>AMS Warning:</strong> {global.baldy_guide.ams_warning}
          </div>
          <div style={{ fontSize: 11, color: theme.warn, background: theme.warnBg, padding: "8px 10px", borderRadius: 6 }}>
            <strong>Lightning:</strong> {global.baldy_guide.lightning_protocol}
          </div>
        </div>
      )}

      {global.conservation_project && (
        <div style={{ ...card(theme), marginTop: 4 }}>
          <div style={{ ...cardTitle(theme), color: theme.accent }}>Conservation Project \u2014 Day {global.conservation_project.day}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, marginBottom: 4 }}>{global.conservation_project.time} \u2014 MANDATORY</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>{global.conservation_project.description}</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>Bring: {global.conservation_project.what_to_bring}</div>
        </div>
      )}

      {global.prohibited_items && global.prohibited_items.length > 0 && (
        <div style={{ ...card(theme), marginTop: 4 }}>
          <div style={{ ...cardTitle(theme), color: theme.danger }}>Prohibited Items</div>
          {global.prohibited_items.map(item => (
            <div key={item} style={{ fontSize: 11, color: theme.textMuted, marginBottom: 3, paddingLeft: 12, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: theme.danger }}>x</span> {item}
            </div>
          ))}
        </div>
      )}

      {global.readiness_reminders && global.readiness_reminders.length > 0 && (
        <div style={{ ...card(theme), marginTop: 4 }}>
          <div style={{ ...cardTitle(theme), color: theme.gold }}>Readiness Reminders</div>
          {global.readiness_reminders.map(r => (
            <div key={r.item} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{r.item}</div>
              <div style={{ fontSize: 11, color: theme.textDim }}>{r.details}</div>
            </div>
          ))}
        </div>
      )}

      {showPrint && (
        <PrintCheatSheet adventure={adventure} itinerary={itin as unknown as Parameters<typeof PrintCheatSheet>[0]["itinerary"]} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

// ── Subcomponents ──

interface ItinBadgeProps {
  children: React.ReactNode;
  color: string;
  bg: string;
}

function ItinBadge({ children, color, bg }: ItinBadgeProps) {
  return (
    <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: bg, color, letterSpacing: "0.5px" }}>
      {children}
    </span>
  );
}

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  theme: ThemeColors;
  warn?: boolean;
  danger?: boolean;
}

function DetailSection({ title, children, theme, warn, danger }: DetailSectionProps) {
  const titleColor = danger ? theme.danger : warn ? theme.warn : theme.heading;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

interface ProgramTagProps {
  type: string;
  theme: ThemeColors;
  mode: ThemeMode;
}

function ProgramTag({ type, theme, mode }: ProgramTagProps) {
  const colors: Record<string, { bg: string; color: string }> = {
    required: { bg: mode === "dark" ? "#3a2520" : "#fde0d0", color: theme.danger },
    program: { bg: theme.accentBg, color: theme.accent },
    passthrough: { bg: theme.statBg, color: theme.textMuted },
    optional: { bg: mode === "dark" ? "#302d20" : "#faf5e8", color: theme.gold },
  };
  const c = colors[type] || colors.program;
  return <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: c.bg, color: c.color, textTransform: "uppercase" }}>{type}</span>;
}

interface WaterStatProps {
  label: string;
  value: string;
  theme: ThemeColors;
}

function WaterStat({ label, value, theme }: WaterStatProps) {
  return (
    <div>
      <div style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11, color: theme.text }}>{value}</div>
    </div>
  );
}

interface InfoChipProps {
  label: string;
  value: string;
  theme: ThemeColors;
}

function InfoChip({ label, value, theme }: InfoChipProps) {
  return (
    <div style={{ background: theme.statBg, borderRadius: 6, padding: "5px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{value}</div>
      <div style={{ fontSize: 9, color: theme.textDimmer }}>{label}</div>
    </div>
  );
}

function tinyBtn(theme: ThemeColors): React.CSSProperties {
  return {
    fontSize: 9, padding: "3px 8px", borderRadius: 4, border: `1px solid ${theme.border}`,
    background: theme.bgAlt, color: theme.textDimmer, cursor: "pointer", fontFamily: fontBody,
  };
}
