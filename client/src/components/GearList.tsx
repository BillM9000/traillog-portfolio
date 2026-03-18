import { useState, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";
import { ClipboardList, CircleCheckBig, Backpack, Info, Download, Printer } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useToast } from "../contexts/ToastContext";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { exportXLSX, printHTML, gearStatusFormat } from "../utils/exportUtils";
import PackWeightWidget from "./PackWeightWidget";
import type { GearCatalogItem, MemberGearItem, AdventureMember } from "../types";
import type { LucideIcon } from "lucide-react";

interface PriorityColorSet {
  bg: string;
  color: string;
  border: string;
}

interface PriorityColors {
  essential: PriorityColorSet;
  recommended: PriorityColorSet;
  optional: PriorityColorSet;
}

const PRIORITY_COLORS: Record<string, PriorityColors> = {
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

interface StatusOption {
  value: string;
  label: string;
  Icon: LucideIcon;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "needed", label: "Need", Icon: ClipboardList, color: "#E07A5F" },
  { value: "owned", label: "Own", Icon: CircleCheckBig, color: "#5B7A3A" },
  { value: "packed", label: "Packed", Icon: Backpack, color: "#3D6B5B" },
];

interface GearListProps {
  troopId: number;
  adventureId: number;
  members: AdventureMember[] | null;
  active: number | null;
  setActive: (index: number | null) => void;
  updateMemberLocally: (userId: number, data: Record<string, unknown>) => void;
}

interface AIRecState {
  loading: boolean;
  recommendations: AIRecommendation[] | null;
  badge_earned: string | null;
  error: string | null;
}

interface AIRecommendation {
  product_name: string;
  brand: string;
  estimated_price?: string;
  weight_oz?: number;
  why_recommended: string;
  buy_url: string;
  rei_url?: string;
}

interface CategoryStats {
  count: number;
  checked: number;
}

// Extended gear catalog item with runtime fields
interface ExtendedGearCatalogItem extends GearCatalogItem {
  priority?: string;
  weight_oz?: number;
  msrp?: number;
  rating_stars?: number;
  rating_notes?: string;
  philmont_compliant?: number;
  compliance_notes?: string;
  active?: number;
  options?: ProductOptionRuntime[];
}

interface ProductOptionRuntime {
  id: number;
  product_name: string;
  brand?: string;
  price?: number;
  weight_oz?: number;
  tier?: string;
  star_rating?: number;
  notes?: string;
  affiliate_url?: string;
  is_ultralight_pick?: number;
}

interface ExtendedMemberGearItem extends MemberGearItem {
  custom_product_name?: string;
  custom_weight_oz?: number;
  selected_option_id?: number;
}

