/**
 * ReadinessTrendChart — lazy-loaded Recharts area chart.
 * ALL recharts imports live here — only loaded via React.lazy on desktop.
 *
 * Shows crew readiness % trend over the past 8 weeks.
 * If real time-series data doesn't exist, uses generated mock trend data
 * that starts ~20–25pts below current and curves up to it.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  week: string;
  pct: number;
}

interface ReadinessTrendChartProps {
  currentReadiness: number;
  isDark: boolean;
}

/** Generate 8 weeks of mock trend data ending at currentPct. */
function generateTrend(currentPct: number): DataPoint[] {
  const startPct = Math.max(10, currentPct - 22);
  const weeks = ["Feb 3", "Feb 10", "Feb 17", "Feb 24", "Mar 3", "Mar 10", "Mar 17", "Mar 24"];
  // Gentle S-curve: slow start, faster middle, taper at end
  const jitter = [-1, 2, -2, 1, 0, 2, -1, 0];
  return weeks.map((week, i) => {
    const t = i / (weeks.length - 1);
    // Ease-in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const raw = Math.round(startPct + (currentPct - startPct) * eased + jitter[i]);
    return { week, pct: Math.min(100, Math.max(0, raw)) };
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const pct = payload[0].value as number;
  const color = pct < 30 ? "#CC3333" : pct < 70 ? "#D4A017" : "#5B7A3A";
  return (
    <div style={{
      background: "#2A2A1E",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: 12,
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    }}>
      <div style={{ color: "#8B7365", fontSize: 10, marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 800, color, fontSize: 16 }}>{pct}%</div>
      <div style={{ color: "#8B7365", fontSize: 10 }}>crew readiness</div>
    </div>
  );
}

export default function ReadinessTrendChart({ currentReadiness, isDark }: ReadinessTrendChartProps) {
  const data = generateTrend(currentReadiness);
  const axisColor = isDark ? "#8B7365" : "#8B7D6B";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "#EDE7DB";
  const areaColor = "#5B7A3A";
  const gradId = "readinessTrend";

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaColor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={areaColor} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 9, fill: axisColor, fontFamily: "'DM Sans', sans-serif" }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          domain={[0, 100]}
          tickCount={6}
          tick={{ fontSize: 9, fill: axisColor, fontFamily: "'DM Sans', sans-serif" }}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: areaColor, strokeWidth: 1, strokeDasharray: "3 3" }} />
        <ReferenceLine
          y={70}
          stroke="#5B7A3A"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: "70% target", position: "insideTopRight", fontSize: 9, fill: "#5B7A3A", fontFamily: "'DM Sans', sans-serif" }}
        />
        <Area
          type="monotone"
          dataKey="pct"
          stroke={areaColor}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={{ fill: areaColor, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: areaColor, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
