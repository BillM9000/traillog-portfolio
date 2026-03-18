import React from "react";
import clsx from "clsx";

interface Props {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  memberName?: string;
}

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, danger = true, memberName }: Props): React.JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999]"
      onClick={onCancel}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className={clsx(
          "bg-tl-card rounded-xl p-6 w-[300px] text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          danger ? "border border-tl-danger/25" : "border border-tl-accent/25"
        )}>
        <div className={clsx(
          "text-sm font-bold font-display mb-1.5",
          danger ? "text-tl-gold" : "text-tl-heading"
        )}>
          {title || (memberName ? `Remove ${memberName}?` : "Are you sure?")}
        </div>
        <div className="text-xs text-tl-text-muted mb-4">
          {message || "This deletes all their availability and skill data permanently."}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={onCancel}
            className="px-[18px] py-2 rounded-[7px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-xs font-semibold cursor-pointer font-body">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={clsx(
              "px-[18px] py-2 rounded-[7px] border-none text-white text-xs font-semibold cursor-pointer font-body",
              danger ? "bg-[#7a3030]" : "bg-tl-accent"
            )}>
            {confirmLabel || "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
