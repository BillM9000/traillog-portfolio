/**
 * BadgeSystem — Phase 3 gamification components
 *
 * Components:
 *   BadgeEarned   — colored circle, embroidered border, SVG icon, label
 *   BadgeLocked   — dashed gray border, desaturated icon, lock overlay, muted label
 *   BadgeRow      — horizontal scroll (mobile) / 4-across grid (desktop) + counter
 *   BadgeDetailModal — bottom sheet on tap: earned shows date; locked shows requirements
 */

import { useState } from "react";
import clsx from "clsx";
import {
  Backpack, HeartPulse, Compass, Mountain, Brain, ShoppingBag, Star,
  Lock, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Achievement } from "../types";

// ─── Badge catalog ────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  title: string;
  category: "Physical" | "Gear" | "Admin" | "Leadership" | "Achievement";
  color: string;       // background color when earned
  icon: LucideIcon;
  description: string;
  requirements: string;
}

export const BADGE_CATALOG: BadgeDef[] = [
  {
    id: "gear_ready",
    title: "Gear Ready",
    category: "Gear",
    color: "#C47A2A",
    icon: Backpack,
    description: "All gear items owned or packed.",
    requirements: "Check off all gear items as owned or packed in the Gear tab.",
  },
  {
    id: "trail_medic",
    title: "Trail Medic",
    category: "Admin",
    color: "#3A5A8A",
    icon: HeartPulse,
    description: "Medical documentation complete.",
    requirements: "Complete all medical skill requirements in the Readiness tab.",
  },
  {
    id: "admin_pro",
    title: "Admin Pro",
    category: "Leadership",
    color: "#7A4A8A",
    icon: Compass,
    description: "All administrative tasks completed.",
    requirements: "Complete all administrative requirements.",
  },
  {
    id: "training_complete",
    title: "Training Complete",
    category: "Physical",
    color: "#5B7A3A",
    icon: Mountain,
    description: "All training skills checked off.",
    requirements: "Complete all training skills in the Readiness tab.",
  },
  {
    id: "ai_ready",
    title: "AI Ready",
    category: "Physical",
    color: "#4A6A5A",
    icon: Brain,
    description: "AI readiness assessment completed.",
    requirements: "Complete the AI self-assessment in the Readiness tab.",
  },
  {
    id: "ai_gear",
    title: "AI Gear Scout",
    category: "Gear",
    color: "#8A5A2A",
    icon: ShoppingBag,
    description: "Used AI gear recommendations.",
    requirements: "Get AI gear recommendations in the Gear tab.",
  },
  {
    id: "fully_prepared",
    title: "Fully Prepared",
    category: "Achievement",
    color: "#B8920A",
    icon: Star,
    description: "All categories complete — truly ready for the trail!",
    requirements: "Complete all gear, training, and medical requirements at 100%.",
  },
];

// ─── Category label colors (text) ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Physical: "#5B7A3A",
  Gear: "#C47A2A",
  Admin: "#3A5A8A",
  Leadership: "#7A4A8A",
  Achievement: "#B8920A",
};

// ─── BadgeEarned ──────────────────────────────────────────────────────────────

interface BadgeEarnedProps {
  badge: BadgeDef;
  size?: number;
  earnedAt?: string;
  onClick?: () => void;
}

