import { parseDateKey } from "../utils/dates";
import { formatDateShort, formatDateFull } from "../utils/dates";
import { useTheme } from "../contexts/ThemeContext";
import { card, cardTitle, badge, tag } from "../utils/theme";

export default function Results({ members, analysis }) {
  const { theme } = useTheme();

  if (members.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: 28, background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📊</div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>Need at least 2 members with availability to show analysis.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Individual Dates */}
      <div style={card(theme)}>
        <div style={cardTitle(theme)}>Top Individual Dates</div>
        {analysis.bestDates.length === 0 && <div style={{ fontSize: 12, color: theme.textDimmer }}>No overlap yet.</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {analysis.bestDates.map(d => (
            <div key={d.key} style={{
              padding: "5px 9px", borderRadius: 6, fontSize: 11,
              background: d.count === members.length ? theme.accentBg : theme.bgAlt,
              border: d.count === members.length ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
            }}>
              <div style={{ fontWeight: 700, color: d.count === members.length ? theme.accentLight : theme.text }}>
                {formatDateShort(d.key)} <span style={{ fontWeight: 400, color: theme.textDimmer }}>({d.dayName})</span>
              </div>
              <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1 }}>
                {d.count}/{members.length} — {d.names.join(", ")}
                {d.missing.length > 0 && <span style={{ color: theme.warn }}> (w/o {d.missing.join(", ")})</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Windows */}
      <div style={{ ...cardTitle(theme), marginTop: 14, marginBottom: 6 }}>Recommended Training Windows</div>
      {analysis.windows.length === 0 && <div style={{ ...card(theme), fontSize: 12, color: theme.textDimmer }}>No windows yet.</div>}
      {analysis.windows.map((w, i) => (
        <div key={i} style={{
          background: i === 0 ? theme.accentBg : theme.bgCard, borderRadius: 9, padding: 12, marginBottom: 6,
          border: i === 0 ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={badge(theme, w.pct === 100 ? "#3d6a45" : w.pct >= 70 ? "#5a7a3d" : "#7a6a30")}>{w.pct}% crew</span>
              <span style={badge(theme, theme.bgAlt)}>{w.length}d</span>
              {i === 0 && <span style={badge(theme, "#6a4a20")}>Top Pick</span>}
            </div>
            <span style={{ fontSize: 10, color: theme.textDimmest }}>{w.suggestion}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading, margin: "6px 0 2px" }}>
            {formatDateFull(w.start)}{w.start !== w.end ? ` → ${formatDateFull(w.end)}` : ""}
          </div>
          <div style={{ height: 3, borderRadius: 2, background: theme.progressBg, overflow: "hidden", margin: "4px 0" }}>
            <div style={{ height: "100%", width: `${w.pct}%`, background: w.pct === 100 ? theme.heatFull : w.pct >= 70 ? "#7aaa55" : "#aa8a44", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 11, color: theme.textDim }}>
            {w.consistentNames.join(", ")}
            {w.missing.length > 0 && <span> &nbsp; <span style={{ color: "#b08070" }}>{w.missing.join(", ")}</span></span>}
          </div>
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 3 }}>
            {w.length === 1 && (
              <>
                <span style={tag(theme)}>Day hike</span>
                {w.pct === 100 && <span style={tag(theme)}>Skills session</span>}
                {w.dates[0] && (parseDateKey(w.dates[0].key).getDay() === 0 || parseDateKey(w.dates[0].key).getDay() === 6) && <span style={tag(theme)}>Map & compass</span>}
              </>
            )}
            {w.length === 2 && (
              <>
                <span style={tag(theme)}>Overnight shakedown</span>
                <span style={tag(theme)}>Loaded hike</span>
                <span style={tag(theme)}>Bear bag drill</span>
              </>
            )}
            {w.length >= 3 && w.length < 5 && (
              <>
                <span style={tag(theme)}>Extended backpacking</span>
                <span style={tag(theme)}>Loaded hike</span>
                <span style={tag(theme, theme.warnBg)}>Dry camp water drill</span>
                <span style={tag(theme)}>Bear bag drill</span>
              </>
            )}
            {w.length >= 5 && (
              <>
                <span style={tag(theme, theme.warnBg)}>Multi-night trek</span>
                <span style={tag(theme)}>Full shakedown</span>
                <span style={tag(theme, theme.warnBg)}>Dry camp water drill</span>
                <span style={tag(theme)}>Navigation practice</span>
                <span style={tag(theme)}>Camp cooking</span>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Member Summary */}
      <div style={{ ...card(theme), marginTop: 14 }}>
        <div style={cardTitle(theme)}>Member Summary</div>
        {members.map((m, i) => {
          const fc = m.dates.filter(d => parseDateKey(d) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderBottom: i < members.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color.bg }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, flex: 1 }}>{m.name}</span>
              <span style={{ fontSize: 11, color: theme.textDim }}>{fc}d avail</span>
              <div style={{ width: 50, height: 3, borderRadius: 2, background: theme.progressBg, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, fc * 1.5)}%`, background: m.color.bg, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
