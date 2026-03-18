// Reusable progress visualization components
import React from "react";

interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  bgColor?: string;
}

export function ProgressRing({ percent, size = 80, stroke = 6, color, bgColor }: ProgressRingProps): React.JSX.Element {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor || "#DDD6C8"} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || "#5B7A3A"} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-1000 ease-in-out" />
    </svg>
  );
}

interface MiniBarProps {
  percent: number;
  color?: string;
  bgColor?: string;
}

export function MiniBar({ percent, color, bgColor }: MiniBarProps): React.JSX.Element {
  const barColor = color || (percent < 30 ? "#C47A2A" : "#5B7A3A");
  return (
    <div className="w-full h-1.5 rounded-sm overflow-hidden" style={{ background: bgColor || "#DDD6C8" }}>
      <div className="h-full rounded-sm transition-[width] duration-800 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: barColor }} />
    </div>
  );
}
