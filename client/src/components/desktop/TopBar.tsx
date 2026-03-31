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

  // Countdown badge — full display matching mobile Header
  let countdownColor = theme.accent;
  let countdownLabel = "";
  let countdownIcon = "";

  if (countdown) {
    if (countdown.onTrek) {
      countdownColor = theme.accent;
      countdownIcon = "\u26FA";
      countdownLabel = `On trail \u00B7 ${countdown.label}`;
    } else if (countdown.gone && countdown.phase === "complete") {
      countdownColor = theme.gold;
      countdownIcon = "\u2713";
      countdownLabel = `Complete \u00B7 ${countdown.label?.split("!")[0] || "Done"}`;
    } else if (countdown.phase === "travel_there") {
      countdownColor = theme.accentLight || theme.accent;
      countdownIcon = "\u{1F690}";
      countdownLabel = `En route \u00B7 ${countdown.label}`;
    } else if (countdown.phase === "travel_back") {
      countdownColor = theme.accentLight || theme.accent;
      countdownIcon = "\u{1F690}";
      countdownLabel = `Heading home \u00B7 ${countdown.days}d left`;
    } else if (countdown.days !== undefined && countdown.days !== null) {
      // Pre-departure
      if (countdown.days <= 1 && countdown.hours !== undefined) {
        countdownColor = theme.urgency;
        countdownIcon = "\u23F1";
        countdownLabel = `${countdown.hours}h ${countdown.minutes}m \u00B7 Departure tomorrow`;
      } else if (countdown.days <= 7) {
        countdownColor = theme.urgency;
        countdownIcon = "\u23F1";
        countdownLabel = `${countdown.days}d ${countdown.hours}h \u00B7 ${countdown.label}`;
      } else {
        if (countdown.days < 14) countdownColor = theme.danger;
        else if (countdown.days < 30) countdownColor = theme.urgency;
        else if (countdown.days <= 60) countdownColor = theme.gold;
        // Format departure date
        const targetDate = trekDates?.depart || trekDate;
        let dateStr = "";
        if (targetDate) {
          const d = typeof targetDate === "string" ? new Date(targetDate + "T00:00:00") : targetDate;
          dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        countdownIcon = "\u23F1";
        countdownLabel = `${countdown.days} days \u00B7 ${countdown.label || "Departure"} ${dateStr}`;
      }
    }
  }

  return (
    <div className="h-12 flex items-center justify-between px-6 border-b border-tl-border bg-tl-bg shrink-0 sticky top-0 z-10">
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
        {/* Countdown badge — full display with icon */}
        {countdownLabel && (
          <div
            className="py-[3px] px-3 rounded-[14px] text-[11px] font-bold font-body flex items-center gap-1.5"
            style={{
              background: `${countdownColor}18`,
              border: `1px solid ${countdownColor}40`,
              color: countdownColor,
            }}
          >
            {countdownIcon && <span className="text-sm leading-none">{countdownIcon}</span>}
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
