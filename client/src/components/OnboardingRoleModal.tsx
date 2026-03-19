import React, { useState } from "react";
import clsx from "clsx";
import { api } from "../api";
import { Users, Shield, Heart } from "lucide-react";

interface OnboardingRoleModalProps {
  onRoleSelected: (role: string) => void;
}

const ROLES = [
  {
    id: "trekker",
    title: "Trekker",
    description: "I'm a Scout or Adult going on the adventure",
    Icon: Users,
  },
  {
    id: "admin",
    title: "Troop Admin",
    description: "I'm organizing the crew and managing logistics",
    Icon: Shield,
  },
  {
    id: "parent",
    title: "Parent",
    description: "I'm tracking my scout's progress and readiness",
    Icon: Heart,
  },
] as const;

export default function OnboardingRoleModal({ onRoleSelected }: OnboardingRoleModalProps) {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (role: string) => {
    setSelecting(role);
    try {
      await api.setOnboardingRole(role);
      onRoleSelected(role);
    } catch (e) {
      console.error("Failed to set onboarding role:", e);
      setSelecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-5">
      <div
        className="bg-tl-bg rounded-card py-8 px-6 max-w-[520px] w-full border border-tl-border"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">&#x1F3D5;&#xFE0F;</div>
          <h2 className="font-display text-xl font-[800] text-tl-heading m-0">
            Welcome to TrailLog
          </h2>
          <p className="text-sm text-tl-text-dim mt-1">
            How will you be using TrailLog? This helps us guide you through setup.
          </p>
        </div>

        {/* Role Cards */}
        <div className="flex flex-col gap-3">
          {ROLES.map(({ id, title, description, Icon }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={selecting !== null}
              className={clsx(
                "flex items-center gap-4 py-4 px-5 rounded-btn border-2 text-left transition-all duration-150",
                selecting === id
                  ? "border-tl-accent bg-tl-accent-bg cursor-wait"
                  : "border-tl-border-light bg-tl-bg-alt hover:border-tl-accent/50 cursor-pointer",
                selecting !== null && selecting !== id && "opacity-50"
              )}
            >
              <div
                className={clsx(
                  "w-11 h-11 rounded-badge shrink-0 flex items-center justify-center",
                  selecting === id ? "bg-tl-accent text-white" : "bg-tl-accent/15 text-tl-accent"
                )}
              >
                <Icon size={22} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-tl-heading font-display">
                  {title}
                </div>
                <div className="text-xs text-tl-text-dim mt-0.5">
                  {description}
                </div>
              </div>
              {selecting === id && (
                <div className="text-xs text-tl-accent font-semibold shrink-0">Setting up...</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
