/**
 * ReadinessBarChart — lazy-loaded Recharts component.
 * ALL recharts imports live here — this file is only loaded via React.lazy on desktop.
 *
 * Shows crew member readiness % as a vertical bar chart, color-coded by threshold.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  name: string;
  overall: number;
  training: number;
  medical: number;
  admin: number;
  gear: number;
}

interface ReadinessBarChartProps {
  data: DataPoint[];
  isDark: boolean;
}

function barColor(value: number): string {
  if (value < 30) return "#CC3333";
  if (value < 70) return "#D4A017";
  return "#5B7A3A";
}

// Custom tooltip
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
      minWidth: 140,
    }}>
      <div style={{ fontWeight: 800, color: "#2C2416", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[
          { label: "Overall", value: d.overall, color: barColor(d.overall) },
          { label: "Training", value: d.training, color: "#5B7A3A" },
          { label: "Medical", value: d.medical, color: "#3A5A8A" },
          { label: "Gear", value: d.gear, color: "#C47A2A" },
          { label: "Admin", value: d.admin, color: "#7A4A8A" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "#6B5D4D" }}>{label}</span>
            <span style={{ fontWeight: 700, color }}>{value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReadinessBarChart({ data, isDark }: ReadinessBarChartProps) {
  const axisColor = isDark ? "#8B7365" : "#8B7D6B";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#EDE7DB";
  const bgColor = isDark ? "#2A2A1E" : "#FDFAF5";

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: axisColor, fontSize: 13 }}>
        No member data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickCount={6}
          tick={{ fontSize: 10, fill: axisColor, fontFamily: "'DM Sans', sans-serif" }}
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
        <ReferenceLine x={70} stroke="#5B7A3A" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "70%", position: "top", fontSize: 9, fill: "#5B7A3A", fontFamily: "'DM Sans', sans-serif" }} />
        <ReferenceLine x={30} stroke="#CC3333" strokeDasharray="4 3" strokeWidth={1} label={{ value: "30%", position: "top", fontSize: 9, fill: "#CC3333", fontFamily: "'DM Sans', sans-serif" }} />
        <Bar dataKey="overall" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell key={index} fill={barColor(entry.overall)} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
