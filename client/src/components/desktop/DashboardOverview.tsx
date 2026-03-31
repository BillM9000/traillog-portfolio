import { useMemo } from "react";
import { Users, ClipboardCheck, Backpack, CalendarCheck } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { computeCrewReadiness } from "../../utils/readiness";
import type { AdventureMember, Skill, GearCatalogItem, MemberGearItem, Adventure, TrekDates } from "../../types";

interface DashboardOverviewProps {
  members: AdventureMember[];
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: Record<number, MemberGearItem[]>;
  adventure: Adventure | null;
  trekDates: TrekDates | null;
}

// Design bible: ≥70% green, 30–69% amber, <30% red
function statusColor(value: number, thresholds: [number, number] = [30, 70]): string {
  if (value < thresholds[0]) return 'var(--tl-danger)';
  if (value < thresholds[1]) return 'var(--tl-urgency)';
  return 'var(--tl-accent)';
}

export default function DashboardOverview({
  members,
  skills,
  gearCatalog,
  memberGearMap,
  adventure,
  trekDates,
}: DashboardOverviewProps) {
  const { theme } = useTheme();

  const readiness = useMemo(
    () => computeCrewReadiness(members, skills, gearCatalog, memberGearMap),
    [members, skills, gearCatalog, memberGearMap],
  );

  const trekkingCount = useMemo(
    () => members.filter((m) => m.participation === "trekking").length,
    [members],
  );

  const avgGearPct = useMemo(() => {
    const trekking = members.filter((m) => m.participation === "trekking");
    if (trekking.length === 0 || gearCatalog.length === 0) return 0;
    const total = trekking.reduce((sum, m) => {
      const items = memberGearMap[m.user_id!] || [];
      const done = items.filter((g) => g.status === "owned" || g.status === "packed").length;
      return sum + Math.round((done / gearCatalog.length) * 100);
    }, 0);
    return Math.round(total / trekking.length);
  }, [members, gearCatalog, memberGearMap]);

  const completedTrainingCount = useMemo(() => {
    const trainingSkills = skills.filter((s) => s.category === "training");
    if (trainingSkills.length === 0) return 0;
    const trekking = members.filter((m) => m.participation === "trekking");
    return trekking.reduce(
      (sum, m) =>
        sum + (m.skills || []).filter((id) => trainingSkills.some((s) => s.id === id)).length,
      0,
    );
  }, [members, skills]);

  const totalTrainingItems = useMemo(() => {
    const trainingSkills = skills.filter((s) => s.category === "training");
    const trekking = members.filter((m) => m.participation === "trekking");
    return trainingSkills.length * trekking.length;
  }, [members, skills]);

  const trainingPct = totalTrainingItems > 0
    ? Math.round((completedTrainingCount / totalTrainingItems) * 100)
    : 0;

  const statCards = [
    { icon: Users, label: "Members", value: `${trekkingCount} / ${members.length}`, color: 'var(--tl-accent)' },
    { icon: ClipboardCheck, label: "Readiness", value: `${readiness.overall}%`, color: statusColor(readiness.overall) },
    { icon: Backpack, label: "Gear", value: `${avgGearPct}%`, color: statusColor(avgGearPct) },
    { icon: CalendarCheck, label: "Training", value: `${completedTrainingCount} / ${totalTrainingItems}`, color: statusColor(trainingPct) },
  ];

  const readinessBreakdown = [
    { label: "Training", value: readiness.training, color: theme.accent },
    { label: "Gear", value: readiness.gear, color: theme.gold },
    { label: "Medical", value: readiness.medical, color: theme.urgency },
    { label: "Admin", value: readiness.admin, color: theme.forestMid },
  ];

  return (
    <div className="mb-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="tl-card flex flex-col gap-1 !mb-0"
          >
            <div className="flex items-center gap-1.5">
              <card.icon size={16} style={{ color: card.color }} strokeWidth={1.8} />
              <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-tl-text-dim">
                {card.label}
              </span>
            </div>
            <span className="font-body text-xl font-bold leading-tight" style={{ color: card.color }}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Readiness breakdown bars */}
      <div className="tl-card grid grid-cols-4 gap-3 !mb-0">
        {readinessBreakdown.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-tl-text-dim">
                {item.label}
              </span>
              <span className="font-body text-[13px] font-semibold text-tl-text">
                {item.value}%
              </span>
            </div>
            <div className="h-1 rounded-sm bg-tl-progress-bg overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-300 ease-in-out"
                style={{ width: `${item.value}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
