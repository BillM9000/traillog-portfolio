/**
 * DesktopBIChartRow — desktop-only BI panel below DashboardOverview.
 * Lazy-loads ReadinessBarChart (keeping recharts out of main bundle).
 *
 * Layout:
 *   Left (~58%): Member readiness horizontal bar chart
 *   Right (~42%): Trail badges 4-across grid (current user)
 */

import { lazy, Suspense, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { BadgeRow } from "../BadgeSystem";
import { computeMemberReadiness } from "../../utils/readiness";
import type { AdventureMember, Skill, Achievement } from "../../types";
import type { GearCatalogItem, MemberGearItem } from "../../types/gear";

const ReadinessBarChart = lazy(() => import("./charts/ReadinessBarChart"));

function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-[120px] text-tl-text-dim text-[12px] font-body">
      Loading chart…
    </div>
  );
}

interface Props {
  members: AdventureMember[];
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: Record<number, MemberGearItem[]>;
  achievements: Achievement | null;
  currentUserId: number;
}

export default function DesktopBIChartRow({
  members, skills, gearCatalog, memberGearMap, achievements, currentUserId,
}: Props) {
  const { isDark } = useTheme();

  const trekking = members.filter(m => m.participation === "trekking");

  const chartData = useMemo(() => {
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills  = skills.filter(s => s.category === "medical");
    const adminSkills    = skills.filter(s => s.category === "admin");

    return trekking.map(m => {
      const pct = (items: Skill[], field: "skills" | "medical" | "admin_tasks") => {
        if (items.length === 0) return 0;
        const done = ((m as any)[field] || []).filter((id: number) => items.some(s => s.id === id)).length;
        return Math.round((done / items.length) * 100);
      };

      const training = pct(trainingSkills, "skills");
      const medical  = pct(medicalSkills,  "medical");
      const admin    = pct(adminSkills,    "admin_tasks");

      const gearItems = memberGearMap[m.user_id!] || [];
      const gearDone  = gearItems.filter(g => g.status === "owned" || g.status === "packed").length;
      const gear = gearCatalog.length > 0 ? Math.round((gearDone / gearCatalog.length) * 100) : 0;

      const overall = computeMemberReadiness(m, skills, gearCatalog, memberGearMap);
      const firstName = m.name?.split(" ")[0] || m.name || "?";
      return { name: firstName, overall, training, medical, admin, gear };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, skills, gearCatalog, memberGearMap]);

  return (
    <div className="flex gap-4 mb-4">
      {/* Left panel: readiness bar chart */}
      <div className="flex-[58_58_0%] bg-tl-surface border border-tl-border rounded-xl p-4 min-w-0">
        <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] font-body mb-3">
          Member Readiness
        </div>
        <Suspense fallback={<ChartLoading />}>
          <ReadinessBarChart data={chartData} isDark={isDark} />
        </Suspense>
      </div>

      {/* Right panel: trail badges */}
      <div className="flex-[42_42_0%] bg-tl-surface border border-tl-border rounded-xl p-4 min-w-0">
        <BadgeRow achievements={achievements as any} userId={currentUserId} size={72} grid />
      </div>
    </div>
  );
}
