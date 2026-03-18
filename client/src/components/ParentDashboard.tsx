import { useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { computeMemberReadiness } from "../utils/readiness";
import clsx from "clsx";
import { Heart, Backpack, ClipboardCheck, Shield, Calendar, ChevronRight, LucideIcon } from "lucide-react";
import type { AdventureMember, ThemeColors, ThemeMode, Skill, GearCatalogItem, MemberGearItem } from "../types";

interface ParentDashboardProps {
  linkedScouts: number[];
  onViewScout?: (memberIndex: number) => void;
}

type MemberGearMap = Record<number, MemberGearItem[]>;

interface CategoryData {
  done: number;
  total: number;
  pct: number;
  packed?: number;
}

interface ReadinessResult {
  training: CategoryData | null;
  medical: CategoryData | null;
  admin: CategoryData | null;
  gear: CategoryData & { packed: number };
  overall: number;
}

interface CategoryDef {
  key: string;
  label: string;
  icon: LucideIcon;
  data: CategoryData | null;
  color: string;
}

interface ScoutCardProps {
  scout: AdventureMember;
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: MemberGearMap;
  theme: ThemeColors;
  mode: ThemeMode;
  onViewScout?: (memberIndex: number) => void;
  members: AdventureMember[];
}

/**
 * Parent Dashboard — dedicated view for parents to track linked scouts' progress.
 * Shows readiness breakdown, gear progress, and upcoming events per scout.
 */
export default function ParentDashboard({ linkedScouts, onViewScout }: ParentDashboardProps) {
  const { theme, mode } = useTheme();
  const { members, skills, gearCatalog, memberGearMap } = useAdventure();

  // Resolve scout objects from members list
  const scouts = useMemo(() => {
    if (!linkedScouts || linkedScouts.length === 0) return [];
    return linkedScouts.map((sid: number) => {
      // Positive = user_id, negative = manual member id
      if (sid > 0) return members.find((m: AdventureMember) => m.user_id === sid);
      return members.find((m: AdventureMember) => m.is_manual && m.id === Math.abs(sid));
    }).filter(Boolean) as AdventureMember[];
  }, [linkedScouts, members]);

  if (scouts.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <div className="bg-tl-card rounded-[16px] border border-tl-border px-5 py-[18px] shadow-card">
        <div className="flex items-center gap-2 mb-3.5">
          <Heart size={16} color={theme.accent} />
          <span className="text-[16px] font-extrabold text-tl-heading font-display">
            My Scout{scouts.length > 1 ? "s" : ""}
          </span>
        </div>

        {scouts.map((scout) => (
          <ScoutCard
            key={scout.is_manual ? `m-${scout.id}` : `u-${scout.user_id}`}
            scout={scout}
            skills={skills}
            gearCatalog={gearCatalog}
            memberGearMap={memberGearMap}
            theme={theme}
            mode={mode}
            onViewScout={onViewScout}
            members={members}
          />
        ))}
      </div>
    </div>
  );
}

function ScoutCard({ scout, skills, gearCatalog, memberGearMap, theme, mode, onViewScout, members }: ScoutCardProps) {
  const readiness: ReadinessResult = useMemo(() => {
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills = skills.filter(s => s.category === "medical");
    const adminSkills = skills.filter(s => s.category === "admin");

    const pct = (items: Skill[], field: "skills" | "medical" | "admin_tasks"): CategoryData | null => {
      if (items.length === 0) return null;
      const done = (scout[field] || []).filter((id: number) => items.some(s => s.id === id)).length;
      return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
    };

    const training = pct(trainingSkills, "skills");
    const medical = pct(medicalSkills, "medical");
    const admin = pct(adminSkills, "admin_tasks");

    const gearItems = memberGearMap[scout.user_id as number] || [];
    const gearOwned = gearItems.filter((g: MemberGearItem) => g.status === "owned" || g.status === "packed").length;
    const gearPacked = gearItems.filter((g: MemberGearItem) => g.status === "packed").length;
    const gear = {
      done: gearOwned, packed: gearPacked, total: gearCatalog.length,
      pct: gearCatalog.length > 0 ? Math.round((gearOwned / gearCatalog.length) * 100) : 0,
    };

    const overall = computeMemberReadiness(scout, skills, gearCatalog, memberGearMap);

    return { training, medical, admin, gear, overall };
  }, [scout, skills, gearCatalog, memberGearMap]);

  const datesCount = (scout.dates || []).length;
  const avatarBg = scout.user_type === "adult" ? "#5B7A3A" : "#8B6E4E";

  const categories: CategoryDef[] = [
    { key: "training", label: "Training", icon: ClipboardCheck, data: readiness.training, color: "#4CAF50" },
    { key: "gear", label: "Gear", icon: Backpack, data: readiness.gear, color: "#FF9800" },
    { key: "medical", label: "Medical", icon: Shield, data: readiness.medical, color: "#2196F3" },
    { key: "admin", label: "Admin", icon: ClipboardCheck, data: readiness.admin, color: "#9C27B0" },
  ];

  const scoutIdx = members.indexOf(scout);

  const cardBg = mode === "dark" ? "bg-[#2A2E24]" : "bg-[#FAFAF5]";
  const innerBg = mode === "dark" ? "bg-[#1E2218]" : "bg-white";

  return (
    <div className={clsx(cardBg, "rounded-[14px] border border-tl-border-light px-4 py-3.5 mb-2.5")}>
      {/* Scout header */}
      <div className="flex items-center gap-2.5 mb-3">
        {(scout as AdventureMember & { avatar_url?: string }).avatar_url ? (
          <img src={(scout as AdventureMember & { avatar_url?: string }).avatar_url} alt="" className="w-9 h-9 rounded-full" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-[#FDFAF5] font-display" style={{ background: avatarBg }}>
            {(scout.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="text-[15px] font-bold text-tl-heading font-display">
            {scout.name}
          </div>
          <div className="text-[11px] text-tl-text-dim font-body">
            {scout.is_manual ? "Scout" : (scout.user_type === "adult" ? "Adult" : "Scout")}
            {datesCount > 0 && ` · ${datesCount} date${datesCount === 1 ? "" : "s"} marked`}
          </div>
        </div>
        {/* Overall readiness ring */}
        <div className="relative w-11 h-11">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke={theme.border} strokeWidth="3" />
            <circle cx="22" cy="22" r="18" fill="none"
              stroke={readiness.overall > 50 ? theme.accent : "#E57373"}
              strokeWidth="3" strokeDasharray={`${readiness.overall * 1.131} 113.1`}
              strokeLinecap="round" transform="rotate(-90 22 22)" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-tl-heading font-display">
            {readiness.overall}%
          </div>
        </div>
      </div>

      {/* Category progress bars */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {categories.map(({ key, label, icon: Icon, data, color }) => {
          if (!data || data.pct === undefined) return null;
          return (
            <div key={key} className={clsx(innerBg, "rounded-[10px] px-2.5 py-2 border border-tl-border-light")}>
              <div className="flex items-center gap-1 mb-1">
                <Icon size={11} color={color} strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-tl-text-dim uppercase tracking-[0.5px]">
                  {label}
                </span>
                <span className="text-[10px] font-semibold text-tl-text-dimmer ml-auto">
                  {data.done}/{data.total}
                </span>
              </div>
              <div className="h-[5px] rounded-[3px] bg-tl-border overflow-hidden">
                <div className="h-full rounded-[3px] transition-[width] duration-500 ease-in-out" style={{
                  background: color,
                  width: `${data.pct}%`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick stats row */}
      <div className="flex gap-2 items-center">
        <div className={clsx(innerBg, "flex items-center gap-1 text-[11px] text-tl-text-dim rounded-lg px-2.5 py-1 border border-tl-border-light")}>
          <Calendar size={11} color={theme.accent} />
          <span>{datesCount} date{datesCount === 1 ? "" : "s"}</span>
        </div>
        {readiness.gear && (
          <div className={clsx(innerBg, "flex items-center gap-1 text-[11px] text-tl-text-dim rounded-lg px-2.5 py-1 border border-tl-border-light")}>
            <Backpack size={11} color="#FF9800" />
            <span>{readiness.gear.packed} packed</span>
          </div>
        )}
        {scoutIdx >= 0 && onViewScout && (
          <button onClick={() => onViewScout(scoutIdx)} className="ml-auto flex items-center gap-[3px] text-[11px] font-semibold text-tl-accent bg-none border-none cursor-pointer font-body px-1.5 py-1">
            View Details <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
