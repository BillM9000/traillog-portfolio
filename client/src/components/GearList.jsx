import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, CircleCheckBig, Backpack, Info, Download, Printer } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle, tag } from "../utils/theme";
import { exportXLSX, printHTML, gearStatusFormat } from "../utils/exportUtils";
import PackWeightWidget from "./PackWeightWidget";

const PRIORITY_COLORS = {
  dark: {
    essential: { bg: "#3A2418", color: "#E8A84C", border: "#6B5420" },
    recommended: { bg: "#2A3620", color: "#B8CC9A", border: "#3A4D2A" },
    optional: { bg: "#252B1F", color: "#8B8478", border: "#4A4D40" },
  },
  light: {
    essential: { bg: "#FFF3E0", color: "#C47A2A", border: "#E8C896" },
    recommended: { bg: "#D4E4B8", color: "#3A4D2A", border: "#B8CC9A" },
    optional: { bg: "#F3F0E8", color: "#6B5D4D", border: "#DDD6C8" },
  },
};

const STATUS_OPTIONS = [
  { value: "needed", label: "Need", Icon: ClipboardList, color: "#E07A5F" },
  { value: "owned", label: "Own", Icon: CircleCheckBig, color: "#5B7A3A" },
  { value: "packed", label: "Packed", Icon: Backpack, color: "#3D6B5B" },
];

