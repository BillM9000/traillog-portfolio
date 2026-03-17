// Reusable progress visualization components

export function ProgressRing({ percent, size = 80, stroke = 6, color, bgColor }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor || "#DDD6C8"} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || "#5B7A3A"} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

export function MiniBar({ percent, color, bgColor }) {
  const barColor = color || (percent < 30 ? "#C47A2A" : "#5B7A3A");
  return (
    <div style={{ width: "100%", height: 6, background: bgColor || "#DDD6C8", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, percent))}%`, height: "100%", background: barColor, borderRadius: 3,
        transition: "width 0.8s ease",
      }} />
    </div>
  );
}
