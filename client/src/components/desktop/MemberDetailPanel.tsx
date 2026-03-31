/**
 * MemberDetailPanel — desktop-only drill-down panel for the Readiness view.
 * Shows the selected member's overall readiness, 4-category breakdown,
 * priority alerts for any category below 50%, and badge progress.
 *
 * Lazy-loaded so BadgeRow stays out of the main bundle.
 */

import { useMemo } from "react";
import { BadgeRow } from "../BadgeSystem";
import type { AdventureMember, Skill, Achievement } from "../../types";
import type { GearCatalogItem, MemberGearItem } from "../../types/gear";

interface Props {
  member: AdventureMember;
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: Record<number, MemberGearItem[]>;
  achievements: Achievement | null;
}

function readinessColor(pct: number): string {
  if (pct >= 70) return "#5B7A3A";
  if (pct >= 50) return "#D4A017";
  return "#CC3333";
}

export default function MemberDetailPanel({
  member, skills, gearCatalog, memberGearMap, achievements,
}: Props) {
  const categories = useMemo(() => {
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills  = skills.filter(s => s.category === "medical");
    const adminSkills    = skills.filter(s => s.category === "admin");

    const pct = (items: Skill[], field: "skills" | "medical" | "admin_tasks"): number | null => {
      if (items.length === 0) return null;
      const done = ((member as any)[field] || []).filter((id: number) => items.some(s => s.id === id)).length;
      return Math.round((done / items.length) * 100);
    };

    const gearItems = memberGearMap[member.user_id!] || [];
    const gearDone  = gearItems.filter(g => g.status === "owned" || g.status === "packed").length;
    const gear      = gearCatalog.length > 0 ? Math.round((gearDone / gearCatalog.length) * 100) : null;

    return [
      { label: "Training", value: pct(trainingSkills, "skills") },
      { label: "Gear",     value: gear },
      { label: "Medical",  value: pct(medicalSkills,  "medical") },
      { label: "Admin",    value: pct(adminSkills,    "admin_tasks") },
    ].filter((c): c is { label: string; value: number } => c.value !== null);
  }, [member, skills, gearCatalog, memberGearMap]);

  const overall = useMemo(() => {
    if (categories.length === 0) return 0;
    return Math.round(categories.reduce((s, c) => s + c.value, 0) / categories.length);
  }, [categories]);

  const initials = member.name
    ?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="bg-tl-surface border border-tl-border rounded-xl p-5 sticky top-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0 font-body"
          style={{ background: "#3A4D2A" }}
        >
          {initials}
        </div>
        <div>
          <div className="text-[15px] font-bold text-tl-text font-display leading-tight">{member.name}</div>
          <div className="text-[11px] text-tl-text-dim capitalize font-body mt-0.5">
            {member.role} · {member.participation}
          </div>
        </div>
      </div>

      {/* Overall readiness — large display number */}
      <div className="text-center mb-5 pb-4 border-b border-tl-border">
        <div
          className="font-display leading-none"
          style={{ fontSize: 52, fontWeight: 900, color: readinessColor(overall) }}
        >
          {overall}%
        </div>
        <div className="text-[10px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mt-2 font-body">
          Overall Readiness
        </div>
      </div>

      {/* 4-category bars */}
      <div className="flex flex-col gap-3 mb-4">
        {categories.map(cat => (
          <div key={cat.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-tl-text-dim uppercase tracking-wide font-body">
                {cat.label}
              </span>
              <div className="flex items-center gap-2">
                {cat.value < 50 && (
                  <span className="text-[10px] font-bold text-tl-danger font-body">⚠ Needs attention</span>
                )}
                <span
                  className="text-[12px] font-bold font-body"
                  style={{ color: readinessColor(cat.value) }}
                >
                  {cat.value}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-tl-progress-bg overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-in-out"
                style={{ width: `${cat.value}%`, background: readinessColor(cat.value) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Badge progress */}
      <div className="border-t border-tl-border pt-4">
        <BadgeRow achievements={achievements as any} userId={member.user_id!} size={48} />
      </div>
    </div>
  );
}
