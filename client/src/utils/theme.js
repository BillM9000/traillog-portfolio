// Font families
export const fontBody = "'Instrument Sans','DM Sans',system-ui,sans-serif";
export const fontDisplay = "'Playfair Display',Georgia,serif";

// Style helpers
export const card = {
  background: "#232e27",
  borderRadius: 9,
  padding: 12,
  marginBottom: 8,
  border: "1px solid #2a332c",
};

export const cardTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#d4c8a8",
  marginBottom: 7,
  fontFamily: fontDisplay,
};

export const badge = (bg) => ({
  display: "inline-block",
  padding: "2px 7px",
  borderRadius: 9,
  fontSize: 10,
  fontWeight: 600,
  background: bg || "#3d5a45",
  color: "#e8e4df",
  marginRight: 3,
});

export const tag = (bg) => ({
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 9,
  fontWeight: 600,
  background: bg || "#2a332c",
  color: "#b0c0b0",
  marginRight: 2,
  marginBottom: 2,
});

export const toolbarBtn = (variant) => ({
  padding: "4px 9px",
  borderRadius: 5,
  border: "1px solid #3d4a40",
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: fontBody,
  background: variant === "primary" ? "#3d5a45" : "#252e28",
  color: variant === "primary" ? "#c0d8c0" : "#6a7a6a",
});
