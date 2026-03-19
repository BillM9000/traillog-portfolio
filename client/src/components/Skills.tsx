import type React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useAuth } from "../contexts/AuthContext";
import { TRAIL_BADGES, JOURNEY_WAYPOINTS } from "../utils/theme";
import { computeCrewReadiness, computeMemberReadiness } from "../utils/readiness";
import { Activity, Mountain, Footprints, Backpack, RefreshCw, ChevronRight, Target, AlertTriangle, CheckCircle2, Sparkles, Brain, Compass, Route, Lock } from "lucide-react";
import type { ThemeColors, Skill, ReadinessScore, JourneyWaypoint, TrailBadgeDef, GearCatalogItem, MemberGearItem, Achievement } from "../types";
import type { LucideIcon } from "lucide-react";

// ── Local interfaces ──

interface AIStep {
  icon: LucideIcon;
  text: string;
}

interface AssessmentForm {
  current_distance_miles: number;
  pack_experience: string;
  elevation_access: string;
  activity_level: string;
}

interface Assessment {
  current_distance_miles: number;
  pack_experience: string;
  elevation_access: string;
  activity_level: string;
}

interface PlanPhase {
  number: number;
  name: string;
  weeks: string;
  focus: string;
  pack_weight?: string;
  benchmarks?: string[];
}

interface Plan {
  plan?: {
    phases?: PlanPhase[];
    summary?: string;
    total_phases?: number;
  };
  phases?: PlanPhase[];
  summary?: string;
  total_phases?: number;
}

interface Priority {
  title: string;
  detail: string;
  urgency: string;
}

interface PhaseProgress {
  phase_number: number;
  status: string;
}

interface RiskResult {
  level: string;
  label: string;
}

interface LeaderDashboardMember {
  user_id: number;
  name: string;
  avatar_url?: string;
  participation: string;
  assessment?: Assessment;
  plan?: { plan?: { phases?: PlanPhase[] } };
  progress?: PhaseProgress[];
}

interface SkillsMember {
  user_id?: number;
  id?: number;
  name: string;
  skills?: number[];
  medical?: number[];
  admin_tasks?: number[];
  participation: string;
  user_type?: string;
  color?: { bg?: string };
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  pct: number;
  skills?: Skill[];
  field?: string;
  toggle?: (skillId: number) => void;
}

interface SkillsProps {
  members: SkillsMember[];
  active: number | null;
  skills: Skill[];
  analysis: unknown;
  isAdmin: boolean;
  onToggleSkill: (skillId: number) => void;
  onAddSkill: (name: string, desc: string, category: string) => Promise<void>;
  onRemoveSkill: (skillId: number) => void;
  adventureId: number | null;
  updateMemberLocally: ((userId: number, updates: Record<string, unknown>) => void) | null;
  achievements: Achievement[];
}

// ── AI Plan Generation Loading Experience ──

