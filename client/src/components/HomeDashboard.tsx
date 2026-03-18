import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import TroopLogo from "./TroopLogo";
import CouncilPicker from "./CouncilPicker";
import type { User, Membership, ThemeColors, AdventureType as AdventureTypeT } from "../types";

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

  const inputLabel: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "block" };
  const radioBtn = (selected: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
    borderRadius: 8, cursor: "pointer", border: selected ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
    background: selected ? theme.accentBg : theme.bgAlt, marginBottom: 6, transition: "all 0.15s",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: theme.bg, borderRadius: 14, padding: "24px 20px",
        maxWidth: 440, width: "100%", maxHeight: "80vh", overflowY: "auto",
        border: `1px solid ${theme.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
      }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 800, color: theme.heading, margin: 0 }}>
            Join {troopName}
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 18, color: theme.textDim, cursor: "pointer", padding: "2px 6px",
          }}>&times;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: theme.textDim, fontSize: 12 }}>Loading...</div>
        ) : (
          <>
            {/* Step 1: Participation */}
            {step === 1 && (
              <div>
                <label style={inputLabel}>How will you participate?</label>
                <div onClick={() => setParticipation("trekking")} style={radioBtn(participation === "trekking")}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", border: `2px solid ${participation === "trekking" ? theme.accent : theme.borderLight}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                  }}>
                    {participation === "trekking" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: theme.accent }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>Trekker</div>
                    <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>Going on the adventure</div>
                  </div>
                </div>
                <div onClick={() => setParticipation("support")} style={radioBtn(participation === "support")}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", border: `2px solid ${participation === "support" ? theme.accent : theme.borderLight}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                  }}>
                    {participation === "support" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: theme.accent }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>Support Crew</div>
                    <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>Helping from home</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Adventure selection (multi-adventure troops only) */}
            {step === 2 && needsAdventureStep && (
              <div>
                <label style={inputLabel}>Which adventure(s) are you joining?</label>
                <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 10 }}>
                  Select one or more adventures you want to participate in.
                </div>
                {adventures.map(adv => {
                  const selected = selectedAdventures.includes(adv.id);
                  const dateRange = [formatDate(adv.arrive_date), formatDate(adv.return_date)].filter(Boolean).join(" - ");
                  return (
                    <div key={adv.id} onClick={() => toggleAdventure(adv.id)} style={{
                      ...radioBtn(selected),
                      cursor: "pointer",
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? theme.accent : theme.borderLight}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                        background: selected ? theme.accent : "transparent",
                      }}>
                        {selected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>{adv.name}</div>
                        <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>
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
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: fontBody,
                }}>Back</button>
              )}
              {step === 1 && needsAdventureStep ? (
                <button onClick={() => setStep(2)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  background: theme.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: fontDisplay,
                }}>Next</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || !canProceed} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  background: canProceed ? theme.accent : theme.borderLight,
                  color: canProceed ? "#fff" : theme.textDim,
                  fontSize: 13, fontWeight: 700,
                  cursor: submitting ? "wait" : canProceed ? "pointer" : "default",
                  fontFamily: fontDisplay,
                }}>{submitting ? "Sending..." : "Request to Join"}</button>
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
}

