import React, { useState } from "react";
import type { ThemeColors } from "../types";

// Deterministic color from troop name
function nameColor(name: string | undefined): string {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name!.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#5B7A3A", "#3A6B5B", "#6B5A3A", "#3A5B7A", "#7A5A3A", "#5A3A6B", "#6B3A5A", "#3A7A5B"];
  return colors[Math.abs(hash) % colors.length];
}

interface Props {
  troopId?: number;
  name?: string;
  size?: number;
  theme?: Partial<ThemeColors>;
}

export default function TroopLogo({ troopId, name, size = 40, theme }: Props): React.JSX.Element {
  const [err, setErr] = useState(false);
  const radius = size <= 48 ? 6 : 10;

  if (!err && troopId) {
    return (
      <img
        src={`/api/troops/${troopId}/logo`}
        alt={name || "Logo"}
        className="shrink-0 object-contain"
        style={{ width: size, height: size, borderRadius: radius, background: theme?.bgAlt || "transparent" }}
        onError={() => setErr(true)}
      />
    );
  }

  // Fallback: colored circle with first letter
  return (
    <div className="shrink-0 flex items-center justify-center font-extrabold text-[#FDFAF5] font-display"
      style={{
        width: size, height: size, borderRadius: radius,
        background: nameColor(name),
        fontSize: size * 0.45,
      }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}