export default function GearList({ troopId, adventureId, members, active, setActive, updateMemberLocally }: GearListProps) {
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const { gearCatalog, memberGearMap, refreshMemberGear } = useAdventure();
  const { addToast } = useToast();
  const isDesktop = useIsDesktop();
  const currentUserId = user?.id;

  const [category, setCategory] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<boolean>(false);
  const [weightKey, setWeightKey] = useState<number>(0);
  const [showGearGuide, setShowGearGuide] = useState<boolean>(false);
  const [aiRecs, setAiRecs] = useState<Record<number, AIRecState>>({});

  const am = active !== null ? members?.[active] : null;
  const pColors = PRIORITY_COLORS[mode] || PRIORITY_COLORS.dark;

  // Build categories from catalog data
  const categories = useMemo(() => {
    const cats: Record<string, CategoryStats> = {};
    for (const item of gearCatalog) {
      if (!cats[item.category]) cats[item.category] = { count: 0, checked: 0 };
      cats[item.category].count++;
    }
    // Count checked items per category for active member
    if (am) {
      const memberItems: ExtendedMemberGearItem[] = memberGearMap[am.user_id] || [];
      const ownedSet = new Set(memberItems.filter((g: ExtendedMemberGearItem) => g.status === "owned" || g.status === "packed").map((g: ExtendedMemberGearItem) => g.gear_catalog_id));
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
    if (!am) return {} as Record<number, ExtendedMemberGearItem>;
    const items: ExtendedMemberGearItem[] = memberGearMap[am.user_id] || [];
    const map: Record<number, ExtendedMemberGearItem> = {};
    for (const g of items) map[g.gear_catalog_id] = g;
    return map;
  }, [am, memberGearMap]);

  // Filtered items
  const filtered = useMemo(() => {
    let f = gearCatalog as ExtendedGearCatalogItem[];
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
        (g.options || []).some((o: ProductOptionRuntime) => o.product_name.toLowerCase().includes(s))
      );
    }
    return f;
  }, [gearCatalog, category, priority, statusFilter, search, myGearMap]);

  // Group by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, ExtendedGearCatalogItem[]> = {};
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
      const items: ExtendedMemberGearItem[] = memberGearMap[m.user_id] || [];
      done += items.filter((g: ExtendedMemberGearItem) => g.status === "owned" || g.status === "packed").length;
    }
    return Math.round((done / total) * 100);
  }, [members, trekkingMembers, gearCatalog, memberGearMap]);

  const myStats = useMemo(() => {
    if (!am) return { owned: 0, packed: 0, needed: 0, total: gearCatalog.length };
    const items: ExtendedMemberGearItem[] = memberGearMap[am.user_id] || [];
    return {
      owned: items.filter((g: ExtendedMemberGearItem) => g.status === "owned").length,
      packed: items.filter((g: ExtendedMemberGearItem) => g.status === "packed").length,
      needed: items.filter((g: ExtendedMemberGearItem) => g.status === "needed").length,
      total: gearCatalog.length,
    };
  }, [am, memberGearMap, gearCatalog]);

  // Toggle gear status: needed → owned → packed → remove
  const cycleGearStatus = useCallback(async (gearCatalogId: number) => {
    if (!am || !adventureId) return;
    const current = myGearMap[gearCatalogId];
    let newStatus: string | null;
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
  const setGearStatus = useCallback(async (gearCatalogId: number, status: string) => {
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
  const selectOption = useCallback(async (gearCatalogId: number, optionId: number, optionWeightOz: number | null) => {
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
  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch AI gear recommendations for a catalog item
  const fetchAIRecommendation = useCallback(async (gearId: number) => {
    if (!adventureId) return;
    setAiRecs(prev => ({ ...prev, [gearId]: { loading: true, recommendations: null, badge_earned: null, error: null } }));
    try {
      const data = await api.getAIGearRecommendation(gearId, adventureId) as { recommendations: AIRecommendation[] | null; badge_earned: string | null };
      setAiRecs(prev => ({ ...prev, [gearId]: { loading: false, recommendations: data.recommendations, badge_earned: data.badge_earned, error: null } }));
      if (data.badge_earned) {
        addToast("🎖️ AI Gear Badge Earned!", "success");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAiRecs(prev => ({ ...prev, [gearId]: { loading: false, recommendations: null, badge_earned: null, error: msg } }));
      addToast("AI recommendation failed: " + msg, "error");
    }
  }, [adventureId, addToast]);

  const catKeys = Object.keys(categories);

  return (
    <div>
      {/* Pack Weight Widget */}
      {am && <PackWeightWidget key={weightKey} adventureId={adventureId} userId={am.user_id} memberName={am.name} />}

      {/* Gear Guide — explains sharing types and weight estimates */}
      <div className="tl-card px-3.5 py-2.5">
        <div onClick={() => setShowGearGuide(!showGearGuide)} className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-tl-accent" />
            <span className="text-[12px] font-bold text-tl-heading font-display">Gear Guide</span>
            <span className="text-[9px] text-tl-text-dimmer">weight & sharing info</span>
          </div>
          <span className="text-[14px] text-tl-text-dimmer transition-transform duration-200" style={{ transform: showGearGuide ? "rotate(90deg)" : "none" }}>&rsaquo;</span>
        </div>
        {showGearGuide && (
          <div className="mt-2.5">
            <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-1.5 font-body">
              Gear Sharing Types
            </div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {[
                { label: "PERSONAL", color: "text-tl-heading", bg: "bg-tl-bg-alt", border: "border-tl-border-light", desc: "Your own gear — counted toward your pack weight" },
                { label: "CREW", color: "text-tl-accent", bg: "bg-tl-accent-bg", border: "border-tl-border-accent", desc: "Shared crew gear — weight split among members on trail" },
                { label: "BUDDY", colorVal: "#3B6BB0", bgVal: "#E8F0FE", borderVal: "#B0C8E8", desc: "Split between tent partners (e.g. one carries tent, other carries poles)" },
                { label: "PROVIDED", colorVal: "#B8740A", bgVal: "#FFF3E0", borderVal: "#E8C896", desc: "Provided by Philmont on-site — you still carry it but don't buy it" },
              ].map(t => (
                <div key={t.label}
                  className={clsx("p-1.5 rounded-btn border", t.bg, t.border)}
                  style={t.bgVal ? { background: t.bgVal, borderColor: t.borderVal } : undefined}
                >
                  <div className="text-[9px] font-bold tracking-[0.5px]" style={t.colorVal ? { color: t.colorVal } : undefined}>
                    {!t.colorVal ? <span className={t.color}>{t.label}</span> : t.label}
                  </div>
                  <div className="text-[9px] text-tl-text-dimmer leading-[1.3] mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-1.5 font-body">
              Pack Weight Estimates
            </div>
            <div className="text-[10px] text-tl-text-muted leading-[1.5]">
              <div className="mb-1">
                <strong className="text-tl-heading">⚖️ Personal gear only</strong> — Only items you mark as "Packed" with type Personal count toward your pack weight.
              </div>
              <div className="mb-1">
                <strong className="text-tl-heading">🍽️ Food: ~1.75 lbs/day</strong> — Philmont provides all trail food in 2-person buddy bags (~0.50 lb breakfast, ~0.75 lb lunch, ~0.50 lb dinner). You carry 2-4 days of food between commissary pickups.
              </div>
              <div>
                <strong className="text-tl-heading">💧 Water: ~6.6 lbs (3L)</strong> — Typical hiking carry. Philmont requires 4L minimum capacity. Dry camp days can be 11-13 lbs (5-6L).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crew gear readiness overview */}
      <div className="tl-card">
        <div className="flex justify-between items-center mb-1.5">
          <div className="tl-card-title">Gear Catalog</div>
          <div className="text-right">
            <div className={clsx("text-[12px] font-bold", crewGearPct >= 80 ? "text-tl-accent" : crewGearPct >= 50 ? "text-tl-gold" : "text-tl-danger")}>
              Crew: {crewGearPct}%
            </div>
            <div className="text-[9px] text-tl-text-dimmer">{gearCatalog.length} items</div>
          </div>
        </div>

        {/* Active member summary */}
        {am && (
          <div className="flex gap-2.5 mb-2 text-[11px]">
            <span className="font-bold" style={{ color: (am as any).color?.bg }}>{am.name}</span>
            <span className="text-tl-accent">✅ {myStats.owned + myStats.packed}</span>
            <span style={{ color: "#E07A5F" }}>📋 {myStats.needed}</span>
            <span className="text-tl-text-dimmer">{myStats.total - myStats.owned - myStats.packed - myStats.needed} unchecked</span>
          </div>
        )}
        {!am && (
          <div className="text-[11px] text-tl-text-dim mb-1.5">Select your name above to manage your gear.</div>
        )}

        {/* Search */}
        <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search gear or products..."
          className="tl-input mb-2 !text-[11px] !py-[7px] !px-2.5 !rounded-badge-sm" />

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-[3px] mb-1.5">
          <button onClick={() => setCategory("all")} className={clsx("gear-pill", category === "all" ? "gear-pill-active" : "gear-pill-inactive")}>
            All {gearCatalog.length}
          </button>
          {catKeys.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={clsx("gear-pill", category === c ? "gear-pill-active" : "gear-pill-inactive")}>
              {c} {categories[c].count}
              {am && categories[c].checked > 0 && <span className="text-tl-accent ml-0.5">✓{categories[c].checked}</span>}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex flex-wrap gap-[3px] mb-1">
          {[{ id: "all", label: "All" }, { id: "essential", label: "Essential" }, { id: "recommended", label: "Recommended" }, { id: "optional", label: "Optional" }].map(p => (
            <button key={p.id} onClick={() => setPriority(p.id)} className={clsx("gear-pill", priority === p.id ? "gear-pill-active" : "gear-pill-inactive")}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        {am && (
          <div className="flex flex-wrap gap-[3px]">
            <button onClick={() => setStatusFilter("all")} className={clsx("gear-pill", statusFilter === "all" ? "gear-pill-active" : "gear-pill-inactive")}>All</button>
            <button onClick={() => setStatusFilter("none")} className={clsx("gear-pill", statusFilter === "none" ? "gear-pill-active" : "gear-pill-inactive")}>Unchecked</button>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)} className={clsx("gear-pill", statusFilter === s.value ? "gear-pill-active" : "gear-pill-inactive")}>
                <s.Icon size={11} strokeWidth={2.5} /> {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Export actions */}
        {am && (
          <div className="flex gap-1.5 mt-2 border-t border-tl-border-light pt-2">
            <button onClick={async () => {
              const myGear: ExtendedMemberGearItem[] = memberGearMap[currentUserId!] || [];
              const activeGear = (gearCatalog as ExtendedGearCatalogItem[]).filter(g => g.active !== 0);
              const rows = activeGear.map(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                return { Name: g.name, Category: g.category, Priority: g.priority || "", Status: mg?.status || "unchecked", Weight_oz: g.weight_oz || "", Type: g.sharing_type || "personal" };
              });
              await exportXLSX([{ name: "Gear Checklist", rows, title: `${am.name} — Gear Checklist`, conditionalFormat: gearStatusFormat }], `my-gear-checklist-${new Date().toISOString().slice(0,10)}.xlsx`);
              addToast("Gear checklist exported", "success");
            }} className="gear-pill gear-pill-inactive flex items-center gap-1">
              <Download size={10} /> Excel
            </button>
            <button onClick={() => {
              const myGear: ExtendedMemberGearItem[] = memberGearMap[currentUserId!] || [];
              const activeGear = (gearCatalog as ExtendedGearCatalogItem[]).filter(g => g.active !== 0);
              const gearByStatus: Record<string, { name: string; category: string; weight: string; sharing: string }[]> = { packed: [], owned: [], need: [], unchecked: [] };
              activeGear.forEach(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                const status = mg?.status || "unchecked";
                const entry = { name: g.name, category: g.category, weight: g.weight_oz ? `${g.weight_oz} oz` : "—", sharing: g.sharing_type || "personal" };
                if (status === "packed") gearByStatus.packed.push(entry);
                else if (status === "owned") gearByStatus.owned.push(entry);
                else if (status === "needed") gearByStatus.need.push(entry);
                else gearByStatus.unchecked.push(entry);
              });
              const section = (title: string, items: { name: string; category: string; weight: string; sharing: string }[]) => {
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
            }} className="gear-pill gear-pill-inactive flex items-center gap-1">
              <Printer size={10} /> Print
            </button>
            <button onClick={async () => {
              const myGear: ExtendedMemberGearItem[] = memberGearMap[currentUserId!] || [];
              const activeGear = (gearCatalog as ExtendedGearCatalogItem[]).filter(g => g.active !== 0);
              const needItems = activeGear.filter(g => {
                const mg = myGear.find(item => item.gear_catalog_id === g.id);
                if (!mg) return true;
                return mg.status === "needed";
              }).map(g => ({ Name: g.name, Category: g.category, Priority: g.priority || "", Weight_oz: g.weight_oz || "", Type: g.sharing_type || "personal" }));
              if (!needItems.length) { addToast("Nothing left to get!", "success"); return; }
              await exportXLSX([{ name: "Still Need", rows: needItems, title: `${am.name} — Still Need` }], `still-need-${new Date().toISOString().slice(0,10)}.xlsx`);
              addToast(`${needItems.length} items exported`, "success");
            }} className="gear-pill gear-pill-inactive flex items-center gap-1">
              <Download size={10} /> Still Need
            </button>
          </div>
        )}
      </div>

      {/* Gear items by category */}
      {Object.entries(groupedItems).map(([cat, items]) => (
        <div key={cat}>
          <div className={clsx("text-[11px] font-extrabold text-tl-heading uppercase tracking-[1px] font-display", isDesktop ? "mt-2.5 mb-1" : "mt-3.5 mb-1.5")}>
            {cat}
            <span className="text-tl-text-dimmer font-normal ml-1.5">{items.length} items</span>
          </div>

          {items.map(item => {
            const p = pColors[item.priority as keyof PriorityColors] || pColors.recommended;
            const sel = myGearMap[item.id];
            const isExpanded = expanded.has(item.id);
            const statusInfo = sel ? STATUS_OPTIONS.find(s => s.value === sel.status) : null;
            // How many crew members have this item
            const ownCount = members ? members.filter(m => {
              const mg: ExtendedMemberGearItem[] = memberGearMap[m.user_id] || [];
              return mg.some(g => g.gear_catalog_id === item.id && (g.status === "owned" || g.status === "packed"));
            }).length : 0;

            return (
              <div key={item.id} className="tl-card transition-all duration-[120ms]"
                style={{
                  background: sel ? (sel.status === "packed" ? "var(--tl-accent-bg)" : "var(--tl-card)") : "var(--tl-card)",
                  border: sel ? `1.5px solid ${sel.status === "packed" ? "var(--tl-border-accent)" : "var(--tl-accent)" + "40"}` : "1px solid var(--tl-border)",
                  padding: isDesktop ? 10 : 12,
                }}>
                {/* Item header — clickable for status */}
                <div className={clsx("flex items-start", isDesktop ? "gap-1.5" : "gap-2")}>
                  {/* Status indicator / checkbox */}
                  <div
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); cycleGearStatus(item.id); }}
                    className="w-6 h-6 rounded-badge-sm shrink-0 flex items-center justify-center text-[13px] transition-all duration-150"
                    style={{
                      border: `2px solid ${statusInfo ? statusInfo.color : "var(--tl-border-light)"}`,
                      cursor: am ? "pointer" : "default",
                      background: sel ? statusInfo?.color + "20" : "transparent",
                    }}
                  >
                    {statusInfo ? <statusInfo.Icon size={14} strokeWidth={2.5} /> : ""}
                  </div>

                  <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={clsx("text-[13px] font-bold font-display", sel ? "text-tl-accent-light" : "text-tl-heading")}>
                        {item.name}
                      </span>
                      <span className="text-[8px] font-bold py-px px-[5px] rounded-[3px] uppercase"
                        style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{item.priority}</span>
                      {(item.sharing_type === "crew") && (
                        <span className="text-[8px] font-semibold py-px px-[5px] rounded-[3px] bg-tl-accent-bg text-tl-accent border border-tl-border-accent">
                          CREW
                        </span>
                      )}
                      {(item.sharing_type === "buddy") && (
                        <span className="text-[8px] font-semibold py-px px-[5px] rounded-[3px]" style={{ background: "#E8F0FE", color: "#3B6BB0", border: "1px solid #B0C8E8" }}>
                          BUDDY
                        </span>
                      )}
                      {(item.sharing_type === "provided") && (
                        <span className="text-[8px] font-semibold py-px px-[5px] rounded-[3px]" style={{ background: "#FFF3E0", color: "#B8740A", border: "1px solid #E8C896" }}>
                          PROVIDED
                        </span>
                      )}
                      {item.philmont_compliant === 0 && (
                        <span className="text-[8px] font-semibold py-px px-[5px] rounded-[3px]" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                          ⚠️ COMPLIANCE
                        </span>
                      )}
                    </div>

                    {/* Weight / Price / Rating row */}
                    <div className="flex gap-2.5 mt-[3px] text-[10px] text-tl-text-muted">
                      {item.weight_oz && <span>⚖️ {item.weight_oz} oz ({(item.weight_oz / 16).toFixed(1)} lbs)</span>}
                      {item.msrp && <span>💰 ~${item.msrp}</span>}
                      {item.rating_stars && <span>{"★".repeat(Math.round(item.rating_stars))}{"☆".repeat(5 - Math.round(item.rating_stars))}</span>}
                    </div>

                    {/* Custom gear name if selected */}
                    {sel?.custom_product_name && (
                      <div className="text-[10px] text-tl-accent mt-0.5">
                        📦 {sel.custom_product_name} {sel.custom_weight_oz ? `(${sel.custom_weight_oz} oz)` : ""}
                      </div>
                    )}
                    {sel?.selected_option_id && !sel.custom_product_name && (() => {
                      const opt = (item.options || []).find((o: ProductOptionRuntime) => o.id === sel.selected_option_id);
                      return opt ? (
                        <div className="text-[10px] text-tl-accent mt-0.5">
                          📦 {opt.product_name} {opt.weight_oz ? `(${opt.weight_oz} oz)` : ""}
                        </div>
                      ) : null;
                    })()}

                    <div className="flex gap-2 mt-0.5">
                      {ownCount > 0 && (
                        <span className="text-[10px] text-tl-accent">{ownCount}/{trekkingMembers.length || members?.length || 0} have this</span>
                      )}
                      <span className="text-[10px] text-tl-text-dimmest cursor-pointer">
                        {isExpanded ? "▲ less" : "▼ details"}
                      </span>
                    </div>
                  </div>

                  {/* Status buttons on the right — click to set, click again to uncheck */}
                  {am && (
                    <div className="flex gap-0.5 shrink-0">
                      {STATUS_OPTIONS.map(s => {
                        const isActive = sel?.status === s.value;
                        return (
                          <button key={s.value} onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (isActive) {
                              // Toggle off — uncheck
                              (async () => { setSaving(true); try { await api.removeMemberGearItem(adventureId, am.user_id, item.id); await refreshMemberGear(); setWeightKey(k => k + 1); } catch(err) { console.error(err); } setSaving(false); })();
                            } else {
                              setGearStatus(item.id, s.value);
                            }
                          }}
                            className="flex flex-col items-center gap-px rounded-[4px] border-none cursor-pointer font-body transition-all duration-[120ms] min-w-[36px]"
                            style={{
                              padding: "3px 8px", fontSize: 9, fontWeight: 600,
                              background: isActive ? s.color : "var(--tl-bg-alt)", color: isActive ? "#fff" : "var(--tl-text-dimmer)",
                            }}
                          >
                            <s.Icon size={11} strokeWidth={2.5} />
                            <span className="text-[7px] font-bold tracking-[0.3px] uppercase">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-tl-border-light">
                    {/* Description / Rating Notes */}
                    {(item.description || item.rating_notes) && (
                      <div className="text-[11px] text-tl-text-muted mb-2 leading-[1.5]">
                        {item.rating_notes && <div className="italic mb-1">"{item.rating_notes}"</div>}
                        {item.description && <div>{item.description}</div>}
                      </div>
                    )}

                    {/* Compliance notes */}
                    {item.compliance_notes && (
                      <div className="text-[10px] py-1 px-2 rounded-badge-sm mb-2" style={{ background: "var(--tl-urgency-bg, #FEF3C7)", color: "#92400E", border: "1px solid #F59E0B40" }}>
                        ⚠️ Philmont: {item.compliance_notes}
                      </div>
                    )}

                    {/* Product Options */}
                    {(item.options || []).length > 0 && (
                      <div className="mb-2">
                        <div className="text-[10px] font-bold text-tl-heading mb-1">Product Options:</div>
                        {item.options!.map((opt: ProductOptionRuntime) => {
                          const isSelected = sel?.selected_option_id === opt.id;
                          return (
                            <div key={opt.id}
                              onClick={() => am && selectOption(item.id, opt.id, opt.weight_oz || null)}
                              className={clsx(
                                "flex items-center gap-2 py-[5px] px-2 rounded-badge-sm mb-[3px] transition-all duration-[120ms]",
                                isSelected ? "bg-tl-accent-bg border-[1.5px] border-tl-border-accent" : "bg-tl-bg-alt border border-tl-border-light",
                              )}
                              style={{ cursor: am ? "pointer" : "default" }}
                            >
                              <span className="text-[12px]">
                                {opt.tier === "budget" ? "💲" : opt.tier === "mid" ? "⭐" : "⚡"}
                              </span>
                              <div className="flex-1">
                                <div className={clsx("text-[11px] font-semibold", isSelected ? "text-tl-accent" : "text-tl-text")}>
                                  {opt.product_name}
                                  {opt.is_ultralight_pick === 1 && <span className="ml-1 text-[9px]" style={{ color: "#F59E0B" }}>⚡ UL</span>}
                                </div>
                                <div className="text-[9px] text-tl-text-dimmer">
                                  {opt.brand && `${opt.brand} · `}
                                  {opt.price && `$${opt.price}`}
                                  {opt.weight_oz && ` · ${opt.weight_oz} oz`}
                                </div>
                                {opt.notes && <div className="text-[9px] text-tl-text-muted mt-px">{opt.notes}</div>}
                              </div>
                              <div className="text-[10px] text-tl-text-dimmer">
                                {"★".repeat(opt.star_rating || 3)}{"☆".repeat(5 - (opt.star_rating || 3))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buy Links — from product options with affiliate URLs */}
                    {(item.options || []).some((o: ProductOptionRuntime) => o.affiliate_url) && (
                      <div className="flex gap-1 flex-wrap mb-1.5">
                        {item.options!.filter((o: ProductOptionRuntime) => o.affiliate_url).map((opt: ProductOptionRuntime) => (
                          <a key={opt.id} href={opt.affiliate_url} target="_blank" rel="noopener noreferrer"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              api.trackAffiliateClick(opt.id, item.id, opt.affiliate_url!).catch(() => {});
                            }}
                            className="py-1 px-2.5 rounded-[5px] bg-tl-accent text-white text-[9px] font-semibold no-underline font-body">
                            🛒 Buy {opt.product_name}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* AI Gear Recommendation */}
                    {am && adventureId && (() => {
                      const rec = aiRecs[item.id];
                      return (
                        <div className="mb-2">
                          <button
                            onClick={() => fetchAIRecommendation(item.id)}
                            disabled={rec?.loading}
                            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-badge-sm border-[1.5px] border-tl-border-light text-[11px] font-bold font-body transition-all duration-150"
                            style={{
                              background: rec?.loading ? "var(--tl-bg-alt)" : "var(--tl-forest-deep, var(--tl-accent))",
                              color: rec?.loading ? "var(--tl-text-dimmer)" : "#fff",
                              cursor: rec?.loading ? "wait" : "pointer",
                            }}
                          >
                            {rec?.loading ? (
                              <><span className="inline-block" style={{ animation: "spin 1s linear infinite" }}>⏳</span> AI is thinking...</>
                            ) : (
                              <>🤖 AI Recommend</>
                            )}
                          </button>

                          {rec?.badge_earned && (
                            <div className="mt-1.5 py-1.5 px-2.5 rounded-badge-sm bg-tl-accent-bg border border-tl-border-accent text-[11px] font-bold text-tl-accent">
                              🎖️ AI Gear Badge Earned!
                            </div>
                          )}

                          {rec?.error && (
                            <div className="mt-1.5 text-[10px] text-tl-danger">
                              Error: {rec.error}
                            </div>
                          )}

                          {rec?.recommendations && (
                            <div className="mt-2">
                              <div className="text-[10px] font-bold text-tl-heading mb-1.5 font-display">
                                AI Recommendations for {item.name}
                              </div>
                              {rec.recommendations.map((r: AIRecommendation, idx: number) => (
                                <div key={idx} className="py-2 px-2.5 rounded-btn mb-1 bg-tl-bg-alt border border-tl-border-light">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="text-[12px] font-bold text-tl-heading font-display">
                                        {r.product_name}
                                      </div>
                                      <div className="text-[10px] text-tl-text-muted mt-px">
                                        {r.brand}{r.estimated_price ? ` · ${r.estimated_price}` : ""}{r.weight_oz ? ` · ${r.weight_oz} oz` : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-tl-text-muted mt-1 leading-[1.4]">
                                    {r.why_recommended}
                                  </div>
                                  <div className="flex gap-1.5 mt-1 flex-wrap">
                                    <a
                                      href={r.buy_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        api.trackAffiliateClick(null, item.id, r.buy_url).catch(() => {});
                                      }}
                                      className="inline-block py-[3px] px-2.5 rounded-[5px] text-[9px] font-bold no-underline font-body"
                                      style={{ background: "#FF9900", color: "#111" }}
                                    >
                                      Amazon
                                    </a>
                                    {r.rei_url && (
                                      <a
                                        href={r.rei_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          api.trackAffiliateClick(null, item.id, r.rei_url!).catch(() => {});
                                        }}
                                        className="inline-block py-[3px] px-2.5 rounded-[5px] text-[9px] font-bold no-underline font-body"
                                        style={{ background: "#2D5F2D", color: "#fff" }}
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
                        userId={am.user_id!}
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
        <div className="tl-card text-center text-tl-text-dimmer text-[12px] italic">
          No gear items match your filters.
        </div>
      )}
    </div>
  );
}

// Custom gear input — user enters their actual product name and weight
interface CustomGearInputProps {
  gearId: number;
  current: ExtendedMemberGearItem | undefined;
  adventureId: number;
  userId: number;
  onUpdate: () => Promise<void>;
}

function CustomGearInput({ gearId, current, adventureId, userId, onUpdate }: CustomGearInputProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(current?.custom_product_name || "");
  const [weight, setWeight] = useState<string>(String(current?.custom_weight_oz || ""));

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
      <button onClick={() => setEditing(true)}
        className="py-1 px-2.5 rounded-[5px] border border-dashed border-tl-border-light bg-transparent text-tl-text-dimmer text-[9px] cursor-pointer font-body">
        ✏️ {current?.custom_product_name ? "Edit my gear" : "Enter your actual gear model"}
      </button>
    );
  }

  return (
    <div className="flex gap-1 mt-1">
      <input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Your model (e.g. MSR Hubba Hubba)"
        className="flex-1 py-1 px-2 rounded-[4px] border border-tl-border-light bg-tl-input text-tl-text text-[10px] font-body outline-none" />
      <input value={weight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)} placeholder="oz" type="number" step="0.1"
        className="w-[50px] py-1 px-1.5 rounded-[4px] border border-tl-border-light bg-tl-input text-tl-text text-[10px] font-body outline-none" />
      <button onClick={save} className="py-1 px-2 rounded-[4px] border-none bg-tl-accent text-white text-[10px] cursor-pointer font-body">Save</button>
      <button onClick={() => setEditing(false)} className="py-1 px-2 rounded-[4px] border border-tl-border-light bg-transparent text-tl-text-dim text-[10px] cursor-pointer font-body">✕</button>
    </div>
  );
}
