import React, { useState, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { computeMemberReadiness } from "../../utils/readiness";
import clsx from "clsx";
import type { AdventureMember, Skill, GearCatalogItem, MemberGearItem } from "../../types";

interface MembersTableProps {
  members: AdventureMember[];
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: Record<number, MemberGearItem[]>;
  active: number | null;
  setActive: (idx: number | null) => void;
  isAdmin: boolean;
  currentUserId: number;
}

type SortKey = "name" | "role" | "readiness" | "training" | "gear";
type SortDir = "asc" | "desc";

export default function MembersTable({
  members,
  skills,
  gearCatalog,
  memberGearMap,
  active,
  setActive,
  isAdmin,
  currentUserId,
}: MembersTableProps) {
  const { theme } = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trainingSkills = useMemo(
    () => skills.filter((s) => s.category === "training"),
    [skills]
  );

  const memberData = useMemo(() => {
    return members.map((m) => {
      const readiness = computeMemberReadiness(m, skills, gearCatalog, memberGearMap);
      const trainDone = (m.skills || []).filter((id) =>
        trainingSkills.some((s) => s.id === id)
      ).length;
      const trainTotal = trainingSkills.length;
      const gearItems = memberGearMap[m.user_id!] || [];
      const gearDone = gearItems.filter(
        (g) => g.status === "owned" || g.status === "packed"
      ).length;
      const gearTotal = gearCatalog.length;
      return { member: m, readiness, trainDone, trainTotal, gearDone, gearTotal };
    });
  }, [members, skills, gearCatalog, memberGearMap, trainingSkills]);

  const sorted = useMemo(() => {
    const indexed = memberData.map((d, i) => ({ ...d, origIdx: i }));
    indexed.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.member.name.localeCompare(b.member.name);
          break;
        case "role":
          cmp = a.member.role.localeCompare(b.member.role);
          break;
        case "readiness":
          cmp = a.readiness - b.readiness;
          break;
        case "training":
          cmp =
            (a.trainTotal === 0 ? 0 : a.trainDone / a.trainTotal) -
            (b.trainTotal === 0 ? 0 : b.trainDone / b.trainTotal);
          break;
        case "gear":
          cmp =
            (a.gearTotal === 0 ? 0 : a.gearDone / a.gearTotal) -
            (b.gearTotal === 0 ? 0 : b.gearDone / b.gearTotal);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return indexed;
  }, [memberData, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const readinessColor = (pct: number): string => {
    if (pct > 70) return theme.accent;
    if (pct >= 30) return theme.gold;
    return theme.danger;
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  return (
    <div className="tl-card overflow-hidden !p-0 !mb-0">
      <table className="w-full border-collapse table-auto">
        <thead>
          <tr>
            {(["name", "role", "readiness", "training", "gear"] as SortKey[]).map((key) => (
              <th
                key={key}
                className="tl-table-header cursor-pointer select-none"
                onClick={() => handleSort(key)}
              >
                {key === "readiness" ? "Readiness %" : key.charAt(0).toUpperCase() + key.slice(1)}
                {arrow(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isSelected = active === row.origIdx;
            const isHovered = hoveredIdx === row.origIdx;
            const isCurrentUser = row.member.user_id === currentUserId;
            const rColor = readinessColor(row.readiness);

            return (
              <tr
                key={row.member.id}
                onClick={() => setActive(isSelected ? null : row.origIdx)}
                onMouseEnter={() => setHoveredIdx(row.origIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(isSelected ? null : row.origIdx);
                  }
                }}
                className={clsx(
                  "h-[38px] cursor-pointer border-b border-tl-border transition-colors duration-150 outline-none",
                  isSelected ? "bg-tl-selected-bg text-tl-selected-text" : isHovered ? "bg-tl-bg-alt text-tl-text" : "bg-transparent text-tl-text",
                  "focus:ring-2 focus:ring-tl-accent"
                )}
              >
                {/* Name */}
                <td className="font-body text-[13px] py-2 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tl-member-dot shrink-0" />
                    <span className={isCurrentUser ? "font-bold" : ""}>
                      {row.member.name}
                    </span>
                  </div>
                </td>

                {/* Role */}
                <td className="font-body text-[13px] py-2 px-3 whitespace-nowrap">
                  <span
                    className={clsx(
                      "inline-block py-0.5 px-2 rounded-badge text-[11px] font-semibold font-body",
                      row.member.role === "admin"
                        ? "bg-tl-accent text-white"
                        : "bg-tl-bg-alt text-tl-text-dim"
                    )}
                  >
                    {row.member.role === "admin" ? "Admin" : "Member"}
                  </span>
                </td>

                {/* Readiness % */}
                <td className="font-body text-[13px] py-2 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="min-w-[28px] text-right">
                      {row.readiness}%
                    </span>
                    <div
                      className={clsx(
                        "w-[60px] h-1 rounded-sm overflow-hidden shrink-0",
                        isSelected ? "bg-white/25" : "bg-tl-bg-alt"
                      )}
                    >
                      <div
                        className="h-full rounded-sm transition-[width] duration-300 ease-in-out"
                        style={{ width: `${row.readiness}%`, background: rColor }}
                      />
                    </div>
                  </div>
                </td>

                {/* Training */}
                <td className="font-body text-[13px] py-2 px-3 whitespace-nowrap">
                  {row.trainDone}/{row.trainTotal}
                </td>

                {/* Gear */}
                <td className="font-body text-[13px] py-2 px-3 whitespace-nowrap">
                  {row.gearDone}/{row.gearTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