interface NewTroopState {
  name: string;
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

export default function HomeDashboard({ user, memberships, onRefresh, onLogout, isGlobalAdmin, onGlobalAdminClick, onEnterAdventure, onViewProfile, onHelpClick }: HomeDashboardProps) {
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
  const [newTroop, setNewTroop] = useState<NewTroopState>({ name: "", council_id: null, city: "", state: "", is_public: true });
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
    if (!newTroop.name.trim()) return setError("Troop name required");
    if (!newTroop.council_id) return setError("Council is required");
    if (!newTroop.city.trim()) return setError("City is required");
    if (!newTroop.state) return setError("State is required");
    setFormLoading(true);
    setError("");
    try {
      const location = [newTroop.city.trim(), newTroop.state].filter(Boolean).join(", ");
      const isCustomCouncil = typeof newTroop.council_id === "string" && newTroop.council_id.startsWith("custom:");
      const councilPayload = isCustomCouncil ? { council: (newTroop.council_id as string).slice(7), council_id: null } : { council_id: newTroop.council_id };
      const created = await api.createTroop({ ...newTroop, ...councilPayload, location }) as { id: number };
      if (newLogoFile && created?.id) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(newLogoFile); });
          await api.uploadTroopLogo(created.id, base64);
        } catch (logoErr) { console.warn("Logo upload failed:", logoErr); }
      }
      setCreatedTroopId(created.id);
      setCreatedTroopName(newTroop.name.trim());
      setCreateStep(2);
      setError("");
      refreshDashboard();
      try { setItineraries(await api.getItineraries() as unknown as ItineraryListItem[]); } catch {}
    } catch (e) { setError((e as Error).message); }
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

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody,
    outline: "none", marginBottom: 8, boxSizing: "border-box",
  };

  const stats = dashboard?.platform_stats;
  const pendingRequests = dashboard?.pending || [];

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: fontBody, color: theme.text }}>
      {/* ── Header ── */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 800, color: theme.heading, margin: 0 }}>
              Trail<span style={{ color: theme.accentLight }}>Log</span>
            </h1>
            <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>Welcome back, {user.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggle} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "2px 6px" }}>
            {theme.name === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
          </button>
          {onHelpClick && (
            <button onClick={onHelpClick} title="Help" aria-label="Open Help" style={{
              width: 30, height: 30, borderRadius: "50%", border: `2px solid ${theme.accent}40`,
              background: theme.accent + "20", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent }}>?</span>
            </button>
          )}
          {onViewProfile && (
            <button onClick={onViewProfile} style={{
              width: 30, height: 30, borderRadius: "50%", border: `2px solid ${theme.accent}40`,
              background: user.avatar_url ? "transparent" : theme.accent + "20",
              cursor: "pointer", overflow: "hidden", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                : <span style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>{(user.name || "U")[0].toUpperCase()}</span>}
            </button>
          )}
          <button onClick={onLogout} style={{
            fontSize: 11, color: theme.warn, background: "none", border: `1px solid ${theme.warnBg}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── Platform Overview (sys admins only) ── */}
        {isGlobalAdmin && stats && (
          <div style={{ ...card(theme), marginBottom: 16, border: `1px solid ${theme.accent}30` }}>
            <div style={{ ...cardTitle(theme), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Platform Overview</span>
              {onGlobalAdminClick && (
                <button onClick={onGlobalAdminClick} style={{
                  fontSize: 10, color: theme.accent, background: "none", border: `1px solid ${theme.accent}40`,
                  padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
                }}>Open Admin Panel {"\u2192"}</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
              {[
                { label: "Users", value: stats.total_users },
                { label: "Troops", value: stats.total_troops },
                { label: "Adventures", value: stats.active_adventures },
                { label: "New (7d)", value: stats.new_this_week },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: theme.textDimmer, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Requests ── */}
        {pendingRequests.length > 0 && (
          <div style={{ ...card(theme), border: `1px solid ${theme.gold}40`, marginBottom: 16 }}>
            <div style={{ ...cardTitle(theme), color: theme.gold }}>Pending Requests</div>
            {pendingRequests.map(p => (
              <div key={p.troop_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>
                <span>
                  <strong>{p.troop_name}</strong>
                  {p.participation === "support" && <span style={{ fontSize: 9, color: theme.textDim, marginLeft: 4 }}>(support)</span>}
                  {" "}&mdash; waiting for admin approval...
                </span>
                <button onClick={async () => {
                  try { await api.leaveTroop(p.troop_id); await onRefresh(); refreshDashboard(); addToast("Request withdrawn", "success"); }
                  catch (e) { addToast((e as Error).message, "error"); }
                }} style={{
                  padding: "3px 8px", borderRadius: 5, border: `1px solid ${theme.warn}40`, background: "transparent",
                  color: theme.warn, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, flexShrink: 0,
                }}>Withdraw</button>
              </div>
            ))}
          </div>
        )}

        {/* ── My Troops ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>Loading...</div>
        ) : (dashboard?.troops || []).length === 0 && !showCreate ? (
          <div style={{ ...card(theme), textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F3D5}\uFE0F"}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.heading, marginBottom: 4 }}>
              {user.user_type === "scout" ? "No troops yet" : "Get started"}
            </div>
            <div style={{ fontSize: 12, color: theme.textDim }}>
              {user.user_type === "scout" ? "A troop leader will need to create one and invite you." : "Create a troop or browse public troops to join."}
            </div>
          </div>
        ) : (
          (dashboard?.troops || []).map(troop => (
            <div key={troop.id} style={{ ...card(theme), marginBottom: 12 }}>
              {/* Troop header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: troop.adventures.length > 0 ? 12 : 0 }}>
                <TroopLogo troopId={troop.id} name={troop.name} size={48} theme={theme} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>{troop.name}</div>
                  <div style={{ fontSize: 11, color: theme.textDim }}>
                    {[troop.council, troop.location].filter(Boolean).join(" \u00B7 ")}
                    {troop.role === "admin" && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: theme.accent, background: theme.accent + "18", padding: "1px 5px", borderRadius: 3 }}>ADMIN</span>}
                  </div>
                </div>
              </div>

              {/* Adventures within this troop */}
              {troop.adventures.map(adv => {
                const countdown = formatCountdown(adv.depart_date, adv.arrive_date, adv.return_date, adv.home_date);
                const dateRange = [formatDate(adv.arrive_date), formatDate(adv.return_date)].filter(Boolean).join(" \u2192 ");
                return (
                  <div key={adv.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.borderLight}`, marginBottom: 6,
                  }}>
                    <ProgressRing pct={adv.crew_readiness} size={48} stroke={4} theme={theme} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>
                        {adv.name}
                      </div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>
                        {ADVENTURE_TYPE_NAMES[adv.adventure_type] || adv.adventure_type}
                        {dateRange && ` \u00B7 ${dateRange}`}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, alignItems: "center" }}>
                        {countdown && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: countdown.color, background: countdown.color + "18", padding: "2px 6px", borderRadius: 4 }}>
                            {countdown.text}
                          </span>
                        )}
                        <span style={{ fontSize: 9, color: theme.textDimmer }}>
                          {adv.trekking_count} trekking{adv.member_count > adv.trekking_count ? ` \u00B7 ${adv.member_count - adv.trekking_count} support` : ""}
                        </span>
                        {adv.next_training && (
                          <span style={{ fontSize: 9, color: theme.accent, fontWeight: 600 }}>
                            Next: {formatDate(adv.next_training.date)}{adv.next_training.location ? ` @ ${adv.next_training.location}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {showCreate && createStep === 2 && troop.id === createdTroopId ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, fontStyle: "italic", flexShrink: 0 }}>Setup {"\u2193"}</span>
                    ) : (
                      <button onClick={() => onEnterAdventure(troop.id, adv.id)} style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: fontDisplay, flexShrink: 0,
                      }}>Enter {"\u2192"}</button>
                    )}
                  </div>
                );
              })}

              {troop.adventures.length === 0 && (
                <div style={{ fontSize: 12, color: theme.textDim, fontStyle: "italic", padding: "8px 0" }}>
                  No active adventures yet
                </div>
              )}
            </div>
          ))
        )}

        {/* ── Quick Actions ── */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {!showCreate && user.user_type !== "scout" && (
            <button onClick={() => { setShowCreate(true); setCreateStep(1); }} style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
              background: "transparent", color: theme.accent, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
            }}>+ Create Troop</button>
          )}
          {(dashboard?.public_troops || []).length > 0 && !showCreate && (
            <button onClick={() => setShowBrowse(!showBrowse)} style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
              background: "transparent", color: theme.textMuted, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
            }}>{showBrowse ? "Hide" : "Browse"} Troops</button>
          )}
        </div>

        {/* ── Browse Public Troops ── */}
        {showBrowse && (dashboard?.public_troops || []).length > 0 && (
          <div style={{ ...card(theme), marginTop: 12 }}>
            <div style={cardTitle(theme)}>Public Troops</div>
            {dashboard!.public_troops.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", background: theme.bgAlt, borderRadius: 8, marginBottom: 4,
                border: `1px solid ${theme.borderLight}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TroopLogo troopId={t.id} name={t.name} size={40} theme={theme} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: theme.textDim }}>{[t.council, t.location].filter(Boolean).join(" \u00B7 ")}</div>
                  </div>
                </div>
                {isGlobalAdmin ? (
                  <button onClick={() => {
                    // For global admin, enter the troop directly — pick first adventure or go to adventure picker
                    onEnterAdventure(t.id, null);
                  }} style={{
                    padding: "4px 10px", borderRadius: 5, border: "none", background: theme.accent,
                    color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  }}>Enter {"\u2192"}</button>
                ) : (
                  <button onClick={() => handleJoinClick(t.id, t.name)} style={{
                    padding: "4px 10px", borderRadius: 5, border: "none", background: theme.accent,
                    color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  }}>Request to Join</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Create Troop Flow (2-step, preserved from Lobby) ── */}
        {showCreate && createStep === 2 && (
          <div style={{ ...card(theme), marginTop: 12 }}>
            <div style={cardTitle(theme)}>Set Up Your First Adventure</div>
            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 14 }}>
              <strong style={{ color: theme.heading }}>{createdTroopName}</strong> is ready! Now create your first adventure.
            </div>
            <form onSubmit={handleCreateAdventure}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Adventure Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {ADVENTURE_TYPES.map((t: AdventureTypeT) => (
                    <button key={t.id} type="button" disabled={!t.enabled}
                      onClick={() => t.enabled && setAdvForm({ ...advForm, adventure_type: t.id })}
                      style={{
                        padding: "10px 12px", borderRadius: 8, cursor: t.enabled ? "pointer" : "default",
                        border: advForm.adventure_type === t.id ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                        background: advForm.adventure_type === t.id ? theme.accentBg : theme.bgAlt,
                        opacity: t.enabled ? 1 : 0.45, textAlign: "left", fontFamily: fontBody, position: "relative",
                      }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.enabled ? theme.heading : theme.textDim }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>{t.location}</div>
                      {!t.enabled && (
                        <div style={{ position: "absolute", top: 6, right: 8, fontSize: 8, fontWeight: 700, color: theme.textDim, background: theme.border, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Coming Soon</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <input value={advForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, name: e.target.value })}
                placeholder={`Crew name (e.g. ${(ADVENTURE_TYPES.find((t: AdventureTypeT) => t.id === advForm.adventure_type)?.name || "Philmont")} 2026)`}
                style={inputStyle} required />
              {(() => {
                const labels = ADVENTURE_TYPES.find((t: AdventureTypeT) => t.id === advForm.adventure_type)?.dateLabels || ADVENTURE_TYPES[0].dateLabels;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    {(["depart", "arrive", "return", "home"] as const).map(key => (
                      <div key={key}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels[key]}</label>
                        <input value={advForm[`${key}_date`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, [`${key}_date`]: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                      </div>
                    ))}
                  </div>
                );
              })()}
              <select value={advForm.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvForm({ ...advForm, itinerary_id: e.target.value })}
                style={{ ...inputStyle, color: advForm.itinerary_id ? theme.text : theme.textDim }}>
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
              {error && <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>{error}</div>}
              <button type="submit" disabled={formLoading} style={{
                width: "100%", padding: "10px 0", borderRadius: 7, border: "none",
                background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: formLoading ? "wait" : "pointer", fontFamily: fontBody,
              }}>{formLoading ? "..." : "Create Adventure & Enter"}</button>
            </form>
          </div>
        )}

        {showCreate && createStep === 1 && (
          <div style={{ ...card(theme), marginTop: 12 }}>
            <div style={cardTitle(theme)}>Create a Troop</div>
            <form onSubmit={handleCreateTroop}>
              <input value={newTroop.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, name: e.target.value })}
                placeholder="Troop or crew name (e.g. Troop 10, Crew 614)" style={inputStyle} required />
              <CouncilPicker value={newTroop.council_id} onChange={(id: number | string | null) => setNewTroop({ ...newTroop, council_id: id })} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={newTroop.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, city: e.target.value })}
                  placeholder="City (required)" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} required />
                <select value={newTroop.state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTroop({ ...newTroop, state: e.target.value })}
                  style={{ ...inputStyle, width: 80, marginBottom: 0, cursor: "pointer" }} required>
                  <option value="">State</option>
                  {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  {newLogoPreview ? (
                    <img src={newLogoPreview} alt="Logo preview" onError={() => { setNewLogoPreview(null); setNewLogoFile(null); }}
                      style={{ width: 100, height: 100, borderRadius: 8, objectFit: "contain", background: theme.bgAlt, border: `1px solid ${theme.border}` }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: theme.accent + "20", display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${theme.borderLight}`, fontSize: 20, color: theme.textDim }}>{"\u{1F4F7}"}</div>
                  )}
                  <div>
                    <label style={{ display: "inline-block", padding: "5px 12px", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: fontDisplay }}>
                      {newLogoPreview ? "Change" : "Add Logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect} style={{ display: "none" }} />
                    </label>
                    {newLogoPreview && (
                      <button type="button" onClick={() => { setNewLogoFile(null); setNewLogoPreview(null); }} style={{ marginLeft: 6, padding: "3px 8px", borderRadius: 4, border: "none", background: "transparent", color: theme.textDim, fontSize: 10, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
                    )}
                    <div style={{ fontSize: 10, color: theme.textDim, marginTop: 3 }}>Optional \u00B7 PNG, JPG, or WebP \u00B7 Max 500KB</div>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Troop Visibility</span>
                  <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${theme.borderLight}` }}>
                    {[true, false].map(isPublic => (
                      <button key={String(isPublic)} type="button" onClick={() => setNewTroop({ ...newTroop, is_public: isPublic })} style={{
                        padding: "4px 14px", border: "none", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", fontFamily: fontBody,
                        background: newTroop.is_public === isPublic ? theme.accent : "transparent",
                        color: newTroop.is_public === isPublic ? "#fff" : theme.textMuted,
                      }}>{isPublic ? "Public" : "Private"}</button>
                    ))}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: newTroop.is_public ? theme.textDim : theme.warn,
                  padding: "8px 10px", borderRadius: 6, lineHeight: 1.5,
                  background: newTroop.is_public ? theme.bgAlt : (theme.name === "dark" ? "#3a2820" : "#fef3e8"),
                  border: `1px solid ${newTroop.is_public ? theme.borderLight : theme.warn + "40"}`,
                }}>
                  {newTroop.is_public
                    ? "Your troop will be listed so parents and scouts can search by name and request to join."
                    : "Your troop will be hidden from search. You'll need to invite each member by email."}
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setShowCreate(false); setCreateStep(1); setCreatedTroopId(null); }} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                }}>Cancel</button>
                <button type="submit" disabled={formLoading} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  background: theme.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: formLoading ? "wait" : "pointer", fontFamily: fontDisplay, letterSpacing: 0.3,
                }}>{formLoading ? "..." : "Create"}</button>
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
