import { useState, useEffect, useCallback, useMemo } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
  ArrowLeft, Sun, Moon, Users, Shield, Heart, Search, MapPin, Mountain,
  Compass, Waves, TreePine, Backpack, Check, ChevronRight, Send, Plus, X,
} from "lucide-react";
import type { User, Council, Itinerary, OnboardingState } from "../types";

// ─── Constants ───────────────────────────────────────────────────────────────

const ADVENTURE_TYPES = [
  { id: "philmont", name: "Philmont Scout Ranch", icon: Mountain, location: "Cimarron, NM" },
  { id: "northern_tier", name: "Northern Tier", icon: Compass, location: "Ely, MN" },
  { id: "sea_base", name: "Florida Sea Base", icon: Waves, location: "Islamorada, FL" },
  { id: "summit", name: "Summit Bechtel Reserve", icon: TreePine, location: "Glen Jean, WV" },
];

const ESSENTIAL_GEAR = [
  { name: "Backpack (50-80L)", icon: "🎒" },
  { name: "Hiking Boots", icon: "🥾" },
  { name: "Sleeping Bag", icon: "🛏️" },
  { name: "Sleeping Pad", icon: "🏕️" },
  { name: "Water Filter", icon: "💧" },
  { name: "Stove & Fuel", icon: "🍳" },
  { name: "Compass", icon: "🧭" },
  { name: "Rain Gear", icon: "☔" },
  { name: "Headlamp", icon: "🔦" },
  { name: "First Aid Kit", icon: "⛑️" },
  { name: "Mess Kit", icon: "🍽️" },
  { name: "Sunscreen", icon: "☀️" },
  { name: "Water Bottles (2+)", icon: "🫗" },
  { name: "Trekking Poles", icon: "🥢" },
  { name: "Camp Clothes", icon: "👕" },
];

const READINESS_QUESTIONS = [
  {
    key: "current_distance_miles",
    label: "Longest hike in the past 3 months?",
    options: [
      { value: 2, label: "< 3 miles" },
      { value: 5, label: "3–7 miles" },
      { value: 10, label: "7–12 miles" },
      { value: 15, label: "12+ miles" },
    ],
  },
  {
    key: "pack_experience",
    label: "Pack experience?",
    options: [
      { value: "none", label: "Never carried a loaded pack" },
      { value: "day_pack", label: "Day pack only" },
      { value: "multi_day", label: "Multi-day loaded pack" },
    ],
  },
  {
    key: "elevation_access",
    label: "Elevation access?",
    options: [
      { value: "flat_only", label: "Flat terrain only" },
      { value: "some_hills", label: "Some hills" },
      { value: "real_elevation", label: "Real elevation gain" },
    ],
  },
  {
    key: "activity_level",
    label: "Activity level?",
    options: [
      { value: "sedentary", label: "Sedentary" },
      { value: "lightly_active", label: "Lightly active" },
      { value: "regularly_active", label: "Regularly active" },
      { value: "very_active", label: "Very active" },
    ],
  },
];

const DATE_LABELS: Record<string, { depart: string; arrive: string; return: string; home: string }> = {
  philmont: { depart: "Leave home", arrive: "Arrive Philmont", return: "Leave Philmont", home: "Arrive home" },
  northern_tier: { depart: "Leave home", arrive: "Arrive base", return: "Leave base", home: "Arrive home" },
  sea_base: { depart: "Leave home", arrive: "Arrive Sea Base", return: "Leave Sea Base", home: "Arrive home" },
  summit: { depart: "Leave home", arrive: "Arrive Summit", return: "Leave Summit", home: "Arrive home" },
};

// ─── Step definitions per path ───────────────────────────────────────────────

type StepId =
  | "role_select" | "register_unit" | "plan_adventure" | "feature_tour"
  | "readiness" | "training_dates" | "gear_check" | "invite_members"
  | "find_unit" | "welcome_scout" | "connect_scout" | "parent_dashboard" | "summary";

interface StepDef {
  id: StepId;
  title: string;
  required: boolean;
}

function getStepsForPath(role: string | null, userType: string | null): StepDef[] {
  if (userType === "scout") {
    return [
      { id: "welcome_scout", title: "Welcome, Scout!", required: true },
      { id: "find_unit", title: "Find Your Troop", required: true },
      { id: "readiness", title: "How Ready Are You?", required: true },
      { id: "gear_check", title: "Gear You Already Own", required: false },
      { id: "summary", title: "You're Ready!", required: true },
    ];
  }
  if (role === "parent") {
    return [
      { id: "role_select", title: "What brings you here?", required: true },
      { id: "find_unit", title: "Find Your Unit", required: true },
      { id: "connect_scout", title: "Connect to Your Scout", required: true },
      { id: "parent_dashboard", title: "Your Dashboard", required: true },
    ];
  }
  if (role === "admin") {
    return [
      { id: "role_select", title: "What brings you here?", required: true },
      { id: "register_unit", title: "Register Your Unit", required: true },
      { id: "plan_adventure", title: "Plan Your Adventure", required: true },
      { id: "readiness", title: "How Ready Are You?", required: true },
      { id: "training_dates", title: "Your First Training Week", required: false },
      { id: "gear_check", title: "Gear You Already Own", required: false },
      { id: "invite_members", title: "Build Your Crew", required: false },
      { id: "summary", title: "You're All Set", required: true },
    ];
  }
  // trekker (default for adults who haven't picked yet)
  if (role === "trekker") {
    return [
      { id: "role_select", title: "What brings you here?", required: true },
      { id: "find_unit", title: "Find Your Unit", required: true },
      { id: "feature_tour", title: "What TrailLog Does For You", required: true },
      { id: "readiness", title: "How Ready Are You?", required: true },
      { id: "training_dates", title: "Your First Training Week", required: false },
      { id: "gear_check", title: "Gear You Already Own", required: false },
      { id: "summary", title: "You're All Set", required: true },
    ];
  }
  // No role yet — just show role select
  return [{ id: "role_select", title: "What brings you here?", required: true }];
}

// ─── Main Wizard Component ───────────────────────────────────────────────────

