import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { Download, Mountain, Droplets, MapPin, ChevronDown, ChevronUp, Star, TreePine, Tent, Footprints, Compass } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
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
      <div className="tl-card text-center py-8 px-5">
        <div className="text-4xl mb-2.5">{"\u{1F5FA}\uFE0F"}</div>
        <div className="text-sm font-bold text-tl-heading font-display mb-1.5">No itinerary selected</div>
        <div className="text-xs text-tl-text-dim mb-4 leading-[1.5]">
          {isAdmin
            ? "Choose a trail itinerary to see daily route details, camps, and program highlights."
            : "Your crew leader hasn't selected an itinerary yet. Check back soon!"}
        </div>
        {isAdmin && itineraries.length > 0 && (
          <div className="max-w-[360px] mx-auto">
            <select
              defaultValue=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectItinerary(e.target.value)}
              disabled={selectingItin}
              className="w-full py-2.5 px-3 rounded-btn border-[1.5px] border-tl-border-accent bg-tl-bg-alt text-tl-text text-[13px] font-body"
              style={{ cursor: selectingItin ? "wait" : "pointer" }}
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
            {selectingItin && <div className="text-[11px] text-tl-text-dim mt-2">Loading itinerary...</div>}
          </div>
        )}
      </div>
    );
  }

  // ── Defensive parsers for fields that may arrive as strings from the DB ──
  const parsePrograms = (raw: unknown): ItineraryProgram[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(p =>
        typeof p === "string" ? { name: p.trim(), type: "program", description: "" } : p
      );
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsePrograms(parsed);
      } catch { /* not JSON */ }
      return raw.split(/;\s*/).filter(Boolean).map(p => ({
        name: p.trim(), type: "program", description: "",
      }));
    }
    return [];
  };

  const parseStringArray = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch { /* not JSON */ }
      return raw.split(/;\s*/).filter(Boolean);
    }
    return [];
  };

  const parseOptionalHikes = (raw: unknown): OptionalHike[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(h =>
        typeof h === "string" ? { name: h.trim(), description: "" } : h
      );
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parseOptionalHikes(parsed);
      } catch { /* not JSON */ }
      return raw.split(/;\s*/).filter(Boolean).map(h => ({ name: h.trim(), description: "" }));
    }
    return [];
  };

  const parseWater = (raw: unknown): WaterStrategy | null => {
    if (!raw) return null;
    if (typeof raw === "object" && raw !== null) return raw as WaterStrategy;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  };

  // Normalize route data: new format (from PDF) has simple fields, adapt to rich format
  const rawRoute = itin.route_data || [];
  const route: RouteDay[] = rawRoute.map(day => {
    // Already rich format (has 'type' field) — normalize array fields defensively
    if (day.type) {
      return {
        ...day,
        programs: parsePrograms(day.programs),
        warnings: parseStringArray(day.warnings),
        optional_hikes: parseOptionalHikes(day.optional_hikes),
        water: parseWater(day.water),
      };
    }
    // New simple format — derive type from camp name conventions
    const campUpper = (day.camp || "").toUpperCase();
    const parsedPrograms = parsePrograms(day.programs);
    const progStr = parsedPrograms.map(p => p.name).join("; ");
    const isDry = progStr.toLowerCase().includes("dry camp");
    const isStaffed = campUpper === day.camp && day.camp !== "Camping HQ" && !isDry;
    const isLayover = day.miles === 0 && day.day > 1;
    const type = day.camp === "Camping HQ" ? "Base Camp"
      : isLayover ? "Layover"
      : isDry ? "Dry Camp"
      : isStaffed ? "Staffed"
      : "Trail";
    const foodPickup = progStr.match(/Food Pickup|pick up/i) ? progStr : null;
    return {
      ...day,
      type,
      notes: progStr,
      showers: false,
      food_pickup: foodPickup,
      programs: parsedPrograms,
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
      <div className="rounded-[12px] overflow-hidden mb-2 text-white relative"
        style={{
          background: mode === "dark"
            ? "linear-gradient(135deg, #1a2a1a 0%, #2a3520 40%, #1e2a28 100%)"
            : "linear-gradient(135deg, #2C3E2C 0%, #3D5A3D 40%, #2A4038 100%)",
        }}>
        {/* Header */}
        <div className="pt-4 px-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-[#9DC49D] tracking-[1.5px] uppercase mb-0.5">
                ITINERARY
              </div>
              <div className="text-2xl font-[800] font-display leading-[1.1]">
                {itin.id}
              </div>
              <div className="text-[13px] text-[#C8DEC8] mt-0.5 font-medium">
                {itin.name}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block py-1 px-3 rounded-badge-sm text-[11px] font-[800] tracking-[0.5px]"
                style={{ background: rs.bg, color: rs.color }}>
                {rs.label}
              </div>
              <div className="text-[22px] font-[800] font-display mt-1">
                {Math.round(totalMiles)} miles
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-1.5 mt-3 pb-3 border-b border-white/15">
            {[
              { icon: <Tent size={12} />, val: route.length + " days", label: "Duration" },
              { icon: <Mountain size={12} />, val: (infoCardData?.totalGain || 0).toLocaleString() + "'", label: "Total Gain" },
              { icon: <Footprints size={12} />, val: (infoCardData?.totalLoss || 0).toLocaleString() + "'", label: "Total Loss" },
              { icon: <Droplets size={12} />, val: dryCamps + " nights", label: "Dry Camps" },
              { icon: <MapPin size={12} />, val: String(staffedCamps), label: "Staffed" },
            ].map(s => (
              <div key={s.label} className="flex-[1_1_0] min-w-[55px] text-center bg-white/[0.08] rounded-badge-sm py-1.5 px-1">
                <div className="flex items-center justify-center gap-[3px] text-[#9DC49D] mb-[1px]">
                  {s.icon}
                  <span className="text-[13px] font-bold text-white">{s.val}</span>
                </div>
                <div className="text-[8px] text-[#8AB88A] font-semibold uppercase tracking-[0.5px]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable highlights */}
        <div
          onClick={() => setShowInfoCard(!showInfoCard)}
          className="py-2 px-4 cursor-pointer flex items-center justify-between bg-black/15"
        >
          <span className="text-[11px] font-bold text-[#9DC49D] tracking-[0.5px]">
            {showInfoCard ? "HIDE DETAILS" : "TRAIL HIGHLIGHTS & PROGRAMS"}
          </span>
          {showInfoCard
            ? <ChevronUp size={14} color="#9DC49D" />
            : <ChevronDown size={14} color="#9DC49D" />
          }
        </div>

        {showInfoCard && infoCardData && (
          <div className="py-3 px-4 pb-4">
              <div>
                {/* Program Highlights */}
                {infoCardData.programs.length > 0 && (
                  <div className="mb-2.5">
                    <div className="text-[10px] font-bold text-[#9DC49D] uppercase tracking-[0.5px] mb-1.5 flex items-center gap-1">
                      <Star size={10} /> Program Highlights
                    </div>
                    {infoCardData.programs.map(p => (
                      <div key={p} className="text-[11px] text-[#D4E8D4] mb-[3px] pl-2.5 relative">
                        <span className="absolute left-0 text-[#9DC49D]">{"\u2022"}</span>
                        {p}
                      </div>
                    ))}
                  </div>
                )}

                {/* Camping & Hiking Highlights */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-bold text-[#9DC49D] uppercase tracking-[0.5px] mb-1.5 flex items-center gap-1">
                    <TreePine size={10} /> Camping & Hiking
                  </div>
                  {infoCardData.peaks.map(p => (
                    <div key={p} className="text-[11px] text-[#D4E8D4] mb-[3px] pl-2.5 relative">
                      <span className="absolute left-0 text-[#9DC49D]">{"\u2022"}</span>
                      {p}
                    </div>
                  ))}
                  {infoCardData.dryCampDays.length > 0 && (
                    <div className="text-[11px] text-[#F0C878] mb-[3px] pl-2.5 relative">
                      <span className="absolute left-0">{"\u2022"}</span>
                      {infoCardData.dryCampDays.length} Dry Camp{infoCardData.dryCampDays.length > 1 ? "s" : ""} (Day{infoCardData.dryCampDays.length > 1 ? "s" : ""} {infoCardData.dryCampDays.join(", ")})
                    </div>
                  )}
                  {infoCardData.maxElev > 0 && (
                    <div className="text-[11px] text-[#D4E8D4] mb-[3px] pl-2.5 relative">
                      <span className="absolute left-0 text-[#9DC49D]">{"\u2022"}</span>
                      Max Elevation: {infoCardData.maxElev.toLocaleString()}'
                    </div>
                  )}
                </div>

                {/* Conservation */}
                {infoCardData.conservation && (
                  <div className="py-2 px-3 rounded-badge-sm mb-2 bg-white/[0.08] border border-[rgba(157,196,157,0.3)]">
                    <div className="text-[10px] font-bold text-[#9DC49D] uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
                      <Compass size={10} /> Conservation
                    </div>
                    <div className="text-[11px] text-[#D4E8D4]">
                      Day {infoCardData.conservation.day}
                      {global.conservation_project?.time ? ` \u2014 ${global.conservation_project.time}` : ""}
                      {(infoCardData.conservation as { camp?: string }).camp ? ` at ${(infoCardData.conservation as { camp?: string }).camp}` : ""}
                    </div>
                    {global.conservation_project?.description && (
                      <div className="text-[10px] text-[#A8C8A8] mt-0.5">
                        {global.conservation_project.description.split(".")[0]}.
                      </div>
                    )}
                  </div>
                )}

                {/* Food Pickups */}
                {infoCardData.foodPickups.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-[#F0C878] uppercase tracking-[0.5px] mb-1">
                      Food Pickups
                    </div>
                    {infoCardData.foodPickups.map(fp => (
                      <div key={fp.day} className="text-[11px] text-[#D4E8D4] mb-0.5 pl-2.5 relative">
                        <span className="absolute left-0 text-[#F0C878]">{"\u2022"}</span>
                        Day {fp.day}: {fp.location}
                  </div>
                ))}
              </div>
            )}

            {/* Staffed camp list */}
            {global.staffed_camps && global.staffed_camps.length > 0 && (
              <div className="mt-2 text-[10px] text-[#A8C8A8]">
                <span className="font-bold text-[#9DC49D]">Staffed Camps: </span>
                {global.staffed_camps.join(" \u2192 ")}
              </div>
            )}
              </div>
          </div>
        )}
      </div>

      {/* Overview card */}
      <div className="tl-card">
        <div className="flex justify-between items-center mb-2">
          <div className="tl-card-title">{itin.name} Quick Reference</div>
          <div className="flex gap-1">
            <button onClick={() => setShowPrint(true)}
              className="text-[9px] py-[3px] px-2 rounded-[4px] border border-tl-accent bg-tl-accent text-white cursor-pointer font-body">Print</button>
            <button onClick={async () => {
              const rows = route.map(d => ({
                Day: d.day, Camp: d.camp || "", Type: d.type || "", Miles: d.miles || 0,
                Elevation: d.elevation || "", Gain: d.gain || 0, Loss: d.loss || 0,
                Programs: ((d.programs || []) as ItineraryProgram[]).map(p => typeof p === "string" ? p : p.name).join("; "),
                Notes: d.notes || "", Warnings: (d.warnings || []).join("; "),
              }));
              await exportXLSX([{ name: "Itinerary", rows, title: `${itin.name || "Itinerary"} \u2014 Day by Day` }], `itinerary-${itin.id || "export"}-${new Date().toISOString().slice(0,10)}.xlsx`);
            }} className="text-[9px] py-[3px] px-2 rounded-[4px] border border-tl-border bg-tl-bg-alt text-tl-text-dimmer cursor-pointer font-body flex items-center gap-[3px]">
              <Download size={10} /> Excel
            </button>
            <button onClick={expandAll} className="text-[9px] py-[3px] px-2 rounded-[4px] border border-tl-border bg-tl-bg-alt text-tl-text-dimmer cursor-pointer font-body">Expand All</button>
            <button onClick={collapseAll} className="text-[9px] py-[3px] px-2 rounded-[4px] border border-tl-border bg-tl-bg-alt text-tl-text-dimmer cursor-pointer font-body">Collapse</button>
          </div>
        </div>

        {/* Stats */}
        <div className={clsx("flex flex-wrap", isDesktop ? "gap-1.5 mb-2" : "gap-2 mb-2.5")}>
          {[
            [totalMiles.toFixed(0) + " mi", "Total"],
            [route.length + " days", "Duration"],
            [dryCamps + " dry", "Carry Water"],
            [String(staffedCamps), "Staffed Camps"],
            [itin.rating || "", "Rating"],
          ].map(([val, label]) => (
            <div key={label} className={clsx("bg-tl-stat-bg rounded-badge-sm text-center", isDesktop ? "py-1 px-2" : "py-1.5 px-2.5")}>
              <div className="text-sm font-bold text-tl-heading font-display">{val}</div>
              <div className="text-[10px] text-tl-text-dimmer">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tags */}
        <div className="flex flex-wrap gap-[5px]">
          {([["All", null], ["Staffed", "Staffed"], ["Dry Camp", "Dry Camp"], ["Layover", "Layover"], ["Trail/Base", "other"]] as [string, string | null][]).map(([label, val]) => {
            const isActive = typeFilter === val;
            return (
              <button key={label} onClick={() => setTypeFilter(isActive ? null : val)}
                className="text-[9px] py-[3px] px-[9px] rounded-[4px] cursor-pointer font-bold font-body transition-all duration-150"
                style={{
                  background: isActive ? theme.accent : (val === "Staffed" ? theme.accentBg : val === "Dry Camp" ? theme.warnBg : val === "Layover" ? (mode === "dark" ? "#302d20" : "#faf5e8") : theme.bgAlt),
                  color: isActive ? "#fff" : theme.textMuted,
                  border: isActive ? `1.5px solid ${theme.accent}` : "1.5px solid transparent",
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
          <div key={day.day} className={clsx("overflow-hidden", isDesktop ? "rounded-btn mb-[3px]" : "rounded-[9px] mb-[5px]")}
            style={{ background: typeBg(day.type), border: typeBorder(day.type) }}>
            {/* Day header — always visible */}
            <div onClick={() => hasDetail && toggle(day.day)}
              className={clsx("flex items-start", isDesktop ? "gap-2 py-[7px] px-2.5" : "gap-2.5 py-2.5 px-3")}
              style={{ cursor: hasDetail ? "pointer" : "default" }}>
              <div className="w-8 text-center shrink-0">
                <div className="text-[10px] text-tl-text-dimmer font-bold">DAY</div>
                <div className="text-xl font-bold text-tl-heading font-display">{day.day}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: typeColor(day.type) }}>{day.camp}</span>
                  {day.elevation && <span className="text-[9px] text-tl-text-dimmer">{day.elevation.toLocaleString()}'</span>}
                </div>
                <div className="text-xs text-tl-text-dim mt-[1px]">{day.notes}</div>
                {/* Indicator badges */}
                <div className="flex flex-wrap gap-[3px] mt-1">
                  {hasWater && <ItinBadge color={theme.warn} bg={theme.warnBg}>DRY CAMP</ItinBadge>}
                  {day.showers && <ItinBadge color={theme.accent} bg={theme.accentBg}>SHOWERS</ItinBadge>}
                  {day.food_pickup && <ItinBadge color={theme.gold} bg={mode === "dark" ? "#302d20" : "#faf5e8"}>FOOD PICKUP</ItinBadge>}
                  {hasPrograms && <ItinBadge color={theme.textMuted} bg={theme.statBg}>{dayPrograms.length} PROGRAMS</ItinBadge>}
                </div>
              </div>
              <div className="text-right min-w-[55px] shrink-0">
                {day.miles > 0 && <div className="text-[13px] font-bold text-tl-text-muted">{day.miles}mi</div>}
                {(day.gain || 0) > 0 && <div className="text-[9px] text-tl-accent">+{(day.gain || 0).toLocaleString()}'</div>}
                {(day.loss || 0) > 0 && <div className="text-[9px] text-tl-danger">-{(day.loss || 0).toLocaleString()}'</div>}
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-[9px] font-semibold py-0.5 px-2 rounded-[4px] whitespace-nowrap border border-tl-border"
                  style={{ background: typeBg(day.type), color: typeColor(day.type) }}>{day.type}</span>
                {hasDetail && <span className="text-xs text-tl-text-dimmer transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>{"\u203A"}</span>}
              </div>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div className="px-3 pb-3 pl-[54px] border-t border-tl-border">
                {/* Programs */}
                {hasPrograms && (
                  <DetailSection title="Programs" theme={theme}>
                    {dayPrograms.map((p, i) => (
                      <div key={i} className="mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-tl-text">{p.name}</span>
                          <ProgramTag type={p.type} theme={theme} mode={mode} />
                          {p.time && <span className="text-[10px] text-tl-text-dimmer">{p.time}</span>}
                        </div>
                        <div className="text-[11px] text-tl-text-dim mt-[1px]">{p.description}</div>
                      </div>
                    ))}
                  </DetailSection>
                )}

                {/* Water strategy */}
                {hasWater && day.water && (
                  <DetailSection title="Water Strategy" theme={theme} warn>
                    <div className="text-[11px] text-tl-text mb-1">{day.water.strategy}</div>
                    <div className="flex flex-wrap gap-2.5">
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
                      <div key={i} className="text-[11px] text-tl-danger mb-[3px] pl-3 relative">
                        <span className="absolute left-0">!</span> {w}
                      </div>
                    ))}
                  </DetailSection>
                )}

                {/* Optional hikes */}
                {hasOptional && (
                  <DetailSection title="Optional Side Hikes" theme={theme}>
                    {(day.optional_hikes || []).map((h, i) => (
                      <div key={i} className="mb-1">
                        <span className="text-xs font-semibold text-tl-accent">{h.name}</span>
                        <span className="text-[11px] text-tl-text-dim ml-1.5">{h.description}</span>
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
        <div className="tl-card mt-2">
          <div className="tl-card-title text-tl-gold">Key Training Priorities</div>
          <div className="text-[11px] text-tl-text-muted leading-[1.9]">
            {itin.training_priorities.map(p => (
              <div key={p.label}><strong className="text-tl-heading">{p.icon} {p.label}:</strong> {p.detail}</div>
            ))}
          </div>
        </div>
      )}

      {/* Global info sections */}
      {global.baldy_guide && (
        <div className="tl-card mt-1">
          <div className="tl-card-title text-tl-gold">Baldy Summit Guide (12,441')</div>
          <div className="flex flex-wrap gap-2 mb-2">
            <InfoChip label="Start" value={global.baldy_guide.start_time} theme={theme} />
            <InfoChip label="Distance" value={global.baldy_guide.round_trip_miles + " mi RT"} theme={theme} />
            <InfoChip label="Elev Change" value={global.baldy_guide.total_elevation_change.toLocaleString() + "'"} theme={theme} />
          </div>
          <div className="text-[11px] font-bold text-tl-heading mb-1">Daypack Essentials</div>
          <div className="flex flex-wrap gap-[3px] mb-2">
            {global.baldy_guide.daypack_essentials.map(item => (
              <span key={item} className="text-[11px] py-0.5 px-2 rounded-[4px] bg-tl-stat-bg text-tl-text-muted">{item}</span>
            ))}
          </div>
          <div className="text-[11px] text-tl-danger py-2 px-2.5 rounded-badge-sm mb-1"
            style={{ background: mode === "dark" ? "#3a2020" : "#fde8e0" }}>
            <strong>AMS Warning:</strong> {global.baldy_guide.ams_warning}
          </div>
          <div className="text-[11px] text-tl-warn bg-tl-warn-bg py-2 px-2.5 rounded-badge-sm">
            <strong>Lightning:</strong> {global.baldy_guide.lightning_protocol}
          </div>
        </div>
      )}

      {global.conservation_project && (
        <div className="tl-card mt-1">
          <div className="tl-card-title text-tl-accent">Conservation Project \u2014 Day {global.conservation_project.day}</div>
          <div className="text-[10px] font-bold text-tl-text-dimmer mb-1">{global.conservation_project.time} \u2014 MANDATORY</div>
          <div className="text-[11px] text-tl-text-muted">{global.conservation_project.description}</div>
          <div className="text-[10px] text-tl-text-dim mt-1">Bring: {global.conservation_project.what_to_bring}</div>
        </div>
      )}

      {global.prohibited_items && global.prohibited_items.length > 0 && (
        <div className="tl-card mt-1">
          <div className="tl-card-title text-tl-danger">Prohibited Items</div>
          {global.prohibited_items.map(item => (
            <div key={item} className="text-[11px] text-tl-text-muted mb-[3px] pl-3 relative">
              <span className="absolute left-0 text-tl-danger">x</span> {item}
            </div>
          ))}
        </div>
      )}

      {global.readiness_reminders && global.readiness_reminders.length > 0 && (
        <div className="tl-card mt-1">
          <div className="tl-card-title text-tl-gold">Readiness Reminders</div>
          {global.readiness_reminders.map(r => (
            <div key={r.item} className="mb-1.5">
              <div className="text-xs font-bold text-tl-heading">{r.item}</div>
              <div className="text-[11px] text-tl-text-dim">{r.details}</div>
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
    <span className="text-[8px] font-bold py-[1px] px-[5px] rounded-[3px] tracking-[0.5px]"
      style={{ background: bg, color }}>
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
    <div className="mt-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.5px] mb-1" style={{ color: titleColor }}>{title}</div>
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
  return <span className="text-[8px] font-bold py-[1px] px-[5px] rounded-[3px] uppercase" style={{ background: c.bg, color: c.color }}>{type}</span>;
}

interface WaterStatProps {
  label: string;
  value: string;
  theme: ThemeColors;
}

function WaterStat({ label, value, theme }: WaterStatProps) {
  return (
    <div>
      <div className="text-[9px] text-tl-text-dimmer font-bold">{label}</div>
      <div className="text-[11px] text-tl-text">{value}</div>
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
    <div className="bg-tl-stat-bg rounded-badge-sm py-[5px] px-2.5 text-center">
      <div className="text-xs font-bold text-tl-heading">{value}</div>
      <div className="text-[9px] text-tl-text-dimmer">{label}</div>
    </div>
  );
}
