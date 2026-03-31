import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { useCountdown } from "../hooks/useCountdown";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useAdventureTheme } from "../contexts/AdventureThemeContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../api";
import { JOURNEY_WAYPOINTS, TRAIL_BADGES } from "../utils/theme";
import { computeCrewReadiness } from "../utils/readiness";
import { ProgressRing } from "./ProgressWidgets";
import { Settings, Sun, Moon, HelpCircle } from "lucide-react";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import TroopLogo from "./TroopLogo";
import type { User, Adventure, AdventureMember, TrekDates, Achievement, AdventureType as AdventureTypeT } from "../types";

interface ApprovedTroop {
  troop_id: number;
  troop_name: string;
}

interface Troop {
  id: number;
  name: string;
  council?: string | null;
  location?: string | null;
}

interface HeaderProps {
  user: User & { avatar_url?: string };
  troop: Troop | null;
  adventure: Adventure | null;
  members: AdventureMember[];
  analysis: unknown;
  trekDates: TrekDates | null;
  trekDate: Date | string | null;
  saving: boolean;
  isAdmin: boolean;
  approvedTroops: ApprovedTroop[];
  onSwitchTroop: (troopId: number) => void;
  onGoHome: () => void;
  onLogout: () => void;
  onAdminClick: () => void;
  onRefreshAuth?: () => void;
  onViewProfile?: () => void;
  onHelpClick: () => void;
  achievements: Achievement | null;
}

interface CountdownDisplay {
  icon: string;
  text: string;
  color: string;
}