interface OnboardingWizardProps {
  user: User;
  onboarding: OnboardingState;
  onRefreshOnboarding: () => Promise<void>;
  onComplete: () => void;
  onRefreshAuth: () => void;
}

export default function OnboardingWizard({
  user, onboarding, onRefreshOnboarding, onComplete, onRefreshAuth,
}: OnboardingWizardProps) {
  const { mode, toggle } = useTheme();
  const { addToast } = useToast();

  // Track wizard state
  const [role, setRole] = useState<string | null>(onboarding.role);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(onboarding.steps));
  const [busy, setBusy] = useState(false);

  // Data collected during wizard
  const [createdTroopId, setCreatedTroopId] = useState<number | null>(null);
  const [createdAdventureId, setCreatedAdventureId] = useState<number | null>(null);
  const [createdCrewId, setCreatedCrewId] = useState<number | null>(null);
  const [joinedTroopId, setJoinedTroopId] = useState<number | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  // Derive steps from role
  const steps = useMemo(
    () => getStepsForPath(role, user.user_type),
    [role, user.user_type],
  );

  // Resume at the last completed step + 1
  useEffect(() => {
    if (onboarding.steps.length > 0) {
      const lastCompleted = onboarding.steps[onboarding.steps.length - 1];
      const idx = steps.findIndex(s => s.id === lastCompleted);
      if (idx >= 0 && idx < steps.length - 1) {
        setCurrentStepIdx(idx + 1);
      }
    }
  }, []); // Only on mount

  const currentStep = steps[currentStepIdx] || steps[0];
  const totalSteps = steps.length;

  // Save step completion to server
  const markStepDone = useCallback(async (stepId: string) => {
    try {
      await api.completeOnboardingStep(stepId);
      setCompletedSteps(prev => new Set([...prev, stepId]));
    } catch (e) {
      console.error("Failed to save step:", e);
    }
  }, []);

  const goNext = useCallback(() => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  }, [currentStepIdx, steps.length]);

  const goBack = useCallback(() => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  }, [currentStepIdx]);

  const handleFinish = useCallback(async () => {
    setBusy(true);
    try {
      await api.completeOnboarding();
      await onRefreshOnboarding();
      onRefreshAuth();
      onComplete();
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      addToast("Failed to complete setup", "error");
    } finally {
      setBusy(false);
    }
  }, [onRefreshOnboarding, onRefreshAuth, onComplete, addToast]);

  // ── Step handlers ──

  const handleRoleSelect = async (selectedRole: string) => {
    setBusy(true);
    try {
      await api.setOnboardingRole(selectedRole);
      setRole(selectedRole);
      await markStepDone("role_selected");
      await onRefreshOnboarding();
      // Steps will recalculate via useMemo, advance to next
      setTimeout(() => {
        setCurrentStepIdx(1);
        setBusy(false);
      }, 200);
    } catch (e) {
      console.error(e);
      addToast("Failed to set role", "error");
      setBusy(false);
    }
  };

  const handleScoutWelcome = async () => {
    setBusy(true);
    try {
      await api.setOnboardingRole("trekker");
      setRole("trekker");
      await markStepDone("welcome_scout");
      goNext();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleUnitCreated = async (troopId: number) => {
    setCreatedTroopId(troopId);
    await markStepDone("unit_created");
    goNext();
  };

  const handleAdventureCreated = async (adventureId: number, crewId: number) => {
    setCreatedAdventureId(adventureId);
    setCreatedCrewId(crewId);
    await markStepDone("adventure_created");
    goNext();
  };

  const handleUnitFound = async (troopId: number, isPending: boolean) => {
    setJoinedTroopId(troopId);
    setPendingApproval(isPending);
    await markStepDone("unit_found");
    goNext();
  };

  const handleFeatureTourDone = async () => {
    await markStepDone("feature_tour_done");
    goNext();
  };

  const handleReadinessDone = async () => {
    await markStepDone("readiness_done");
    goNext();
  };

  const handleTrainingDatesSkip = async () => {
    await markStepDone("training_dates_skip");
    goNext();
  };

  const handleTrainingDatesDone = async () => {
    await markStepDone("training_dates_done");
    goNext();
  };

  const handleGearCheckSkip = async () => {
    await markStepDone("gear_check_skip");
    goNext();
  };

  const handleGearCheckDone = async () => {
    await markStepDone("gear_check_done");
    goNext();
  };

  const handleInviteSkip = async () => {
    await markStepDone("invite_skip");
    goNext();
  };

  const handleInviteDone = async () => {
    await markStepDone("invite_done");
    goNext();
  };

  const handleConnectScout = async () => {
    await markStepDone("connect_scout");
    goNext();
  };

  // ── Render current step content ──

  function renderStep() {
    switch (currentStep.id) {
      case "role_select":
        return <StepRoleSelect onSelect={handleRoleSelect} busy={busy} userType={user.user_type} />;
      case "welcome_scout":
        return <StepScoutWelcome onContinue={handleScoutWelcome} busy={busy} userName={user.name} />;
      case "register_unit":
        return <StepRegisterUnit onComplete={handleUnitCreated} />;
      case "find_unit":
        return <StepFindUnit onComplete={handleUnitFound} userType={user.user_type} />;
      case "plan_adventure":
        return <StepPlanAdventure troopId={createdTroopId!} onComplete={handleAdventureCreated} />;
      case "feature_tour":
        return <StepFeatureTour onContinue={handleFeatureTourDone} />;
      case "readiness":
        return (
          <StepReadiness
            crewId={createdCrewId}
            pendingApproval={pendingApproval}
            onComplete={handleReadinessDone}
          />
        );
      case "training_dates":
        return <StepTrainingDates onComplete={handleTrainingDatesDone} onSkip={handleTrainingDatesSkip} />;
      case "gear_check":
        return <StepGearCheck onComplete={handleGearCheckDone} onSkip={handleGearCheckSkip} />;
      case "invite_members":
        return (
          <StepInviteMembers
            adventureId={createdAdventureId!}
            onComplete={handleInviteDone}
            onSkip={handleInviteSkip}
          />
        );
      case "connect_scout":
        return <StepConnectScout onComplete={handleConnectScout} />;
      case "parent_dashboard":
        return <StepParentDashboard onFinish={handleFinish} busy={busy} />;
      case "summary":
        return (
          <StepSummary
            role={role}
            pendingApproval={pendingApproval}
            onFinish={handleFinish}
            busy={busy}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-tl-bg flex flex-col overflow-hidden">
      {/* Top bar: progress + theme toggle */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3">
        {/* Back button */}
        <div className="w-8">
          {currentStepIdx > 0 && currentStep.id !== "role_select" && (
            <button
              onClick={goBack}
              className="w-8 h-8 rounded-full border-none bg-transparent text-tl-text-dim cursor-pointer flex items-center justify-center hover:bg-tl-bg-alt transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex-1 mx-4">
          <div className="text-center text-[11px] font-bold font-body text-tl-text-dim mb-1">
            Step {currentStepIdx + 1} of {totalSteps}
          </div>
          <div className="w-full max-w-[300px] mx-auto h-1.5 rounded-full bg-tl-bg-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-tl-accent transition-all duration-500 ease-out"
              style={{ width: `${((currentStepIdx + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full border-none bg-transparent text-tl-text-dim cursor-pointer flex items-center justify-center hover:bg-tl-bg-alt transition-colors"
        >
          {mode === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-5 py-6">
        <div className="w-full max-w-[520px]">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function WizardCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-tl-bg rounded-card border border-tl-border p-6 shadow-lg", className)}>
      {children}
    </div>
  );
}

function WizardTitle({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-6">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <h2 className="font-display text-xl font-[800] text-tl-heading m-0">{title}</h2>
      {subtitle && <p className="text-sm text-tl-text-dim mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, className }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full py-3.5 rounded-btn border-none font-display text-sm font-bold text-white cursor-pointer transition-all duration-150",
        disabled ? "bg-tl-accent/50 cursor-not-allowed" : "bg-tl-accent hover:bg-tl-accent-hover active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SkipLink({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 w-full py-2 border-none bg-transparent text-tl-text-dim text-xs font-body cursor-pointer hover:text-tl-text transition-colors"
    >
      {label || "I'll do this later"} →
    </button>
  );
}

function FeatureCallout({ text }: { text: string }) {
  return (
    <div className="mt-4 py-3 px-4 rounded-btn bg-tl-accent/8 border border-tl-accent/20 text-xs text-tl-accent italic leading-relaxed">
      {text}
    </div>
  );
}

// ─── Step 1: Role Selection ──────────────────────────────────────────────────

function StepRoleSelect({ onSelect, busy, userType }: { onSelect: (role: string) => void; busy: boolean; userType: string | null }) {
  const roles = [
    {
      id: "admin",
      icon: Shield,
      title: "I'm organizing a crew",
      desc: "Set up your unit, manage members, track everyone's readiness",
    },
    {
      id: "trekker",
      icon: Users,
      title: "I'm trekking with a crew",
      desc: "Track your gear, get a training plan, count down the days",
    },
    {
      id: "parent",
      icon: Heart,
      title: "I'm a parent",
      desc: "See your scout's gear progress, readiness score, and upcoming schedule",
    },
  ];

  return (
    <WizardCard>
      <WizardTitle
        icon="🏕️"
        title="What brings you here?"
        subtitle="This helps us set up the right experience for you."
      />
      <div className="flex flex-col gap-3">
        {roles.map(({ id, icon: Icon, title, desc }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            disabled={busy}
            className={clsx(
              "flex items-center gap-4 py-4 px-5 rounded-btn border-2 text-left transition-all duration-150",
              busy ? "opacity-50 cursor-wait" : "border-tl-border-light bg-tl-bg-alt hover:border-tl-accent/50 cursor-pointer",
            )}
          >
            <div className="w-12 h-12 rounded-badge shrink-0 flex items-center justify-center bg-tl-accent/15 text-tl-accent">
              <Icon size={24} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-tl-heading font-display">{title}</div>
              <div className="text-xs text-tl-text-dim mt-0.5 leading-relaxed">{desc}</div>
            </div>
            <ChevronRight size={16} className="text-tl-text-dim shrink-0" />
          </button>
        ))}
      </div>
    </WizardCard>
  );
}

// ─── Scout Welcome ───────────────────────────────────────────────────────────

function StepScoutWelcome({ onContinue, busy, userName }: { onContinue: () => void; busy: boolean; userName: string }) {
  return (
    <WizardCard>
      <WizardTitle
        icon="⛺"
        title={`Welcome, ${userName.split(" ")[0]}!`}
        subtitle="TrailLog helps you track your gear, training, and readiness for your High Adventure trek."
      />

      <div className="flex flex-col gap-2 mb-6">
        {[
          { icon: "🗺️", label: "See your crew's itinerary day-by-day" },
          { icon: "🎒", label: "Track your gear with a personal checklist" },
          { icon: "💪", label: "Get a training plan based on your fitness" },
          { icon: "⏱️", label: "Count down the days to departure" },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-btn bg-tl-bg-alt">
            <span className="text-lg">{f.icon}</span>
            <span className="text-xs text-tl-text font-body">{f.label}</span>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onContinue} disabled={busy}>
        Let's Get Started
      </PrimaryButton>
    </WizardCard>
  );
}

// ─── Step 2a: Register Unit (Admin) ──────────────────────────────────────────

function StepRegisterUnit({ onComplete }: { onComplete: (troopId: number) => void }) {
  const { addToast } = useToast();
  const [unitType, setUnitType] = useState("troop");
  const [unitNumber, setUnitNumber] = useState("");
  const [councilId, setCouncilId] = useState<number | null>(null);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [councilSearch, setCouncilSearch] = useState("");
  const [showCouncilDropdown, setShowCouncilDropdown] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCouncils().then(setCouncils).catch(console.error);
  }, []);

  const filteredCouncils = useMemo(() => {
    if (!councilSearch.trim()) return councils.slice(0, 20);
    const q = councilSearch.toLowerCase();
    return councils.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [councils, councilSearch]);

  const selectedCouncil = councils.find(c => c.id === councilId);

  const canSubmit = unitNumber.trim() && councilId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      // Check for duplicate
      const dup = await api.checkDuplicateTroop(unitType, unitNumber.trim(), councilId!) as { exists: boolean };
      if (dup.exists) {
        addToast("A unit with that type, number, and council already exists", "error");
        setBusy(false);
        return;
      }
      const name = `${unitType.charAt(0).toUpperCase() + unitType.slice(1)} ${unitNumber.trim()}`;
      const troop = await api.createTroop({
        name,
        unit_type: unitType,
        unit_number: unitNumber.trim(),
        council_id: councilId,
      });
      addToast("Unit registered!", "success");
      onComplete(troop.id);
    } catch (e: any) {
      addToast(e.message || "Failed to create unit", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="🏠"
        title="Register Your Unit"
        subtitle="Set up your BSA unit so your crew members can find and join you."
      />

      <div className="flex flex-col gap-4">
        {/* Unit type */}
        <div>
          <label className="block text-xs font-bold text-tl-text-dim mb-1.5 font-body">Unit Type</label>
          <div className="flex gap-2">
            {["troop", "crew", "ship", "post"].map(t => (
              <button
                key={t}
                onClick={() => setUnitType(t)}
                className={clsx(
                  "py-2 px-4 rounded-btn text-xs font-bold cursor-pointer transition-all font-body capitalize",
                  unitType === t
                    ? "bg-tl-accent text-white border-2 border-tl-accent"
                    : "bg-tl-bg-alt text-tl-text-dim border-2 border-tl-border-light hover:border-tl-accent/40",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Unit number */}
        <div>
          <label className="block text-xs font-bold text-tl-text-dim mb-1.5 font-body">Unit Number</label>
          <input
            type="text"
            value={unitNumber}
            onChange={e => setUnitNumber(e.target.value)}
            placeholder="e.g. 614"
            className="tl-input w-full"
            maxLength={10}
          />
        </div>

        {/* Council picker */}
        <div className="relative">
          <label className="block text-xs font-bold text-tl-text-dim mb-1.5 font-body">Council</label>
          {selectedCouncil ? (
            <div className="flex items-center gap-2 py-2 px-3 rounded-btn bg-tl-accent/10 border border-tl-accent/30">
              <MapPin size={14} className="text-tl-accent shrink-0" />
              <span className="text-xs text-tl-text font-body flex-1">{selectedCouncil.name}</span>
              <button onClick={() => { setCouncilId(null); setCouncilSearch(""); }} className="text-tl-text-dim hover:text-tl-text cursor-pointer bg-transparent border-none">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tl-text-dim" />
                <input
                  type="text"
                  value={councilSearch}
                  onChange={e => { setCouncilSearch(e.target.value); setShowCouncilDropdown(true); }}
                  onFocus={() => setShowCouncilDropdown(true)}
                  placeholder="Search your council..."
                  className="tl-input w-full pl-8"
                />
              </div>
              {showCouncilDropdown && filteredCouncils.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-btn border border-tl-border bg-tl-bg shadow-lg z-10">
                  {filteredCouncils.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCouncilId(c.id); setShowCouncilDropdown(false); setCouncilSearch(""); }}
                      className="w-full text-left py-2 px-3 text-xs font-body text-tl-text hover:bg-tl-bg-alt cursor-pointer border-none bg-transparent border-b border-b-tl-border/30"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || busy}>
          {busy ? "Creating..." : "Register Unit"}
        </PrimaryButton>
      </div>

      <FeatureCallout text="TrailLog tracks gear, training, readiness, and itineraries for your entire unit. Every member gets their own dashboard." />
    </WizardCard>
  );
}

// ─── Step 2b: Find Unit (Trekker/Scout) ──────────────────────────────────────

function StepFindUnit({ onComplete, userType }: { onComplete: (troopId: number, pending: boolean) => void; userType: string | null }) {
  const { addToast } = useToast();
  const [searchMode, setSearchMode] = useState<"search" | "code">("search");
  const [councils, setCouncils] = useState<Council[]>([]);
  const [councilId, setCouncilId] = useState<number | null>(null);
  const [councilSearch, setCouncilSearch] = useState("");
  const [showCouncilDropdown, setShowCouncilDropdown] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCouncils().then(setCouncils).catch(console.error);
  }, []);

  const filteredCouncils = useMemo(() => {
    if (!councilSearch.trim()) return councils.slice(0, 20);
    const q = councilSearch.toLowerCase();
    return councils.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [councils, councilSearch]);

  // Auto-search when council is selected
  const selectCouncil = async (council: Council) => {
    setCouncilId(council.id);
    setCouncilSearch(council.name);
    setShowCouncilDropdown(false);
    setSearching(true);
    setSearched(false);
    try {
      const troops = await api.searchTroopsByCouncil(council.id);
      setSearchResults(troops);
      setSearched(true);
    } catch {
      addToast("Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async (troopId: number) => {
    setBusy(true);
    try {
      await api.joinTroop(troopId);
      addToast("Join request sent!", "success");
      onComplete(troopId, true);
    } catch (e: any) {
      addToast(e.message || "Failed to join", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setBusy(true);
    try {
      const result = await api.joinTroopByCode(inviteCode.trim());
      addToast(`Joined ${result.troop_name}!`, "success");
      onComplete(result.troop_id, false);
    } catch (e: any) {
      addToast(e.message || "Invalid invite code", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="🔍"
        title={userType === "scout" ? "Find Your Troop" : "Find Your Unit"}
        subtitle="Search by council or enter an invite code from your crew leader."
      />

      {/* Toggle search / invite code */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchMode("search")}
          className={clsx(
            "flex-1 py-2 rounded-btn text-xs font-bold cursor-pointer font-body transition-all",
            searchMode === "search"
              ? "bg-tl-accent text-white border-2 border-tl-accent"
              : "bg-tl-bg-alt text-tl-text-dim border-2 border-tl-border-light",
          )}
        >
          Search by Council
        </button>
        <button
          onClick={() => setSearchMode("code")}
          className={clsx(
            "flex-1 py-2 rounded-btn text-xs font-bold cursor-pointer font-body transition-all",
            searchMode === "code"
              ? "bg-tl-accent text-white border-2 border-tl-accent"
              : "bg-tl-bg-alt text-tl-text-dim border-2 border-tl-border-light",
          )}
        >
          Invite Code
        </button>
      </div>

      {searchMode === "search" ? (
        <div className="flex flex-col gap-3">
          {/* Council search */}
          <div className="relative">
            <label className="block text-xs font-bold text-tl-text-dim mb-1 font-body">Search your council</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tl-text-dim" />
              <input
                type="text"
                value={councilSearch}
                onChange={e => {
                  setCouncilSearch(e.target.value);
                  setShowCouncilDropdown(true);
                  if (councilId) { setCouncilId(null); setSearchResults([]); setSearched(false); }
                }}
                onFocus={() => setShowCouncilDropdown(true)}
                placeholder="Type your council name..."
                className="tl-input w-full pl-8"
              />
            </div>
            {showCouncilDropdown && councilSearch && !councilId && filteredCouncils.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-btn border border-tl-border bg-tl-bg shadow-lg z-10">
                {filteredCouncils.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCouncil(c)}
                    className="w-full text-left py-2 px-3 text-xs font-body text-tl-text hover:bg-tl-bg-alt cursor-pointer border-none bg-transparent"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {searching && (
            <div className="text-center py-4 text-xs text-tl-text-dim">Searching units...</div>
          )}

          {/* Results — troops in this council */}
          {searched && !searching && searchResults.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-tl-text-dim font-body">
                {searchResults.length} unit{searchResults.length !== 1 ? "s" : ""} found in this council:
              </div>
              {searchResults.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-btn bg-tl-bg-alt border border-tl-border-light">
                  <div>
                    <div className="text-sm font-bold text-tl-heading font-display">{t.name}</div>
                    <div className="text-[10px] text-tl-text-dim">
                      {t.location || t.council}{t.member_count ? ` · ${t.member_count} member${Number(t.member_count) !== 1 ? "s" : ""}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(t.id)}
                    disabled={busy}
                    className="py-1.5 px-3 rounded-btn bg-tl-accent text-white text-xs font-bold cursor-pointer border-none font-body shrink-0"
                  >
                    Request to Join
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No results — offer to register */}
          {searched && !searching && searchResults.length === 0 && (
            <div className="text-center py-4 px-3 rounded-btn bg-tl-bg-alt border border-tl-border-light">
              <div className="text-sm font-bold text-tl-heading font-display mb-1">No units found</div>
              <div className="text-xs text-tl-text-dim mb-3">
                No units are registered in this council yet. Ask your crew leader for an invite code, or if you're the leader, go back and choose "Start a New Unit" instead.
              </div>
              <button
                onClick={() => setSearchMode("code")}
                className="py-2 px-4 rounded-btn bg-tl-accent/20 text-tl-accent text-xs font-bold cursor-pointer border border-tl-accent/40 font-body"
              >
                Try Invite Code Instead
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-tl-text-dim mb-1 font-body">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3XK9P2"
              maxLength={8}
              className="tl-input w-full text-center tracking-widest text-base font-mono"
            />
            <div className="text-[10px] text-tl-text-dim mt-1">
              Get this from your troop admin or crew leader
            </div>
          </div>
          <PrimaryButton onClick={handleJoinByCode} disabled={!inviteCode.trim() || busy}>
            {busy ? "Joining..." : "Join with Code"}
          </PrimaryButton>
        </div>
      )}

      <FeatureCallout text="Once approved, you'll see your crew's itinerary, gear checklist, training schedule, and readiness tracker." />
    </WizardCard>
  );
}

// ─── Step 3a: Plan Your Adventure (Admin) ────────────────────────────────────

function StepPlanAdventure({ troopId, onComplete }: { troopId: number; onComplete: (advId: number, crewId: number) => void }) {
  const { addToast } = useToast();
  const [adventureType, setAdventureType] = useState("philmont");
  const [crewName, setCrewName] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [arriveDate, setArriveDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [homeDate, setHomeDate] = useState("");
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getItineraries().then(setItineraries).catch(console.error);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Itinerary[]> = {};
    itineraries.forEach(it => {
      const key = `${it.days}-day`;
      if (!g[key]) g[key] = [];
      g[key].push(it);
    });
    return g;
  }, [itineraries]);

  const labels = DATE_LABELS[adventureType] || DATE_LABELS.philmont;
  const canSubmit = crewName.trim() && departDate && arriveDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      // Create adventure
      const name = crewName.trim().startsWith("Crew") ? crewName.trim() : `Crew ${crewName.trim()}`;
      const adv = await api.createAdventure(troopId, {
        name,
        adventure_type: adventureType,
        depart_date: departDate,
        arrive_date: arriveDate,
        return_date: returnDate || null,
        home_date: homeDate || null,
      });
      // Create crew under this adventure
      const crew = await api.createCrew(adv.id, {
        name,
        itinerary_id: itineraryId,
      });
      addToast("Adventure created!", "success");
      onComplete(adv.id, crew.id);
    } catch (e: any) {
      addToast(e.message || "Failed to create adventure", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="🗺️"
        title="Plan Your Adventure"
        subtitle="Tell us about your High Adventure trek."
      />

      <div className="flex flex-col gap-4">
        {/* Adventure type */}
        <div>
          <label className="block text-xs font-bold text-tl-text-dim mb-1.5 font-body">Adventure Type</label>
          <div className="grid grid-cols-2 gap-2">
            {ADVENTURE_TYPES.map(at => {
              const Icon = at.icon;
              return (
                <button
                  key={at.id}
                  onClick={() => setAdventureType(at.id)}
                  className={clsx(
                    "py-3 px-3 rounded-btn text-left transition-all cursor-pointer",
                    adventureType === at.id
                      ? "bg-tl-accent/15 border-2 border-tl-accent"
                      : "bg-tl-bg-alt border-2 border-tl-border-light hover:border-tl-accent/30",
                  )}
                >
                  <Icon size={18} className={adventureType === at.id ? "text-tl-accent" : "text-tl-text-dim"} />
                  <div className="text-xs font-bold text-tl-heading mt-1 font-display">{at.name}</div>
                  <div className="text-[10px] text-tl-text-dim">{at.location}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Crew name */}
        <div>
          <label className="block text-xs font-bold text-tl-text-dim mb-1 font-body">Crew Name</label>
          <input
            type="text"
            value={crewName}
            onChange={e => setCrewName(e.target.value)}
            placeholder="e.g. Crew 614-A"
            className="tl-input w-full"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-tl-text-dim mb-1 font-body">{labels.depart}</label>
            <input type="date" value={departDate} onChange={e => setDepartDate(e.target.value)} className="tl-input w-full text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-tl-text-dim mb-1 font-body">{labels.arrive}</label>
            <input type="date" value={arriveDate} onChange={e => setArriveDate(e.target.value)} className="tl-input w-full text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-tl-text-dim mb-1 font-body">{labels.return}</label>
            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="tl-input w-full text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-tl-text-dim mb-1 font-body">{labels.home}</label>
            <input type="date" value={homeDate} onChange={e => setHomeDate(e.target.value)} className="tl-input w-full text-xs" />
          </div>
        </div>

        {/* Itinerary picker */}
        {adventureType === "philmont" && Object.keys(grouped).length > 0 && (
          <div>
            <label className="block text-xs font-bold text-tl-text-dim mb-1.5 font-body">Itinerary (optional)</label>
            <div className="max-h-48 overflow-y-auto rounded-btn border border-tl-border p-2 bg-tl-bg-alt">
              {Object.entries(grouped).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([group, items]) => (
                <div key={group} className="mb-2">
                  <div className="text-[10px] font-bold text-tl-text-dim uppercase tracking-wide mb-1">{group}</div>
                  {items.map(it => (
                    <button
                      key={it.id}
                      onClick={() => setItineraryId(itineraryId === it.id ? null : it.id)}
                      className={clsx(
                        "w-full text-left py-1.5 px-2 rounded text-xs font-body cursor-pointer border-none transition-all",
                        itineraryId === it.id
                          ? "bg-tl-accent/15 text-tl-accent font-bold"
                          : "bg-transparent text-tl-text hover:bg-tl-bg",
                      )}
                    >
                      {it.name} · {it.miles}mi
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || busy}>
          {busy ? "Creating..." : "Create Adventure"}
        </PrimaryButton>
      </div>

      <FeatureCallout text="Your itinerary drives everything — daily schedules, dry camp warnings, water strategies, elevation profiles. Each crew member sees their own countdown." />
    </WizardCard>
  );
}

// ─── Step 3b: Feature Tour (Trekker) ─────────────────────────────────────────

function StepFeatureTour({ onContinue }: { onContinue: () => void }) {
  const features = [
    { icon: "🗺️", title: "Your Itinerary", desc: "Day-by-day route with camps, programs, dry camp warnings" },
    { icon: "🎒", title: "Personal Gear List", desc: "Check off items, track pack weight, get AI suggestions" },
    { icon: "💪", title: "Readiness Plan", desc: "AI generates a personalized training plan based on your fitness" },
    { icon: "📅", title: "Training Events", desc: "See scheduled hikes, mark attendance, coordinate with crew" },
    { icon: "⏱️", title: "Countdown", desc: "Live countdown to departure with phase tracking" },
  ];

  return (
    <WizardCard>
      <WizardTitle
        icon="✨"
        title="What TrailLog Does For You"
        subtitle="Here's everything you'll have access to once you're set up."
      />

      <div className="flex flex-col gap-3 mb-6">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 py-3 px-4 rounded-btn bg-tl-bg-alt border border-tl-border-light">
            <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <div className="text-sm font-bold text-tl-heading font-display">{f.title}</div>
              <div className="text-xs text-tl-text-dim mt-0.5 leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onContinue}>
        Got It — Let's Continue
      </PrimaryButton>
    </WizardCard>
  );
}

// ─── Step 4: Readiness Assessment ────────────────────────────────────────────

function StepReadiness({ crewId, pendingApproval, onComplete }: {
  crewId: number | null; pendingApproval: boolean; onComplete: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [busy, setBusy] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const allAnswered = READINESS_QUESTIONS.every(q => answers[q.key] !== undefined);

  // Compute a simple readiness estimate from answers
  const readinessEstimate = useMemo(() => {
    if (!allAnswered) return null;
    let score = 0;
    const dist = answers.current_distance_miles as number;
    if (dist >= 15) score += 30; else if (dist >= 10) score += 22; else if (dist >= 5) score += 12; else score += 5;
    const pack = answers.pack_experience as string;
    if (pack === "multi_day") score += 25; else if (pack === "day_pack") score += 15; else score += 5;
    const elev = answers.elevation_access as string;
    if (elev === "real_elevation") score += 25; else if (elev === "some_hills") score += 15; else score += 5;
    const activity = answers.activity_level as string;
    if (activity === "very_active") score += 20; else if (activity === "regularly_active") score += 15; else if (activity === "lightly_active") score += 8; else score += 3;
    return Math.min(score, 100);
  }, [answers, allAnswered]);

  const handleAnalyze = async () => {
    if (!allAnswered) return;
    setBusy(true);
    try {
      if (crewId) {
        await api.submitAssessment(crewId, answers);
      }
    } catch (e) {
      // If pending approval, the API may reject — that's OK, score still shows locally
      console.error(e);
    } finally {
      setBusy(false);
      setShowResult(true);
    }
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 75) return { label: "Looking Strong", color: "text-green-500", tip: "You're in great shape. Keep up the training and you'll be ready." };
    if (score >= 50) return { label: "Good Foundation", color: "text-yellow-500", tip: "Solid start. Focus on increasing distance and pack weight over the next few months." };
    if (score >= 25) return { label: "Building Up", color: "text-orange-400", tip: "Start with regular hikes and gradually add pack weight. You've got time." };
    return { label: "Getting Started", color: "text-red-400", tip: "No worries — everyone starts somewhere. Start walking regularly and build up from there." };
  };

  if (showResult && readinessEstimate !== null) {
    const info = getReadinessLabel(readinessEstimate);
    return (
      <WizardCard>
        <WizardTitle
          icon="📊"
          title="Your Readiness Snapshot"
        />

        {/* Readiness ring */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-tl-border" />
              <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" strokeLinecap="round"
                className="text-tl-accent transition-all duration-1000"
                strokeDasharray={`${readinessEstimate * 3.14} 314`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-display text-tl-heading">{readinessEstimate}%</span>
            </div>
          </div>
          <div className={clsx("text-sm font-bold font-display mt-2", info.color)}>{info.label}</div>
        </div>

        {/* Tip */}
        <div className="py-3 px-4 rounded-btn bg-tl-bg-alt border border-tl-border-light mb-5">
          <div className="text-xs text-tl-text leading-relaxed">{info.tip}</div>
        </div>

        {/* What happens next */}
        <div className="text-[10px] text-tl-text-dim mb-4 text-center">
          Once you're in your crew, the Readiness tab will generate a personalized week-by-week training plan.
        </div>

        <PrimaryButton onClick={onComplete}>
          Continue
        </PrimaryButton>
      </WizardCard>
    );
  }

  return (
    <WizardCard>
      <WizardTitle
        icon="🧗"
        title="How Ready Are You?"
        subtitle="Quick fitness check — this helps us build your personalized training plan."
      />

      <div className="flex flex-col gap-5">
        {READINESS_QUESTIONS.map(q => (
          <div key={q.key}>
            <div className="text-xs font-bold text-tl-heading mb-2 font-body">{q.label}</div>
            <div className="flex flex-col gap-1.5">
              {q.options.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.key]: opt.value }))}
                  className={clsx(
                    "py-2.5 px-4 rounded-btn text-xs font-body text-left cursor-pointer transition-all border-2",
                    answers[q.key] === opt.value
                      ? "border-tl-accent bg-tl-accent/12 text-tl-accent font-bold"
                      : "border-tl-border-light bg-tl-bg-alt text-tl-text hover:border-tl-accent/30",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={handleAnalyze} disabled={!allAnswered || busy}>
          {busy ? "Analyzing..." : "See My Readiness"}
        </PrimaryButton>
      </div>
    </WizardCard>
  );
}

// ─── Step 5: Training Dates ──────────────────────────────────────────────────

function StepTrainingDates({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  // Generate next 7 days
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push({
        key: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    return result;
  }, []);

  const toggleDay = (key: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="📅"
        title="Your First Training Week"
        subtitle="Pick days you can train this week. We'll help coordinate with your crew."
      />

      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map(d => (
          <button
            key={d.key}
            onClick={() => toggleDay(d.key)}
            className={clsx(
              "flex flex-col items-center py-3 rounded-btn cursor-pointer transition-all border-2",
              selectedDays.has(d.key)
                ? "border-tl-accent bg-tl-accent/15 text-tl-accent"
                : "border-tl-border-light bg-tl-bg-alt text-tl-text-dim hover:border-tl-accent/30",
            )}
          >
            <span className="text-[10px] font-bold font-body uppercase">{d.dayName}</span>
            <span className="text-lg font-bold font-display mt-0.5">{d.dayNum}</span>
            <span className="text-[9px] font-body">{d.month}</span>
            {selectedDays.has(d.key) && <Check size={12} className="mt-1 text-tl-accent" />}
          </button>
        ))}
      </div>

      <PrimaryButton onClick={onComplete} disabled={selectedDays.size === 0}>
        Save {selectedDays.size} Day{selectedDays.size !== 1 ? "s" : ""}
      </PrimaryButton>
      <SkipLink onClick={onSkip} label="I'll schedule later" />
    </WizardCard>
  );
}

// ─── Step 6: Gear Quick-Check ────────────────────────────────────────────────

function StepGearCheck({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const toggleItem = (name: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const pct = Math.round((owned.size / ESSENTIAL_GEAR.length) * 100);

  return (
    <WizardCard>
      <WizardTitle
        icon="🎒"
        title="Gear You Already Own"
        subtitle="Tap items you own. We'll track the rest on your gear checklist."
      />

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full bg-tl-bg-alt overflow-hidden">
          <div className="h-full rounded-full bg-tl-accent transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-bold text-tl-text-dim font-body whitespace-nowrap">
          {owned.size} of {ESSENTIAL_GEAR.length} · {pct}%
        </span>
      </div>

      {/* Gear grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {ESSENTIAL_GEAR.map(item => (
          <button
            key={item.name}
            onClick={() => toggleItem(item.name)}
            className={clsx(
              "flex flex-col items-center py-3 px-2 rounded-btn cursor-pointer transition-all border-2 min-h-[72px]",
              owned.has(item.name)
                ? "border-tl-accent bg-tl-accent/12"
                : "border-tl-border-light bg-tl-bg-alt hover:border-tl-accent/30",
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={clsx(
              "text-[9px] font-body mt-1 text-center leading-tight",
              owned.has(item.name) ? "text-tl-accent font-bold" : "text-tl-text-dim",
            )}>
              {item.name}
            </span>
            {owned.has(item.name) && (
              <Check size={10} className="text-tl-accent mt-0.5" />
            )}
          </button>
        ))}
      </div>

      <PrimaryButton onClick={onComplete}>
        {owned.size > 0 ? `Save ${owned.size} Item${owned.size !== 1 ? "s" : ""}` : "Continue"}
      </PrimaryButton>
      <SkipLink onClick={onSkip} />
    </WizardCard>
  );
}

// ─── Step 7: Invite Members (Admin) ──────────────────────────────────────────

function StepInviteMembers({ adventureId, onComplete, onSkip }: {
  adventureId: number; onComplete: () => void; onSkip: () => void;
}) {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setBusy(true);
    try {
      await api.sendInvitation(adventureId, email.trim());
      setSentEmails(prev => [...prev, email.trim()]);
      setEmail("");
      addToast("Invitation sent!", "success");
    } catch (e: any) {
      addToast(e.message || "Failed to send invitation", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="📨"
        title="Build Your Crew"
        subtitle="Invite crew members by email. They'll get a link to join your adventure."
      />

      {/* Email input */}
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="crew.member@email.com"
          className="tl-input flex-1"
        />
        <button
          onClick={handleSend}
          disabled={!email.trim() || busy}
          className="py-2 px-4 rounded-btn bg-tl-accent text-white border-none cursor-pointer font-body text-xs font-bold disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Sent list */}
      {sentEmails.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-tl-text-dim mb-1 font-body">Invitations Sent</div>
          <div className="flex flex-col gap-1">
            {sentEmails.map((em, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded bg-green-500/10 text-xs">
                <Check size={12} className="text-green-500" />
                <span className="text-tl-text font-body">{em}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature discovery grid */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-tl-text-dim mb-2 font-body uppercase tracking-wide">
          What your crew members will see
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "🎒", title: "Gear Checklist", desc: "AI-powered pack list" },
            { icon: "📊", title: "Readiness Engine", desc: "Personalized training plans" },
            { icon: "📅", title: "Training Calendar", desc: "Schedule hikes, track attendance" },
            { icon: "📋", title: "Reports", desc: "Excel exports for everything" },
          ].map((f, i) => (
            <div key={i} className="py-2 px-3 rounded-btn bg-tl-bg-alt text-center">
              <div className="text-lg">{f.icon}</div>
              <div className="text-[10px] font-bold text-tl-heading mt-1">{f.title}</div>
              <div className="text-[9px] text-tl-text-dim">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <PrimaryButton onClick={onComplete}>
        {sentEmails.length > 0 ? "Continue" : "Skip for Now"}
      </PrimaryButton>
      {sentEmails.length === 0 && <SkipLink onClick={onSkip} label="I'll invite later" />}
    </WizardCard>
  );
}

// ─── Connect Scout (Parent) ──────────────────────────────────────────────────

function StepConnectScout({ onComplete }: { onComplete: () => void }) {
  const { addToast } = useToast();
  const [scoutEmail, setScoutEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    if (!scoutEmail.trim()) return;
    setBusy(true);
    try {
      // For now, just save and proceed - actual linking happens through troop join
      addToast("We'll connect you once your scout confirms", "success");
      onComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardCard>
      <WizardTitle
        icon="👨‍👦"
        title="Connect to Your Scout"
        subtitle="Enter your scout's email address so we can link your accounts."
      />

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-tl-text-dim mb-1 font-body">Scout's Email</label>
          <input
            type="email"
            value={scoutEmail}
            onChange={e => setScoutEmail(e.target.value)}
            placeholder="your.scout@email.com"
            className="tl-input w-full"
          />
        </div>

        <PrimaryButton onClick={handleConnect} disabled={!scoutEmail.trim() || busy}>
          {busy ? "Connecting..." : "Connect"}
        </PrimaryButton>
      </div>

      <FeatureCallout text="As a parent, you'll see your scout's gear progress, readiness score, training attendance, and upcoming schedule." />
    </WizardCard>
  );
}

// ─── Parent Dashboard Preview ────────────────────────────────────────────────

function StepParentDashboard({ onFinish, busy }: { onFinish: () => void; busy: boolean }) {
  return (
    <WizardCard>
      <WizardTitle
        icon="📱"
        title="Your Dashboard"
        subtitle="Here's what you'll see when you log in."
      />

      <div className="flex flex-col gap-3 mb-6">
        {[
          { icon: "📊", title: "Readiness Score", desc: "See how prepared your scout is for the trek" },
          { icon: "🎒", title: "Gear Progress", desc: "Track what gear they still need to get" },
          { icon: "📅", title: "Training Schedule", desc: "View upcoming training hikes and events" },
          { icon: "📝", title: "Documents", desc: "Access permission forms and medical info" },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-4 rounded-btn bg-tl-bg-alt border border-tl-border-light">
            <span className="text-xl shrink-0">{f.icon}</span>
            <div>
              <div className="text-xs font-bold text-tl-heading font-display">{f.title}</div>
              <div className="text-[10px] text-tl-text-dim">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onFinish} disabled={busy}>
        {busy ? "Finishing..." : "Enter TrailLog"}
      </PrimaryButton>
    </WizardCard>
  );
}

// ─── Final Step: Summary ─────────────────────────────────────────────────────

function StepSummary({ role, pendingApproval, onFinish, busy }: {
  role: string | null; pendingApproval: boolean; onFinish: () => void; busy: boolean;
}) {
  return (
    <WizardCard>
      <WizardTitle
        icon="✅"
        title={pendingApproval ? "Almost There!" : "You're All Set"}
        subtitle={pendingApproval
          ? "Your join request has been sent. You'll get access once your crew leader approves you."
          : "Your adventure is ready. Pick your first action below."
        }
      />

      {!pendingApproval && (
        <div className="flex flex-col gap-3 mb-6">
          {role === "admin" && (
            <>
              <SummaryAction icon="🎒" title="Open Gear Catalog" desc="Customize gear requirements for your crew" />
              <SummaryAction icon="📅" title="Schedule a Training Hike" desc="Plan your crew's first group outing" />
              <SummaryAction icon="🗺️" title="Explore Your Itinerary" desc="See your route day by day" />
            </>
          )}
          {role === "trekker" && (
            <>
              <SummaryAction icon="🎒" title="Start Your Gear List" desc="Check off items you already own" />
              <SummaryAction icon="💪" title="View Training Plan" desc="See your personalized readiness plan" />
              <SummaryAction icon="🗺️" title="Explore Itinerary" desc="Check out your trek route" />
            </>
          )}
        </div>
      )}

      {pendingApproval && (
        <div className="mb-6 py-4 px-4 rounded-btn bg-yellow-500/10 border border-yellow-500/20 text-center">
          <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400 font-display">
            Waiting for Approval
          </div>
          <div className="text-xs text-tl-text-dim mt-1">
            Your crew leader will review your request. We'll notify you when you're approved.
          </div>
        </div>
      )}

      <PrimaryButton onClick={onFinish} disabled={busy}>
        {busy ? "Finishing..." : "Enter TrailLog"}
      </PrimaryButton>
    </WizardCard>
  );
}

function SummaryAction({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-btn bg-tl-bg-alt border border-tl-border-light cursor-pointer hover:border-tl-accent/40 transition-all">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-bold text-tl-heading font-display">{title}</div>
        <div className="text-[10px] text-tl-text-dim">{desc}</div>
      </div>
      <ChevronRight size={14} className="text-tl-text-dim shrink-0" />
    </div>
  );
}
