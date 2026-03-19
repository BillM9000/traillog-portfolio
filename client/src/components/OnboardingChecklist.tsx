import { useState } from "react";
import clsx from "clsx";
import { api } from "../api";
import { Check, X } from "lucide-react";
import type { OnboardingState } from "../types";

interface OnboardingChecklistProps {
  onboarding: OnboardingState;
  onRefresh: () => Promise<void>;
}

interface StepDef {
  id: string;
  title: string;
  subtitle?: string;
}

const TREKKER_STEPS: StepDef[] = [
  { id: "join_troop", title: "Join a troop", subtitle: "Enter a join code or accept an invitation" },
  { id: "enter_adventure", title: "Enter an adventure", subtitle: "Select your crew's adventure" },
  { id: "set_availability", title: "Set your training availability", subtitle: "Mark dates you can attend training" },
  { id: "ai_readiness", title: "Take AI readiness assessment", subtitle: "Get a personalized training plan" },
  { id: "gear_checklist", title: "Start your gear checklist", subtitle: "Review and check off gear items" },
  { id: "review_itinerary", title: "Review your itinerary", subtitle: "Explore your trek route and camps" },
];

const ADMIN_STEPS: StepDef[] = [
  { id: "create_troop", title: "Create a troop", subtitle: "Set up your troop with council info" },
  { id: "create_adventure", title: "Create an adventure & select itinerary", subtitle: "Plan your crew's trek" },
  { id: "invite_members", title: "Invite crew members", subtitle: "Send email invitations to your crew" },
  { id: "schedule_training", title: "Schedule first training event", subtitle: "Plan your crew's first group hike" },
  { id: "review_gear_catalog", title: "Review gear catalog", subtitle: "Customize gear requirements for your crew" },
  { id: "generate_report", title: "Generate first report", subtitle: "Export a readiness or training report" },
];

const PARENT_STEPS: StepDef[] = [
  { id: "connect_troop", title: "Connect to your scout's troop", subtitle: "Join the troop as a support member" },
  { id: "view_scout_dashboard", title: "View your scout's dashboard", subtitle: "Check their readiness and training progress" },
  { id: "check_gear", title: "Check gear progress", subtitle: "See what gear your scout still needs" },
  { id: "review_readiness", title: "Review readiness scores", subtitle: "Monitor your scout's preparation" },
];

function getStepsForRole(role: string): StepDef[] {
  switch (role) {
    case "trekker": return TREKKER_STEPS;
    case "admin": return ADMIN_STEPS;
    case "parent": return PARENT_STEPS;
    default: return [];
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "trekker": return "Trekker";
    case "admin": return "Troop Admin";
    case "parent": return "Parent";
    default: return "User";
  }
}

export default function OnboardingChecklist({ onboarding, onRefresh }: OnboardingChecklistProps) {
  const [dismissing, setDismissing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  if (!onboarding.role || onboarding.completed) return null;

  const steps = getStepsForRole(onboarding.role);
  const completedSet = new Set(onboarding.steps);
  const completedCount = steps.filter(s => completedSet.has(s.id)).length;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const handleToggleStep = async (stepId: string) => {
    if (completedSet.has(stepId)) return; // Don't un-complete steps
    setCompleting(stepId);
    try {
      await api.completeOnboardingStep(stepId);
      await onRefresh();
    } catch (e) {
      console.error("Failed to complete step:", e);
    } finally {
      setCompleting(null);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.completeOnboarding();
      await onRefresh();
    } catch (e) {
      console.error("Failed to dismiss onboarding:", e);
      setDismissing(false);
    }
  };

  return (
    <div className="tl-card mb-4 border-l-4 border-l-tl-accent">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-[800] text-tl-heading m-0">
            Getting Started
          </h3>
          <div className="text-[10px] text-tl-text-dim mt-0.5">
            {getRoleLabel(onboarding.role)} setup &middot; {completedCount} of {totalSteps} complete
          </div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="flex items-center gap-1 py-1 px-2.5 rounded-[5px] border border-tl-border-light bg-transparent text-tl-text-dim text-[10px] font-semibold cursor-pointer font-body hover:text-tl-text-muted"
          title="Dismiss getting started guide"
        >
          <X size={12} />
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-tl-bg-alt mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-tl-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5">
        {steps.map((step) => {
          const done = completedSet.has(step.id);
          const isCompleting = completing === step.id;
          return (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              disabled={done || isCompleting}
              className={clsx(
                "flex items-start gap-3 py-2.5 px-3 rounded-btn text-left transition-all duration-150 border",
                done
                  ? "border-tl-border-light bg-tl-bg-alt opacity-70 cursor-default"
                  : "border-tl-border-light bg-tl-bg-alt hover:border-tl-accent/40 cursor-pointer",
                isCompleting && "cursor-wait"
              )}
            >
              {/* Checkbox */}
              <div
                className={clsx(
                  "w-5 h-5 rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[1px] transition-all duration-150",
                  done
                    ? "border-green-500 bg-green-500"
                    : "border-tl-border-light bg-transparent"
                )}
              >
                {done && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div
                  className={clsx(
                    "text-xs font-bold",
                    done ? "text-tl-text-dim line-through" : "text-tl-heading"
                  )}
                >
                  {step.title}
                </div>
                {step.subtitle && !done && (
                  <div className="text-[10px] text-tl-text-dim mt-0.5">
                    {step.subtitle}
                  </div>
                )}
              </div>

              {isCompleting && (
                <div className="text-[10px] text-tl-accent font-semibold shrink-0">...</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Completion message */}
      {completedCount === totalSteps && (
        <div className="mt-3 py-2.5 px-3 rounded-btn bg-green-500/10 border border-green-500/20 text-center">
          <div className="text-xs font-bold text-green-600 dark:text-green-400">
            All steps complete! You're ready to go.
          </div>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="mt-1.5 py-1.5 px-4 rounded-[5px] border-none bg-tl-accent text-white text-[11px] font-bold cursor-pointer font-display"
          >
            {dismissing ? "..." : "Finish Setup"}
          </button>
        </div>
      )}
    </div>
  );
}
