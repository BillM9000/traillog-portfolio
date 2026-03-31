/**
 * GearCompletionChart — lazy-loaded Recharts component.
 * ALL recharts imports live here — only loaded via React.lazy on desktop.
 *
 * Horizontal bar chart: gear completion % per member.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  name: string;
  pct: number;
  owned: number;
  total: number;
}

interface GearCompletionChartProps {
  data: DataPoint[];
  isDark: boolean;
}

function barColor(value: number): string {
  if (value < 30) return "#CC3333";
  if (value < 70) return "#D4A017";
  return "#C47A2A";  // amber — gear category color
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DataPoint;
  return (
    <div style={{
      background: "#FDFAF5",
      border: "1px solid #DDD6C8",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontWeight: 800, color: "#2C2416", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#6B5D4D" }}>{d.owned} / {d.total} items</div>
      <div style={{ fontWeight: 700, color: barColor(d.pct), marginTop: 2 }}>{d.pct}% complete</div>
    </div>
  );
}

export default function GearCompletionChart({ data, isDark }: GearCompletionChartProps) {
  const axisColor = isDark ? "#8B7365" : "#8B7D6B";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#EDE7DB";

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: axisColor, fontSize: 13 }}>
        No gear data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickCount={6}
          tick={{ fontSize: 10, fill: axisColor, fontFamily: "'DM Sans', sans-serif" }}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 12, fill: axisColor, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
        <ReferenceLine x={70} stroke="#C47A2A" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "70%", position: "top", fontSize: 9, fill: "#C47A2A", fontFamily: "'DM Sans', sans-serif" }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell key={index} fill={barColor(entry.pct)} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