export default function GearList({ troopId, adventureId, members, active, setActive, updateMemberLocally }) {
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const { gearCatalog, memberGearMap, refreshMemberGear } = useAdventure();
  const { addToast } = useToast();
  const currentUserId = user?.id;

  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [weightKey, setWeightKey] = useState(0);
  const [showGearGuide, setShowGearGuide] = useState(false);
  const [aiRecs, setAiRecs] = useState({});       // { [gearId]: { loading, recommendations, badge_earned, error } }

  const am = active !== null ? members?.[active] : null;
  const pColors = PRIORITY_COLORS[mode] || PRIORITY_COLORS.dark;

  // Build categories from catalog data
  const categories = useMemo(() => {
    const cats = {};
    for (const item of gearCatalog) {
      if (!cats[item.category]) cats[item.category] = { count: 0, checked: 0 };
      cats[item.category].count++;
    }
    // Count checked items per category for active member
    if (am) {
      const memberItems = memberGearMap[am.user_id] || [];
      const ownedSet = new Set(memberItems.filter(g => g.status === "owned" || g.status === "packed").map(g => g.gear_catalog_id));
      for (const item of gearCatalog) {
        if (ownedSet.has(item.id)) {
          cats[item.category].checked++;
        }
      }
    }
    return cats;
  }, [gearCatalog, am, memberGearMap]);

  // Member's gear selections as a map
  const myGearMap = useMemo(() => {
    if (!am) return {};
    const items = memberGearMap[am.user_id] || [];
    const map = {};
    for (const g of items) map[g.gear_catalog_id] = g;
    return map;
  }, [am, memberGearMap]);

  // Filtered items
  const filtered = useMemo(() => {
    let f = gearCatalog;
    if (category !== "all") f = f.filter(g => g.category === category);
    if (priority !== "all") f = f.filter(g => g.priority === priority);
    if (statusFilter !== "all") {
      f = f.filter(g => {
        const sel = myGearMap[g.id];
        if (statusFilter === "none") return !sel;
        return sel?.status === statusFilter;
      });
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      f = f.filter(g =>
        g.name.toLowerCase().includes(s) ||
        (g.description || "").toLowerCase().includes(s) ||
        (g.options || []).some(o => o.product_name.toLowerCase().includes(s))
      );
    }
    return f;
  }, [gearCatalog, category, priority, statusFilter, search, myGearMap]);

  // Group by category for display
  const groupedItems = useMemo(() => {
    const groups = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  // Per-member gear stats
  const trekkingMembers = useMemo(() => members ? members.filter(m => m.participation === "trekking") : [], [members]);

  const crewGearPct = useMemo(() => {
    const countMembers = trekkingMembers.length > 0 ? trekkingMembers : (members || []);
    if (countMembers.length === 0 || gearCatalog.length === 0) return 0;
    const total = gearCatalog.length * countMembers.length;
    let done = 0;
    for (const m of countMembers) {
      const items = memberGearMap[m.user_id] || [];
      done += items.filter(g => g.status === "owned" || g.status === "packed").length;
    }
    return Math.round((done / total) * 100);
  }, [members, trekkingMembers, gearCatalog, memberGearMap]);

  const myStats = useMemo(() => {
    if (!am) return { owned: 0, packed: 0, needed: 0, total: gearCatalog.length };
    const items = memberGearMap[am.user_id] || [];
    return {
      owned: items.filter(g => g.status === "owned").length,
      packed: items.filter(g => g.status === "packed").length,
      needed: items.filter(g => g.status === "needed").length,
      total: gearCatalog.length,
    };
  }, [am, memberGearMap, gearCatalog]);

  // Toggle gear status: needed → owned → packed → remove
  const cycleGearStatus = useCallback(async (gearCatalogId) => {
    if (!am || !adventureId) return;
    const current = myGearMap[gearCatalogId];
    let newStatus;
    if (!current) newStatus = "owned";
    else if (current.status === "needed") newStatus = "owned";
    else if (current.status === "owned") newStatus = "packed";
    else newStatus = null; // Remove (packed → remove)

    setSaving(true);
    try {
      if (newStatus) {
        await api.updateMemberGearItem(adventureId, am.user_id, gearCatalogId, { status: newStatus });
      } else {
        await api.removeMemberGearItem(adventureId, am.user_id, gearCatalogId);
      }
      await refreshMemberGear(); setWeightKey(k => k + 1);
    } catch (e) {
      console.error(e);
      addToast("Failed to update gear", "error");
    }
    setSaving(false);
  }, [am, adventureId, myGearMap, refreshMemberGear, addToast]);

  // Set specific status
  const setGearStatus = useCallback(async (gearCatalogId, status) => {
    if (!am || !adventureId) return;
    setSaving(true);
    try {
      await api.updateMemberGearItem(adventureId, am.user_id, gearCatalogId, { status });
      await refreshMemberGear(); setWeightKey(k => k + 1);
    } catch (e) {
      console.error(e);
      addToast("Failed to update gear", "error");
    }
    setSaving(false);
  }, [am, adventureId, refreshMemberGear, addToast]);

  // Select product option
  const selectOption = useCallback(async (gearCatalogId, optionId, optionWeightOz) => {
    if (!am || !adventureId) return;
    setSaving(true);
    try {
      const current = myGearMap[gearCatalogId];
      await api.updateMemberGearItem(adventureId, am.user_id, gearCatalogId, {
        status: current?.status || "owned",
        selected_option_id: optionId,
        custom_weight_oz: optionWeightOz || null,
      });
      await refreshMemberGear(); setWeightKey(k => k + 1);
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [am, adventureId, myGearMap, refreshMemberGear]);

  // Toggle expand
  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch AI gear recommendations for a catalog item
  const fetchAIRecommendation = useCallback(async (gearId) => {
    if (!adventureId) return;
    setAiRecs(prev => ({ ...prev, [gearId]: { loading: true, recommendations: null, badge_earned: null, error: null } }));
    try {
      const data = await api.getAIGearRecommendation(gearId, adventureId);
      setAiRecs(prev => ({ ...prev, [gearId]: { loading: false, recommendations: data.recommendations, badge_earned: data.badge_earned, error: null } }));
      if (data.badge_earned) {
        addToast("🎖️ AI Gear Badge Earned!", "success");
      }
    } catch (e) {
      setAiRecs(prev => ({ ...prev, [gearId]: { loading: false, recommendations: null, badge_earned: null, error: e.message } }));
      addToast("AI recommendation failed: " + e.message, "error");
    }
  }, [adventureId, addToast]);

  const catKeys = Object.keys(categories);

  return (
    <div>
      {/* Pack Weight Widget */}
      {am && <PackWeightWidget key={weightKey} adventureId={adventureId} userId={am.user_id} memberName={am.name} />}

      {/* Gear Guide — explains sharing types and weight estimates */}
      <div style={{ ...card(theme), padding: "10px 14px" }}>
        <div onClick={() => setShowGearGuide(!showGearGuide)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Info size={14} color={theme.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Gear Guide</span>
            <span style={{ fontSize: 9, color: theme.textDimmer }}>weight & sharing info</span>
          </div>
          <span style={{ fontSize: 14, color: theme.textDimmer, transform: showGearGuide ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
        </div>
        {showGearGuide && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, fontFamily: fontBody }}>
              Gear Sharing Types
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
              {[
                { label: "PERSONAL", color: theme.heading, bg: theme.bgAlt, border: theme.borderLight, desc: "Your own gear — counted toward your pack weight" },
                { label: "CREW", color: theme.accent, bg: theme.accentBg, border: theme.borderAccent, desc: "Shared crew gear — weight split among members on trail" },
                { label: "BUDDY", color: "#3B6BB0", bg: "#E8F0FE", border: "#B0C8E8", desc: "Split between tent partners (e.g. one carries tent, other carries poles)" },
                { label: "PROVIDED", color: "#B8740A", bg: "#FFF3E0", border: "#E8C896", desc: "Provided by Philmont on-site — you still carry it but don't buy it" },
              ].map(t => (
                <div key={t.label} style={{ padding: "6px 8px", borderRadius: 8, background: t.bg, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: t.color, letterSpacing: 0.5 }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: theme.textDimmer, lineHeight: 1.3, marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, fontFamily: fontBody }}>
              Pack Weight Estimates
            </div>
            <div style={{ fontSize: 10, color: theme.textMuted, lineHeight: 1.5 }}>
              <div style={{ marginBottom: 4 }}>
                <strong style={{ color: theme.heading }}>⚖️ Personal gear only</strong> — Only items you mark as "Packed" with type Personal count toward your pack weight.
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong style={{ color: theme.heading }}>🍽️ Food: ~1.75 lbs/day</strong> — Philmont provides all trail food in 2-person buddy bags (~0.50 lb breakfast, ~0.75 lb lunch, ~0.50 lb dinner). You carry 2-4 days of food between commissary pickups.
              </div>
              <div>
                <strong style={{ color: theme.heading }}>💧 Water: ~6.6 lbs (3L)</strong> — Typical hiking carry. Philmont requires 4L minimum capacity. Dry camp days can be 11-13 lbs (5-6L).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crew gear readiness overview */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={cardTitle(theme)}>Gear Catalog</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: crewGearPct >= 80 ? theme.accent : crewGearPct >= 50 ? theme.gold : theme.danger }}>
              Crew: {crewGearPct}%
            </div>
            <div style={{ fontSize: 9, color: theme.textDimmer }}>{gearCatalog.length} items</div>
          </div>
        </div>

        {/* Active member summary */}
        {am && (
          <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 11 }}>
            <span style={{ color: am.color?.bg, fontWeight: 700 }}>{am.name}</span>
            <span style={{ color: theme.accent }}>✅ {myStats.owned + myStats.packed}</span>
            <span style={{ color: "#E07A5F" }}>📋 {myStats.needed}</span>
            <span style={{ color: theme.textDimmer }}>{myStats.total - myStats.owned - myStats.packed - myStats.needed} unchecked</span>
          </div>
        )}
        {!am && (
          <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 6 }}>Select your name above to manage your gear.</div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gear or products..."
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`,
            background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody,
            outline: "none", marginBottom: 8, boxSizing: "border-box",
          }} />

        {/* Category filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
          <button onClick={() => setCategory("all")} style={pillStyle(theme, category === "all")}>
            All {gearCatalog.length}
          </button>
          {catKeys.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={pillStyle(theme, category === c)}>
              {c} {categories[c].count}
              {am && categories[c].checked > 0 && <span style={{ color: theme.accent, marginLeft: 2 }}>✓{categories[c].checked}</span>}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
          {[{ id: "all", label: "All" }, { id: "essential", label: "Essential" }, { id: "recommended", label: "Recommended" }, { id: "optional", label: "Optional" }].map(p => (
            <button key={p.id} onClick={() => setPriority(p.id)} style={pillStyle(theme, priority === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        {am && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <button onClick={() => setStatusFilter("all")} style={pillStyle(theme, statusFilter === "all")}>All</button>
            <button onClick={() => setStatusFilter("none")} style={pillStyle(theme, statusFilter === "none")}>Unchecked</button>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)} style={pillStyle(theme, statusFilter === s.value)}>
                <s.Icon size={11} strokeWidth={2.5} /> {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Export actions */}
        {am && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, borderTop: `1px solid ${theme.borderLight}`, paddingTop: 8 }}>
            <button onClick={async () => {
              const myGear = memberGearMap[currentUserId] || [];
              const activeGear = gearCatalog.filter(g => g.active !== 0);
              const rows = activeGear.map(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                return { Name: g.name, Category: g.category, Priority: g.priority || "", Status: mg?.status || "unchecked", Weight_oz: g.weight_oz || "", Type: g.sharing_type || "personal" };
              });
              await exportXLSX([{ name: "Gear Checklist", rows, title: `${am.name} — Gear Checklist`, conditionalFormat: gearStatusFormat }], `my-gear-checklist-${new Date().toISOString().slice(0,10)}.xlsx`);
              addToast("Gear checklist exported", "success");
            }} style={{ ...pillStyle(theme, false), display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={10} /> Excel
            </button>
            <button onClick={() => {
              const myGear = memberGearMap[currentUserId] || [];
              const activeGear = gearCatalog.filter(g => g.active !== 0);
              const gearByStatus = { packed: [], owned: [], need: [], unchecked: [] };
              activeGear.forEach(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                const status = mg?.status || "unchecked";
                const entry = { name: g.name, category: g.category, weight: g.weight_oz ? `${g.weight_oz} oz` : "—", sharing: g.sharing_type || "personal" };
                if (status === "packed") gearByStatus.packed.push(entry);
                else if (status === "owned") gearByStatus.owned.push(entry);
                else if (status === "needed") gearByStatus.need.push(entry);
                else gearByStatus.unchecked.push(entry);
              });
              const section = (title, items) => {
                if (!items.length) return "";
                return `<div class="section"><h3>${title} (${items.length})</h3><table>
                  <tr><th>☐</th><th>Item</th><th>Category</th><th>Weight</th><th>Type</th></tr>
                  ${items.map(i => `<tr><td>☐</td><td>${i.name}</td><td>${i.category}</td><td>${i.weight}</td><td>${i.sharing}</td></tr>`).join("")}
                </table></div>`;
              };
              printHTML(`${am.name} — Gear Checklist`, `
                <h1>${am.name} — Gear Checklist</h1>
                <div class="meta">Generated ${new Date().toLocaleDateString()} · ${gearByStatus.packed.length} packed · ${gearByStatus.owned.length} owned · ${gearByStatus.need.length} need · ${gearByStatus.unchecked.length} unchecked</div>
                ${section("✅ Packed", gearByStatus.packed)}
                ${section("Owned (not packed yet)", gearByStatus.owned)}
                ${section("Need to Get", gearByStatus.need)}
                ${section("Unchecked", gearByStatus.unchecked)}
              `);
            }} style={{ ...pillStyle(theme, false), display: "flex", alignItems: "center", gap: 4 }}>
              <Printer size={10} /> Print
            </button>
            <button onClick={async () => {
              const myGear = memberGearMap[currentUserId] || [];
              const activeGear = gearCatalog.filter(g => g.active !== 0);
              const needItems = activeGear.filter(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                if (!mg) return true;
                return mg.status === "needed";
              }).map(g => ({ Name: g.name, Category: g.category, Priority: g.priority || "", Weight_oz: g.weight_oz || "", Type: g.sharing_type || "personal" }));
              if (!needItems.length) { addToast("Nothing left to get!", "success"); return; }
              await exportXLSX([{ name: "Still Need", rows: needItems, title: `${am.name} — Still Need` }], `still-need-${new Date().toISOString().slice(0,10)}.xlsx`);
              addToast(`${needItems.length} items exported`, "success");
            }} style={{ ...pillStyle(theme, false), display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={10} /> Still Need
            </button>
          </div>
        )}
      </div>

      {/* Gear items by category */}
      {Object.entries(groupedItems).map(([cat, items]) => (
        <div key={cat}>
          <div style={{ fontSize: 11, fontWeight: 800, color: theme.heading, textTransform: "uppercase", letterSpacing: 1, marginTop: 14, marginBottom: 6, fontFamily: fontDisplay }}>
            {cat}
            <span style={{ color: theme.textDimmer, fontWeight: 400, marginLeft: 6 }}>{items.length} items</span>
          </div>

          {items.map(item => {
            const p = pColors[item.priority] || pColors.recommended;
            const sel = myGearMap[item.id];
            const isExpanded = expanded.has(item.id);
            const statusInfo = sel ? STATUS_OPTIONS.find(s => s.value === sel.status) : null;
            // How many crew members have this item
            const ownCount = members ? members.filter(m => {
              const mg = memberGearMap[m.user_id] || [];
              return mg.some(g => g.gear_catalog_id === item.id && (g.status === "owned" || g.status === "packed"));
            }).length : 0;

            return (
              <div key={item.id} style={{
                ...card(theme),
                background: sel ? (sel.status === "packed" ? theme.accentBg : theme.bgCard) : theme.bgCard,
                border: sel ? `1.5px solid ${sel.status === "packed" ? theme.borderAccent : theme.accent + "40"}` : `1px solid ${theme.border}`,
                transition: "all .12s", padding: 12,
              }}>
                {/* Item header — clickable for status */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  {/* Status indicator / checkbox */}
                  <div
                    onClick={(e) => { e.stopPropagation(); cycleGearStatus(item.id); }}
                    style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${statusInfo ? statusInfo.color : theme.borderLight}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, cursor: am ? "pointer" : "default",
                      background: sel ? statusInfo?.color + "20" : "transparent",
                      transition: "all .15s",
                    }}
                  >
                    {statusInfo ? <statusInfo.Icon size={14} strokeWidth={2.5} /> : ""}
                  </div>

                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleExpand(item.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sel ? theme.accentLight : theme.heading, fontFamily: fontDisplay }}>
                        {item.name}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase",
                        background: p.bg, color: p.color, border: `1px solid ${p.border}`,
                      }}>{item.priority}</span>
                      {(item.sharing_type === "crew") && (
                        <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: theme.accentBg, color: theme.accent, border: `1px solid ${theme.borderAccent}` }}>
                          CREW
                        </span>
                      )}
                      {(item.sharing_type === "buddy") && (
                        <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#E8F0FE", color: "#3B6BB0", border: "1px solid #B0C8E8" }}>
                          BUDDY
                        </span>
                      )}
                      {(item.sharing_type === "provided") && (
                        <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#FFF3E0", color: "#B8740A", border: "1px solid #E8C896" }}>
                          PROVIDED
                        </span>
                      )}
                      {item.philmont_compliant === 0 && (
                        <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#FEE2E2", color: "#DC2626" }}>
                          ⚠️ COMPLIANCE
                        </span>
                      )}
                    </div>

                    {/* Weight / Price / Rating row */}
                    <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 10, color: theme.textMuted }}>
                      {item.weight_oz && <span>⚖️ {item.weight_oz} oz ({(item.weight_oz / 16).toFixed(1)} lbs)</span>}
                      {item.msrp && <span>💰 ~${item.msrp}</span>}
                      {item.rating_stars && <span>{"★".repeat(Math.round(item.rating_stars))}{"☆".repeat(5 - Math.round(item.rating_stars))}</span>}
                    </div>

                    {/* Custom gear name if selected */}
                    {sel?.custom_product_name && (
                      <div style={{ fontSize: 10, color: theme.accent, marginTop: 2 }}>
                        📦 {sel.custom_product_name} {sel.custom_weight_oz ? `(${sel.custom_weight_oz} oz)` : ""}
                      </div>
                    )}
                    {sel?.selected_option_id && !sel.custom_product_name && (() => {
                      const opt = (item.options || []).find(o => o.id === sel.selected_option_id);
                      return opt ? (
                        <div style={{ fontSize: 10, color: theme.accent, marginTop: 2 }}>
                          📦 {opt.product_name} {opt.weight_oz ? `(${opt.weight_oz} oz)` : ""}
                        </div>
                      ) : null;
                    })()}

                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      {ownCount > 0 && (
                        <span style={{ fontSize: 10, color: theme.accent }}>{ownCount}/{trekkingMembers.length || members?.length || 0} have this</span>
                      )}
                      <span style={{ fontSize: 10, color: theme.textDimmest, cursor: "pointer" }}>
                        {isExpanded ? "▲ less" : "▼ details"}
                      </span>
                    </div>
                  </div>

                  {/* Status buttons on the right — click to set, click again to uncheck */}
                  {am && (
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      {STATUS_OPTIONS.map(s => {
                        const isActive = sel?.status === s.value;
                        return (
                          <button key={s.value} onClick={(e) => {
                            e.stopPropagation();
                            if (isActive) {
                              // Toggle off — uncheck
                              (async () => { setSaving(true); try { await api.removeMemberGearItem(adventureId, am.user_id, item.id); await refreshMemberGear(); setWeightKey(k => k + 1); } catch(err) { console.error(err); } setSaving(false); })();
                            } else {
                              setGearStatus(item.id, s.value);
                            }
                          }}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                              padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 600,
                              background: isActive ? s.color : theme.bgAlt, color: isActive ? "#fff" : theme.textDimmer,
                              fontFamily: fontBody, transition: "all .12s", minWidth: 36,
                            }}
                          >
                            <s.Icon size={11} strokeWidth={2.5} />
                            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.borderLight}` }}>
                    {/* Description / Rating Notes */}
                    {(item.description || item.rating_notes) && (
                      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                        {item.rating_notes && <div style={{ fontStyle: "italic", marginBottom: 4 }}>"{item.rating_notes}"</div>}
                        {item.description && <div>{item.description}</div>}
                      </div>
                    )}

                    {/* Compliance notes */}
                    {item.compliance_notes && (
                      <div style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, background: theme.urgencyBg || "#FEF3C7", color: "#92400E", marginBottom: 8, border: "1px solid #F59E0B40" }}>
                        ⚠️ Philmont: {item.compliance_notes}
                      </div>
                    )}

                    {/* Product Options */}
                    {(item.options || []).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: theme.heading, marginBottom: 4 }}>Product Options:</div>
                        {item.options.map(opt => {
                          const isSelected = sel?.selected_option_id === opt.id;
                          return (
                            <div key={opt.id}
                              onClick={() => am && selectOption(item.id, opt.id, opt.weight_oz)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 3,
                                background: isSelected ? theme.accentBg : theme.bgAlt,
                                border: isSelected ? `1.5px solid ${theme.borderAccent}` : `1px solid ${theme.borderLight}`,
                                cursor: am ? "pointer" : "default", transition: "all .12s",
                              }}
                            >
                              <span style={{ fontSize: 12 }}>
                                {opt.tier === "budget" ? "💲" : opt.tier === "mid" ? "⭐" : "⚡"}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? theme.accent : theme.text }}>
                                  {opt.product_name}
                                  {opt.is_ultralight_pick === 1 && <span style={{ color: "#F59E0B", marginLeft: 4, fontSize: 9 }}>⚡ UL</span>}
                                </div>
                                <div style={{ fontSize: 9, color: theme.textDimmer }}>
                                  {opt.brand && `${opt.brand} · `}
                                  {opt.price && `$${opt.price}`}
                                  {opt.weight_oz && ` · ${opt.weight_oz} oz`}
                                </div>
                                {opt.notes && <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 1 }}>{opt.notes}</div>}
                              </div>
                              <div style={{ fontSize: 10, color: theme.textDimmer }}>
                                {"★".repeat(opt.star_rating || 3)}{"☆".repeat(5 - (opt.star_rating || 3))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buy Links — from product options with affiliate URLs */}
                    {(item.options || []).some(o => o.affiliate_url) && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                        {item.options.filter(o => o.affiliate_url).map(opt => (
                          <a key={opt.id} href={opt.affiliate_url} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              api.trackAffiliateClick(opt.id, item.id, opt.affiliate_url).catch(() => {});
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: 5, background: theme.accent, color: "#fff",
                              fontSize: 9, fontWeight: 600, textDecoration: "none", fontFamily: fontBody,
                            }}>
                            🛒 Buy {opt.product_name}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* AI Gear Recommendation */}
                    {am && adventureId && (() => {
                      const rec = aiRecs[item.id];
                      return (
                        <div style={{ marginBottom: 8 }}>
                          <button
                            onClick={() => fetchAIRecommendation(item.id)}
                            disabled={rec?.loading}
                            style={{
                              padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${theme.borderLight}`,
                              background: rec?.loading ? theme.bgAlt : theme.forestDeep || theme.accent,
                              color: rec?.loading ? theme.textDimmer : "#fff",
                              fontSize: 11, fontWeight: 700, cursor: rec?.loading ? "wait" : "pointer",
                              fontFamily: fontBody, display: "flex", alignItems: "center", gap: 6,
                              transition: "all .15s",
                            }}
                          >
                            {rec?.loading ? (
                              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> AI is thinking...</>
                            ) : (
                              <>🤖 AI Recommend</>
                            )}
                          </button>

                          {rec?.badge_earned && (
                            <div style={{
                              marginTop: 6, padding: "6px 10px", borderRadius: 6,
                              background: theme.accentBg, border: `1px solid ${theme.borderAccent}`,
                              fontSize: 11, fontWeight: 700, color: theme.accent,
                            }}>
                              🎖️ AI Gear Badge Earned!
                            </div>
                          )}

                          {rec?.error && (
                            <div style={{ marginTop: 6, fontSize: 10, color: theme.danger }}>
                              Error: {rec.error}
                            </div>
                          )}

                          {rec?.recommendations && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: theme.heading, marginBottom: 6, fontFamily: fontDisplay }}>
                                AI Recommendations for {item.name}
                              </div>
                              {rec.recommendations.map((r, idx) => (
                                <div key={idx} style={{
                                  padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                                  background: theme.bgAlt, border: `1px solid ${theme.borderLight}`,
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>
                                        {r.product_name}
                                      </div>
                                      <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>
                                        {r.brand}{r.estimated_price ? ` · ${r.estimated_price}` : ""}{r.weight_oz ? ` · ${r.weight_oz} oz` : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                                    {r.why_recommended}
                                  </div>
                                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                                    <a
                                      href={r.buy_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        api.trackAffiliateClick(null, item.id, r.buy_url).catch(() => {});
                                      }}
                                      style={{
                                        display: "inline-block", padding: "3px 10px", borderRadius: 5,
                                        background: "#FF9900", color: "#111", fontSize: 9, fontWeight: 700,
                                        textDecoration: "none", fontFamily: fontBody,
                                      }}
                                    >
                                      Amazon
                                    </a>
                                    {r.rei_url && (
                                      <a
                                        href={r.rei_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          api.trackAffiliateClick(null, item.id, r.rei_url).catch(() => {});
                                        }}
                                        style={{
                                          display: "inline-block", padding: "3px 10px", borderRadius: 5,
                                          background: "#2D5F2D", color: "#fff", fontSize: 9, fontWeight: 700,
                                          textDecoration: "none", fontFamily: fontBody,
                                        }}
                                      >
                                        REI
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Custom gear entry */}
                    {am && (
                      <CustomGearInput
                        gearId={item.id}
                        current={sel}
                        adventureId={adventureId}
                        userId={am.user_id}
                        theme={theme}
                        onUpdate={async () => { await refreshMemberGear(); setWeightKey(k => k + 1); }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ ...card(theme), textAlign: "center", color: theme.textDimmer, fontSize: 12, fontStyle: "italic" }}>
          No gear items match your filters.
        </div>
      )}
    </div>
  );
}

// Custom gear input — user enters their actual product name and weight
function CustomGearInput({ gearId, current, adventureId, userId, theme, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current?.custom_product_name || "");
  const [weight, setWeight] = useState(current?.custom_weight_oz || "");

  const save = async () => {
    try {
      await api.updateMemberGearItem(adventureId, userId, gearId, {
        status: current?.status || "owned",
        custom_product_name: name.trim() || null,
        custom_weight_oz: weight ? parseFloat(weight) : null,
      });
      await onUpdate();
      setEditing(false);
    } catch (e) { console.error(e); }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} style={{
        padding: "4px 10px", borderRadius: 5, border: `1px dashed ${theme.borderLight}`,
        background: "transparent", color: theme.textDimmer, fontSize: 9, cursor: "pointer", fontFamily: fontBody,
      }}>
        ✏️ {current?.custom_product_name ? "Edit my gear" : "Enter your actual gear model"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your model (e.g. MSR Hubba Hubba)"
        style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 10, fontFamily: fontBody, outline: "none" }} />
      <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="oz" type="number" step="0.1"
        style={{ width: 50, padding: "4px 6px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 10, fontFamily: fontBody, outline: "none" }} />
      <button onClick={save} style={{ padding: "4px 8px", borderRadius: 4, border: "none", background: theme.accent, color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: fontBody }}>Save</button>
      <button onClick={() => setEditing(false)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 10, cursor: "pointer", fontFamily: fontBody }}>✕</button>
    </div>
  );
}

// Pill button style helper
function pillStyle(theme, active) {
  return {
    padding: "3px 9px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 600,
    cursor: "pointer", fontFamily: fontBody,
    background: active ? theme.pillActiveBg : theme.pillInactiveBg,
    color: active ? theme.pillActiveText : theme.pillInactiveText,
  };
}

