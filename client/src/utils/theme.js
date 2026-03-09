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
  background: variant === "primary" ? t.accent : t.bgAlt,
  color: variant === "primary" ? "#fff" : t.textDim,
});