function AIGeneratingCard(): React.ReactElement {
  const { theme } = useTheme();
  const [step, setStep] = useState<number>(0);
  const steps: AIStep[] = [
    { icon: Brain, text: "Analyzing your fitness level & experience..." },
    { icon: Compass, text: "Reviewing your itinerary & elevation profile..." },
    { icon: Route, text: "Building personalized training phases..." },
    { icon: Sparkles, text: "Finalizing your custom readiness plan..." },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s < steps.length - 1 ? s + 1 : s));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="tl-card mb-2.5 px-5 py-6 text-center relative overflow-hidden" style={{
      background: `linear-gradient(135deg, var(--tl-bg-alt), var(--tl-bg))`,
      border: `2px solid ${theme.accent}44`,
    }}>
      {/* Animated background shimmer */}
      <div className="absolute top-0 -left-full w-[200%] h-full" style={{
        background: `linear-gradient(90deg, transparent, ${theme.accent}08, transparent)`,
        animation: "aiShimmer 2s ease-in-out infinite",
      }} />

      {/* Sparkle decorations */}
      <div className="absolute top-2 right-3 opacity-15" style={{ animation: "aiPulse 1.5s ease-in-out infinite" }}>
        <Sparkles size={20} color={theme.accent} />
      </div>
      <div className="absolute bottom-2 left-3 opacity-10" style={{ animation: "aiPulse 1.5s ease-in-out infinite 0.5s" }}>
        <Sparkles size={16} color={theme.accent} />
      </div>

      {/* AI badge */}
      <div className="inline-flex items-center gap-1.5 rounded-[20px] px-3.5 py-1 mb-3.5" style={{
        background: `${theme.accent}18`, border: `1px solid ${theme.accent}33`,
      }}>
        <Sparkles size={12} color={theme.accent} style={{ animation: "aiPulse 1s ease-in-out infinite" }} />
        <span className="text-[10px] font-extrabold font-body tracking-[1.2px] uppercase" style={{ color: theme.accent }}>
          Powered by Claude AI
        </span>
      </div>

      {/* Main icon */}
      <div className="mb-3 relative">
        <div className="w-[52px] h-[52px] rounded-full mx-auto flex items-center justify-center" style={{
          background: `${theme.accent}15`, border: `2px solid ${theme.accent}33`,
          animation: "aiPulse 1.5s ease-in-out infinite",
        }}>
          <Icon size={24} color={theme.accent} />
        </div>
      </div>

      {/* Title */}
      <div className="text-[16px] font-extrabold text-tl-heading font-display mb-1.5">
        Building Your AI Training Plan
      </div>
      <div className="text-[12px] text-tl-text-muted mb-4 leading-[1.4]">
        Our AI is analyzing your assessment, itinerary, and departure date to create a plan tailored specifically for you.
      </div>

      {/* Step indicators */}
      <div className="flex flex-col gap-1.5 max-w-[300px] mx-auto">
        {steps.map((s: AIStep, i: number) => {
          const StepIcon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] transition-all duration-[400ms]" style={{
              background: active ? `${theme.accent}12` : "transparent",
              border: active ? `1px solid ${theme.accent}22` : "1px solid transparent",
            }}>
              <div className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center transition-all duration-[400ms]" style={{
                background: done ? theme.accent : active ? `${theme.accent}25` : `${theme.textDimmest}22`,
              }}>
                {done ? (
                  <CheckCircle2 size={12} color="#fff" />
                ) : (
                  <StepIcon size={11} color={active ? theme.accent : theme.textDimmest} style={active ? { animation: "aiPulse 1s ease-in-out infinite" } : {}} />
                )}
              </div>
              <span className="text-[11px] font-body transition-all duration-[400ms]" style={{
                fontWeight: active ? 700 : 500,
                color: done ? theme.accent : active ? theme.heading : theme.textDimmest,
              }}>
                {s.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes aiShimmer {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// ── AI Ready Badge Celebration ──

interface AIBadgeCelebrationProps {
  onDismiss: () => void;
}

function AIBadgeCelebration({ onDismiss }: AIBadgeCelebrationProps): React.ReactElement {
  return (
    <div className="tl-card mb-2.5 px-5 py-7 text-center relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
      border: "2px solid #e2b340",
      animation: "badgeSlideIn 0.6s ease-out",
    }}>
      {/* Sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full opacity-60" style={{
          top: `${10 + Math.random() * 80}%`,
          left: `${5 + Math.random() * 90}%`,
          background: i % 2 === 0 ? "#e2b340" : "#fff",
          animation: `badgeSparkle ${1.5 + Math.random()}s ease-in-out infinite ${Math.random() * 0.5}s`,
        }} />
      ))}

      {/* Badge icon */}
      <div className="text-[56px] mb-2" style={{
        animation: "badgePop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both",
        filter: "drop-shadow(0 0 20px rgba(226, 179, 64, 0.5))",
      }}>
        {"\uD83E\uDD16"}
      </div>

      {/* Title */}
      <div className="text-[20px] font-black font-display mb-1 tracking-[0.5px]" style={{
        color: "#e2b340",
        animation: "badgeFadeIn 0.5s ease-out 0.5s both",
      }}>
        Badge Earned!
      </div>
      <div className="text-[15px] font-bold font-display mb-2.5" style={{
        color: "#fff",
        animation: "badgeFadeIn 0.5s ease-out 0.7s both",
      }}>
        AI Ready
      </div>
      <div className="text-[12px] leading-[1.5] max-w-[280px] mx-auto mb-4" style={{
        color: "#ccc",
        animation: "badgeFadeIn 0.5s ease-out 0.9s both",
      }}>
        You completed your AI self-assessment and received a personalized training plan powered by Claude AI.
      </div>

      {/* Dismiss */}
      <button onClick={onDismiss} className="px-6 py-2 rounded-[8px] text-[12px] font-bold cursor-pointer font-body" style={{
        border: "1px solid #e2b34055",
        background: "#e2b34020", color: "#e2b340",
        animation: "badgeFadeIn 0.5s ease-out 1.1s both",
      }}>
        Awesome!
      </button>

      <style>{`
        @keyframes badgeSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.15); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes badgeFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgeSparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default function Skills({ members, active, skills, analysis, isAdmin, onToggleSkill, onAddSkill, onRemoveSkill, adventureId, updateMemberLocally, achievements }: SkillsProps): React.ReactElement {
  const { theme, mode } = useTheme();
  const { gearCatalog, memberGearMap, selectedCrewId } = useAdventure();
  const { user } = useAuth();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["training"]));
  const [newSkillName, setNewSkillName] = useState<string>("");
  const [newSkillDesc, setNewSkillDesc] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [addCategory, setAddCategory] = useState<string>("training");
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<number | null>(null);
  const [showBadgeLegend, setShowBadgeLegend] = useState<boolean>(false);

  // AI Readiness Engine state
  const [showAssessment, setShowAssessment] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState<boolean>(true);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>({ current_distance_miles: 3, pack_experience: "none", elevation_access: "flat_only", activity_level: "lightly_active" });
  const [assessmentSaving, setAssessmentSaving] = useState<boolean>(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [progress, setProgress] = useState<PhaseProgress[]>([]);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [showPhases, setShowPhases] = useState<boolean>(false);
  const [badgeCelebration, setBadgeCelebration] = useState<string | null>(null);

  // Load assessment + plan on mount
  const loadAIReadiness = useCallback(async () => {
    if (!selectedCrewId || !user) return;
    setAssessmentLoading(true);
    try {
      const { assessment: a } = await api.getAssessment(selectedCrewId as number) as { assessment: Assessment | null };
      setAssessment(a);
      if (a) {
        setAssessmentForm({ current_distance_miles: a.current_distance_miles, pack_experience: a.pack_experience, elevation_access: a.elevation_access, activity_level: a.activity_level });
        // Load plan
        setPlanLoading(true);
        try {
          const result = await api.getReadinessPlan(selectedCrewId as number, user.id) as { plan: Plan; priorities?: Priority[]; progress?: PhaseProgress[]; badge_earned?: string };
          setPlan(result.plan);
          setPriorities(result.priorities || []);
          setProgress(result.progress || []);
          if (result.badge_earned === "ai_ready") {
            setBadgeCelebration("ai_ready");
            setTimeout(() => setBadgeCelebration(null), 6000);
          }
        } catch (e: unknown) {
          // No plan yet — that's OK, will be generated
          console.log("No plan yet:", (e as Error).message);
        }
        setPlanLoading(false);
      }
    } catch (e: unknown) { console.error("Error loading AI readiness:", e); }
    setAssessmentLoading(false);
  }, [selectedCrewId, user]);

  useEffect(() => { loadAIReadiness(); }, [loadAIReadiness]);

  const submitAssessment = async (): Promise<void> => {
    if (!selectedCrewId || assessmentSaving) return;
    setAssessmentSaving(true);
    try {
      const result = await api.submitAssessment(selectedCrewId as number, assessmentForm) as { assessment: Assessment };
      setAssessment(result.assessment);
      setShowAssessment(false);
      // Generate plan
      setPlanLoading(true);
      const planResult = await api.getReadinessPlan(selectedCrewId as number, user!.id) as { plan: Plan; priorities?: Priority[]; progress?: PhaseProgress[]; badge_earned?: string };
      setPlan(planResult.plan);
      setPriorities(planResult.priorities || []);
      setProgress(planResult.progress || []);
      setPlanLoading(false);
      // Badge celebration
      if (planResult.badge_earned === "ai_ready") {
        setBadgeCelebration("ai_ready");
        setTimeout(() => setBadgeCelebration(null), 6000);
      }
    } catch (e: unknown) { console.error(e); }
    setAssessmentSaving(false);
  };

  const handleRegenerate = async (): Promise<void> => {
    if (!selectedCrewId || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.regenerateReadinessPlan(selectedCrewId as number) as { plan: Plan; priorities?: Priority[]; badge_earned?: string };
      setPlan(result.plan);
      setPriorities(result.priorities || []);
      setProgress([]);
      if (result.badge_earned === "ai_ready") {
        setBadgeCelebration("ai_ready");
        setTimeout(() => setBadgeCelebration(null), 6000);
      }
    } catch (e: unknown) { console.error(e); }
    setRegenerating(false);
  };

  const updatePhaseProgress = async (phaseNumber: number, status: string): Promise<void> => {
    if (!selectedCrewId) return;
    try {
      const result = await api.updateReadinessProgress(selectedCrewId as number, { phase_number: phaseNumber, status }) as { progress?: PhaseProgress[] };
      setProgress(result.progress || []);
    } catch (e: unknown) { console.error(e); }
  };

  const am = active !== null ? members[active] : null;

  // Only trekking members count for readiness
  const trekkingMembers = useMemo(() => members.filter(m => m.participation === "trekking"), [members]);

  const trainingSkills = useMemo(() => skills.filter(s => s.category === "training"), [skills]);
  const medicalSkills = useMemo(() => skills.filter(s => s.category === "medical"), [skills]);
  const adminSkills = useMemo(() => skills.filter(s => s.category === "admin"), [skills]);

  // Use shared readiness calculation (single source of truth)
  const readiness = useMemo(() =>
    computeCrewReadiness(members as any, skills, gearCatalog as any, memberGearMap as any),
    [members, skills, gearCatalog, memberGearMap]);

  const toggleMedical = async (skillId: number): Promise<void> => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    const current = m.medical || [];
    const updated = current.includes(skillId) ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id!, { medical: updated });
    try { await api.updateCrewMedical(selectedCrewId as number, m.user_id!, updated); } catch (e: unknown) { console.error(e); }
  };

  const toggleAdmin = async (skillId: number): Promise<void> => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    const current = m.admin_tasks || [];
    const updated = current.includes(skillId) ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id!, { admin_tasks: updated });
    try { await api.updateCrewAdmin(selectedCrewId as number, m.user_id!, updated); } catch (e: unknown) { console.error(e); }
  };

  const [addError, setAddError] = useState<string>("");
  const [addingSkill, setAddingSkill] = useState<boolean>(false);

  const handleAdd = async (): Promise<void> => {
    const name = newSkillName.trim();
    if (!name) { setAddError("Item name is required"); return; }
    if (!adventureId || addingSkill) return;
    setAddError(""); setAddingSkill(true);
    try {
      await onAddSkill(name, newSkillDesc, addCategory);
      setNewSkillName(""); setNewSkillDesc(""); setShowAddForm(false);
    } catch (e: unknown) { console.error(e); }
    setAddingSkill(false);
  };

  const categories: CategoryDef[] = [
    { id: "training", label: "Training", icon: "\uD83C\uDF92", pct: readiness.training, skills: trainingSkills, field: "skills", toggle: onToggleSkill },
    { id: "gear", label: "Gear", icon: "\uD83C\uDF92", pct: readiness.gear },
    { id: "medical", label: "Medical", icon: "\uD83C\uDFE5", pct: readiness.medical, skills: medicalSkills, field: "medical", toggle: toggleMedical },
    { id: "admin", label: "Admin", icon: "\uD83D\uDCCB", pct: readiness.admin, skills: adminSkills, field: "admin_tasks", toggle: toggleAdmin },
  ];

  // Current waypoint
  const currentWaypoint = JOURNEY_WAYPOINTS.reduce((best: JourneyWaypoint, wp: JourneyWaypoint) => readiness.overall >= wp.pct ? wp : best, JOURNEY_WAYPOINTS[0]);

  // Leader dashboard state
  const [leaderDashboard, setLeaderDashboard] = useState<LeaderDashboardMember[] | null>(null);
  const [showLeaderView, setShowLeaderView] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCrewId || !isAdmin) return;
    api.getReadinessDashboard(selectedCrewId as number).then((r: any) => setLeaderDashboard(r.dashboard)).catch(() => {});
  }, [selectedCrewId, isAdmin]);

  const urgencyColor = (u: string): string => u === "red" ? theme.danger : u === "yellow" ? theme.gold : theme.accent;
  const urgencyIcon = (u: string): React.ReactElement => u === "red" ? <AlertTriangle size={14} /> : u === "yellow" ? <Target size={14} /> : <CheckCircle2 size={14} />;
  const phaseStatus = (num: number): string => progress.find(p => p.phase_number === num)?.status || "not_started";
  const phaseStatusColor = (s: string): string => s === "complete" ? theme.accent : s === "working" ? theme.gold : theme.textDimmest;

  // Determine member AI risk status from leader dashboard
  const getMemberRisk = (memberData: LeaderDashboardMember): RiskResult => {
    if (!memberData.assessment) return { level: "none", label: "No Assessment" };
    if (!memberData.plan) return { level: "none", label: "No Plan" };
    const plan = memberData.plan.plan;
    const prog = memberData.progress || [];
    if (!plan?.phases) return { level: "green", label: "Plan Generated" };
    const totalPhases = plan.phases.length;
    const completed = prog.filter(p => p.status === "complete").length;
    const working = prog.filter(p => p.status === "working").length;
    if (completed === totalPhases) return { level: "green", label: "On Track" };
    if (completed + working > 0) return { level: "yellow", label: `Phase ${completed + 1}/${totalPhases}` };
    return { level: "red", label: "Not Started" };
  };
  const riskColor = (level: string): string => level === "red" ? theme.danger : level === "yellow" ? theme.gold : level === "green" ? theme.accent : theme.textDimmest;

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Self-Assessment Prompt — show if no assessment and not loading */}
      {!assessmentLoading && !assessment && !showAssessment && selectedCrewId && (
        <div className="tl-card mb-2.5 text-center" style={{ border: `2px solid ${theme.accent}` }}>
          <div className="text-[20px] mb-1.5"><Activity size={24} color={theme.accent} /></div>
          <div className="text-[14px] font-bold text-tl-heading font-display mb-1">AI Readiness Coach</div>
          <div className="text-[12px] text-tl-text-muted mb-1.5 leading-[1.4]">
            Take a 30-second self-assessment and get a personalized training plan based on your itinerary and departure date.
          </div>
          <div className="text-[9px] text-tl-text-dimmest mb-2.5 leading-[1.3] italic">
            For general guidance only &mdash; not medical or professional fitness advice.
          </div>
          <button onClick={() => setShowAssessment(true)} className="px-6 py-2.5 rounded-[8px] border-none bg-tl-accent text-white text-[13px] font-bold cursor-pointer font-body">Start Assessment</button>
        </div>
      )}

      {/* Assessment Modal */}
      {showAssessment && (
        <div className="tl-card mb-2.5" style={{ border: `2px solid ${theme.accent}` }}>
          <div className="tl-card-title flex items-center gap-2">
            <Activity size={16} color={theme.accent} />
            Self-Assessment
          </div>
          <div className="text-[11px] text-tl-text-muted mb-3">No judgment &mdash; just where you are today. You can retake this anytime.</div>

          {/* Distance slider */}
          <div className="mb-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Footprints size={14} className="text-tl-text-dim" />
              <span className="text-[12px] font-semibold text-tl-heading">Comfortable hiking distance</span>
            </div>
            <input type="range" min="1" max="15" step="0.5" value={assessmentForm.current_distance_miles}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentForm(f => ({ ...f, current_distance_miles: parseFloat(e.target.value) }))}
              className="w-full" style={{ accentColor: theme.accent }} />
            <div className="flex justify-between text-[10px] text-tl-text-dimmer">
              <span>1 mi</span>
              <span className="font-bold text-tl-accent text-[13px]">{assessmentForm.current_distance_miles} miles</span>
              <span>15 mi</span>
            </div>
          </div>

          {/* Pack experience */}
          <div className="mb-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Backpack size={14} className="text-tl-text-dim" />
              <span className="text-[12px] font-semibold text-tl-heading">Pack experience</span>
            </div>
            {([["none", "None", "Never carried a loaded pack"], ["day_pack", "Some", "Day pack weight (10-15 lbs)"], ["loaded", "Loaded", "Overnight weight (30+ lbs)"]] as [string, string, string][]).map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, pack_experience: val }))}
                className="px-2.5 py-2 rounded-[6px] mb-[3px] cursor-pointer" style={{
                  border: assessmentForm.pack_experience === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.pack_experience === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div className="text-[12px] font-semibold" style={{ color: assessmentForm.pack_experience === val ? theme.accent : theme.text }}>{label}</div>
                <div className="text-[10px] text-tl-text-dimmer">{desc}</div>
              </div>
            ))}
          </div>

          {/* Elevation access */}
          <div className="mb-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Mountain size={14} className="text-tl-text-dim" />
              <span className="text-[12px] font-semibold text-tl-heading">Elevation/incline access</span>
            </div>
            {([["flat_only", "Flat terrain only", "No hills available for training"], ["some_hills", "Some hills", "Moderate inclines available"], ["real_elevation", "Real elevation", "Mountains or steep terrain nearby"]] as [string, string, string][]).map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, elevation_access: val }))}
                className="px-2.5 py-2 rounded-[6px] mb-[3px] cursor-pointer" style={{
                  border: assessmentForm.elevation_access === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.elevation_access === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div className="text-[12px] font-semibold" style={{ color: assessmentForm.elevation_access === val ? theme.accent : theme.text }}>{label}</div>
                <div className="text-[10px] text-tl-text-dimmer">{desc}</div>
              </div>
            ))}
          </div>

          {/* Activity level */}
          <div className="mb-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity size={14} className="text-tl-text-dim" />
              <span className="text-[12px] font-semibold text-tl-heading">Current activity level</span>
            </div>
            {([["sedentary", "Sedentary", "Mostly desk/couch"], ["lightly_active", "Lightly active", "Walk regularly, some activity"], ["regularly_active", "Regularly active", "Exercise 3-4x/week"], ["very_active", "Very active", "Daily exercise or physical job"]] as [string, string, string][]).map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, activity_level: val }))}
                className="px-2.5 py-2 rounded-[6px] mb-[3px] cursor-pointer" style={{
                  border: assessmentForm.activity_level === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.activity_level === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div className="text-[12px] font-semibold" style={{ color: assessmentForm.activity_level === val ? theme.accent : theme.text }}>{label}</div>
                <div className="text-[10px] text-tl-text-dimmer">{desc}</div>
              </div>
            ))}
          </div>

          <div className="text-[9px] text-tl-text-dimmest leading-[1.4] mb-2 italic">
            This plan is a general guide for trek preparation and is not a substitute for professional medical advice. Consult your physician before starting any new exercise program, especially at altitude.
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setShowAssessment(false)} className="flex-1 py-2.5 rounded-[8px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-[12px] font-semibold cursor-pointer font-body">Cancel</button>
            <button onClick={submitAssessment} disabled={assessmentSaving} className="flex-1 py-2.5 rounded-[8px] border-none bg-tl-accent text-white text-[12px] font-bold cursor-pointer font-body" style={{
              opacity: assessmentSaving ? 0.6 : 1,
            }}>{assessmentSaving ? "Saving..." : assessment ? "Update Assessment" : "\u2728 Generate My AI Plan"}</button>
          </div>
        </div>
      )}

      {/* Priority Now Card */}
      {priorities.length > 0 && !showAssessment && (
        <div className="tl-card mb-2.5" style={{ border: `1.5px solid ${urgencyColor(priorities[0]?.urgency)}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Target size={14} color={theme.accent} />
              <span className="text-[13px] font-bold text-tl-heading font-display">Priority Now</span>
            </div>
            <div className="flex gap-1">
              {assessment && (
                <button onClick={() => setShowAssessment(true)} className="text-[9px] text-tl-text-dimmer bg-transparent border border-tl-border rounded-[4px] px-1.5 py-[2px] cursor-pointer font-body">Retake</button>
              )}
              <button onClick={handleRegenerate} disabled={regenerating} className="text-[9px] text-tl-text-dimmer bg-transparent border border-tl-border rounded-[4px] px-1.5 py-[2px] cursor-pointer font-body flex items-center gap-[3px]"><RefreshCw size={9} style={regenerating ? { animation: "spin 1s linear infinite" } : {}} /> {regenerating ? "..." : "Refresh"}</button>
            </div>
          </div>
          {priorities.map((p: Priority, i: number) => (
            <div key={i} className="flex gap-2 px-2.5 py-2 rounded-[6px] mb-1 bg-tl-bg-alt border border-tl-border">
              <div className="shrink-0 pt-[1px]" style={{ color: urgencyColor(p.urgency) }}>{urgencyIcon(p.urgency)}</div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: urgencyColor(p.urgency) }}>{p.title}</div>
                <div className="text-[11px] text-tl-text-muted leading-[1.4]">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Plan Generation — spectacular loading experience */}
      {planLoading && <AIGeneratingCard />}

      {/* AI Ready Badge Celebration */}
      {badgeCelebration && <AIBadgeCelebration onDismiss={() => setBadgeCelebration(null)} />}

      {/* Training Phases */}
      {plan && plan.phases && !showAssessment && (
        <div className="tl-card mb-2.5">
          <div onClick={() => setShowPhases(!showPhases)} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Mountain size={14} color={theme.accent} />
              <span className="text-[13px] font-bold text-tl-heading font-display">Training Plan</span>
              <span className="text-[10px] text-tl-text-dimmer">{plan.total_phases || plan.phases.length} phases</span>
            </div>
            <span className="text-[14px] text-tl-text-dimmer transition-transform duration-200" style={{ transform: showPhases ? "rotate(90deg)" : "none" }}>&rsaquo;</span>
          </div>

          {plan.summary && (
            <div className="text-[11px] text-tl-text-muted mt-1.5 italic leading-[1.4]">{plan.summary}</div>
          )}

          {/* Phase summary pills */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {plan.phases.map((phase: PlanPhase) => {
              const status = phaseStatus(phase.number);
              return (
                <div key={phase.number} className="px-2.5 py-1 rounded-[12px] text-[10px] font-bold font-body cursor-pointer" style={{
                  border: `1.5px solid ${phaseStatusColor(status)}`,
                  background: status === "complete" ? theme.accentBg : status === "working" ? `${theme.gold}15` : theme.bgAlt,
                  color: phaseStatusColor(status),
                }} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPhases(true); }}>
                  {status === "complete" ? "\u2713" : status === "working" ? "\u25B6" : phase.number} {phase.name}
                </div>
              );
            })}
          </div>

          {showPhases && (
            <div className="mt-2.5">
              {plan.phases.map((phase: PlanPhase) => {
                const status = phaseStatus(phase.number);
                return (
                  <div key={phase.number} className="px-3 py-2.5 rounded-[8px] mb-1.5 bg-tl-bg-alt" style={{
                    border: `1px solid ${status === "working" ? theme.gold : status === "complete" ? theme.accent : theme.border}`,
                  }}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-[12px] font-bold text-tl-heading">Phase {phase.number}: {phase.name}</span>
                        <span className="text-[10px] text-tl-text-dimmer ml-2">Weeks {phase.weeks}</span>
                      </div>
                      <select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updatePhaseProgress(phase.number, e.target.value)}
                        className="text-[10px] font-semibold font-body rounded-[4px] px-1.5 py-[2px] bg-tl-bg cursor-pointer outline-none" style={{
                          border: `1px solid ${phaseStatusColor(status)}`, color: phaseStatusColor(status),
                        }}>
                        <option value="not_started">Not Started</option>
                        <option value="working">In Progress</option>
                        <option value="complete">Done</option>
                      </select>
                    </div>
                    <div className="text-[11px] text-tl-text-muted mb-1">{phase.focus}</div>
                    {phase.pack_weight && (
                      <div className="text-[10px] text-tl-accent font-semibold mb-1">Pack: {phase.pack_weight}</div>
                    )}
                    {phase.benchmarks && (
                      <div>
                        {phase.benchmarks.map((b: string, i: number) => (
                          <div key={i} className="flex gap-1.5 mb-0.5">
                            <ChevronRight size={10} className="text-tl-text-dimmer shrink-0 mt-0.5" />
                            <span className="text-[10px] text-tl-text-dim leading-[1.4]">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-[9px] text-tl-text-dimmest leading-[1.4] mt-1.5 italic px-0.5">
                This AI-generated plan is for general guidance only and does not constitute medical, fitness, or professional advice. Every person is different. Consult a physician before beginning any exercise program. If you experience pain, dizziness, or shortness of breath, stop and seek medical attention.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leader AI Readiness Dashboard */}
      {isAdmin && leaderDashboard && leaderDashboard.length > 0 && !showAssessment && (
        <div className="tl-card mb-2.5">
          <div onClick={() => setShowLeaderView(!showLeaderView)} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Activity size={14} color={theme.accent} />
              <span className="text-[13px] font-bold text-tl-heading font-display">Crew AI Readiness</span>
              <span className="text-[10px] text-tl-text-dimmer">
                {leaderDashboard.filter(m => m.assessment).length}/{leaderDashboard.filter(m => m.participation === "trekking").length} assessed
              </span>
            </div>
            <span className="text-[14px] text-tl-text-dimmer transition-transform duration-200" style={{ transform: showLeaderView ? "rotate(90deg)" : "none" }}>&rsaquo;</span>
          </div>

          {/* Always show risk summary pills */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {leaderDashboard.filter(m => m.participation === "trekking").map((m: LeaderDashboardMember) => {
              const risk = getMemberRisk(m);
              return (
                <div key={m.user_id} title={`${m.name}: ${risk.label}`} className="px-2 py-[3px] rounded-[10px] text-[9px] font-bold font-body" style={{
                  border: `1.5px solid ${riskColor(risk.level)}`,
                  background: risk.level === "green" ? theme.accentBg : risk.level === "yellow" ? `${theme.gold}15` : risk.level === "red" ? `${theme.danger}15` : theme.bgAlt,
                  color: riskColor(risk.level),
                }}>
                  {m.name.split(" ")[0]}
                </div>
              );
            })}
          </div>

          {showLeaderView && (
            <div className="mt-2.5">
              {leaderDashboard.filter(m => m.participation === "trekking").map((m: LeaderDashboardMember) => {
                const risk = getMemberRisk(m);
                const memberPlan = m.plan?.plan;
                const prog = m.progress || [];
                return (
                  <div key={m.user_id} className="px-2.5 py-2 rounded-[6px] mb-1 bg-tl-bg-alt" style={{
                    border: `1px solid ${riskColor(risk.level)}`,
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-tl-accent flex items-center justify-center text-[9px] text-white font-bold">
                            {m.name[0]}
                          </div>
                        )}
                        <span className="text-[12px] font-semibold text-tl-heading">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: riskColor(risk.level) }}>{risk.label}</span>
                    </div>
                    {m.assessment && (
                      <div className="text-[10px] text-tl-text-dimmer mt-1">
                        {m.assessment.current_distance_miles}mi &middot; {m.assessment.pack_experience.replace("_", " ")} &middot; {m.assessment.activity_level.replace(/_/g, " ")}
                      </div>
                    )}
                    {memberPlan?.phases && (
                      <div className="flex gap-[3px] mt-1">
                        {memberPlan.phases.map((phase: PlanPhase) => {
                          const ps = prog.find(p => p.phase_number === phase.number)?.status || "not_started";
                          return (
                            <div key={phase.number} className="w-[18px] h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center" style={{
                              background: ps === "complete" ? theme.accent : ps === "working" ? theme.gold : theme.progressBg,
                              color: ps !== "not_started" ? "#fff" : theme.textDimmest,
                            }}>
                              {ps === "complete" ? "\u2713" : phase.number}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!m.assessment && (
                      <div className="text-[10px] text-tl-warn mt-1">Has not completed self-assessment</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Journey Progress Trail */}
      {trekkingMembers.length > 0 && (
        <div className="tl-card mb-2.5 text-center">
          <div className="text-[11px] font-bold text-tl-heading mb-2 font-display">Journey to Philmont</div>
          <div className="flex items-center justify-center gap-0 mb-2 px-2.5">
            {JOURNEY_WAYPOINTS.map((wp: JourneyWaypoint, i: number) => {
              const reached = readiness.overall >= wp.pct;
              const isCurrent = wp === currentWaypoint;
              return (
                <div key={wp.pct} className="flex items-center">
                  {i > 0 && (
                    <div className="w-10 h-[3px] rounded-sm transition-[background] duration-500" style={{ background: reached ? theme.accent : theme.progressBg }} />
                  )}
                  <div title={`${wp.name}: ${wp.message}`} className="rounded-full flex items-center justify-center font-bold transition-all duration-300 shrink-0" style={{
                    width: isCurrent ? 28 : 18, height: isCurrent ? 28 : 18,
                    background: reached ? theme.accent : theme.progressBg,
                    border: isCurrent ? `3px solid ${theme.gold}` : "2px solid transparent",
                    fontSize: isCurrent ? 12 : 9, color: reached ? "#fff" : theme.textDimmer,
                  }}>
                    {wp.pct === 100 ? "\u2B50" : reached ? "\u2713" : `${wp.pct}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[12px] font-bold text-tl-accent font-display">{currentWaypoint.name}</div>
          <div className="text-[10px] text-tl-text-muted italic mt-0.5">{currentWaypoint.message}</div>

          {/* Member progress dots */}
          {trekkingMembers.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
              {trekkingMembers.map((m: SkillsMember) => {
                const pct = computeMemberReadiness(m as any, skills, gearCatalog as any, memberGearMap as any);
                return (
                  <div key={m.user_id || m.id} title={`${m.name}: ${pct}%`} className="flex items-center gap-[3px]">
                    <div className="w-2 h-2 rounded-full" style={{ background: m.color?.bg || theme.accent }} />
                    <span className="text-[9px] text-tl-text-dimmer">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trail Badge & Waypoint Legend */}
      <div className="tl-card mb-2.5">
        <div onClick={() => setShowBadgeLegend(!showBadgeLegend)} className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">{"\uD83C\uDFC5"}</span>
            <span className="text-[13px] font-bold text-tl-heading font-display">Trail Guide</span>
            <span className="text-[10px] text-tl-text-dimmer">badges & waypoints</span>
          </div>
          <span className="text-[10px] text-tl-text-dimmer font-medium">{showBadgeLegend ? "Collapse" : "Expand"}</span>
        </div>

        {showBadgeLegend && (
          <div className="mt-2.5">
            {/* Trail Badges */}
            <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-1.5 font-body">
              Trail Badges &mdash; Earn by completing each category
            </div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {Object.entries(TRAIL_BADGES).map(([key, badge]: [string, any]) => {
                const descriptions: Record<string, string> = {
                  gear_ready: "All gear items owned or packed",
                  trail_medic: "All medical items completed",
                  admin_pro: "All admin tasks completed",
                  training_complete: "All training skills completed",
                  ai_ready: "Completed AI self-assessment",
                  ai_gear: "Used AI gear recommendations",
                  fully_prepared: "All categories complete!",
                };
                return (
                  <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] bg-tl-bg-alt border border-tl-border">
                    <span className="text-[16px] shrink-0">{badge.icon}</span>
                    <div>
                      <div className="text-[11px] font-semibold text-tl-heading">{badge.title}</div>
                      <div className="text-[9px] text-tl-text-dimmer leading-[1.3]">{descriptions[key]}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Journey Waypoints */}
            <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-1.5 font-body">
              Journey Waypoints &mdash; Crew readiness milestones
            </div>
            {JOURNEY_WAYPOINTS.map((wp: JourneyWaypoint, i: number) => (
              <div key={wp.pct} className="flex items-center gap-2 px-2 py-1 rounded-[6px] mb-0.5" style={{
                background: readiness.overall >= wp.pct ? theme.accentBg : "transparent",
                border: readiness.overall >= wp.pct ? `1px solid ${theme.borderAccent}` : "1px solid transparent",
              }}>
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{
                  background: readiness.overall >= wp.pct ? theme.accent : theme.progressBg,
                  color: readiness.overall >= wp.pct ? "#fff" : theme.textDimmer,
                }}>
                  {wp.pct === 100 ? "\u2B50" : readiness.overall >= wp.pct ? "\u2713" : `${wp.pct}`}
                </div>
                <div>
                  <span className="text-[11px] font-semibold" style={{ color: readiness.overall >= wp.pct ? theme.accentLight : theme.textMuted }}>{wp.pct}% &mdash; {wp.name}</span>
                  <div className="text-[9px] text-tl-text-dimmer italic">{wp.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall readiness */}
      <div className="tl-card">
        <div className="tl-card-title">Crew Readiness Dashboard</div>
        <div className="flex items-center gap-3.5 mb-3">
          <div className="relative w-16 h-16">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.progressBg} strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.accent} strokeWidth="6"
                strokeDasharray={`${readiness.overall * 1.76} ${176 - readiness.overall * 1.76}`}
                strokeLinecap="round" transform="rotate(-90 32 32)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[16px] font-bold text-tl-heading font-display">{readiness.overall}%</span>
            </div>
          </div>
          <div className="flex-1">
            {categories.map((cat: CategoryDef) => (
              <div key={cat.id} className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-tl-text-muted w-[60px]">{cat.label}</span>
                <div className="flex-1 h-1.5 rounded-sm bg-tl-progress-bg overflow-hidden">
                  <div className="h-full rounded-sm transition-[width] duration-300" style={{ width: `${cat.pct}%`, background: cat.pct >= 80 ? theme.accent : cat.pct >= 50 ? theme.gold : theme.danger }} />
                </div>
                <span className="text-[10px] font-bold text-tl-text-dimmer w-[30px] text-right">{cat.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {members.filter(m => m.participation === "support").length > 0 && (
          <div className="text-[10px] text-tl-text-dimmest mb-1">Readiness % based on trekking members only</div>
        )}

        <div className="text-[11px] text-tl-text-dim">
          {active !== null
            ? <>Editing for <strong style={{ color: (am as any).color?.bg || theme.accent }}>{am!.name}</strong>. Click items to check off.</>
            : "Select your name above to check off completed items."}
        </div>
      </div>

      {/* Category sections */}
      {categories.filter(c => c.skills).map((cat: CategoryDef) => (
        <div key={cat.id} className="mb-1.5">
          <div onClick={() => setExpandedCats(prev => { const next = new Set(prev); next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id); return next; })}
            className="tl-card cursor-pointer flex items-center justify-between !mb-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{cat.icon}</span>
              <span className="text-[13px] font-bold text-tl-heading font-display">{cat.label}</span>
              <span className="text-[10px] text-tl-text-dimmer">{trekkingMembers.length > 0 && `${cat.pct}% complete`}</span>
            </div>
            <span className="text-[14px] text-tl-text-dimmer transition-transform duration-200" style={{ transform: expandedCats.has(cat.id) ? "rotate(90deg)" : "none" }}>&rsaquo;</span>
          </div>

          {expandedCats.has(cat.id) && (
            <div className="py-1">
              {/* Sort: system skills first, then manual */}
              {[...cat.skills!].sort((a, b) => ((b as any).is_system || 0) - ((a as any).is_system || 0)).map((s: any) => {
                const chk = am && ((am as any)[cat.field!] || []).includes(s.id);
                const completedBy = members.filter(m => ((m as any)[cat.field!] || []).includes(s.id));
                const remaining = trekkingMembers.filter(m => !((m as any)[cat.field!] || []).includes(s.id));
                const isSystem = s.is_system === 1;

                return (
                  <div key={s.id} className="flex items-center gap-[9px] px-[11px] py-2 rounded-[7px] mb-0.5" style={{
                    background: chk ? theme.accentBg : theme.bgAlt,
                    border: chk ? `1.5px solid ${theme.borderAccent}` : `1px solid ${theme.border}`,
                    cursor: isSystem ? "default" : (active !== null ? "pointer" : "default"),
                    opacity: isSystem && !chk ? 0.7 : 1,
                  }} onClick={() => !isSystem && cat.toggle!(s.id)}>
                    <span className="text-[16px] w-6 text-center">{s.icon}</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold flex items-center gap-1" style={{ color: chk ? theme.accentLight : theme.text }}>
                        {s.name}
                        {isSystem && (
                          <span className="text-[8px] font-bold px-[5px] py-[1px] rounded-[6px] bg-tl-bg-alt text-tl-text-dimmer border border-tl-border inline-flex items-center gap-0.5">
                            <Lock size={7} /> AUTO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-tl-text-dimmer">{isSystem ? (s.description || "Earned by attending training sessions") : s.desc}</div>
                      {members.length > 0 && (
                        <div className="text-[10px] mt-[1px]" style={{ color: completedBy.length > 0 ? theme.accent : theme.textDimmer }}>
                          {completedBy.length > 0 && completedBy.map((m: SkillsMember) => {
                            const badge = m.user_type === "adult" ? "(A)" : m.user_type === "scout" ? "(S)" : "";
                            return `${m.name}${badge}`;
                          }).join(", ")}
                          {remaining.length > 0 && <span className="text-tl-warn">{completedBy.length > 0 ? " | " : ""}Needs: {remaining.map((m: SkillsMember) => m.name).join(", ")}</span>}
                        </div>
                      )}
                    </div>
                    {isSystem ? (
                      <div className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0" style={{
                        border: `2px solid ${chk ? theme.accent : theme.borderLight}`,
                        background: chk ? theme.accentBg : "transparent",
                      }}>
                        {chk ? <span className="text-[12px] text-tl-accent">{"\u2713"}</span> : <Lock size={9} color={theme.textDimmest} />}
                      </div>
                    ) : (
                      <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); cat.toggle!(s.id); }} className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-[12px] text-tl-accent shrink-0" style={{
                        border: `2px solid ${chk ? theme.accent : theme.borderLight}`,
                        cursor: active !== null ? "pointer" : "default",
                      }}>{chk && "\u2713"}</div>
                    )}
                    {isAdmin && !s.isDefault && !isSystem && (
                      confirmDeleteSkill === s.id ? (
                        <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="flex gap-[3px]">
                          <button onClick={() => { onRemoveSkill(s.id); setConfirmDeleteSkill(null); }}
                            className="text-[9px] text-white bg-tl-danger border-none rounded-[3px] px-1.5 py-[2px] cursor-pointer font-body font-semibold">Delete</button>
                          <button onClick={() => setConfirmDeleteSkill(null)}
                            className="text-[9px] text-tl-text-dimmer bg-tl-bg-alt border border-tl-border rounded-[3px] px-1.5 py-[2px] cursor-pointer font-body">No</button>
                        </div>
                      ) : (
                        <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setConfirmDeleteSkill(s.id); }} title="Remove"
                          className="bg-transparent border-none text-tl-danger text-[12px] cursor-pointer px-0.5 py-0 leading-none">x</button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Add skill form */}
      {isAdmin && (
        <div className="mt-1">
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} className="w-full py-2.5 rounded-[8px] border-[1.5px] border-dashed border-tl-border-light bg-transparent text-tl-accent text-[12px] font-semibold cursor-pointer font-body">+ Add Checklist Item</button>
          ) : (
            <div className="tl-card">
              <select value={addCategory} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAddCategory(e.target.value)}
                className="tl-input mb-1.5">
                <option value="training">Training</option>
                <option value="medical">Medical</option>
                <option value="admin">Admin</option>
              </select>
              <input value={newSkillName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewSkillName(e.target.value); setAddError(""); }} placeholder="Item name"
                className="tl-input" style={{ marginBottom: addError ? 2 : 6, borderColor: addError ? theme.danger : undefined }} />
              {addError && <div className="text-[10px] text-tl-danger mb-1">{addError}</div>}
              <input value={newSkillDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkillDesc(e.target.value)} placeholder="Description (optional)"
                className="tl-input mb-1.5" />
              <div className="flex gap-1.5">
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-[7px] rounded-[5px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-[12px] font-semibold cursor-pointer font-body">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-[7px] rounded-[5px] border-none bg-tl-accent text-white text-[12px] font-semibold cursor-pointer font-body">Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
