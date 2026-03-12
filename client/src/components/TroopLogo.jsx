import { useState } from "react";
import { fontDisplay } from "../utils/theme";

// Deterministic color from troop name
function nameColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#5B7A3A", "#3A6B5B", "#6B5A3A", "#3A5B7A", "#7A5A3A", "#5A3A6B", "#6B3A5A", "#3A7A5B"];
  return colors[Math.abs(hash) % colors.length];
}

export default function TroopLogo({ troopId, name, size = 40, theme }) {
  const [err, setErr] = useState(false);
  const radius = size <= 48 ? 6 : 10;

  if (!err && troopId) {
    return (
      <img
        src={`/api/troops/${troopId}/logo`}
        alt={name || "Logo"}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "contain", flexShrink: 0, background: theme?.bgAlt || "transparent" }}
        onError={() => setErr(true)}
      />
    );
  }

  // Fallback: colored circle with first letter
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: nameColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, fontWeight: 800, color: "#FDFAF5",
      fontFamily: fontDisplay,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}
