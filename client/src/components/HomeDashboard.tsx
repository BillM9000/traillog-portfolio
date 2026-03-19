import React, { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay } from "../utils/theme";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import TroopLogo from "./TroopLogo";
import CouncilPicker from "./CouncilPicker";
import OnboardingChecklist from "./OnboardingChecklist";
import type { User, Membership, ThemeColors, AdventureType as AdventureTypeT, OnboardingState } from "../types";

const ADVENTURE_TYPE_NAMES: Record<string, string> = {
  philmont: "Philmont Scout Ranch",
  northern_tier: "Northern Tier",
  sea_base: "Florida Sea Base",
  summit: "Summit Bechtel Reserve",
};

// ── Dashboard API response types ──
interface DashboardAdventure {
  id: number;
  name: string;
  adventure_type: string;
  depart_date: string | null;
  arrive_date: string | null;
  return_date: string | null;
  home_date: string | null;
  crew_readiness: number;
  member_count: number;
  trekking_count: number;
  next_training: { date: string; location?: string } | null;
}

interface DashboardTroop {
  id: number;
  name: string;
  council: string | null;
  location: string | null;
  role: string;
  adventures: DashboardAdventure[];
}

interface PublicTroop {
  id: number;
  name: string;
  council: string | null;
  location: string | null;
}

interface PendingRequest {
  troop_id: number;
  troop_name: string;
  participation: string;
}

interface PlatformStats {
  total_users: number;
  total_troops: number;
  active_adventures: number;
  new_this_week: number;
}

interface DashboardResponse {
  troops: DashboardTroop[];
  pending: PendingRequest[];
  public_troops: PublicTroop[];
  platform_stats?: PlatformStats;
}

interface JoinAdventure {
  id: number;
  name: string;
  adventure_type: string;
  arrive_date: string | null;
  return_date: string | null;
}

interface JoinModalProps {
  troopId: number;
  troopName: string;
  theme: ThemeColors;
  onClose: () => void;
  onSubmit: (data: { participation: string; adventure_ids: number[] }) => Promise<void>;
}

