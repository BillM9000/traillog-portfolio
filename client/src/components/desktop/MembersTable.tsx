import React, { useState, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { fontBody } from "../../utils/theme";
import { computeMemberReadiness } from "../../utils/readiness";
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
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const headerStyle: React.CSSProperties = {
    fontFamily: fontBody,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: theme.textDim,
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: `1px solid ${theme.border}`,
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const cellStyle: React.CSSProperties = {
    fontFamily: fontBody,
    fontSize: 13,
    fontWeight: 400,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        background: theme.bgCard,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        boxShadow: theme.shadow,
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto",
        }}
      >
        <thead>
          <tr>
            <th style={headerStyle} onClick={() => handleSort("name")}>
              Name{arrow("name")}
            </th>
            <th style={headerStyle} onClick={() => handleSort("role")}>
              Role{arrow("role")}
            </th>
            <th style={headerStyle} onClick={() => handleSort("readiness")}>
              Readiness %{arrow("readiness")}
            </th>
            <th style={headerStyle} onClick={() => handleSort("training")}>
              Training{arrow("training")}
            </th>
            <th style={headerStyle} onClick={() => handleSort("gear")}>
              Gear{arrow("gear")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isSelected = active === row.origIdx;
            const isHovered = hoveredIdx === row.origIdx;
            const isCurrentUser = row.member.user_id === currentUserId;
            const rColor = readinessColor(row.readiness);

            let rowBg = "transparent";
            let rowColor = theme.text;
            if (isSelected) {
              rowBg = theme.selectedBg;
              rowColor = theme.selectedText;
            } else if (isHovered) {
              rowBg = theme.bgAlt;
            }

            return (
              <tr
                key={row.member.id}
                onClick={() =>
                  setActive(isSelected ? null : row.origIdx)
                }
                onMouseEnter={() => setHoveredIdx(row.origIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(isSelected ? null : row.origIdx);
                  }
                }}
                style={{
                  height: 38,
                  background: rowBg,
                  color: rowColor,
                  cursor: "pointer",
                  borderBottom: `1px solid ${theme.border}`,
                  transition: "background 150ms ease",
                  outline: "none",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.outline = `2px solid ${theme.accent}`;
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.outline = "none";
                }}
              >
                {/* Name */}
                <td style={cellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: theme.memberDot,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: isCurrentUser ? 700 : 400,
                      }}
                    >
                      {row.member.name}
                    </span>
                  </div>
                </td>

                {/* Role */}
                <td style={cellStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: fontBody,
                      background:
                        row.member.role === "admin"
                          ? theme.accent
                          : theme.bgAlt,
                      color:
                        row.member.role === "admin"
                          ? "#fff"
                          : theme.textDim,
                    }}
                  >
                    {row.member.role === "admin" ? "Admin" : "Member"}
                  </span>
                </td>

                {/* Readiness % */}
                <td style={cellStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ minWidth: 28, textAlign: "right" }}>
                      {row.readiness}%
                    </span>
                    <div
                      style={{
                        width: 60,
                        height: 4,
                        borderRadius: 2,
                        background: isSelected
                          ? "rgba(255,255,255,0.25)"
                          : theme.bgAlt,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: `${row.readiness}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: rColor,
                          transition: "width 300ms ease",
                        }}
                      />
                    </div>
                  </div>
                </td>

                {/* Training */}
                <td style={cellStyle}>
                  {row.trainDone}/{row.trainTotal}
                </td>

                {/* Gear */}
                <td style={cellStyle}>
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
