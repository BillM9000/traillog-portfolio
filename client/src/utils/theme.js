// Font families
export const fontBody = "'Instrument Sans','DM Sans',system-ui,sans-serif";
export const fontDisplay = "'Playfair Display',Georgia,serif";

// Theme-aware style helpers
export const card = (t) => ({
  background: t.bgCard,
  borderRadius: 9,
  padding: 12,
  marginBottom: 8,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadow,
});

export const cardTitle = (t) => ({
  fontSize: 13,
  fontWeight: 700,
  color: t.heading,
  marginBottom: 7,
  fontFamily: fontDisplay,
});

export const badge = (t, bg) => ({
  display: "inline-block",
  padding: "2px 7px",
  borderRadius: 9,
  fontSize: 10,
  fontWeight: 600,
  background: bg || t.accentBg,
  color: t.text,
  marginRight: 3,
});

export const tag = (t, bg) => ({
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 9,
  fontWeight: 600,
  background: bg || t.bgAlt,
  color: t.textMuted,
  marginRight: 2,
  marginBottom: 2,
});

export const toolbarBtn = (t, variant) => ({
  padding: "4px 9px",
  borderRadius: 5,
  border: `1px solid ${t.borderLight}`,
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: fontBody,
  background: variant === "primary" ? t.accent : variant === "danger" ? "#c0392b" : t.bgAlt,
  color: variant === "primary" || variant === "danger" ? "#fff" : t.textDim,
});

// Member type badges
export const memberTypeBadge = (t, type) => ({
  display: "inline-block",
  padding: "1px 5px",
  borderRadius: 4,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.3,
  background: type === "adult" ? "#3a6fa0" : "#4a7a55",
  color: "#fff",
  marginLeft: 3,
});

export const participationBadge = (t, participation) => ({
  display: "inline-block",
  padding: "1px 5px",
  borderRadius: 4,
  fontSize: 9,
  fontWeight: 600,
  background: participation === "support" ? "#8a6d3b" : "transparent",
  color: participation === "support" ? "#fff" : t.textMuted,
  border: participation === "support" ? "none" : `1px solid ${t.borderLight}`,
  marginLeft: 3,
});

// Trail badge definitions
export const TRAIL_BADGES = {
  gear_ready: { icon: "🎒", title: "Gear Ready" },
  trail_medic: { icon: "🏥", title: "Trail Medic" },
  admin_pro: { icon: "📋", title: "Admin Pro" },
  training_complete: { icon: "🥾", title: "Training Complete" },
  fully_prepared: { icon: "⭐", title: "Fully Prepared" },
};

// Crew journey milestones with Scout Law values
export const JOURNEY_WAYPOINTS = [
  { pct: 0, name: "Trailhead", message: "The journey begins — every step counts" },
  { pct: 25, name: "Base Camp", message: "A Scout is Trustworthy — your crew is building a foundation" },
  { pct: 50, name: "Timber Ridge", message: "A Scout is Prepared — halfway to the summit" },
  { pct: 75, name: "Eagle Point", message: "A Scout is Brave — the peak is in sight" },
  { pct: 100, name: "Summit!", message: "A Scout is Cheerful — your crew is ready for adventure!" },
];
