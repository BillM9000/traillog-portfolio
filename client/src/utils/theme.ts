import type { CSSProperties } from "react";
import type { ThemeColors, TrailBadgeDef, JourneyWaypoint } from "../types";

// Font families — TrailLog brand
export const fontBody = "'DM Sans','Helvetica',sans-serif";
export const fontDisplay = "'Source Serif 4',Georgia,serif";

// Theme-aware style helpers
export const card = (t: ThemeColors): CSSProperties => ({
  background: t.bgCard,
  borderRadius: 14,
  padding: 16,
  marginBottom: 10,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadow,
});

export const cardTitle = (t: ThemeColors): CSSProperties => ({
  fontSize: 15,
  fontWeight: 800,
  color: t.heading,
  marginBottom: 8,
  fontFamily: fontDisplay,
});

export const badge = (t: ThemeColors, bg?: string): CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 600,
  background: bg || t.accentBg,
  color: t.text,
  marginRight: 3,
});

export const tag = (t: ThemeColors, bg?: string): CSSProperties => ({
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 600,
  background: bg || t.bgAlt,
  color: t.textMuted,
  marginRight: 3,
  marginBottom: 2,
});

export const toolbarBtn = (t: ThemeColors, variant?: string): CSSProperties => ({
  padding: "7px 14px",
  borderRadius: 8,
  border: `1.5px solid ${t.borderLight}`,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: fontBody,
  background: variant === "primary" ? t.forestDeep : variant === "danger" ? "#c0392b" : t.bgAlt,
  color: variant === "primary" || variant === "danger" ? "#fff" : t.textDim,
  transition: "all 0.2s ease",
});

// Member type badges
export const memberTypeBadge = (t: ThemeColors, type: string): CSSProperties => ({
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: 6,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.3,
  background: type === "adult" ? "#5B7A3A" : type === "scout" ? "#8B6E4E" : "#8B7D6B",
  color: "#fff",
  marginLeft: 4,
});

export const participationBadge = (t: ThemeColors, participation: string): CSSProperties => ({
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: 6,
  fontSize: 9,
  fontWeight: 600,
  background: participation === "support" ? "#8a6d3b" : "transparent",
  color: participation === "support" ? "#fff" : t.textMuted,
  border: participation === "support" ? "none" : `1px solid ${t.borderLight}`,
  marginLeft: 4,
});

// Trail badge definitions
export const TRAIL_BADGES: Record<string, TrailBadgeDef> = {
  gear_ready: { icon: "\u{1F392}", title: "Gear Ready" },
  trail_medic: { icon: "\u{1F3E5}", title: "Trail Medic" },
  admin_pro: { icon: "\u{1F4CB}", title: "Admin Pro" },
  training_complete: { icon: "\u{1F97E}", title: "Training Complete" },
  ai_ready: { icon: "\u{1F916}", title: "AI Ready" },
  ai_gear: { icon: "\u{1F6CD}\uFE0F", title: "AI Gear Scout" },
  fully_prepared: { icon: "\u2B50", title: "Fully Prepared" },
};

// Crew journey milestones with Scout Law values
export const JOURNEY_WAYPOINTS: JourneyWaypoint[] = [
  { pct: 0, name: "Trailhead", message: "The journey begins \u2014 every step counts" },
  { pct: 25, name: "Base Camp", message: "A Scout is Trustworthy \u2014 your crew is building a foundation" },
  { pct: 50, name: "Timber Ridge", message: "A Scout is Prepared \u2014 halfway to the summit" },
  { pct: 75, name: "Eagle Point", message: "A Scout is Brave \u2014 the peak is in sight" },
  { pct: 100, name: "Summit!", message: "A Scout is Cheerful \u2014 your crew is ready for adventure!" },
];

// ProgressRing and MiniBar components are in components/ProgressWidgets.jsx
