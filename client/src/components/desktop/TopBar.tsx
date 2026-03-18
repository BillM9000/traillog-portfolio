import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useCountdown } from "../../hooks/useCountdown";
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
    <div className="h-12 flex items-center justify-between px-6 border-b border-tl-border bg-tl-bg shrink-0">
      {/* Left: section title */}
      <div className="flex items-center gap-3">
        <h1 className="font-display text-lg font-bold text-tl-heading m-0">
          {sectionTitle}
        </h1>
        {saving && (
          <span className="text-[11px] font-medium font-body text-tl-text-dim italic">
            Saving...
          </span>
        )}
      </div>

      {/* Right: countdown badge + theme toggle + avatar */}
      <div className="flex items-center gap-3">
        {/* Countdown badge — keep inline style for dynamic color */}
        {countdownLabel && (
          <div
            className="py-[3px] px-2.5 rounded-[14px] text-xs font-bold font-body"
            style={{
              background: `${countdownColor}18`,
              border: `1px solid ${countdownColor}40`,
              color: countdownColor,
            }}
          >
            {countdownLabel}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="flex items-center justify-center w-8 h-8 rounded-btn border-none bg-transparent cursor-pointer text-tl-text-dim transition-colors duration-150 hover:bg-tl-bg-alt"
        >
          {mode === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User avatar */}
        <button
          onClick={onViewProfile}
          title={user.name}
          className="flex items-center gap-2 py-1 px-2 rounded-btn border-none bg-transparent cursor-pointer transition-colors duration-150 hover:bg-tl-bg-alt"
        >
          <div className="w-7 h-7 rounded-full bg-tl-accent flex items-center justify-center text-xs font-bold text-white font-body overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              user.name?.charAt(0)?.toUpperCase() || "?"
            )}
          </div>
          <span className="text-[13px] font-medium font-body text-tl-text max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
            {user.name}
          </span>
        </button>
      </div>
    </div>
  );
}
