/**
 * PriorityAlertCard — contextual, data-driven priority action card.
 *
 * Amber border = warning (default). Red border = danger.
 * Place at the top of relevant section pages for actionable crew alerts.
 */

import { AlertTriangle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PriorityAlertCardProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  severity?: "warning" | "danger";
  icon?: LucideIcon;
}

export default function PriorityAlertCard({
  title,
  body,
  ctaLabel,
  onCta,
  severity = "warning",
  icon: Icon = AlertTriangle,
}: PriorityAlertCardProps) {
  const isWarning = severity === "warning";
  const borderColor = isWarning ? "#C47A2A" : "#CC3333";
  const bgGradient = isWarning
    ? "linear-gradient(135deg, var(--tl-urgency-bg,#FFF3E0) 0%, var(--tl-urgency-bg-end,#FFE8CC) 100%)"
    : "linear-gradient(135deg, #FFF0F0 0%, #FFE0E0 100%)";
  const iconBg = isWarning ? "#C47A2A" : "#CC3333";
  const titleColor = isWarning ? "var(--tl-urgency,#C47A2A)" : "#CC3333";
  const bodyColor = isWarning ? "#7A5020" : "#993333";
  const ctaBg = isWarning ? "#C47A2A" : "#CC3333";

  return (
    <div
      className="tl-card mb-2.5 flex items-start gap-3"
      style={{
        background: bgGradient,
        borderColor,
        borderWidth: "1.5px",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center rounded-badge mt-0.5"
        style={{ width: 34, height: 34, background: iconBg }}
      >
        <Icon size={17} color="#fff" strokeWidth={2.2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold font-display leading-tight mb-1" style={{ color: titleColor }}>
          {title}
        </div>
        <div className="text-[12px] font-body leading-[1.5]" style={{ color: bodyColor }}>
          {body}
        </div>
        {ctaLabel && onCta && (
          <button
            onClick={onCta}
            className="mt-2 text-[11px] font-bold font-body text-white px-3 py-1 rounded-badge border-none cursor-pointer"
            style={{ background: ctaBg }}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
