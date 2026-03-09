import { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle, memberTypeBadge } from "../utils/theme";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "water", label: "Water" },
  { id: "pack", label: "Pack" },
  { id: "footwear", label: "Footwear" },
  { id: "shelter", label: "Shelter" },
  { id: "cooking", label: "Cooking" },
  { id: "navigation", label: "Navigation" },
  { id: "clothing", label: "Clothing" },
  { id: "misc", label: "Misc" },
];

const PRIORITIES = [
  { id: "all", label: "All" },
  { id: "essential", label: "Essential" },
  { id: "recommended", label: "Recommended" },
  { id: "optional", label: "Optional" },
];

const PRIORITY_COLORS = {
  dark: {
    essential: { bg: "#3d2020", color: "#d08060", border: "#5a3030" },
    recommended: { bg: "#2a3020", color: "#90b060", border: "#3d4a30" },
    optional: { bg: "#202a30", color: "#6090b0", border: "#2a3d50" },
  },
  light: {
    essential: { bg: "#fde8e0", color: "#b04020", border: "#e0a090" },
    recommended: { bg: "#e8f0e0", color: "#4a7a30", border: "#b0d090" },
    optional: { bg: "#e0eaf0", color: "#3060a0", border: "#90b0d0" },
  },
};

export default function GearList({ troopId, adventureId, members, active, setActive, updateMemberLocally }) {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const { theme, mode } = useTheme();

  const am = active !== null ? members?.[active] : null;

  useEffect(() => {
    api.getGear(troopId).then(setItems).catch(console.error);
  }, [troopId]);

  const filtered = useMemo(() => {
    let f = items;
    if (category !== "all") f = f.filter(g => g.category === category);
    if (priority !== "all") f = f.filter(g => g.priority === priority);
    if (search.trim()) {
      const s = search.toLowerCase();
      f = f.filter(g => g.name.toLowerCase().includes(s) || g.description.toLowerCase().includes(s));
    }
    return f;
  }, [items, category, priority, search]);

  const pColors = PRIORITY_COLORS[mode] || PRIORITY_COLORS.dark;

  // Per-member gear completion
  const trekkingMembers = useMemo(() => members ? members.filter(m => m.participation === "trekking") : [], [members]);
  const supportMembers = useMemo(() => members ? members.filter(m => m.participation === "support") : [], [members]);

  const memberGearStats = useMemo(() => {
    if (!members || members.length === 0) return [];
    return members.map(m => {
      const checked = (m.gear || []).length;
      const total = items.length;
      return { name: m.name, color: m.color, checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0, userType: m.user_type || (m.is_manual ? "scout" : ""), participation: m.participation };
    });
  }, [members, items]);

  // Crew-wide gear % (trekking members only)
  const crewGearPct = useMemo(() => {
    const countMembers = trekkingMembers.length > 0 ? trekkingMembers : (members || []);
    if (countMembers.length === 0 || items.length === 0) return 0;
    const total = items.length * countMembers.length;
    const done = countMembers.reduce((sum, m) => sum + (m.gear || []).length, 0);
    return Math.round((done / total) * 100);
  }, [members, trekkingMembers, items]);

  const toggleGear = async (itemId) => {
    if (active === null || !adventureId || !am) return;
    const current = am.gear || [];
    const has = current.includes(itemId);
    const updated = has ? current.filter(id => id !== itemId) : [...current, itemId];
    if (updateMemberLocally) updateMemberLocally(am.user_id, { gear: updated });
    try {
      await api.updateAdventureGear(adventureId, am.user_id, updated);
    } catch (e) { console.error(e); }
  };

  const myChecked = am ? new Set(am.gear || []) : new Set();
  const myCount = myChecked.size;
  const myTotal = items.length;
  const myPct = myTotal > 0 ? Math.round((myCount / myTotal) * 100) : 0;

  return (
    <div>
      {/* Crew gear readiness overview */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={cardTitle(theme)}>Gear Checklist</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: crewGearPct >= 80 ? theme.accent : crewGearPct >= 50 ? theme.gold : theme.danger }}>
              Crew: {crewGearPct}%
            </div>
            {supportMembers.length > 0 && <div style={{ fontSize: 9, color: theme.textDimmer }}>trekking only</div>}
          </div>
        </div>

        {/* Per-member bars */}
        {memberGearStats.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {memberGearStats.map((m, idx) => (
              <div key={m.name} onClick={() => setActive && setActive(idx)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, cursor: "pointer", borderRadius: 5, padding: "3px 6px", background: active === idx ? theme.accentBg : "transparent", border: active === idx ? `1.5px solid ${theme.borderAccent}` : "1.5px solid transparent", transition: "all .15s" }}>
                <span style={{ fontSize: 10, color: active === idx ? theme.accent : m.color?.bg || theme.accent, fontWeight: 700, width: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <span style={memberTypeBadge(theme, m.userType)}>{m.userType === "adult" ? "A" : "S"}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: theme.progressBg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, borderRadius: 3, background: m.pct >= 80 ? theme.accent : m.pct >= 50 ? theme.gold : theme.danger, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 9, color: theme.textDimmer, width: 50, textAlign: "right" }}>{m.checked}/{m.total}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active member highlight */}
        {am && (
          <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 6 }}>
            <strong style={{ color: am.color.bg }}>{am.name}</strong>: {myCount}/{myTotal} items ({myPct}%)
          </div>
        )}
        {!am && (
          <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 6 }}>Select your name above to check off your gear.</div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gear..."
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`,
            background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody,
            outline: "none", marginBottom: 8, boxSizing: "border-box",
          }} />

        {/* Category filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: "3px 9px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
              background: category === c.id ? theme.bgTabActive : theme.bgTab,
              color: category === c.id ? "#fff" : theme.textDimmer,
            }}>{c.label}</button>
          ))}
        </div>

        {/* Priority filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {PRIORITIES.map(p => (
            <button key={p.id} onClick={() => setPriority(p.id)} style={{
              padding: "3px 9px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
              background: priority === p.id ? theme.bgTabActive : theme.bgTab,
              color: priority === p.id ? "#fff" : theme.textDimmer,
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Gear items */}
      {filtered.map(item => {
        const p = pColors[item.priority] || pColors.recommended;
        const checked = myChecked.has(item.id);
        // How many crew members have this item
        const ownCount = members ? members.filter(m => (m.gear || []).includes(item.id)).length : 0;

        return (
          <div key={item.id} onClick={() => toggleGear(item.id)} style={{
            ...card(theme), display: "flex", alignItems: "center", gap: 10,
            cursor: active !== null ? "pointer" : "default",
            background: checked ? theme.accentBg : theme.bgCard,
            border: checked ? `1.5px solid ${theme.borderAccent}` : `1px solid ${theme.border}`,
            transition: "all .12s",
          }}>
            {/* Checkbox */}
            <div style={{
              width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? theme.accent : theme.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: theme.accent, flexShrink: 0,
            }}>
              {checked && "\u2713"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: checked ? theme.accentLight : theme.heading, fontFamily: fontDisplay }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase",
                  background: p.bg, color: p.color, border: `1px solid ${p.border}`,
                }}>{item.priority}</span>
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>{item.description}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: theme.textDimmest }}>{item.category}</span>
                {ownCount > 0 && (
                  <span style={{ fontSize: 10, color: theme.accent }}>{ownCount}/{trekkingMembers.length || members?.length || 0} have this</span>
                )}
              </div>
            </div>

            {item.affiliate_url && (
              <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                padding: "5px 10px", borderRadius: 5, background: theme.accent, color: "#fff",
                fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: fontBody,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>Buy</a>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ ...card(theme), textAlign: "center", color: theme.textDimmer, fontSize: 12, fontStyle: "italic" }}>
          No gear items match your filters.
        </div>
      )}
    </div>
  );
}
