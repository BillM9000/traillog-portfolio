import { useMemo } from "react";
import { Users, ClipboardCheck, Backpack, CalendarCheck } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { computeCrewReadiness } from "../../utils/readiness";
import { fontBody, fontDisplay } from "../../utils/theme";
import type { AdventureMember, Skill, GearCatalogItem, MemberGearItem, Adventure, TrekDates } from "../../types";

interface DashboardOverviewProps {
  members: AdventureMember[];
  skills: Skill[];
  gearCatalog: GearCatalogItem[];
  memberGearMap: Record<number, MemberGearItem[]>;
  adventure: Adventure | null;
  trekDates: TrekDates | null;
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

  const statCards = [
    {
      icon: Users,
      label: "Members",
      value: `${trekkingCount} / ${members.length}`,
    },
    {
      icon: ClipboardCheck,
      label: "Readiness",
      value: `${readiness.overall}%`,
    },
    {
      icon: Backpack,
      label: "Gear",
      value: `${avgGearPct}%`,
    },
    {
      icon: CalendarCheck,
      label: "Training",
      value: `${completedTrainingCount} / ${totalTrainingItems}`,
    },
  ];

  const readinessBreakdown = [
    { label: "Training", value: readiness.training, color: theme.accent },
    { label: "Gear", value: readiness.gear, color: theme.gold },
    { label: "Medical", value: readiness.medical, color: theme.urgency },
    { label: "Admin", value: readiness.admin, color: theme.forestMid },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Stat cards row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              boxShadow: theme.shadow,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <card.icon size={16} color={theme.accent} strokeWidth={1.8} />
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: theme.textDim,
                }}
              >
                {card.label}
              </span>
            </div>
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 20,
                fontWeight: 700,
                color: theme.text,
                lineHeight: 1.2,
              }}
            >
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Readiness breakdown bars */}
      <div
        style={{
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          boxShadow: theme.shadow,
          padding: "12px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {readinessBreakdown.map((item) => (
          <div key={item.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: theme.textDim,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                }}
              >
                {item.value}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: theme.progressBg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${item.value}%`,
                  borderRadius: 2,
                  background: item.color,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
