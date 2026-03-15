import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useAuth } from "../contexts/AuthContext";
import { card, cardTitle, fontBody, fontDisplay, TRAIL_BADGES, JOURNEY_WAYPOINTS, memberTypeBadge } from "../utils/theme";
import { computeCrewReadiness, computeMemberReadiness } from "../utils/readiness";
import { Activity, Mountain, Footprints, Backpack, RefreshCw, ChevronRight, Target, AlertTriangle, CheckCircle2, Sparkles, Brain, Compass, Route } from "lucide-react";

// ── AI Plan Generation Loading Experience ──
function AIGeneratingCard({ theme }) {
  const [step, setStep] = useState(0);
  const steps = [
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
    <div style={{
      ...card(theme), marginBottom: 10, padding: "24px 20px", textAlign: "center",
      background: `linear-gradient(135deg, ${theme.bgAlt}, ${theme.bg})`,
      border: `2px solid ${theme.accent}44`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated background shimmer */}
      <div style={{
        position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%",
        background: `linear-gradient(90deg, transparent, ${theme.accent}08, transparent)`,
        animation: "aiShimmer 2s ease-in-out infinite",
      }} />

      {/* Sparkle decorations */}
      <div style={{ position: "absolute", top: 8, right: 12, opacity: 0.15, animation: "aiPulse 1.5s ease-in-out infinite" }}>
        <Sparkles size={20} color={theme.accent} />
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 12, opacity: 0.1, animation: "aiPulse 1.5s ease-in-out infinite 0.5s" }}>
        <Sparkles size={16} color={theme.accent} />
      </div>

      {/* AI badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: `${theme.accent}18`, border: `1px solid ${theme.accent}33`,
        borderRadius: 20, padding: "4px 14px", marginBottom: 14,
      }}>
        <Sparkles size={12} color={theme.accent} style={{ animation: "aiPulse 1s ease-in-out infinite" }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: theme.accent, fontFamily: fontBody, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Powered by Claude AI
        </span>
      </div>

      {/* Main icon */}
      <div style={{ marginBottom: 12, position: "relative" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto",
          background: `${theme.accent}15`, border: `2px solid ${theme.accent}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "aiPulse 1.5s ease-in-out infinite",
        }}>
          <Icon size={24} color={theme.accent} />
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay,
        marginBottom: 6,
      }}>
        Building Your AI Training Plan
      </div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16, lineHeight: 1.4 }}>
        Our AI is analyzing your assessment, itinerary, and departure date to create a plan tailored specifically for you.
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 300, margin: "0 auto" }}>
        {steps.map((s, i) => {
          const StepIcon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              borderRadius: 8, transition: "all 0.4s ease",
              background: active ? `${theme.accent}12` : "transparent",
              border: active ? `1px solid ${theme.accent}22` : "1px solid transparent",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? theme.accent : active ? `${theme.accent}25` : `${theme.textDimmest}22`,
                transition: "all 0.4s ease",
              }}>
                {done ? (
                  <CheckCircle2 size={12} color="#fff" />
                ) : (
                  <StepIcon size={11} color={active ? theme.accent : theme.textDimmest} style={active ? { animation: "aiPulse 1s ease-in-out infinite" } : {}} />
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: fontBody,
                color: done ? theme.accent : active ? theme.heading : theme.textDimmest,
                transition: "all 0.4s ease",
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
function AIBadgeCelebration({ theme, onDismiss }) {
  return (
    <div style={{
      ...card(theme), marginBottom: 10, padding: "28px 20px", textAlign: "center",
      background: `linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)`,
      border: `2px solid #e2b340`,
      position: "relative", overflow: "hidden",
      animation: "badgeSlideIn 0.6s ease-out",
    }}>
      {/* Sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${10 + Math.random() * 80}%`,
          left: `${5 + Math.random() * 90}%`,
          width: 4, height: 4, borderRadius: "50%",
          background: i % 2 === 0 ? "#e2b340" : "#fff",
          opacity: 0.6,
          animation: `badgeSparkle ${1.5 + Math.random()}s ease-in-out infinite ${Math.random() * 0.5}s`,
        }} />
      ))}

      {/* Badge icon */}
      <div style={{
        fontSize: 56, marginBottom: 8,
        animation: "badgePop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both",
        filter: "drop-shadow(0 0 20px rgba(226, 179, 64, 0.5))",
      }}>
        🤖
      </div>

      {/* Title */}
      <div style={{
        fontSize: 20, fontWeight: 900, color: "#e2b340", fontFamily: fontDisplay,
        marginBottom: 4, letterSpacing: 0.5,
        animation: "badgeFadeIn 0.5s ease-out 0.5s both",
      }}>
        Badge Earned!
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: fontDisplay,
        marginBottom: 10,
        animation: "badgeFadeIn 0.5s ease-out 0.7s both",
      }}>
        AI Ready
      </div>
      <div style={{
        fontSize: 12, color: "#ccc", lineHeight: 1.5, maxWidth: 280, margin: "0 auto 16px",
        animation: "badgeFadeIn 0.5s ease-out 0.9s both",
      }}>
        You completed your AI self-assessment and received a personalized training plan powered by Claude AI.
      </div>

      {/* Dismiss */}
      <button onClick={onDismiss} style={{
        padding: "8px 24px", borderRadius: 8, border: "1px solid #e2b34055",
        background: "#e2b34020", color: "#e2b340", fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: fontBody,
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

export default function Skills({ members, active, skills, analysis, isAdmin, onToggleSkill, onAddSkill, onRemoveSkill, adventureId, updateMemberLocally, achievements }) {
  const { theme, mode } = useTheme();
  const { gearCatalog, memberGearMap, selectedCrewId } = useAdventure();
  const { user } = useAuth();
  const [expandedCats, setExpandedCats] = useState(new Set(["training"]));
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCategory, setAddCategory] = useState("training");
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState(null);
  const [showBadgeLegend, setShowBadgeLegend] = useState(false);

  // AI Readiness Engine state
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [assessmentForm, setAssessmentForm] = useState({ current_distance_miles: 3, pack_experience: "none", elevation_access: "flat_only", activity_level: "lightly_active" });
  const [assessmentSaving, setAssessmentSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [progress, setProgress] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showPhases, setShowPhases] = useState(false);
  const [badgeCelebration, setBadgeCelebration] = useState(null);

  // Load assessment + plan on mount
  const loadAIReadiness = useCallback(async () => {
    if (!selectedCrewId || !user) return;
    setAssessmentLoading(true);
    try {
      const { assessment: a } = await api.getAssessment(selectedCrewId);
      setAssessment(a);
      if (a) {
        setAssessmentForm({ current_distance_miles: a.current_distance_miles, pack_experience: a.pack_experience, elevation_access: a.elevation_access, activity_level: a.activity_level });
        // Load plan
        setPlanLoading(true);
        try {
          const result = await api.getReadinessPlan(selectedCrewId, user.id);
          setPlan(result.plan);
          setPriorities(result.priorities || []);
          setProgress(result.progress || []);
          if (result.badge_earned === "ai_ready") {
            setBadgeCelebration("ai_ready");
            setTimeout(() => setBadgeCelebration(null), 6000);
          }
        } catch (e) {
          // No plan yet — that's OK, will be generated
          console.log("No plan yet:", e.message);
        }
        setPlanLoading(false);
      }
    } catch (e) { console.error("Error loading AI readiness:", e); }
    setAssessmentLoading(false);
  }, [selectedCrewId, user]);

  useEffect(() => { loadAIReadiness(); }, [loadAIReadiness]);

  const submitAssessment = async () => {
    if (!selectedCrewId || assessmentSaving) return;
    setAssessmentSaving(true);
    try {
      const result = await api.submitAssessment(selectedCrewId, assessmentForm);
      setAssessment(result.assessment);
      setShowAssessment(false);
      // Generate plan
      setPlanLoading(true);
      const planResult = await api.getReadinessPlan(selectedCrewId, user.id);
      setPlan(planResult.plan);
      setPriorities(planResult.priorities || []);
      setProgress(planResult.progress || []);
      setPlanLoading(false);
      // Badge celebration
      if (planResult.badge_earned === "ai_ready") {
        setBadgeCelebration("ai_ready");
        setTimeout(() => setBadgeCelebration(null), 6000);
      }
    } catch (e) { console.error(e); }
    setAssessmentSaving(false);
  };

  const handleRegenerate = async () => {
    if (!selectedCrewId || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.regenerateReadinessPlan(selectedCrewId);
      setPlan(result.plan);
      setPriorities(result.priorities || []);
      setProgress([]);
      if (result.badge_earned === "ai_ready") {
        setBadgeCelebration("ai_ready");
        setTimeout(() => setBadgeCelebration(null), 6000);
      }
    } catch (e) { console.error(e); }
    setRegenerating(false);
  };

  const updatePhaseProgress = async (phaseNumber, status) => {
    if (!selectedCrewId) return;
    try {
      const result = await api.updateReadinessProgress(selectedCrewId, { phase_number: phaseNumber, status });
      setProgress(result.progress || []);
    } catch (e) { console.error(e); }
  };

  const am = active !== null ? members[active] : null;

  // Only trekking members count for readiness
  const trekkingMembers = useMemo(() => members.filter(m => m.participation === "trekking"), [members]);

  const trainingSkills = useMemo(() => skills.filter(s => s.category === "training"), [skills]);
  const medicalSkills = useMemo(() => skills.filter(s => s.category === "medical"), [skills]);
  const adminSkills = useMemo(() => skills.filter(s => s.category === "admin"), [skills]);

  // Use shared readiness calculation (single source of truth)
  const readiness = useMemo(() =>
    computeCrewReadiness(members, skills, gearCatalog, memberGearMap),
    [members, skills, gearCatalog, memberGearMap]);

  const toggleMedical = async (skillId) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    const current = m.medical || [];
    const updated = current.includes(skillId) ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id, { medical: updated });
    try { await api.updateCrewMedical(selectedCrewId, m.user_id, updated); } catch (e) { console.error(e); }
  };

  const toggleAdmin = async (skillId) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    const current = m.admin_tasks || [];
    const updated = current.includes(skillId) ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id, { admin_tasks: updated });
    try { await api.updateCrewAdmin(selectedCrewId, m.user_id, updated); } catch (e) { console.error(e); }
  };

  const [addError, setAddError] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  const handleAdd = async () => {
    const name = newSkillName.trim();
    if (!name) { setAddError("Item name is required"); return; }
    if (!adventureId || addingSkill) return;
    setAddError(""); setAddingSkill(true);
    try {
      await onAddSkill(name, newSkillDesc, addCategory);
      setNewSkillName(""); setNewSkillDesc(""); setShowAddForm(false);
    } catch (e) { console.error(e); }
    setAddingSkill(false);
  };

  const categories = [
    { id: "training", label: "Training", icon: "🎒", pct: readiness.training, skills: trainingSkills, field: "skills", toggle: onToggleSkill },
    { id: "gear", label: "Gear", icon: "🎒", pct: readiness.gear },
    { id: "medical", label: "Medical", icon: "🏥", pct: readiness.medical, skills: medicalSkills, field: "medical", toggle: toggleMedical },
    { id: "admin", label: "Admin", icon: "📋", pct: readiness.admin, skills: adminSkills, field: "admin_tasks", toggle: toggleAdmin },
  ];

  // Current waypoint
  const currentWaypoint = JOURNEY_WAYPOINTS.reduce((best, wp) => readiness.overall >= wp.pct ? wp : best, JOURNEY_WAYPOINTS[0]);

  // Leader dashboard state
  const [leaderDashboard, setLeaderDashboard] = useState(null);
  const [showLeaderView, setShowLeaderView] = useState(false);

  useEffect(() => {
    if (!selectedCrewId || !isAdmin) return;
    api.getReadinessDashboard(selectedCrewId).then(r => setLeaderDashboard(r.dashboard)).catch(() => {});
  }, [selectedCrewId, isAdmin]);

  const urgencyColor = (u) => u === "red" ? theme.danger : u === "yellow" ? theme.gold : theme.accent;
  const urgencyIcon = (u) => u === "red" ? <AlertTriangle size={14} /> : u === "yellow" ? <Target size={14} /> : <CheckCircle2 size={14} />;
  const phaseStatus = (num) => progress.find(p => p.phase_number === num)?.status || "not_started";
  const phaseStatusColor = (s) => s === "complete" ? theme.accent : s === "working" ? theme.gold : theme.textDimmest;

  // Determine member AI risk status from leader dashboard
  const getMemberRisk = (memberData) => {
    if (!memberData.assessment) return { level: "none", label: "No Assessment" };
    if (!memberData.plan) return { level: "none", label: "No Plan" };
    const plan = memberData.plan.plan;
    const prog = memberData.progress || [];
    if (!plan?.phases) return { level: "green", label: "Plan Generated" };
    const totalPhases = plan.phases.length;
    const completed = prog.filter(p => p.status === "complete").length;
    const working = prog.filter(p => p.status === "working").length;
    // Simple heuristic: if behind expected phase, show risk
    if (completed === totalPhases) return { level: "green", label: "On Track" };
    if (completed + working > 0) return { level: "yellow", label: `Phase ${completed + 1}/${totalPhases}` };
    return { level: "red", label: "Not Started" };
  };
  const riskColor = (level) => level === "red" ? theme.danger : level === "yellow" ? theme.gold : level === "green" ? theme.accent : theme.textDimmest;

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Self-Assessment Prompt — show if no assessment and not loading */}
      {!assessmentLoading && !assessment && !showAssessment && selectedCrewId && (
        <div style={{ ...card(theme), marginBottom: 10, textAlign: "center", border: `2px solid ${theme.accent}` }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}><Activity size={24} color={theme.accent} /></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginBottom: 4 }}>AI Readiness Coach</div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10, lineHeight: 1.4 }}>
            Take a 30-second self-assessment and get a personalized training plan based on your itinerary and departure date.
          </div>
          <button onClick={() => setShowAssessment(true)} style={{
            padding: "10px 24px", borderRadius: 8, border: "none", background: theme.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: fontBody,
          }}>Start Assessment</button>
        </div>
      )}

      {/* Assessment Modal */}
      {showAssessment && (
        <div style={{ ...card(theme), marginBottom: 10, border: `2px solid ${theme.accent}` }}>
          <div style={{ ...cardTitle(theme), display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={theme.accent} />
            Self-Assessment
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 12 }}>No judgment — just where you are today. You can retake this anytime.</div>

          {/* Distance slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Footprints size={14} color={theme.textDim} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Comfortable hiking distance</span>
            </div>
            <input type="range" min="1" max="15" step="0.5" value={assessmentForm.current_distance_miles}
              onChange={e => setAssessmentForm(f => ({ ...f, current_distance_miles: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: theme.accent }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDimmer }}>
              <span>1 mi</span>
              <span style={{ fontWeight: 700, color: theme.accent, fontSize: 13 }}>{assessmentForm.current_distance_miles} miles</span>
              <span>15 mi</span>
            </div>
          </div>

          {/* Pack experience */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Backpack size={14} color={theme.textDim} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Pack experience</span>
            </div>
            {[["none", "None", "Never carried a loaded pack"], ["day_pack", "Some", "Day pack weight (10-15 lbs)"], ["loaded", "Loaded", "Overnight weight (30+ lbs)"]].map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, pack_experience: val }))}
                style={{
                  padding: "8px 10px", borderRadius: 6, marginBottom: 3, cursor: "pointer",
                  border: assessmentForm.pack_experience === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.pack_experience === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: assessmentForm.pack_experience === val ? theme.accent : theme.text }}>{label}</div>
                <div style={{ fontSize: 10, color: theme.textDimmer }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Elevation access */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Mountain size={14} color={theme.textDim} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Elevation/incline access</span>
            </div>
            {[["flat_only", "Flat terrain only", "No hills available for training"], ["some_hills", "Some hills", "Moderate inclines available"], ["real_elevation", "Real elevation", "Mountains or steep terrain nearby"]].map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, elevation_access: val }))}
                style={{
                  padding: "8px 10px", borderRadius: 6, marginBottom: 3, cursor: "pointer",
                  border: assessmentForm.elevation_access === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.elevation_access === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: assessmentForm.elevation_access === val ? theme.accent : theme.text }}>{label}</div>
                <div style={{ fontSize: 10, color: theme.textDimmer }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Activity level */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Activity size={14} color={theme.textDim} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Current activity level</span>
            </div>
            {[["sedentary", "Sedentary", "Mostly desk/couch"], ["lightly_active", "Lightly active", "Walk regularly, some activity"], ["regularly_active", "Regularly active", "Exercise 3-4x/week"], ["very_active", "Very active", "Daily exercise or physical job"]].map(([val, label, desc]) => (
              <div key={val} onClick={() => setAssessmentForm(f => ({ ...f, activity_level: val }))}
                style={{
                  padding: "8px 10px", borderRadius: 6, marginBottom: 3, cursor: "pointer",
                  border: assessmentForm.activity_level === val ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: assessmentForm.activity_level === val ? theme.accentBg : theme.bgAlt,
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: assessmentForm.activity_level === val ? theme.accent : theme.text }}>{label}</div>
                <div style={{ fontSize: 10, color: theme.textDimmer }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowAssessment(false)} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${theme.borderLight}`,
              background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
            }}>Cancel</button>
            <button onClick={submitAssessment} disabled={assessmentSaving} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: fontBody,
              opacity: assessmentSaving ? 0.6 : 1,
            }}>{assessmentSaving ? "Saving..." : assessment ? "Update Assessment" : "✨ Generate My AI Plan"}</button>
          </div>
        </div>
      )}

      {/* Priority Now Card */}
      {priorities.length > 0 && !showAssessment && (
        <div style={{ ...card(theme), marginBottom: 10, border: `1.5px solid ${urgencyColor(priorities[0]?.urgency)}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Target size={14} color={theme.accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Priority Now</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {assessment && (
                <button onClick={() => setShowAssessment(true)} style={{
                  fontSize: 9, color: theme.textDimmer, background: "none", border: `1px solid ${theme.border}`,
                  borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody,
                }}>Retake</button>
              )}
              <button onClick={handleRegenerate} disabled={regenerating} style={{
                fontSize: 9, color: theme.textDimmer, background: "none", border: `1px solid ${theme.border}`,
                borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody, display: "flex", alignItems: "center", gap: 3,
              }}><RefreshCw size={9} style={regenerating ? { animation: "spin 1s linear infinite" } : {}} /> {regenerating ? "..." : "Refresh"}</button>
            </div>
          </div>
          {priorities.map((p, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, padding: "8px 10px", borderRadius: 6, marginBottom: 4,
              background: theme.bgAlt, border: `1px solid ${theme.border}`,
            }}>
              <div style={{ color: urgencyColor(p.urgency), flexShrink: 0, paddingTop: 1 }}>{urgencyIcon(p.urgency)}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: urgencyColor(p.urgency) }}>{p.title}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.4 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Plan Generation — spectacular loading experience */}
      {planLoading && <AIGeneratingCard theme={theme} />}

      {/* AI Ready Badge Celebration */}
      {badgeCelebration && <AIBadgeCelebration theme={theme} onDismiss={() => setBadgeCelebration(null)} />}

      {/* Training Phases */}
      {plan && plan.phases && !showAssessment && (
        <div style={{ ...card(theme), marginBottom: 10 }}>
          <div onClick={() => setShowPhases(!showPhases)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mountain size={14} color={theme.accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Training Plan</span>
              <span style={{ fontSize: 10, color: theme.textDimmer }}>{plan.total_phases || plan.phases.length} phases</span>
            </div>
            <span style={{ fontSize: 14, color: theme.textDimmer, transform: showPhases ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
          </div>

          {plan.summary && (
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>{plan.summary}</div>
          )}

          {/* Phase summary pills */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {plan.phases.map(phase => {
              const status = phaseStatus(phase.number);
              return (
                <div key={phase.number} style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: fontBody,
                  border: `1.5px solid ${phaseStatusColor(status)}`,
                  background: status === "complete" ? theme.accentBg : status === "working" ? `${theme.gold}15` : theme.bgAlt,
                  color: phaseStatusColor(status), cursor: "pointer",
                }} onClick={(e) => { e.stopPropagation(); setShowPhases(true); }}>
                  {status === "complete" ? "\u2713" : status === "working" ? "\u25B6" : phase.number} {phase.name}
                </div>
              );
            })}
          </div>

          {showPhases && (
            <div style={{ marginTop: 10 }}>
              {plan.phases.map(phase => {
                const status = phaseStatus(phase.number);
                return (
                  <div key={phase.number} style={{
                    padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                    background: theme.bgAlt, border: `1px solid ${status === "working" ? theme.gold : status === "complete" ? theme.accent : theme.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>Phase {phase.number}: {phase.name}</span>
                        <span style={{ fontSize: 10, color: theme.textDimmer, marginLeft: 8 }}>Weeks {phase.weeks}</span>
                      </div>
                      <select value={status} onChange={(e) => updatePhaseProgress(phase.number, e.target.value)}
                        style={{
                          fontSize: 10, fontWeight: 600, fontFamily: fontBody, borderRadius: 4, padding: "2px 6px",
                          border: `1px solid ${phaseStatusColor(status)}`, color: phaseStatusColor(status),
                          background: theme.bg, cursor: "pointer", outline: "none",
                        }}>
                        <option value="not_started">Not Started</option>
                        <option value="working">In Progress</option>
                        <option value="complete">Done</option>
                      </select>
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>{phase.focus}</div>
                    {phase.pack_weight && (
                      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>Pack: {phase.pack_weight}</div>
                    )}
                    {phase.benchmarks && (
                      <div>
                        {phase.benchmarks.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                            <ChevronRight size={10} color={theme.textDimmer} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: 10, color: theme.textDim, lineHeight: 1.4 }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leader AI Readiness Dashboard */}
      {isAdmin && leaderDashboard && leaderDashboard.length > 0 && !showAssessment && (
        <div style={{ ...card(theme), marginBottom: 10 }}>
          <div onClick={() => setShowLeaderView(!showLeaderView)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={14} color={theme.accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Crew AI Readiness</span>
              <span style={{ fontSize: 10, color: theme.textDimmer }}>
                {leaderDashboard.filter(m => m.assessment).length}/{leaderDashboard.filter(m => m.participation === "trekking").length} assessed
              </span>
            </div>
            <span style={{ fontSize: 14, color: theme.textDimmer, transform: showLeaderView ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
          </div>

          {/* Always show risk summary pills */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {leaderDashboard.filter(m => m.participation === "trekking").map(m => {
              const risk = getMemberRisk(m);
              return (
                <div key={m.user_id} title={`${m.name}: ${risk.label}`} style={{
                  padding: "3px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700, fontFamily: fontBody,
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
            <div style={{ marginTop: 10 }}>
              {leaderDashboard.filter(m => m.participation === "trekking").map(m => {
                const risk = getMemberRisk(m);
                const plan = m.plan?.plan;
                const prog = m.progress || [];
                return (
                  <div key={m.user_id} style={{
                    padding: "8px 10px", borderRadius: 6, marginBottom: 4,
                    background: theme.bgAlt, border: `1px solid ${riskColor(risk.level)}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>
                            {m.name[0]}
                          </div>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>{m.name}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: riskColor(risk.level) }}>{risk.label}</span>
                    </div>
                    {m.assessment && (
                      <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 4 }}>
                        {m.assessment.current_distance_miles}mi · {m.assessment.pack_experience.replace("_", " ")} · {m.assessment.activity_level.replace(/_/g, " ")}
                      </div>
                    )}
                    {plan?.phases && (
                      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                        {plan.phases.map(phase => {
                          const ps = prog.find(p => p.phase_number === phase.number)?.status || "not_started";
                          return (
                            <div key={phase.number} style={{
                              width: 18, height: 18, borderRadius: "50%", fontSize: 8, fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
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
                      <div style={{ fontSize: 10, color: theme.warn, marginTop: 4 }}>Has not completed self-assessment</div>
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
        <div style={{ ...card(theme), marginBottom: 10, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 8, fontFamily: fontDisplay }}>Journey to Philmont</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 8, padding: "0 10px" }}>
            {JOURNEY_WAYPOINTS.map((wp, i) => {
              const reached = readiness.overall >= wp.pct;
              const isCurrent = wp === currentWaypoint;
              return (
                <div key={wp.pct} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div style={{ width: 40, height: 3, background: reached ? theme.accent : theme.progressBg, borderRadius: 2, transition: "background .5s" }} />
                  )}
                  <div title={`${wp.name}: ${wp.message}`} style={{
                    width: isCurrent ? 28 : 18, height: isCurrent ? 28 : 18, borderRadius: "50%",
                    background: reached ? theme.accent : theme.progressBg,
                    border: isCurrent ? `3px solid ${theme.gold}` : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isCurrent ? 12 : 9, color: reached ? "#fff" : theme.textDimmer,
                    fontWeight: 700, transition: "all .3s", flexShrink: 0,
                  }}>
                    {wp.pct === 100 ? "⭐" : reached ? "✓" : `${wp.pct}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, fontFamily: fontDisplay }}>{currentWaypoint.name}</div>
          <div style={{ fontSize: 10, color: theme.textMuted, fontStyle: "italic", marginTop: 2 }}>{currentWaypoint.message}</div>

          {/* Member progress dots */}
          {trekkingMembers.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {trekkingMembers.map(m => {
                const pct = computeMemberReadiness(m, skills, gearCatalog, memberGearMap);
                return (
                  <div key={m.user_id || m.id} title={`${m.name}: ${pct}%`} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color?.bg || theme.accent }} />
                    <span style={{ fontSize: 9, color: theme.textDimmer }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trail Badge & Waypoint Legend */}
      <div style={{ ...card(theme), marginBottom: 10 }}>
        <div onClick={() => setShowBadgeLegend(!showBadgeLegend)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🏅</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Trail Guide</span>
            <span style={{ fontSize: 10, color: theme.textDimmer }}>badges & waypoints</span>
          </div>
          <span style={{ fontSize: 14, color: theme.textDimmer, transform: showBadgeLegend ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
        </div>

        {showBadgeLegend && (
          <div style={{ marginTop: 10 }}>
            {/* Trail Badges */}
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, fontFamily: fontBody }}>
              Trail Badges — Earn by completing each category
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
              {Object.entries(TRAIL_BADGES).map(([key, badge]) => {
                const descriptions = {
                  gear_ready: "All gear items owned or packed",
                  trail_medic: "All medical items completed",
                  admin_pro: "All admin tasks completed",
                  training_complete: "All training skills completed",
                  ai_ready: "Completed AI self-assessment",
                  ai_gear: "Used AI gear recommendations",
                  fully_prepared: "All categories complete!",
                };
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                    borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.border}`,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{badge.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: theme.heading }}>{badge.title}</div>
                      <div style={{ fontSize: 9, color: theme.textDimmer, lineHeight: 1.3 }}>{descriptions[key]}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Journey Waypoints */}
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, fontFamily: fontBody }}>
              Journey Waypoints — Crew readiness milestones
            </div>
            {JOURNEY_WAYPOINTS.map((wp, i) => (
              <div key={wp.pct} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                borderRadius: 6, marginBottom: 2,
                background: readiness.overall >= wp.pct ? theme.accentBg : "transparent",
                border: readiness.overall >= wp.pct ? `1px solid ${theme.borderAccent}` : `1px solid transparent`,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: readiness.overall >= wp.pct ? theme.accent : theme.progressBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: readiness.overall >= wp.pct ? "#fff" : theme.textDimmer,
                }}>
                  {wp.pct === 100 ? "⭐" : readiness.overall >= wp.pct ? "✓" : `${wp.pct}`}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: readiness.overall >= wp.pct ? theme.accentLight : theme.textMuted }}>{wp.pct}% — {wp.name}</span>
                  <div style={{ fontSize: 9, color: theme.textDimmer, fontStyle: "italic" }}>{wp.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall readiness */}
      <div style={card(theme)}>
        <div style={cardTitle(theme)}>Crew Readiness Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.progressBg} strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.accent} strokeWidth="6"
                strokeDasharray={`${readiness.overall * 1.76} ${176 - readiness.overall * 1.76}`}
                strokeLinecap="round" transform="rotate(-90 32 32)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{readiness.overall}%</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: theme.textMuted, width: 60 }}>{cat.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: theme.progressBg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${cat.pct}%`, borderRadius: 3, background: cat.pct >= 80 ? theme.accent : cat.pct >= 50 ? theme.gold : theme.danger, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, width: 30, textAlign: "right" }}>{cat.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {members.filter(m => m.participation === "support").length > 0 && (
          <div style={{ fontSize: 10, color: theme.textDimmest, marginBottom: 4 }}>Readiness % based on trekking members only</div>
        )}

        <div style={{ fontSize: 11, color: theme.textDim }}>
          {active !== null
            ? <>Editing for <strong style={{ color: am.color?.bg || theme.accent }}>{am.name}</strong>. Click items to check off.</>
            : "Select your name above to check off completed items."}
        </div>
      </div>

      {/* Category sections */}
      {categories.filter(c => c.skills).map(cat => (
        <div key={cat.id} style={{ marginBottom: 6 }}>
          <div onClick={() => setExpandedCats(prev => { const next = new Set(prev); next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id); return next; })}
            style={{ ...card(theme), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{cat.label}</span>
              <span style={{ fontSize: 10, color: theme.textDimmer }}>{trekkingMembers.length > 0 && `${cat.pct}% complete`}</span>
            </div>
            <span style={{ fontSize: 14, color: theme.textDimmer, transform: expandedCats.has(cat.id) ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
          </div>

          {expandedCats.has(cat.id) && (
            <div style={{ padding: "4px 0" }}>
              {cat.skills.map(s => {
                const chk = am && (am[cat.field] || []).includes(s.id);
                const completedBy = members.filter(m => (m[cat.field] || []).includes(s.id));
                const remaining = trekkingMembers.filter(m => !(m[cat.field] || []).includes(s.id));

                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 7, marginBottom: 2,
                    background: chk ? theme.accentBg : theme.bgAlt,
                    border: chk ? `1.5px solid ${theme.borderAccent}` : `1px solid ${theme.border}`,
                    cursor: active !== null ? "pointer" : "default",
                  }} onClick={() => cat.toggle(s.id)}>
                    <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: chk ? theme.accentLight : theme.text }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: theme.textDimmer }}>{s.desc}</div>
                      {members.length > 0 && (
                        <div style={{ fontSize: 10, color: completedBy.length > 0 ? theme.accent : theme.textDimmer, marginTop: 1 }}>
                          {completedBy.length > 0 && completedBy.map(m => {
                            const badge = m.user_type === "adult" ? "(A)" : m.user_type === "scout" ? "(S)" : "";
                            return `${m.name}${badge}`;
                          }).join(", ")}
                          {remaining.length > 0 && <span style={{ color: theme.warn }}>{completedBy.length > 0 ? " | " : ""}Needs: {remaining.map(m => m.name).join(", ")}</span>}
                        </div>
                      )}
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); cat.toggle(s.id); }} style={{
                      width: 18, height: 18, borderRadius: 4, border: `2px solid ${chk ? theme.accent : theme.borderLight}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: theme.accent, flexShrink: 0,
                      cursor: active !== null ? "pointer" : "default",
                    }}>{chk && "\u2713"}</div>
                    {isAdmin && !s.isDefault && (
                      confirmDeleteSkill === s.id ? (
                        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 3 }}>
                          <button onClick={() => { onRemoveSkill(s.id); setConfirmDeleteSkill(null); }}
                            style={{ fontSize: 9, color: "#fff", background: theme.danger, border: "none", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>Delete</button>
                          <button onClick={() => setConfirmDeleteSkill(null)}
                            style={{ fontSize: 9, color: theme.textDimmer, background: theme.bgAlt, border: `1px solid ${theme.border}`, borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody }}>No</button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSkill(s.id); }} title="Remove"
                          style={{ background: "none", border: "none", color: theme.danger, fontSize: 12, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>x</button>
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
        <div style={{ marginTop: 4 }}>
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} style={{
              width: "100%", padding: "10px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
              background: "transparent", color: theme.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
            }}>+ Add Checklist Item</button>
          ) : (
            <div style={card(theme)}>
              <select value={addCategory} onChange={e => setAddCategory(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }}>
                <option value="training">Training</option>
                <option value="medical">Medical</option>
                <option value="admin">Admin</option>
              </select>
              <input value={newSkillName} onChange={e => { setNewSkillName(e.target.value); setAddError(""); }} placeholder="Item name"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${addError ? theme.danger : theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: addError ? 2 : 6, boxSizing: "border-box" }} />
              {addError && <div style={{ fontSize: 10, color: theme.danger, marginBottom: 4 }}>{addError}</div>}
              <input value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} placeholder="Description (optional)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                <button onClick={handleAdd} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
