/**
 * DesktopBIChartRow — desktop-only BI panel below DashboardOverview.
 * Lazy-loads ReadinessTrendChart (keeping recharts out of main bundle).
 *
 * Layout:
 *   Left (~58%): Crew readiness % trend over the past 8 weeks (area chart)
 *   Right (~42%): Trail badges 4-across grid (current user)
 */

import { lazy, Suspense, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { BadgeRow } from "../BadgeSystem";
import { computeCrewReadiness } from "../../utils/readiness";
import type { AdventureMember, Skill, Achievement } from "../../types";
import type { GearCatalogItem, MemberGearItem } from "../../types/gear";

const ReadinessTrendChart = lazy(() => import("./charts/ReadinessTrendChart"));

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

  const currentReadiness = useMemo(
    () => computeCrewReadiness(members, skills, gearCatalog, memberGearMap).overall,
    [members, skills, gearCatalog, memberGearMap],
  );

  return (
    <div className="flex gap-4 mb-4">
      {/* Left panel: readiness trend area chart */}
      <div className="flex-[58_58_0%] bg-tl-surface border border-tl-border rounded-xl p-4 min-w-0">
        <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] font-body mb-3">
          Readiness Trend
        </div>
        <Suspense fallback={<ChartLoading />}>
          <ReadinessTrendChart currentReadiness={currentReadiness} isDark={isDark} />
        </Suspense>
      </div>

      {/* Right panel: trail badges */}
      <div className="flex-[42_42_0%] bg-tl-surface border border-tl-border rounded-xl p-4 min-w-0">
        <BadgeRow achievements={achievements as any} userId={currentUserId} size={72} grid />
      </div>
    </div>
  );
}
