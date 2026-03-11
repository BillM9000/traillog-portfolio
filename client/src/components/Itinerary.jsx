import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { card, cardTitle, fontDisplay, fontBody } from "../utils/theme";
import PrintCheatSheet from "./PrintCheatSheet";

export default function Itinerary({ adventureId, adventure, isAdmin, onRefresh }) {
  const { theme, mode } = useTheme();
  const { addToast } = useToast();
  const [itin, setItin] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [typeFilter, setTypeFilter] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [itineraries, setItineraries] = useState([]);
  const [selectingItin, setSelectingItin] = useState(false);

  useEffect(() => {
    if (!adventureId) return;
    api.getAdventure(adventureId).then(adv => {
      if (adv.itinerary_id) api.getItinerary(adv.itinerary_id).then(setItin).catch(console.error);
      else api.getItineraries().then(setItineraries).catch(console.error);
    }).catch(console.error);
  }, [adventureId]);

  const handleSelectItinerary = async (itinId) => {
    if (!itinId) return;
    setSelectingItin(true);
    try {
      await api.updateAdventure(adventureId, { itinerary_id: itinId });
      const data = await api.getItinerary(itinId);
      setItin(data);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      addToast(e.message || "Failed to set itinerary", "error");
    }
    setSelectingItin(false);
  };

  if (!itin) {
    const grouped = { 12: [], 9: [], 7: [] };
    itineraries.forEach(it => { if (grouped[it.days]) grouped[it.days].push(it); });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => {
      const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
      return na - nb;
    }));
    return (
      <div style={{ ...card(theme), textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
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
              onChange={e => handleSelectItinerary(e.target.value)}
              disabled={selectingItin}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${theme.borderAccent}`, background: theme.bgAlt, color: theme.text, fontSize: 13, fontFamily: fontBody, cursor: selectingItin ? "wait" : "pointer" }}
            >
              <option value="">Select itinerary...</option>
              {[12, 9, 7].map(days => grouped[days]?.length > 0 && (
                <optgroup key={days} label={`${days}-Day Treks`}>
                  {grouped[days].map(it => (
                    <option key={it.id} value={it.id}>{it.name} — {it.miles} mi, {it.rating}</option>
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
  const route = rawRoute.map(day => {
    // Already rich format (has 'type' field) — use as-is
    if (day.type) return day;
    // New simple format — derive type from camp name conventions
    const campUpper = (day.camp || "").toUpperCase();
    const isDry = (day.programs || "").toLowerCase().includes("dry camp");
    const isStaffed = campUpper === day.camp && day.camp !== "Camping HQ" && !isDry;
    const isLayover = day.miles === 0 && day.day > 1;
    const type = day.camp === "Camping HQ" ? "Base Camp"
      : isLayover ? "Layover"
      : isDry ? "Dry Camp"
      : isStaffed ? "Staffed"
      : "Trail";
    const showers = (day.programs || "").toLowerCase().includes("shower") || /\bs\b/.test("");
    const foodPickup = (day.programs || "").match(/Food Pickup|pick up/i) ? day.programs : null;
    // Parse program string into array of objects
    const progStr = day.programs || "";
    const programs = progStr ? progStr.split(/;\s*/).filter(Boolean).map(p => ({
      name: p.trim(), type: "program", description: "",
    })) : [];
    return {
      ...day,
      type,
      notes: progStr,
      showers: false,
      food_pickup: foodPickup,
      programs,
      water: isDry ? { strategy: "Dry camp — carry extra water", fill_location: "", next_source: "", carry_liters: 4 } : null,
      warnings: isDry ? ["DRY CAMP — carry minimum 4-6 liters per person"] : [],
      optional_hikes: [],
    };
  });
  const rawGlobal = itin.global_info || {};
  const global = typeof rawGlobal === "string" ? (() => { try { return JSON.parse(rawGlobal); } catch { return {}; } })() : rawGlobal;
  const toggle = (day) => setExpanded(p => { const s = new Set(p); s.has(day) ? s.delete(day) : s.add(day); return s; });
  const expandAll = () => setExpanded(new Set(route.map(d => d.day)));
  const collapseAll = () => setExpanded(new Set());

  const typeBg = (type) => {
    if (type === "Dry Camp") return mode === "dark" ? "#2a2520" : "#fdf6f0";
    if (type === "Staffed") return mode === "dark" ? "#202d28" : "#f0f8f2";
    if (type === "Layover") return mode === "dark" ? "#2d2a20" : "#faf5e8";
    return theme.bgAlt;
  };

  const typeBorder = (type) => {
    if (type === "Layover") return `1.5px solid ${theme.gold}60`;
    if (type === "Dry Camp") return `1.5px solid ${theme.warn}40`;
    return `1px solid ${theme.border}`;
  };

  const typeColor = (type) => {
    if (type === "Layover") return theme.gold;
    if (type === "Dry Camp") return theme.warn;
    if (type === "Staffed") return theme.accent;
    return theme.textMuted;
  };

  // Stats bar
  const totalMiles = route.reduce((s, d) => s + d.miles, 0);
  const dryCamps = route.filter(d => d.type === "Dry Camp").length;
  const staffedCamps = route.filter(d => d.type === "Staffed").length;

  return (
    <div>
      {/* Overview card */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={cardTitle(theme)}>{itin.name} Quick Reference</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setShowPrint(true)} style={{ ...tinyBtn(theme), background: theme.accent, color: "#fff", border: `1px solid ${theme.accent}` }}>Print</button>
            <button onClick={expandAll} style={tinyBtn(theme)}>Expand All</button>
            <button onClick={collapseAll} style={tinyBtn(theme)}>Collapse</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {[
            [totalMiles.toFixed(0) + " mi", "Total"],
            [route.length + " days", "Duration"],
            [dryCamps + " dry", "Carry Water"],
            [staffedCamps, "Staffed Camps"],
            [itin.rating, "Rating"],
          ].map(([val, label]) => (
            <div key={label} style={{ background: theme.statBg, borderRadius: 6, padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{val}</div>
              <div style={{ fontSize: 9, color: theme.textDimmer }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[["All", null], ["Staffed", "Staffed"], ["Dry Camp", "Dry Camp"], ["Layover", "Layover"], ["Trail/Base", "other"]].map(([label, val]) => {
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
        const hasPrograms = day.programs?.length > 0;
        const hasWater = !!day.water;
        const hasWarnings = day.warnings?.length > 0;
        const hasOptional = day.optional_hikes?.length > 0;
        const hasDetail = hasPrograms || hasWater || hasWarnings || hasOptional;

        return (
          <div key={day.day} style={{
            background: typeBg(day.type), borderRadius: 9, marginBottom: 5,
            border: typeBorder(day.type), overflow: "hidden",
          }}>
            {/* Day header — always visible */}
            <div onClick={() => hasDetail && toggle(day.day)} style={{
              display: "flex", gap: 10, padding: "10px 12px", alignItems: "flex-start",
              cursor: hasDetail ? "pointer" : "default",
            }}>
              <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 8, color: theme.textDimmer, fontWeight: 700 }}>DAY</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{day.day}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: typeColor(day.type) }}>{day.camp}</span>
                  {day.elevation && <span style={{ fontSize: 9, color: theme.textDimmer }}>{day.elevation.toLocaleString()}'</span>}
                </div>
                <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{day.notes}</div>
                {/* Indicator badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {hasWater && <Badge color={theme.warn} bg={theme.warnBg}>DRY CAMP</Badge>}
                  {day.showers && <Badge color={theme.accent} bg={theme.accentBg}>SHOWERS</Badge>}
                  {day.food_pickup && <Badge color={theme.gold} bg={mode === "dark" ? "#302d20" : "#faf5e8"}>FOOD PICKUP</Badge>}
                  {hasPrograms && <Badge color={theme.textMuted} bg={theme.statBg}>{day.programs.length} PROGRAMS</Badge>}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 55, flexShrink: 0 }}>
                {day.miles > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted }}>{day.miles}mi</div>}
                {day.gain > 0 && <div style={{ fontSize: 9, color: theme.accent }}>+{day.gain.toLocaleString()}'</div>}
                {day.loss > 0 && <div style={{ fontSize: 9, color: theme.danger }}>-{day.loss.toLocaleString()}'</div>}
              </div>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                  background: typeBg(day.type), color: typeColor(day.type), whiteSpace: "nowrap",
                  border: `1px solid ${theme.border}`,
                }}>{day.type}</span>
                {hasDetail && <span style={{ fontSize: 12, color: theme.textDimmer, transition: "transform .2s", transform: isOpen ? "rotate(90deg)" : "none" }}>›</span>}
              </div>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div style={{ padding: "0 12px 12px 54px", borderTop: `1px solid ${theme.border}` }}>
                {/* Programs */}
                {hasPrograms && (
                  <DetailSection title="Programs" theme={theme}>
                    {day.programs.map((p, i) => (
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
                {hasWater && (
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
                    {day.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 11, color: theme.danger, marginBottom: 3, paddingLeft: 12, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0 }}>!</span> {w}
                      </div>
                    ))}
                  </DetailSection>
                )}

                {/* Optional hikes */}
                {hasOptional && (
                  <DetailSection title="Optional Side Hikes" theme={theme}>
                    {day.optional_hikes.map((h, i) => (
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
      {itin.training_priorities?.length > 0 && (
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
              <span key={item} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: theme.statBg, color: theme.textMuted }}>{item}</span>
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
          <div style={{ ...cardTitle(theme), color: theme.accent }}>Conservation Project — Day {global.conservation_project.day}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, marginBottom: 4 }}>{global.conservation_project.time} — MANDATORY</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>{global.conservation_project.description}</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>Bring: {global.conservation_project.what_to_bring}</div>
        </div>
      )}

      {global.prohibited_items?.length > 0 && (
        <div style={{ ...card(theme), marginTop: 4 }}>
          <div style={{ ...cardTitle(theme), color: theme.danger }}>Prohibited Items</div>
          {global.prohibited_items.map(item => (
            <div key={item} style={{ fontSize: 11, color: theme.textMuted, marginBottom: 3, paddingLeft: 12, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: theme.danger }}>x</span> {item}
            </div>
          ))}
        </div>
      )}

      {global.readiness_reminders?.length > 0 && (
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
        <PrintCheatSheet adventure={adventure} itinerary={itin} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

// ── Subcomponents ──

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: bg, color, letterSpacing: "0.5px" }}>
      {children}
    </span>
  );
}

function DetailSection({ title, children, theme, warn, danger }) {
  const titleColor = danger ? theme.danger : warn ? theme.warn : theme.heading;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function ProgramTag({ type, theme, mode }) {
  const colors = {
    required: { bg: mode === "dark" ? "#3a2520" : "#fde0d0", color: theme.danger },
    program: { bg: theme.accentBg, color: theme.accent },
    passthrough: { bg: theme.statBg, color: theme.textMuted },
    optional: { bg: mode === "dark" ? "#302d20" : "#faf5e8", color: theme.gold },
  };
  const c = colors[type] || colors.program;
  return <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: c.bg, color: c.color, textTransform: "uppercase" }}>{type}</span>;
}

function WaterStat({ label, value, theme }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11, color: theme.text }}>{value}</div>
    </div>
  );
}

function InfoChip({ label, value, theme }) {
  return (
    <div style={{ background: theme.statBg, borderRadius: 6, padding: "5px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{value}</div>
      <div style={{ fontSize: 9, color: theme.textDimmer }}>{label}</div>
    </div>
  );
}

function tinyBtn(theme) {
  return {
    fontSize: 9, padding: "3px 8px", borderRadius: 4, border: `1px solid ${theme.border}`,
    background: theme.bgAlt, color: theme.textDimmer, cursor: "pointer", fontFamily: fontBody,
  };
}