function JoinModal({ troopId, troopName, theme, onClose, onSubmit }: JoinModalProps) {
  const [step, setStep] = useState(1);
  const [participation, setParticipation] = useState("trekking");
  const [adventures, setAdventures] = useState<JoinAdventure[]>([]);
  const [selectedAdventures, setSelectedAdventures] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getTroopJoinInfo(troopId).then((data: unknown) => {
      const info = data as { adventures?: JoinAdventure[] };
      setAdventures(info.adventures || []);
      // If only one adventure, auto-select it
      if (info.adventures?.length === 1) {
        setSelectedAdventures([info.adventures[0].id]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [troopId]);

  const formatDate = (d: string | null): string => {
    if (!d) return "";
    try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
  };

  const toggleAdventure = (advId: number) => {
    setSelectedAdventures(prev =>
      prev.includes(advId) ? prev.filter(id => id !== advId) : [...prev, advId]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // If troop has adventures and user hasn't selected any, select all
    const advIds = adventures.length > 0
      ? (selectedAdventures.length > 0 ? selectedAdventures : adventures.map(a => a.id))
      : [];
    await onSubmit({ participation, adventure_ids: advIds });
    setSubmitting(false);
  };

  const needsAdventureStep = adventures.length > 1;
  const canProceed = step === 1 || selectedAdventures.length > 0;

  const radioBtn = (selected: boolean) => clsx(
    "flex items-start gap-2.5 py-3 px-3.5 rounded-btn cursor-pointer mb-1.5 transition-all duration-150",
    selected ? "border-2 border-tl-accent bg-tl-accent-bg" : "border-[1.5px] border-tl-border-light bg-tl-bg-alt"
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-5"
      onClick={onClose}>
      <div className="bg-tl-bg rounded-card py-6 px-5 max-w-[440px] w-full max-h-[80vh] overflow-y-auto border border-tl-border"
        style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-[800] text-tl-heading m-0">
            Join {troopName}
          </h3>
          <button onClick={onClose}
            className="bg-none border-none text-lg text-tl-text-dim cursor-pointer py-0.5 px-1.5">&times;</button>
        </div>

        {loading ? (
          <div className="text-center p-5 text-tl-text-dim text-xs">Loading...</div>
        ) : (
          <>
            {/* Step 1: Participation */}
            {step === 1 && (
              <div>
                <label className="text-[9px] font-bold text-tl-text-dim uppercase tracking-[0.5px] mb-1.5 block">How will you participate?</label>
                <div onClick={() => setParticipation("trekking")} className={radioBtn(participation === "trekking")}>
                  <div className={clsx(
                    "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-[1px]",
                    participation === "trekking" ? "border-tl-accent" : "border-tl-border-light"
                  )}>
                    {participation === "trekking" && <div className="w-2.5 h-2.5 rounded-full bg-tl-accent" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-tl-heading">Trekker</div>
                    <div className="text-[11px] text-tl-text-dim mt-0.5">Going on the adventure</div>
                  </div>
                </div>
                <div onClick={() => setParticipation("support")} className={radioBtn(participation === "support")}>
                  <div className={clsx(
                    "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-[1px]",
                    participation === "support" ? "border-tl-accent" : "border-tl-border-light"
                  )}>
                    {participation === "support" && <div className="w-2.5 h-2.5 rounded-full bg-tl-accent" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-tl-heading">Support Crew</div>
                    <div className="text-[11px] text-tl-text-dim mt-0.5">Helping from home</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Adventure selection (multi-adventure troops only) */}
            {step === 2 && needsAdventureStep && (
              <div>
                <label className="text-[9px] font-bold text-tl-text-dim uppercase tracking-[0.5px] mb-1.5 block">Which adventure(s) are you joining?</label>
                <div className="text-[11px] text-tl-text-dim mb-2.5">
                  Select one or more adventures you want to participate in.
                </div>
                {adventures.map(adv => {
                  const selected = selectedAdventures.includes(adv.id);
                  const dateRange = [formatDate(adv.arrive_date), formatDate(adv.return_date)].filter(Boolean).join(" - ");
                  return (
                    <div key={adv.id} onClick={() => toggleAdventure(adv.id)} className={clsx(radioBtn(selected), "cursor-pointer")}>
                      <div className={clsx(
                        "w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[1px]",
                        selected ? "border-tl-accent bg-tl-accent" : "border-tl-border-light bg-transparent"
                      )}>
                        {selected && <span className="text-white text-xs font-bold leading-none">&#10003;</span>}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-tl-heading">{adv.name}</div>
                        <div className="text-[10px] text-tl-text-dim mt-0.5">
                          {ADVENTURE_TYPE_NAMES[adv.adventure_type] || adv.adventure_type}
                          {dateRange && ` \u00b7 ${dateRange}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 mt-4">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)}
                  className="flex-1 py-2.5 rounded-[7px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-xs font-semibold cursor-pointer font-body">Back</button>
              )}
              {step === 1 && needsAdventureStep ? (
                <button onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[13px] font-bold cursor-pointer font-display">Next</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || !canProceed}
                  className={clsx(
                    "flex-1 py-2.5 rounded-[7px] border-none text-[13px] font-bold font-display",
                    canProceed ? "bg-tl-accent text-white" : "bg-tl-border-light text-tl-text-dim",
                    submitting ? "cursor-wait" : canProceed ? "cursor-pointer" : "cursor-default"
                  )}>{submitting ? "Sending..." : "Request to Join"}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface CountdownDisplay {
  text: string;
  color: string;
}

function formatCountdown(depart: string | null, arrive: string | null, returnDate: string | null, home: string | null): CountdownDisplay | null {
  const dDepart = daysUntil(depart);
  const dArrive = daysUntil(arrive);
  const dReturn = daysUntil(returnDate);
  const dHome = daysUntil(home);
  if (dDepart === null) return null;
  if (dHome !== null && dHome < 0) return { text: "Completed", color: "#6c757d" };
  if (dReturn !== null && dReturn < 0 && (dHome === null || dHome >= 0)) return { text: "Traveling home", color: "#17a2b8" };
  if (dArrive !== null && dArrive <= 0 && (dReturn === null || dReturn >= 0)) return { text: "On trail!", color: "#28a745" };
  if (dDepart <= 0) return { text: "Traveling!", color: "#17a2b8" };
  if (dDepart === 1) return { text: "Departs tomorrow!", color: "#fd7e14" };
  if (dDepart <= 7) return { text: `${dDepart} days out`, color: "#fd7e14" };
  if (dDepart <= 30) return { text: `${dDepart} days out`, color: "#ffc107" };
  return { text: `${dDepart} days out`, color: "#6c757d" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Minimal progress ring
interface ProgressRingProps {
  pct: number;
  size?: number;
  stroke?: number;
  theme: ThemeColors;
}

function ProgressRing({ pct, size = 40, stroke = 4, theme }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "#28a745" : pct >= 50 ? "#ffc107" : pct >= 25 ? "#fd7e14" : "#dc3545";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.borderLight} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: size * 0.28, fontWeight: 700, fill: theme.text, fontFamily: fontBody }}>
        {pct}%
      </text>
    </svg>
  );
}

interface HomeDashboardProps {
  user: User & { avatar_url?: string };
  memberships: Membership[];
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  isGlobalAdmin: boolean;
  onGlobalAdminClick?: () => void;
  onEnterAdventure: (troopId: number, adventureId: number | null) => void;
  onViewProfile?: () => void;
  onHelpClick?: () => void;
  onboarding?: OnboardingState | null;
  onRefreshOnboarding?: () => Promise<void>;
}

const UNIT_TYPES = [
  { value: "Troop", label: "Troop", sub: "Scouts BSA" },
  { value: "Venturing Crew", label: "Venturing Crew", sub: "Venturing" },
  { value: "Ship", label: "Ship", sub: "Sea Scouts" },
  { value: "Post", label: "Post", sub: "Exploring" },
] as const;

interface ExistingTroop {
  id: number;
  name: string;
  unit_type: string;
  unit_number: string;
  council: string | null;
  location: string | null;
}

interface NewTroopState {
  unit_type: string;
  unit_number: string;
  council_id: number | string | null;
  city: string;
  state: string;
  is_public: boolean;
}

interface AdvFormState {
  name: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
  adventure_type: string;
  [key: string]: string;
}

interface ItineraryListItem {
  id: string;
  name: string;
  days: number;
  miles: number;
  rating: string;
}

export default function HomeDashboard({ user, memberships, onRefresh, onLogout, isGlobalAdmin, onGlobalAdminClick, onEnterAdventure, onViewProfile, onHelpClick, onboarding, onRefreshOnboarding }: HomeDashboardProps) {
  const { theme, toggle } = useTheme();
  const { addToast } = useToast();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrowse, setShowBrowse] = useState(false);

  // Troop creation state (preserved from Lobby)
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createdTroopId, setCreatedTroopId] = useState<number | null>(null);
  const [createdTroopName, setCreatedTroopName] = useState("");
  const [newTroop, setNewTroop] = useState<NewTroopState>({ unit_type: "Troop", unit_number: "", council_id: null, city: "", state: "", is_public: true });
  const [duplicateTroop, setDuplicateTroop] = useState<ExistingTroop | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [advForm, setAdvForm] = useState<AdvFormState>({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
  const [itineraries, setItineraries] = useState<ItineraryListItem[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  // Join modal state
  const [joinModal, setJoinModal] = useState<{ troopId: number; troopName: string } | null>(null);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      setDashboard(data as unknown as DashboardResponse);
    } catch (e) { console.error("Dashboard fetch error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshDashboard(); }, [refreshDashboard]);

  const handleJoinClick = (troopId: number, troopName: string) => {
    setJoinModal({ troopId, troopName });
  };

  const handleJoinSubmit = async ({ participation, adventure_ids }: { participation: string; adventure_ids: number[] }) => {
    try {
      await api.joinTroop(joinModal!.troopId, { participation, adventure_ids });
      setJoinModal(null);
      await onRefresh();
      refreshDashboard();
      addToast("Join request sent", "success");
    } catch (e) { addToast((e as Error).message, "error"); }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Logo must be PNG, JPG, or WebP"); return; }
    if (file.size > 500 * 1024) { setError("Logo must be under 500KB"); return; }
    setNewLogoFile(file);
    setNewLogoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleCreateTroop = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateTroop(null);
    if (!newTroop.unit_number.trim()) return setError("Unit number is required");
    if (!/^[A-Za-z0-9]+$/.test(newTroop.unit_number.trim())) return setError("Unit number must be alphanumeric (e.g. 10, 123B, 123G)");
    if (!newTroop.council_id) return setError("Council is required");
    if (!newTroop.city.trim()) return setError("City is required");
    if (!newTroop.state) return setError("State is required");
    setFormLoading(true);
    setError("");
    try {
      const location = [newTroop.city.trim(), newTroop.state].filter(Boolean).join(", ");
      const isCustomCouncil = typeof newTroop.council_id === "string" && newTroop.council_id.startsWith("custom:");
      const councilPayload = isCustomCouncil ? { council: (newTroop.council_id as string).slice(7), council_id: null } : { council_id: newTroop.council_id };
      const created = await api.createTroop({ ...newTroop, unit_number: newTroop.unit_number.trim(), ...councilPayload, location }) as { id: number };
      if (newLogoFile && created?.id) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(newLogoFile); });
          await api.uploadTroopLogo(created.id, base64);
        } catch (logoErr) { console.warn("Logo upload failed:", logoErr); }
      }
      setCreatedTroopId(created.id);
      setCreatedTroopName(`${newTroop.unit_type} ${newTroop.unit_number.trim()}`);
      setCreateStep(2);
      setError("");
      refreshDashboard();
      try { setItineraries(await api.getItineraries() as unknown as ItineraryListItem[]); } catch {}
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
      // If it's a duplicate, try to get existing troop info
      if (err.message?.includes("already exists")) {
        try {
          const isCustomCouncil2 = typeof newTroop.council_id === "string" && newTroop.council_id.startsWith("custom:");
          if (!isCustomCouncil2 && newTroop.council_id) {
            const checkResp = await api.checkDuplicateTroop(newTroop.unit_type, newTroop.unit_number.trim(), newTroop.council_id as number);
            if (checkResp && (checkResp as ExistingTroop).id) {
              setDuplicateTroop(checkResp as ExistingTroop);
            }
          }
        } catch {}
      }
    }
    finally { setFormLoading(false); setNewLogoFile(null); setNewLogoPreview(null); }
  };

  const handleCreateAdventure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advForm.name.trim()) return setError("Adventure name required");
    setFormLoading(true);
    setError("");
    try {
      const adv = await api.createAdventure(createdTroopId!, advForm);
      await onRefresh();
      onEnterAdventure(createdTroopId!, adv.id);
    } catch (e) { setError((e as Error).message); }
    finally { setFormLoading(false); }
  };

  const stats = dashboard?.platform_stats;
  const pendingRequests = dashboard?.pending || [];

  return (
    <div className="min-h-screen bg-tl-bg font-body text-tl-text">
      {/* ── Header ── */}
      <div className="py-[18px] px-5 border-b border-tl-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div>
            <h1 className="font-display text-[22px] font-[800] text-tl-heading m-0">
              Trail<span className="text-tl-accent-light">Log</span>
            </h1>
            <div className="text-[11px] text-tl-text-dim font-body">Welcome back, {user.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="bg-none border-none text-lg cursor-pointer py-0.5 px-1.5">
            {theme.name === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
          </button>
          {onHelpClick && (
            <button onClick={onHelpClick} title="Help" aria-label="Open Help"
              className="w-[30px] h-[30px] rounded-full cursor-pointer p-0 flex items-center justify-center"
              style={{ border: `2px solid ${theme.accent}40`, background: theme.accent + "20" }}>
              <span className="text-sm font-bold text-tl-accent">?</span>
            </button>
          )}
          {onViewProfile && (
            <button onClick={onViewProfile}
              className="w-[30px] h-[30px] rounded-full cursor-pointer overflow-hidden p-0 flex items-center justify-center"
              style={{ border: `2px solid ${theme.accent}40`, background: user.avatar_url ? "transparent" : theme.accent + "20" }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-[30px] h-[30px] rounded-full" />
                : <span className="text-xs font-bold text-tl-accent">{(user.name || "U")[0].toUpperCase()}</span>}
            </button>
          )}
          <button onClick={onLogout}
            className="text-[11px] text-tl-warn bg-none border border-tl-warn-bg py-1 px-2.5 rounded-[5px] cursor-pointer font-body font-semibold">Sign Out</button>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto py-6 px-5">

        {/* ── Onboarding Checklist ── */}
        {onboarding && !onboarding.completed && onboarding.role && onRefreshOnboarding && (
          <OnboardingChecklist onboarding={onboarding} onRefresh={onRefreshOnboarding} />
        )}

        {/* ── Platform Overview (sys admins only) ── */}
        {isGlobalAdmin && stats && (
          <div className="tl-card mb-4" style={{ border: `1px solid ${theme.accent}30` }}>
            <div className="tl-card-title flex items-center justify-between">
              <span>Platform Overview</span>
              {onGlobalAdminClick && (
                <button onClick={onGlobalAdminClick}
                  className="text-[10px] text-tl-accent bg-none py-[3px] px-2.5 rounded-[5px] cursor-pointer font-body font-semibold"
                  style={{ border: `1px solid ${theme.accent}40` }}>Open Admin Panel {"\u2192"}</button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: "Users", value: stats.total_users },
                { label: "Troops", value: stats.total_troops },
                { label: "Adventures", value: stats.active_adventures },
                { label: "New (7d)", value: stats.new_this_week },
              ].map(s => (
                <div key={s.label} className="text-center py-2.5 px-1.5 rounded-btn bg-tl-bg-alt border border-tl-border-light">
                  <div className="text-[22px] font-[800] text-tl-heading font-display">{s.value}</div>
                  <div className="text-[9px] font-semibold text-tl-text-dimmer uppercase tracking-[0.5px]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Requests ── */}
        {pendingRequests.length > 0 && (
          <div className="tl-card mb-4" style={{ border: `1px solid ${theme.gold}40` }}>
            <div className="tl-card-title text-tl-gold">Pending Requests</div>
            {pendingRequests.map(p => (
              <div key={p.troop_id} className="flex items-center justify-between text-xs text-tl-text-muted mb-1">
                <span>
                  <strong>{p.troop_name}</strong>
                  {p.participation === "support" && <span className="text-[9px] text-tl-text-dim ml-1">(support)</span>}
                  {" "}&mdash; waiting for admin approval...
                </span>
                <button onClick={async () => {
                  try { await api.leaveTroop(p.troop_id); await onRefresh(); refreshDashboard(); addToast("Request withdrawn", "success"); }
                  catch (e) { addToast((e as Error).message, "error"); }
                }} className="py-[3px] px-2 rounded-[5px] bg-transparent text-tl-warn text-[10px] font-semibold cursor-pointer font-body shrink-0"
                  style={{ border: `1px solid ${theme.warn}40` }}>Withdraw</button>
              </div>
            ))}
          </div>
        )}

        {/* ── My Troops ── */}
        {loading ? (
          <div className="text-center p-10 text-tl-text-dim">Loading...</div>
        ) : (dashboard?.troops || []).length === 0 && !showCreate ? (
          <div className="tl-card text-center py-10 px-5">
            <div className="text-[32px] mb-2">{"\u{1F3D5}\uFE0F"}</div>
            <div className="text-sm font-semibold text-tl-heading mb-1">
              {user.user_type === "scout" ? "No troops yet" : "Get started"}
            </div>
            <div className="text-xs text-tl-text-dim">
              {user.user_type === "scout" ? "A troop leader will need to create one and invite you." : "Create a troop or browse public troops to join."}
            </div>
          </div>
        ) : (
          (dashboard?.troops || []).map(troop => (
            <div key={troop.id} className="tl-card mb-3">
              {/* Troop header */}
              <div className={clsx("flex items-center gap-3", troop.adventures.length > 0 && "mb-3")}>
                <TroopLogo troopId={troop.id} name={troop.name} size={48} theme={theme} />
                <div className="flex-1">
                  <div className="text-[15px] font-[800] text-tl-heading font-display">{troop.name}</div>
                  <div className="text-[11px] text-tl-text-dim">
                    {[troop.council, troop.location].filter(Boolean).join(" \u00B7 ")}
                    {troop.role === "admin" && <span className="ml-1.5 text-[9px] font-bold text-tl-accent py-[1px] px-[5px] rounded-[3px]" style={{ background: theme.accent + "18" }}>ADMIN</span>}
                  </div>
                </div>
              </div>

              {/* Adventures within this troop */}
              {troop.adventures.map(adv => {
                const countdown = formatCountdown(adv.depart_date, adv.arrive_date, adv.return_date, adv.home_date);
                const dateRange = [formatDate(adv.arrive_date), formatDate(adv.return_date)].filter(Boolean).join(" \u2192 ");
                return (
                  <div key={adv.id}
                    className="flex items-center gap-3 py-2.5 px-3 bg-tl-bg-alt rounded-btn border border-tl-border-light mb-1.5">
                    <ProgressRing pct={adv.crew_readiness} size={48} stroke={4} theme={theme} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-tl-heading">
                        {adv.name}
                      </div>
                      <div className="text-[10px] text-tl-text-dim">
                        {ADVENTURE_TYPE_NAMES[adv.adventure_type] || adv.adventure_type}
                        {dateRange && ` \u00B7 ${dateRange}`}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                        {countdown && (
                          <span className="text-[9px] font-bold py-0.5 px-1.5 rounded-[4px]"
                            style={{ color: countdown.color, background: countdown.color + "18" }}>
                            {countdown.text}
                          </span>
                        )}
                        <span className="text-[9px] text-tl-text-dimmer">
                          {adv.trekking_count} trekking{adv.member_count > adv.trekking_count ? ` \u00B7 ${adv.member_count - adv.trekking_count} support` : ""}
                        </span>
                        {adv.next_training && (
                          <span className="text-[9px] text-tl-accent font-semibold">
                            Next: {formatDate(adv.next_training.date)}{adv.next_training.location ? ` @ ${adv.next_training.location}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {showCreate && createStep === 2 && troop.id === createdTroopId ? (
                      <span className="text-[10px] font-semibold text-tl-text-dim italic shrink-0">Setup {"\u2193"}</span>
                    ) : (
                      <button onClick={() => onEnterAdventure(troop.id, adv.id)}
                        className="py-1.5 px-3.5 rounded-badge-sm border-none bg-tl-accent text-white text-[11px] font-bold cursor-pointer font-display shrink-0">Enter {"\u2192"}</button>
                    )}
                  </div>
                );
              })}

              {troop.adventures.length === 0 && (
                <div className="text-xs text-tl-text-dim italic py-2">
                  No active adventures yet
                </div>
              )}
            </div>
          ))
        )}

        {/* ── Quick Actions ── */}
        <div className="flex gap-2 mt-2">
          {!showCreate && user.user_type !== "scout" && (
            <button onClick={() => { setShowCreate(true); setCreateStep(1); }}
              className="flex-1 py-3 rounded-btn border-[1.5px] border-dashed border-tl-border-light bg-transparent text-tl-accent text-[13px] font-semibold cursor-pointer font-body">+ Register Unit</button>
          )}
          {(dashboard?.public_troops || []).length > 0 && !showCreate && (
            <button onClick={() => setShowBrowse(!showBrowse)}
              className="flex-1 py-3 rounded-btn border-[1.5px] border-tl-border-light bg-transparent text-tl-text-muted text-[13px] font-semibold cursor-pointer font-body">{showBrowse ? "Hide" : "Browse"} Troops</button>
          )}
        </div>

        {/* ── Browse Public Troops ── */}
        {showBrowse && (dashboard?.public_troops || []).length > 0 && (
          <div className="tl-card mt-3">
            <div className="tl-card-title">Public Troops</div>
            {dashboard!.public_troops.map(t => (
              <div key={t.id}
                className="flex items-center justify-between py-2 px-3 bg-tl-bg-alt rounded-btn mb-1 border border-tl-border-light">
                <div className="flex items-center gap-2.5">
                  <TroopLogo troopId={t.id} name={t.name} size={40} theme={theme} />
                  <div>
                    <div className="text-xs font-bold text-tl-heading">{t.name}</div>
                    <div className="text-[10px] text-tl-text-dim">{[t.council, t.location].filter(Boolean).join(" \u00B7 ")}</div>
                  </div>
                </div>
                {isGlobalAdmin ? (
                  <button onClick={() => {
                    // For global admin, enter the troop directly — pick first adventure or go to adventure picker
                    onEnterAdventure(t.id, null);
                  }} className="py-1 px-2.5 rounded-[5px] border-none bg-tl-accent text-white text-[10px] font-semibold cursor-pointer font-body">Enter {"\u2192"}</button>
                ) : (
                  <button onClick={() => handleJoinClick(t.id, t.name)}
                    className="py-1 px-2.5 rounded-[5px] border-none bg-tl-accent text-white text-[10px] font-semibold cursor-pointer font-body">Request to Join</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Create Troop Flow (2-step, preserved from Lobby) ── */}
        {showCreate && createStep === 2 && (
          <div className="tl-card mt-3">
            <div className="tl-card-title">Set Up Your First Adventure</div>
            <div className="text-xs text-tl-text-dim mb-3.5">
              <strong className="text-tl-heading">{createdTroopName}</strong> is ready! Now create your first adventure.
            </div>
            <form onSubmit={handleCreateAdventure}>
              <div className="mb-2.5">
                <label className="text-[9px] font-bold text-tl-text-dim uppercase mb-1 block">Adventure Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADVENTURE_TYPES.map((t: AdventureTypeT) => (
                    <button key={t.id} type="button" disabled={!t.enabled}
                      onClick={() => t.enabled && setAdvForm({ ...advForm, adventure_type: t.id })}
                      className={clsx(
                        "py-2.5 px-3 rounded-btn text-left font-body relative",
                        advForm.adventure_type === t.id ? "border-2 border-tl-accent bg-tl-accent-bg" : "border-[1.5px] border-tl-border-light bg-tl-bg-alt",
                        t.enabled ? "cursor-pointer opacity-100" : "cursor-default opacity-45"
                      )}>
                      <div className="text-sm mb-0.5">{t.icon}</div>
                      <div className={clsx("text-xs font-bold", t.enabled ? "text-tl-heading" : "text-tl-text-dim")}>{t.name}</div>
                      <div className="text-[10px] text-tl-text-dim">{t.location}</div>
                      {!t.enabled && (
                        <div className="absolute top-1.5 right-2 text-[8px] font-bold text-tl-text-dim bg-tl-border py-0.5 px-1.5 rounded-[4px] uppercase tracking-[0.5px]">Coming Soon</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <input value={advForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, name: e.target.value })}
                placeholder={`Crew name (e.g. ${(ADVENTURE_TYPES.find((t: AdventureTypeT) => t.id === advForm.adventure_type)?.name || "Philmont")} 2026)`}
                className="w-full py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none mb-2 box-border" required />
              {(() => {
                const labels = ADVENTURE_TYPES.find((t: AdventureTypeT) => t.id === advForm.adventure_type)?.dateLabels || ADVENTURE_TYPES[0].dateLabels;
                return (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {(["depart", "arrive", "return", "home"] as const).map(key => (
                      <div key={key}>
                        <label className="text-[9px] font-bold text-tl-text-dim uppercase">{labels[key]}</label>
                        <input value={advForm[`${key}_date`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, [`${key}_date`]: e.target.value })} type="date"
                          className="w-full py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none box-border" />
                      </div>
                    ))}
                  </div>
                );
              })()}
              <select value={advForm.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvForm({ ...advForm, itinerary_id: e.target.value })}
                className={clsx("w-full py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-xs font-body outline-none mb-2 box-border", advForm.itinerary_id ? "text-tl-text" : "text-tl-text-dim")}>
                <option value="">Select itinerary (optional)...</option>
                {[12, 9, 7].map(days => {
                  const group = itineraries.filter(it => it.days === days).sort((a, b) => (parseInt(a.id.split("-")[1]) || 0) - (parseInt(b.id.split("-")[1]) || 0));
                  return group.length > 0 ? (
                    <optgroup key={days} label={`${days}-Day Treks`}>
                      {group.map(it => <option key={it.id} value={it.id}>{it.name} ({it.miles} mi, {it.rating})</option>)}
                    </optgroup>
                  ) : null;
                })}
              </select>
              {error && <div className="text-xs text-tl-danger mb-2">{error}</div>}
              <button type="submit" disabled={formLoading}
                className="w-full py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-xs font-semibold font-body"
                style={{ cursor: formLoading ? "wait" : "pointer" }}>{formLoading ? "..." : "Create Adventure & Enter"}</button>
            </form>
          </div>
        )}

        {showCreate && createStep === 1 && (
          <div className="tl-card mt-3">
            <div className="tl-card-title">Register Your Unit</div>
            <form onSubmit={handleCreateTroop}>
              <label className="text-[9px] font-bold text-tl-text-dim uppercase mb-1 block">Unit Type</label>
              <select value={newTroop.unit_type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setNewTroop({ ...newTroop, unit_type: e.target.value }); setDuplicateTroop(null); setError(""); }}
                className="w-full py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none mb-2 box-border cursor-pointer">
                {UNIT_TYPES.map(ut => (
                  <option key={ut.value} value={ut.value}>{ut.label} ({ut.sub})</option>
                ))}
              </select>
              <label className="text-[9px] font-bold text-tl-text-dim uppercase mb-1 block">Unit Number</label>
              <input value={newTroop.unit_number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewTroop({ ...newTroop, unit_number: e.target.value }); setDuplicateTroop(null); setError(""); }}
                placeholder="e.g. 10, 123B, 123G"
                maxLength={10}
                className="w-full py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none mb-2 box-border" required />
              {newTroop.unit_number.trim() && (
                <div className="text-[11px] text-tl-accent font-semibold mb-2 -mt-1">
                  Will be created as: <strong>{newTroop.unit_type} {newTroop.unit_number.trim()}</strong>
                </div>
              )}
              <CouncilPicker value={newTroop.council_id} onChange={(id: number | string | null) => setNewTroop({ ...newTroop, council_id: id })} />
              <div className="flex gap-2 mb-2">
                <input value={newTroop.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, city: e.target.value })}
                  placeholder="City (required)" className="flex-1 py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none box-border" required />
                <select value={newTroop.state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTroop({ ...newTroop, state: e.target.value })}
                  className="w-20 py-2.5 px-3 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none cursor-pointer box-border" required>
                  <option value="">State</option>
                  {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-2.5">
                <div className="flex items-center gap-2.5 mb-1.5">
                  {newLogoPreview ? (
                    <img src={newLogoPreview} alt="Logo preview" onError={() => { setNewLogoPreview(null); setNewLogoFile(null); }}
                      className="w-[100px] h-[100px] rounded-btn object-contain bg-tl-bg-alt border border-tl-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-btn flex items-center justify-center border border-dashed border-tl-border-light text-xl text-tl-text-dim"
                      style={{ background: theme.accent + "20" }}>{"\u{1F4F7}"}</div>
                  )}
                  <div>
                    <label className="inline-block py-[5px] px-3 rounded-badge-sm border-none bg-tl-accent text-white text-[11px] font-bold cursor-pointer font-display">
                      {newLogoPreview ? "Change" : "Add Logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect} className="hidden" />
                    </label>
                    {newLogoPreview && (
                      <button type="button" onClick={() => { setNewLogoFile(null); setNewLogoPreview(null); }}
                        className="ml-1.5 py-[3px] px-2 rounded-[4px] border-none bg-transparent text-tl-text-dim text-[10px] cursor-pointer font-body">Remove</button>
                    )}
                    <div className="text-[10px] text-tl-text-dim mt-[3px]">Optional \u00B7 PNG, JPG, or WebP \u00B7 Max 500KB</div>
                  </div>
                </div>
              </div>
              <div className="mb-2.5">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-xs font-semibold text-tl-heading">Troop Visibility</span>
                  <div className="flex rounded-badge-sm overflow-hidden border border-tl-border-light">
                    {[true, false].map(isPublic => (
                      <button key={String(isPublic)} type="button" onClick={() => setNewTroop({ ...newTroop, is_public: isPublic })}
                        className={clsx(
                          "py-1 px-3.5 border-none text-[11px] font-semibold cursor-pointer font-body",
                          newTroop.is_public === isPublic ? "bg-tl-accent text-white" : "bg-transparent text-tl-text-muted"
                        )}>{isPublic ? "Public" : "Private"}</button>
                    ))}
                  </div>
                </div>
                <div className={clsx(
                  "text-[11px] py-2 px-2.5 rounded-badge-sm leading-[1.5]",
                  newTroop.is_public ? "text-tl-text-dim bg-tl-bg-alt border border-tl-border-light" : "text-tl-warn"
                )} style={!newTroop.is_public ? {
                  background: theme.name === "dark" ? "#3a2820" : "#fef3e8",
                  border: `1px solid ${theme.warn}40`,
                } : undefined}>
                  {newTroop.is_public
                    ? "Your troop will be listed so parents and scouts can search by name and request to join."
                    : "Your troop will be hidden from search. You'll need to invite each member by email."}
                </div>
              </div>
              {error && !duplicateTroop && <div className="text-xs text-tl-danger mb-2">{error}</div>}

              {/* Duplicate troop found — show info + join link */}
              {duplicateTroop && (
                <div className="mb-3 p-3 rounded-btn border-2 border-tl-gold bg-tl-bg-alt">
                  <div className="text-xs font-bold text-tl-heading mb-1.5">
                    {duplicateTroop.name} already exists!
                  </div>
                  <div className="text-[11px] text-tl-text-dim mb-1">
                    {[duplicateTroop.council, duplicateTroop.location].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-[11px] text-tl-text-dim mb-2.5">
                    If this is your unit, you can request to join it instead of creating a new one.
                  </div>
                  <button type="button"
                    onClick={() => {
                      setDuplicateTroop(null);
                      setError("");
                      setShowCreate(false);
                      handleJoinClick(duplicateTroop.id, duplicateTroop.name);
                    }}
                    className="w-full py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[13px] font-bold font-display cursor-pointer">
                    Request to Join {duplicateTroop.name}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowCreate(false); setCreateStep(1); setCreatedTroopId(null); setDuplicateTroop(null); }}
                  className="flex-1 py-2.5 rounded-[7px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-xs font-semibold cursor-pointer font-body">Cancel</button>
                {!duplicateTroop && (
                  <button type="submit" disabled={formLoading}
                    className="flex-1 py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[13px] font-bold font-display tracking-[0.3px]"
                    style={{ cursor: formLoading ? "wait" : "pointer" }}>{formLoading ? "..." : "Create"}</button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Join Modal */}
      {joinModal && (
        <JoinModal
          troopId={joinModal.troopId}
          troopName={joinModal.troopName}
          theme={theme}
          onClose={() => setJoinModal(null)}
          onSubmit={handleJoinSubmit}
        />
      )}
    </div>
  );
}
