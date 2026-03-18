import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";

interface CategoryData {
  count: number;
  weight_oz: number;
}

interface WeightData {
  item_count: number;
  grand_total_lbs: number;
  philmont_limit_lbs: number;
  over_limit: boolean;
  base_weight_lbs: number;
  food_estimate_lbs: number;
  water_lbs: number;
  trek_days: number;
  crew_buddy_count: number;
  provided_count: number;
  by_category: Record<string, CategoryData>;
}

interface Props {
  adventureId: number;
  userId: number;
  memberName?: string;
}

export default function PackWeightWidget({ adventureId, userId, memberName }: Props): React.JSX.Element | null {
  const { theme } = useTheme();
  const [weight, setWeight] = useState<WeightData | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!adventureId || !userId) return;
    api.getMemberPackWeight(adventureId, userId).then(setWeight).catch(console.error);
  }, [adventureId, userId]);

  if (!weight || weight.item_count === 0) return null;

  const pct = Math.min(100, Math.round((weight.grand_total_lbs / weight.philmont_limit_lbs) * 100));
  const barColor = weight.over_limit ? "#DC2626" : pct > 80 ? "#F59E0B" : theme.accent;

  return (
    <div className="tl-card cursor-pointer" onClick={() => setShowBreakdown(!showBreakdown)}>
      <div className="flex justify-between items-center mb-1.5">
        <div className="tl-card-title">&#x2696;&#xFE0F; Pack Weight</div>
        <div className="text-right">
          <span className="text-lg font-extrabold font-display" style={{ color: barColor }}>
            {weight.grand_total_lbs}
          </span>
          <span className="text-[11px] text-tl-text-dimmer"> / {weight.philmont_limit_lbs} lbs</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded bg-tl-progress-bg overflow-hidden mb-1.5">
        <div className="h-full rounded transition-[width] duration-400 ease-in-out"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {/* Summary row */}
      <div className="flex gap-2.5 text-[10px] text-tl-text-muted mb-1 flex-wrap">
        <span>Personal gear: <strong className="text-tl-text">{weight.base_weight_lbs} lbs</strong></span>
        <span>+Food: <strong className="text-tl-text">{weight.food_estimate_lbs} lbs</strong> <span className="text-tl-text-dimmer">({weight.trek_days}d)</span></span>
        <span>+Water: <strong className="text-tl-text">{weight.water_lbs} lbs</strong> <span className="text-tl-text-dimmer">(3L)</span></span>
      </div>
      {(weight.crew_buddy_count > 0 || weight.provided_count > 0) && (
        <div className="text-[9px] text-tl-text-dimmer mb-1 italic">
          {weight.crew_buddy_count > 0 && <span>{weight.crew_buddy_count} crew/buddy items packed (weight split on trail) </span>}
          {weight.provided_count > 0 && <span>&middot; {weight.provided_count} Philmont-provided items</span>}
        </div>
      )}

      {weight.over_limit && (
        <div className="text-[10px] text-[#DC2626] font-semibold mb-1">
          &#x26A0;&#xFE0F; Over Philmont's recommended {weight.philmont_limit_lbs} lb limit — consider lighter options
        </div>
      )}

      <div className="text-[9px] text-tl-text-dimmest cursor-pointer">
        {showBreakdown ? "\u25B2 Hide breakdown" : "\u25BC Show category breakdown"} &middot; {weight.item_count} items tracked
      </div>

      {/* Category breakdown */}
      {showBreakdown && (
        <div className="mt-2 pt-1.5 border-t border-tl-border-light">
          {Object.entries(weight.by_category).sort((a, b) => b[1].weight_oz - a[1].weight_oz).map(([cat, data]) => (
            <div key={cat} className="flex justify-between items-center py-[3px] text-[10px]">
              <span className="text-tl-text-muted">{cat}</span>
              <div className="flex gap-2 items-center">
                <span className="text-tl-text-dimmer">{data.count} items</span>
                <span className="font-bold text-tl-text w-[60px] text-right">
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