export default function Header({ user, troop, adventure, members, analysis, trekDates, trekDate, saving, isAdmin, approvedTroops, onSwitchTroop, onGoHome, onLogout, onAdminClick, onRefreshAuth, onViewProfile, onHelpClick, achievements }: HeaderProps) {
  const { theme, mode, toggle } = useTheme();
  const adventureTheme = useAdventureTheme();
  const { addToast } = useToast();
  const [showProfile, setShowProfile] = useState(false);
  const [showTrailGuide, setShowTrailGuide] = useState(false);
  const [showLogoLightbox, setShowLogoLightbox] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const adventureName = adventure?.name || "Loading...";
  const troopName = troop?.name || "";
  const adventureType = ADVENTURE_TYPES.find((t: AdventureTypeT) => t.id === adventure?.adventure_type) || null;
  const countdown = useCountdown(trekDates || trekDate, adventureType?.dateLabels?.arrive || "Arrival at Base");

  // Format date range string (depart home → return home for full trip)
  const dateRangeStr = (() => {
    const fmt = (d: Date | null | undefined): string | null => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
    const depart = fmt(trekDates?.depart);
    const home = fmt(trekDates?.home);
    const arrive = fmt(trekDates?.arrive);
    const ret = fmt(trekDates?.return);
    // Prefer full trip range (depart → home), fallback to trek range (arrive → return)
    const start = depart || arrive;
    const end = home || ret;
    if (start && end) return `${start} \u2013 ${end}`;
    if (start) return start;
    return null;
  })();

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    try {
      await api.updateProfile({ name: editName.trim() });
      if (onRefreshAuth) onRefreshAuth();
      addToast("Profile updated", "success");
      setShowProfile(false);
    } catch (e) { addToast((e as Error).message, "error"); }
    setSavingProfile(false);
  };

  // Compute crew readiness using shared calculation (single source of truth)
  const { skills: advSkills, gearCatalog, memberGearMap, crews, selectedCrew } = useAdventure();
  const hasMultipleCrews = crews && crews.length > 1;
  const crewReadiness = computeCrewReadiness(members, advSkills, gearCatalog, memberGearMap).overall;
  const trekkingMembers = members.filter(m => m.participation === "trekking");

  // Find current waypoint
  const currentWaypoint = JOURNEY_WAYPOINTS.reduce((best, wp) => crewReadiness >= wp.pct ? wp : best, JOURNEY_WAYPOINTS[0]);

  // Earned badges — current user only
  const myBadges = (achievements?.badges || []).filter(b => b.user_id === user.id);
  const badgeCount = myBadges.length;

  // Compact countdown display
  const getCountdownDisplay = (): CountdownDisplay | null => {
    if (!countdown || (!countdown.days && countdown.days !== 0 && !countdown.onTrek && !countdown.gone)) return null;

    if (countdown.onTrek) {
      return { icon: "\u26FA", text: `On trail \u00B7 ${countdown.label}`, color: theme.accent };
    }
    if (countdown.gone && countdown.phase === "complete") {
      return { icon: "\u2713", text: `Complete \u00B7 ${countdown.label?.split("!")[0] || "Done"}`, color: theme.gold };
    }
    if (countdown.phase === "travel_there") {
      return { icon: "\u{1F690}", text: `En route \u00B7 ${countdown.label}`, color: theme.accentLight };
    }
    if (countdown.phase === "travel_back") {
      return { icon: "\u{1F690}", text: `Heading home \u00B7 ${countdown.days}d left`, color: theme.accentLight };
    }
    // Pre-departure
    if (countdown.days !== undefined) {
      if (countdown.days <= 1 && countdown.hours !== undefined) {
        return { icon: "\u23F1", text: `${countdown.hours}h ${countdown.minutes}m \u00B7 Departure tomorrow`, color: theme.urgency };
      }
      if (countdown.days <= 7) {
        return { icon: "\u23F1", text: `${countdown.days}d ${countdown.hours}h \u00B7 ${countdown.label}`, color: theme.urgency };
      }
      // Format target date
      const targetDate = trekDates?.depart || trekDate;
      let dateStr = "";
      if (targetDate) {
        const d = typeof targetDate === "string" ? new Date(targetDate + "T00:00:00") : targetDate;
        dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      return { icon: "\u23F1", text: `${countdown.days} days \u00B7 ${countdown.label} ${dateStr}`, color: theme.urgency };
    }
    return null;
  };

  const cd = getCountdownDisplay();

  // Texture pattern — sourced from AdventureTheme (6% opacity overlay)
  const textureStyle: React.CSSProperties = {
    backgroundImage: adventureTheme.def.textureSvgUrl,
  };

  const badgeDef: Record<string, string> = { gear_ready: "\u{1F392}", trail_medic: "\u{1F3E5}", admin_pro: "\u{1F4CB}", training_complete: "\u{1F97E}", ai_ready: "\u{1F916}", ai_gear: "\u{1F6CD}\uFE0F", fully_prepared: "\u2B50" };
  const titleDef: Record<string, string> = { gear_ready: "Gear Ready", trail_medic: "Trail Medic", admin_pro: "Admin Pro", training_complete: "Training Complete", ai_ready: "AI Ready", ai_gear: "AI Gear Scout", fully_prepared: "Fully Prepared" };

  return (<>
    <div className="rounded-b-[24px] p-5 pb-0 relative" style={{ background: adventureTheme.heroGradient }}>
      {/* Texture overlay — clipped to rounded corners independently */}
      <div className="absolute inset-0 rounded-b-[24px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={textureStyle} />
      </div>

      {/* ── ROW 1: Logo Bar ── */}
      <div className="flex items-center justify-between relative mb-3.5 pb-3 border-b border-white/10">
        <div onClick={onGoHome} className="flex items-center gap-2.5 cursor-pointer" role="button" aria-label="Go home">
          <Logo size={32} />
          <div>
            <div className="text-[17px] font-[800] text-[#FDFAF5] tracking-[0.5px] font-display leading-[1.1]">
              Trail<span className="text-[#B8CC9A]">Log</span>
            </div>
            <div className="text-[9px] text-[rgba(184,204,154,0.7)] font-semibold tracking-[2px] uppercase font-body">
              by GraceZero.ai
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-[#B8CC9A]">saving...</span>}
          <button onClick={toggle} title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            className="w-8 h-8 rounded-[10px] bg-white/10 backdrop-blur-[4px] border-none cursor-pointer text-sm text-[#FDFAF5] flex items-center justify-center">
            {mode === "dark" ? <Sun size={18} color="#FDFAF5" strokeWidth={2} /> : <Moon size={18} color="#FDFAF5" strokeWidth={2} />}
          </button>
          <button onClick={onHelpClick} title="Help" aria-label="Open Help"
            className="w-8 h-8 rounded-[10px] bg-white/10 backdrop-blur-[4px] border-none cursor-pointer flex items-center justify-center">
            <HelpCircle size={18} color="#FDFAF5" strokeWidth={2} />
          </button>
          {isAdmin && (
            <button onClick={onAdminClick} title="Admin Panel" aria-label="Open Admin Panel"
              className="w-8 h-8 rounded-[10px] bg-white/10 backdrop-blur-[4px] border-none cursor-pointer text-sm flex items-center justify-center">
              <Settings size={18} color="#fff" strokeWidth={2} />
            </button>
          )}
          <div ref={profileRef} className="relative">
            <div onClick={() => { setEditName(user.name || ""); setShowProfile(!showProfile); }} role="button" aria-label="Profile menu" title="Profile"
              className="w-8 h-8 rounded-[10px] bg-white/[0.12] backdrop-blur-[4px] flex items-center justify-center cursor-pointer overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-[10px]" />
              ) : (
                <span className="text-[13px] font-[800] text-[#FDFAF5] font-display">
                  {(user.name || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            {showProfile && (
              <div className="absolute top-full right-0 mt-2 bg-tl-card rounded-card border border-tl-border p-4 w-[230px] z-[100]" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                <div className="text-[10px] font-bold text-tl-text-dim uppercase tracking-[1.5px] mb-2 font-body">Profile</div>
                <input value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  className="w-full py-2 px-3 rounded-btn border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-[13px] font-body outline-none box-border mb-2"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && saveProfile()} />
                <div className="text-[11px] text-tl-text-dim mb-2.5 font-body">
                  {user.user_type === "adult" ? "Adult Leader" : "Scout"} &bull; {user.email}
                </div>
                {approvedTroops.length > 1 && (
                  <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSwitchTroop(parseInt(e.target.value))} value={troop?.id || ""}
                    className="w-full text-xs py-1.5 px-2 rounded-btn border-[1.5px] border-tl-border-light bg-tl-input text-tl-text font-body cursor-pointer mb-2.5">
                    {approvedTroops.map(t => <option key={t.troop_id} value={t.troop_id}>{t.troop_name}</option>)}
                  </select>
                )}
                <div className="flex gap-1.5 mb-2">
                  <button onClick={() => { setShowProfile(false); onGoHome(); }}
                    className="flex-1 py-2 rounded-btn border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-text text-xs font-semibold cursor-pointer font-body">Home</button>
                  <button onClick={() => { setShowProfile(false); onViewProfile?.(); }}
                    className="flex-1 py-2 rounded-btn border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-accent text-xs font-semibold cursor-pointer font-body">Profile</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={savingProfile}
                    className="flex-1 py-2 rounded-btn border-none bg-tl-forest-deep text-xs font-semibold cursor-pointer font-body"
                    style={{ color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5" }}>{savingProfile ? "..." : "Save"}</button>
                  <button onClick={onLogout}
                    className="flex-1 py-2 rounded-btn border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-danger text-xs font-semibold cursor-pointer font-body">Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Hero — Logo + Crew Identity + Dates + Countdown ── */}
      <div className="flex flex-col items-center relative mb-4 text-center">
        {/* Troop Logo — hero size, clickable for lightbox */}
        <div className="mb-2 cursor-pointer" onClick={() => setShowLogoLightbox(true)}>
          <TroopLogo troopId={troop?.id} name={troopName} size={88} theme={{ bgAlt: "rgba(253,250,245,0.92)" }} />
        </div>

        {/* Troop name + adventure type */}
        <button onClick={onGoHome} aria-label="Go home"
          className="text-[11px] text-white/85 font-bold tracking-[1.5px] uppercase bg-none border-none cursor-pointer font-body p-0 mb-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
          {troopName}{adventureType ? ` \u00B7 ${adventureType.name}` : ""}
        </button>

        {/* Crew name — big and bold */}
        <h1 className="text-2xl font-[900] text-white m-0 mb-1 leading-[1.15] font-display"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.35)" }}>
          {hasMultipleCrews && selectedCrew ? selectedCrew.name : adventureName}
        </h1>

        {/* Date range */}
        {dateRangeStr && (
          <div className="text-xs text-white/80 font-semibold font-body mb-0.5">
            {dateRangeStr}
          </div>
        )}

        {/* Countdown */}
        {cd && (
          <div className="inline-flex items-center gap-1 text-[13px] font-[800] text-white font-body bg-black/25 backdrop-blur-[4px] py-1 px-3.5 rounded-pill mt-0.5"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {cd.icon} {cd.text}
          </div>
        )}

        {/* Member count */}
        {members.length > 0 && (
          <div className="text-[11px] text-white/60 mt-1 font-body font-semibold">
            {trekkingMembers.length} trekking{members.length - trekkingMembers.length > 0 ? ` \u00B7 ${members.length - trekkingMembers.length} support` : ""}
          </div>
        )}
      </div>

      {/* ── ROW 3: Journey Progress Card (frosted glass) ── */}
      <div onClick={() => setShowTrailGuide(true)}
        className="flex items-center gap-4 bg-black/15 backdrop-blur-[6px] rounded-[16px] py-4 px-[18px] -mb-7 relative z-[2] cursor-pointer">
        <div className="relative shrink-0">
          <ProgressRing percent={crewReadiness} size={56} stroke={5} color="#B8CC9A" bgColor="rgba(255,255,255,0.15)" />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-[900] text-[#FDFAF5] font-display">
            {crewReadiness}%
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#FDFAF5] mb-1 font-body flex items-center gap-1.5">
            {currentWaypoint.name}
            <span className="text-[9px] text-white font-normal italic opacity-80">Trail Guide</span>
          </div>
          <div className="text-[11px] text-[#D4E4B8] leading-[1.4] font-body">
            {currentWaypoint.message}
          </div>
          {badgeCount > 0 && (
            <div className="mt-1.5">
              <div className="text-[9px] font-semibold text-[rgba(184,204,154,0.7)] tracking-[1px] uppercase mb-[3px] font-body">
                Trail Badges
              </div>
              <div className="flex gap-1">
                {myBadges.slice(0, 6).map((b, i) => (
                  <span key={i} title={titleDef[b.badge_id] || b.badge_id}
                    className="text-xs bg-[rgba(184,204,154,0.3)] py-0.5 px-1.5 rounded-badge-sm border border-[rgba(184,204,154,0.5)]">
                    {badgeDef[b.badge_id] || "\u2B50"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Logo Lightbox ── */}
    {showLogoLightbox && (
      <div onClick={() => setShowLogoLightbox(false)}
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-[6px] flex items-center justify-center p-5 cursor-pointer">
        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="relative bg-tl-card rounded-[20px] p-6 text-center max-w-[340px]"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <button onClick={() => setShowLogoLightbox(false)}
            className="absolute top-2.5 right-3.5 bg-none border-none text-xl text-tl-text-dim cursor-pointer">{"\u2715"}</button>
          <div className="mb-4">
            <TroopLogo troopId={troop?.id} name={troopName} size={200} theme={theme} />
          </div>
          <div className="text-base font-[800] text-tl-heading font-display mb-1">
            {troopName}
          </div>
          {troop?.council && (
            <div className="text-xs text-tl-text-dim font-body">
              {troop.council}{troop.location ? ` \u00B7 ${troop.location}` : ""}
            </div>
          )}
          {adventure?.name && (
            <div className="text-[13px] font-bold text-tl-accent font-display mt-2">
              {adventure.name}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── Trail Guide Modal ── */}
    {showTrailGuide && (
      <div onClick={() => setShowTrailGuide(false)}
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[4px] flex items-center justify-center p-5">
        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="bg-tl-bg rounded-[20px] py-6 px-5 max-w-[400px] w-full max-h-[80vh] overflow-y-auto border border-tl-border-light"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-[800] text-tl-heading font-display">
              Trail Guide
            </div>
            <button onClick={() => setShowTrailGuide(false)}
              className="bg-tl-bg-alt border border-tl-border-light rounded-btn w-7 h-7 cursor-pointer text-sm text-tl-text-dim flex items-center justify-center">&times;</button>
          </div>

          {/* Journey Waypoints */}
          <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-2 font-body">
            Journey Waypoints — Crew readiness milestones
          </div>
          {JOURNEY_WAYPOINTS.map((wp) => (
            <div key={wp.pct}
              className={clsx(
                "flex items-center gap-2.5 py-1.5 px-2.5 rounded-btn mb-[3px]",
                crewReadiness >= wp.pct ? "bg-tl-accent-bg border border-tl-border-accent" : "border border-transparent"
              )}>
              <div className={clsx(
                "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold",
                crewReadiness >= wp.pct ? "bg-tl-accent text-white" : "bg-tl-progress-bg text-tl-text-dimmer"
              )}>
                {wp.pct === 100 ? "\u2B50" : crewReadiness >= wp.pct ? "\u2713" : `${wp.pct}`}
              </div>
              <div>
                <div className={clsx(
                  "text-xs font-bold font-body",
                  crewReadiness >= wp.pct ? "text-tl-heading" : "text-tl-text-muted"
                )}>
                  {wp.pct}% — {wp.name}
                </div>
                <div className="text-[11px] text-tl-text-dimmer italic leading-[1.3]">{wp.message}</div>
              </div>
            </div>
          ))}

          {/* Trail Badges */}
          <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mt-4 mb-2 font-body">
            Trail Badges — Earn by completing each category
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(TRAIL_BADGES).map(([key, badge]) => {
              const descriptions: Record<string, string> = {
                gear_ready: "All gear items packed",
                trail_medic: "All medical items done",
                admin_pro: "All admin tasks done",
                training_complete: "All training skills done",
                ai_ready: "AI self-assessment done",
                ai_gear: "Used AI gear recommendations",
                fully_prepared: "All categories at 100%!",
              };
              const earned = myBadges.some(b => b.badge_id === key);
              return (
                <div key={key}
                  className={clsx(
                    "flex items-center gap-2 py-2 px-2.5 rounded-badge",
                    earned ? "bg-tl-accent-bg border border-tl-border-accent" : "bg-tl-bg-alt border border-tl-border-light",
                    !earned && "opacity-60"
                  )}>
                  <span className="text-lg shrink-0">{badge.icon}</span>
                  <div>
                    <div className={clsx("text-[11px] font-bold", earned ? "text-tl-heading" : "text-tl-text-muted")}>{badge.title}</div>
                    <div className="text-[9px] text-tl-text-dimmer leading-[1.3]">{descriptions[key]}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-tl-text-dimmest text-center mt-4 font-body">
            Your crew is at <strong className="text-tl-heading">{crewReadiness}%</strong> readiness — <strong className="text-tl-accent">{currentWaypoint.name}</strong>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
