import { useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { computeMemberReadiness } from "../utils/readiness";
import { fontBody, fontDisplay } from "../utils/theme";
import { Heart, Backpack, ClipboardCheck, Shield, Calendar, ChevronRight } from "lucide-react";

/**
 * Parent Dashboard — dedicated view for parents to track linked scouts' progress.
 * Shows readiness breakdown, gear progress, and upcoming events per scout.
 */
export default function ParentDashboard({ linkedScouts, onViewScout }) {
  const { theme, mode } = useTheme();
  const { members, skills, gearCatalog, memberGearMap } = useAdventure();

  // Resolve scout objects from members list
  const scouts = useMemo(() => {
    if (!linkedScouts || linkedScouts.length === 0) return [];
    return linkedScouts.map(sid => {
      // Positive = user_id, negative = manual member id
      if (sid > 0) return members.find(m => m.user_id === sid);
      return members.find(m => m.is_manual && m.id === Math.abs(sid));
    }).filter(Boolean);
  }, [linkedScouts, members]);

  if (scouts.length === 0) return null;

  return (
    <div style={{ padding: "0 16px", marginBottom: 16 }}>
      <div style={{
        background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
        padding: "18px 20px", boxShadow: theme.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Heart size={16} color={theme.accent} />
          <span style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>
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

function ScoutCard({ scout, skills, gearCatalog, memberGearMap, theme, mode, onViewScout, members }) {
  const readiness = useMemo(() => {
    const trainingSkills = skills.filter(s => s.category === "training");
    const medicalSkills = skills.filter(s => s.category === "medical");
    const adminSkills = skills.filter(s => s.category === "admin");

    const pct = (items, field) => {
      if (items.length === 0) return null;
      const done = (scout[field] || []).filter(id => items.some(s => s.id === id)).length;
      return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
    };

    const training = pct(trainingSkills, "skills");
    const medical = pct(medicalSkills, "medical");
    const admin = pct(adminSkills, "admin_tasks");

    const gearItems = memberGearMap[scout.user_id] || [];
    const gearOwned = gearItems.filter(g => g.status === "owned" || g.status === "packed").length;
    const gearPacked = gearItems.filter(g => g.status === "packed").length;
    const gear = {
      done: gearOwned, packed: gearPacked, total: gearCatalog.length,
      pct: gearCatalog.length > 0 ? Math.round((gearOwned / gearCatalog.length) * 100) : 0,
    };

    const overall = computeMemberReadiness(scout, skills, gearCatalog, memberGearMap);

    return { training, medical, admin, gear, overall };
  }, [scout, skills, gearCatalog, memberGearMap]);

  const datesCount = (scout.dates || []).length;
  const avatarBg = scout.user_type === "adult" ? "#5B7A3A" : "#8B6E4E";

  const categories = [
    { key: "training", label: "Training", icon: ClipboardCheck, data: readiness.training, color: "#4CAF50" },
    { key: "gear", label: "Gear", icon: Backpack, data: readiness.gear, color: "#FF9800" },
    { key: "medical", label: "Medical", icon: Shield, data: readiness.medical, color: "#2196F3" },
    { key: "admin", label: "Admin", icon: ClipboardCheck, data: readiness.admin, color: "#9C27B0" },
  ];

  const scoutIdx = members.indexOf(scout);

  return (
    <div style={{
      background: mode === "dark" ? "#2A2E24" : "#FAFAF5", borderRadius: 14,
      border: `1px solid ${theme.borderLight}`, padding: "14px 16px", marginBottom: 10,
    }}>
      {/* Scout header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {scout.avatar_url ? (
          <img src={scout.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, background: avatarBg, color: "#FDFAF5", fontFamily: fontDisplay,
          }}>
            {(scout.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>
            {scout.name}
          </div>
          <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>
            {scout.is_manual ? "Scout" : (scout.user_type === "adult" ? "Adult" : "Scout")}
            {datesCount > 0 && ` · ${datesCount} date${datesCount === 1 ? "" : "s"} marked`}
          </div>
        </div>
        {/* Overall readiness ring */}
        <div style={{ position: "relative", width: 44, height: 44 }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke={theme.border} strokeWidth="3" />
            <circle cx="22" cy="22" r="18" fill="none"
              stroke={readiness.overall > 50 ? theme.accent : "#E57373"}
              strokeWidth="3" strokeDasharray={`${readiness.overall * 1.131} 113.1`}
              strokeLinecap="round" transform="rotate(-90 22 22)" />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay,
          }}>
            {readiness.overall}%
          </div>
        </div>
      </div>

      {/* Category progress bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {categories.map(({ key, label, icon: Icon, data, color }) => {
          if (!data || data.pct === undefined) return null;
          return (
            <div key={key} style={{
              background: mode === "dark" ? "#1E2218" : "#fff", borderRadius: 10,
              padding: "8px 10px", border: `1px solid ${theme.borderLight}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Icon size={11} color={color} strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {label}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDimmer, marginLeft: "auto" }}>
                  {data.done}/{data.total}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3, background: color,
                  width: `${data.pct}%`, transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick stats row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: theme.textDim,
          background: mode === "dark" ? "#1E2218" : "#fff", borderRadius: 8, padding: "4px 10px",
          border: `1px solid ${theme.borderLight}`,
        }}>
          <Calendar size={11} color={theme.accent} />
          <span>{datesCount} date{datesCount === 1 ? "" : "s"}</span>
        </div>
        {readiness.gear && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: theme.textDim,
            background: mode === "dark" ? "#1E2218" : "#fff", borderRadius: 8, padding: "4px 10px",
            border: `1px solid ${theme.borderLight}`,
          }}>
            <Backpack size={11} color="#FF9800" />
            <span>{readiness.gear.packed} packed</span>
          </div>
        )}
        {scoutIdx >= 0 && onViewScout && (
          <button onClick={() => onViewScout(scoutIdx)} style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 600, color: theme.accent, background: "none",
            border: "none", cursor: "pointer", fontFamily: fontBody, padding: "4px 6px",
          }}>
            View Details <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
