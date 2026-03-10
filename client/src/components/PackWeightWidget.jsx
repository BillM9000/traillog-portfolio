import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";

export default function PackWeightWidget({ adventureId, userId, memberName }) {
  const { theme } = useTheme();
  const [weight, setWeight] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!adventureId || !userId) return;
    api.getMemberPackWeight(adventureId, userId).then(setWeight).catch(console.error);
  }, [adventureId, userId]);

  if (!weight || weight.item_count === 0) return null;

  const pct = Math.min(100, Math.round((weight.grand_total_lbs / weight.philmont_limit_lbs) * 100));
  const barColor = weight.over_limit ? "#DC2626" : pct > 80 ? "#F59E0B" : theme.accent;

  return (
    <div style={card(theme)} onClick={() => setShowBreakdown(!showBreakdown)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={cardTitle(theme)}>⚖️ Pack Weight</div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: barColor, fontFamily: fontDisplay }}>
            {weight.grand_total_lbs}
          </span>
          <span style={{ fontSize: 11, color: theme.textDimmer }}> / {weight.philmont_limit_lbs} lbs</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: theme.progressBg, overflow: "hidden", marginBottom: 6 }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 4, background: barColor,
          transition: "width .4s ease",
        }} />
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 10, fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>
        <span>Base: <strong style={{ color: theme.text }}>{weight.base_weight_lbs} lbs</strong></span>
        <span>+Food: <strong style={{ color: theme.text }}>{weight.food_estimate_lbs} lbs</strong></span>
        <span>+Water: <strong style={{ color: theme.text }}>{weight.water_lbs} lbs</strong></span>
      </div>

      {weight.over_limit && (
        <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 600, marginBottom: 4 }}>
          ⚠️ Over Philmont's recommended {weight.philmont_limit_lbs} lb limit — consider lighter options
        </div>
      )}

      <div style={{ fontSize: 9, color: theme.textDimmest, cursor: "pointer" }}>
        {showBreakdown ? "▲ Hide breakdown" : "▼ Show category breakdown"} · {weight.item_count} items tracked
      </div>

      {/* Category breakdown */}
      {showBreakdown && (
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.borderLight}` }}>
          {Object.entries(weight.by_category).sort((a, b) => b[1].weight_oz - a[1].weight_oz).map(([cat, data]) => (
            <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 10 }}>
              <span style={{ color: theme.textMuted }}>{cat}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: theme.textDimmer }}>{data.count} items</span>
                <span style={{ fontWeight: 700, color: theme.text, width: 60, textAlign: "right" }}>
                  {(data.weight_oz / 16).toFixed(1)} lbs
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
