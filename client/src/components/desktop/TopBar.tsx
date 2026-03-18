import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useCountdown } from "../../hooks/useCountdown";
import { fontBody, fontDisplay } from "../../utils/theme";
import type { User, TrekDates } from "../../types";

interface TopBarProps {
  user: User;
  sectionTitle: string;
  adventureName: string | null;
  trekDates: TrekDates | null;
  trekDate: Date | string | null;
  saving: boolean;
  onViewProfile: () => void;
}

export default function TopBar({ user, sectionTitle, adventureName, trekDates, trekDate, saving, onViewProfile }: TopBarProps) {
  const { theme, mode, toggle } = useTheme();
  const countdown = useCountdown(trekDates || trekDate);

  // Countdown badge — compact "86d" format with urgency colors
  const countdownDays = countdown?.days ?? null;
  let countdownColor = theme.accent; // green >60d
  let countdownLabel = "";
  if (countdownDays !== null && !countdown?.gone) {
    if (countdownDays < 14) countdownColor = theme.danger;
    else if (countdownDays < 30) countdownColor = theme.urgency;
    else if (countdownDays <= 60) countdownColor = theme.gold;
    countdownLabel = `${countdownDays}d`;
  } else if (countdown?.onTrek) {
    countdownColor = theme.accent;
    countdownLabel = "On Trek";
  }

  return (
    <div style={{
      height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", borderBottom: `1px solid ${theme.border}`,
      background: theme.bg, flexShrink: 0,
    }}>
      {/* Left: section title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{
          fontFamily: fontDisplay, fontSize: 18, fontWeight: 700,
          color: theme.heading, margin: 0,
        }}>
          {sectionTitle}
        </h1>
        {saving && (
          <span style={{
            fontSize: 11, fontWeight: 500, fontFamily: fontBody,
            color: theme.textDim, fontStyle: "italic",
          }}>
            Saving...
          </span>
        )}
      </div>

      {/* Right: countdown badge + theme toggle + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Countdown badge */}
        {countdownLabel && (
          <div style={{
            padding: "3px 10px", borderRadius: 14,
            background: `${countdownColor}18`,
            border: `1px solid ${countdownColor}40`,
            fontSize: 12, fontWeight: 700, fontFamily: fontBody,
            color: countdownColor,
          }}>
            {countdownLabel}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "transparent", cursor: "pointer",
            color: theme.textDim, transition: "background 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.bgAlt)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {mode === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User avatar */}
        <button
          onClick={onViewProfile}
          title={user.name}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 8px", borderRadius: 8, border: "none",
            background: "transparent", cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.bgAlt)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: theme.accent, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 12, fontWeight: 700,
            color: "#fff", fontFamily: fontBody,
            overflow: "hidden",
          }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              user.name?.charAt(0)?.toUpperCase() || "?"
            )}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 500, fontFamily: fontBody,
            color: theme.text, maxWidth: 120,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user.name}
          </span>
        </button>
      </div>
    </div>
  );
}