export function BadgeEarned({ badge, size = 64, earnedAt, onClick }: BadgeEarnedProps) {
  const Icon = badge.icon;
  const iconSize = Math.round(size * 0.42);
  const labelFontSize = size >= 80 ? 11 : 10;

  return (
    <button
      onClick={onClick}
      aria-label={`${badge.title} — earned badge, tap for details`}
      className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0 group"
      style={{ width: size + 12 }}
    >
      <div
        className="relative flex items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        style={{
          width: size,
          height: size,
          background: badge.color,
          border: `2px solid ${badge.color}`,
          boxShadow: `0 0 0 2px #C4A035, 0 0 8px 0 ${badge.color}66, inset 0 1px 2px rgba(255,255,255,0.25)`,
          filter: `drop-shadow(0 0 4px ${badge.color}88)`,
        }}
      >
        <Icon size={iconSize} color="#fff" strokeWidth={2} />
      </div>
      <span
        className="font-body font-bold text-center leading-tight text-tl-heading"
        style={{ fontSize: labelFontSize, maxWidth: size + 12 }}
      >
        {badge.title}
      </span>
      {earnedAt && (
        <span className="text-tl-text-dim font-body" style={{ fontSize: 9 }}>
          {new Date(earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </button>
  );
}

// ─── BadgeLocked ──────────────────────────────────────────────────────────────

interface BadgeLockedProps {
  badge: BadgeDef;
  size?: number;
  onClick?: () => void;
}

export function BadgeLocked({ badge, size = 64, onClick }: BadgeLockedProps) {
  const Icon = badge.icon;
  const iconSize = Math.round(size * 0.42);
  const labelFontSize = size >= 80 ? 11 : 10;

  return (
    <button
      onClick={onClick}
      aria-label={`${badge.title} — locked badge, tap to see requirements`}
      className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0 group"
      style={{ width: size + 12 }}
    >
      <div
        className="relative flex items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        style={{
          width: size,
          height: size,
          background: "var(--tl-bg-alt, #F3F0E8)",
          border: "2px dashed #C4B599",
          opacity: 0.75,
        }}
      >
        {/* Desaturated icon */}
        <Icon size={iconSize} color="#A89880" strokeWidth={1.5} style={{ opacity: 0.5 }} />
        {/* Lock overlay at bottom-right */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-tl-bg border border-tl-border"
          style={{ width: 16, height: 16, bottom: -2, right: -2 }}
        >
          <Lock size={9} strokeWidth={2.5} className="text-tl-text-dim" />
        </div>
      </div>
      <span
        className="font-body font-medium text-center leading-tight text-tl-text-dim"
        style={{ fontSize: labelFontSize, maxWidth: size + 12, opacity: 0.65 }}
      >
        {badge.title}
      </span>
    </button>
  );
}

// ─── BadgeDetailModal ─────────────────────────────────────────────────────────

interface BadgeDetailModalProps {
  badge: BadgeDef;
  earned: boolean;
  earnedAt?: string;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, earned, earnedAt, onClose }: BadgeDetailModalProps) {
  const Icon = badge.icon;
  const catColor = CATEGORY_COLORS[badge.category] || "#6B5D4D";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[4px] flex items-end justify-center p-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${badge.title} badge details`}
    >
      <div
        className="bg-tl-bg rounded-t-[24px] w-full max-w-[480px] pb-safe pt-6 px-6"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.25)", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close handle */}
        <div className="flex justify-between items-center mb-5">
          <div
            className="text-[10px] font-bold uppercase tracking-[1.2px] font-body px-2 py-0.5 rounded-full"
            style={{ background: `${catColor}22`, color: catColor }}
          >
            {badge.category}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-tl-bg-alt border border-tl-border text-tl-text-dim cursor-pointer"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Badge icon — large */}
        <div className="flex flex-col items-center mb-5">
          {earned ? (
            <div
              className="flex items-center justify-center rounded-full mb-3"
              style={{
                width: 96,
                height: 96,
                background: badge.color,
                boxShadow: `0 0 0 3px #C4A035, 0 0 20px 0 ${badge.color}66, inset 0 2px 4px rgba(255,255,255,0.2)`,
                filter: `drop-shadow(0 0 8px ${badge.color}88)`,
              }}
            >
              <Icon size={42} color="#fff" strokeWidth={1.8} />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-full mb-3 relative"
              style={{ width: 96, height: 96, background: "var(--tl-bg-alt)", border: "2px dashed #C4B599" }}
            >
              <Icon size={42} color="#A89880" strokeWidth={1.5} style={{ opacity: 0.4 }} />
              <div
                className="absolute flex items-center justify-center rounded-full bg-tl-bg border border-tl-border"
                style={{ width: 22, height: 22, bottom: -4, right: -4 }}
              >
                <Lock size={12} strokeWidth={2.5} className="text-tl-text-dim" />
              </div>
            </div>
          )}

          <h2 className="text-xl font-[900] text-tl-heading font-display text-center">{badge.title}</h2>

          {earned && earnedAt && (
            <div className="text-sm text-tl-text-dim font-body mt-0.5">
              Earned {new Date(earnedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Description / requirements */}
        <div className="bg-tl-bg-alt rounded-[14px] p-4 mb-5">
          {earned ? (
            <>
              <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1px] mb-1.5 font-body">About this badge</div>
              <p className="text-[13px] text-tl-text leading-relaxed font-body">{badge.description}</p>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1px] mb-1.5 font-body">How to earn</div>
              <p className="text-[13px] text-tl-text leading-relaxed font-body">{badge.requirements}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BadgeRow ─────────────────────────────────────────────────────────────────

interface BadgeRowProps {
  achievements: Achievement | null;
  userId: number;
  /** 64px on mobile, 80px on desktop */
  size?: number;
  /** When true, renders 4-across grid instead of horizontal scroll */
  grid?: boolean;
}

export function BadgeRow({ achievements, userId, size = 64, grid = false }: BadgeRowProps) {
  const [selected, setSelected] = useState<{ badge: BadgeDef; earned: boolean; earnedAt?: string } | null>(null);

  const earnedBadges = (achievements?.badges || []).filter(b => b.user_id === userId);
  const earnedIds = new Set(earnedBadges.map(b => b.badge_id));
  const earnedCount = earnedBadges.filter(b => BADGE_CATALOG.some(d => d.id === b.badge_id)).length;

  // Earned first, then locked
  const sorted = [
    ...BADGE_CATALOG.filter(d => earnedIds.has(d.id)),
    ...BADGE_CATALOG.filter(d => !earnedIds.has(d.id)),
  ];

  return (
    <>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] font-body">
          Trail Badges
        </div>
        <div className="text-[11px] font-bold font-body" style={{ color: earnedCount > 0 ? "#C4A035" : undefined }}>
          <span className="text-tl-text-dim font-body">{earnedCount}/{BADGE_CATALOG.length} earned</span>
        </div>
      </div>

      {grid ? (
        // ── Desktop: 4-across grid ──
        <div className="grid grid-cols-4 gap-3">
          {sorted.map(badge => {
            const earnedBadge = earnedBadges.find(b => b.badge_id === badge.id);
            return earnedBadge ? (
              <BadgeEarned
                key={badge.id}
                badge={badge}
                size={size}
                earnedAt={earnedBadge.earned_at}
                onClick={() => setSelected({ badge, earned: true, earnedAt: earnedBadge.earned_at })}
              />
            ) : (
              <BadgeLocked
                key={badge.id}
                badge={badge}
                size={size}
                onClick={() => setSelected({ badge, earned: false })}
              />
            );
          })}
        </div>
      ) : (
        // ── Mobile: horizontal scroll ──
        <div
          className="flex gap-3 pb-2 -mx-1 px-1"
          style={{ overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {sorted.map(badge => {
            const earnedBadge = earnedBadges.find(b => b.badge_id === badge.id);
            return (
              <div key={badge.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                {earnedBadge ? (
                  <BadgeEarned
                    badge={badge}
                    size={size}
                    earnedAt={earnedBadge.earned_at}
                    onClick={() => setSelected({ badge, earned: true, earnedAt: earnedBadge.earned_at })}
                  />
                ) : (
                  <BadgeLocked
                    badge={badge}
                    size={size}
                    onClick={() => setSelected({ badge, earned: false })}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <BadgeDetailModal
          badge={selected.badge}
          earned={selected.earned}
          earnedAt={selected.earnedAt}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
