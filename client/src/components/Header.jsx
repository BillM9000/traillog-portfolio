import { useState, useRef, useEffect } from "react";
import { useCountdown } from "../hooks/useCountdown";
import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../api";
import { fontBody, fontDisplay, JOURNEY_WAYPOINTS, TRAIL_BADGES } from "../utils/theme";
import { computeCrewReadiness } from "../utils/readiness";
import { ProgressRing } from "./ProgressWidgets";
import { Settings, Sun, Moon } from "lucide-react";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import TroopLogo from "./TroopLogo";

export default function Header({ user, troop, adventure, members, analysis, trekDates, trekDate, saving, isAdmin, approvedTroops, onSwitchTroop, onBackToAdventures, onLogout, onAdminClick, onRefreshAuth, onViewProfile, achievements }) {
  const countdown = useCountdown(trekDates || trekDate);
  const { theme, mode, toggle } = useTheme();
  const { addToast } = useToast();
  const [showProfile, setShowProfile] = useState(false);
  const [showTrailGuide, setShowTrailGuide] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const profileRef = useRef(null);

  const adventureName = adventure?.name || "Loading...";
  const troopName = troop?.name || "";
  const adventureType = ADVENTURE_TYPES.find(t => t.id === adventure?.adventure_type) || null;

  // Format date range string (depart home → return home for full trip)
  const dateRangeStr = (() => {
    const fmt = (d) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
    const depart = fmt(trekDates?.depart);
    const home = fmt(trekDates?.home);
    const arrive = fmt(trekDates?.arrive);
    const ret = fmt(trekDates?.return);
    // Prefer full trip range (depart → home), fallback to trek range (arrive → return)
    const start = depart || arrive;
    const end = home || ret;
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    return null;
  })();

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
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
    } catch (e) { addToast(e.message, "error"); }
    setSavingProfile(false);
  };

  // Compute crew readiness using shared calculation (single source of truth)
  const { skills: advSkills, gearCatalog, memberGearMap } = useAdventure();
  const crewReadiness = computeCrewReadiness(members, advSkills, gearCatalog, memberGearMap).overall;
  const trekkingMembers = members.filter(m => m.participation === "trekking");

  // Find current waypoint
  const currentWaypoint = JOURNEY_WAYPOINTS.reduce((best, wp) => crewReadiness >= wp.pct ? wp : best, JOURNEY_WAYPOINTS[0]);

  // Earned badges — current user only
  const myBadges = (achievements?.badges || []).filter(b => b.user_id === user.id);
  const badgeCount = myBadges.length;

  // Compact countdown display
  const getCountdownDisplay = () => {
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

  // Texture pattern (cross pattern at 6% opacity)
  const textureStyle = {
    position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  };

  return (<>
    <div style={{
      background: theme.bgHeader,
      borderRadius: "0 0 24px 24px",
      padding: "20px 20px 0 20px",
      position: "relative",
    }}>
      {/* Texture overlay — clipped to rounded corners independently */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "0 0 24px 24px", overflow: "hidden", pointerEvents: "none" }}>
        <div style={textureStyle} />
      </div>

      {/* ── ROW 1: Logo Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", marginBottom: 14, paddingBottom: 12,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div onClick={onBackToAdventures} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} role="button" aria-label="Back to adventures">
          <Logo size={32} />
          <div>
            <div style={{
              fontSize: 17, fontWeight: 800, color: "#FDFAF5", letterSpacing: 0.5,
              fontFamily: fontDisplay, lineHeight: 1.1,
            }}>
              Trail<span style={{ color: "#B8CC9A" }}>Log</span>
            </div>
            <div style={{
              fontSize: 8.5, color: "rgba(184,204,154,0.6)", fontWeight: 600,
              letterSpacing: 2, textTransform: "uppercase", fontFamily: fontBody,
            }}>
              by GraceZero.ai
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <span style={{ fontSize: 10, color: "#B8CC9A" }}>saving...</span>}
          <button onClick={toggle} title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} style={{
            width: 32, height: 32, borderRadius: 10,
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
            border: "none", cursor: "pointer", fontSize: 14, color: "#FDFAF5",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {mode === "dark" ? <Sun size={18} color="#FDFAF5" strokeWidth={2} /> : <Moon size={18} color="#FDFAF5" strokeWidth={2} />}
          </button>
          {isAdmin && (
            <button onClick={onAdminClick} title="Admin Panel" aria-label="Open Admin Panel" style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
              border: "none", cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Settings size={18} color="#fff" strokeWidth={2} />
            </button>
          )}
          <div ref={profileRef} style={{ position: "relative" }}>
            <div onClick={() => { setEditName(user.name || ""); setShowProfile(!showProfile); }} role="button" aria-label="Profile menu" title="Profile" style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", overflow: "hidden",
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 10 }} />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 800, color: "#FDFAF5", fontFamily: fontDisplay }}>
                  {(user.name || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            {showProfile && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", padding: 16, width: 230, zIndex: 100 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: fontBody }}>Profile</div>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
                  background: theme.bgInput, color: theme.text, fontSize: 13, fontFamily: fontBody, outline: "none", boxSizing: "border-box", marginBottom: 8,
                }} onKeyDown={e => e.key === "Enter" && saveProfile()} />
                <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 10, fontFamily: fontBody }}>
                  {user.user_type === "adult" ? "Adult Leader" : "Scout"} &bull; {user.email}
                </div>
                {approvedTroops.length > 1 && (
                  <select onChange={e => onSwitchTroop(parseInt(e.target.value))} value={troop?.id || ""} style={{
                    width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
                    background: theme.bgInput, color: theme.text, fontFamily: fontBody, cursor: "pointer", marginBottom: 10,
                  }}>
                    {approvedTroops.map(t => <option key={t.troop_id} value={t.troop_id}>{t.troop_name}</option>)}
                  </select>
                )}
                <button onClick={() => { setShowProfile(false); onViewProfile?.(); }} style={{
                  width: "100%", padding: "8px 0", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.accent, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: fontBody, marginBottom: 8,
                }}>View Profile</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveProfile} disabled={savingProfile} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                    background: theme.forestDeep, color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  }}>{savingProfile ? "..." : "Save"}</button>
                  <button onClick={onLogout} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
                    background: theme.bgAlt, color: theme.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  }}>Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Hero — Logo + Crew Identity + Dates + Countdown ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", marginBottom: 16, textAlign: "center" }}>
        {/* Troop Logo — hero size */}
        <div style={{ marginBottom: 8 }}>
          <TroopLogo troopId={troop?.id} name={troopName} size={88} theme={{ bgAlt: "rgba(253,250,245,0.92)" }} />
        </div>

        {/* Troop name + adventure type */}
        <button onClick={onBackToAdventures} aria-label="Back to adventures" style={{
          fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: 1.5,
          textTransform: "uppercase", background: "none", border: "none", cursor: "pointer",
          fontFamily: fontBody, padding: 0, marginBottom: 2,
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}>
          {troopName}{adventureType ? ` · ${adventureType.name}` : ""}
        </button>

        {/* Crew name — big and bold */}
        <h1 style={{
          fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 4px 0", lineHeight: 1.15,
          fontFamily: fontDisplay, textShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }}>
          {adventureName}
        </h1>

        {/* Date range */}
        {dateRangeStr && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, fontFamily: fontBody, marginBottom: 2 }}>
            {dateRangeStr}
          </div>
        )}

        {/* Countdown */}
        {cd && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: fontBody,
            background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)",
            padding: "4px 14px", borderRadius: 20, marginTop: 2,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}>
            {cd.icon} {cd.text}
          </div>
        )}

        {/* Member count */}
        {members.length > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4, fontFamily: fontBody, fontWeight: 600 }}>
            {trekkingMembers.length} trekking{members.length - trekkingMembers.length > 0 ? ` · ${members.length - trekkingMembers.length} support` : ""}
          </div>
        )}
      </div>

      {/* ── ROW 3: Journey Progress Card (frosted glass) ── */}
      <div onClick={() => setShowTrailGuide(true)} style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "rgba(0,0,0,0.15)", backdropFilter: "blur(6px)",
        borderRadius: 16, padding: "16px 18px",
        marginBottom: -28, position: "relative", zIndex: 2, cursor: "pointer",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ProgressRing percent={crewReadiness} size={56} stroke={5} color="#B8CC9A" bgColor="rgba(255,255,255,0.15)" />
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#FDFAF5", fontFamily: fontDisplay,
          }}>
            {crewReadiness}%
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FDFAF5", marginBottom: 4, fontFamily: fontBody, display: "flex", alignItems: "center", gap: 6 }}>
            {currentWaypoint.name}
            <span style={{ fontSize: 9, color: "rgba(184,204,154,0.5)", fontWeight: 400 }}>ⓘ</span>
          </div>
          <div style={{ fontSize: 11, color: "#D4E4B8", lineHeight: 1.4, fontFamily: fontBody }}>
            {currentWaypoint.message}
          </div>
          {badgeCount > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(184,204,154,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3, fontFamily: fontBody }}>
                Trail Badges
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {myBadges.slice(0, 5).map((b, i) => {
                  const badgeDef = { gear_ready: "\u{1F392}", trail_medic: "\u{1F3E5}", admin_pro: "\u{1F4CB}", training_complete: "\u{1F97E}", fully_prepared: "\u2B50" };
                  const titleDef = { gear_ready: "Gear Ready", trail_medic: "Trail Medic", admin_pro: "Admin Pro", training_complete: "Training Complete", fully_prepared: "Fully Prepared" };
                  return (
                    <span key={i} title={titleDef[b.badge_type] || b.badge_type} style={{
                      fontSize: 12, background: "rgba(184,204,154,0.3)", padding: "2px 6px", borderRadius: 6,
                      border: "1px solid rgba(184,204,154,0.5)",
                    }}>
                      {badgeDef[b.badge_type] || "\u2B50"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Trail Guide Modal ── */}
    {showTrailGuide && (
      <div onClick={() => setShowTrailGuide(false)} style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: theme.bg, borderRadius: 20, padding: "24px 20px",
          maxWidth: 400, width: "100%", maxHeight: "80vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: `1px solid ${theme.borderLight}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>
              Trail Guide
            </div>
            <button onClick={() => setShowTrailGuide(false)} style={{
              background: theme.bgAlt, border: `1px solid ${theme.borderLight}`,
              borderRadius: 8, width: 28, height: 28, cursor: "pointer",
              fontSize: 14, color: theme.textDim, display: "flex", alignItems: "center", justifyContent: "center",
            }}>&times;</button>
          </div>

          {/* Journey Waypoints */}
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: fontBody }}>
            Journey Waypoints — Crew readiness milestones
          </div>
          {JOURNEY_WAYPOINTS.map((wp) => (
            <div key={wp.pct} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
              borderRadius: 8, marginBottom: 3,
              background: crewReadiness >= wp.pct ? theme.accentBg : "transparent",
              border: crewReadiness >= wp.pct ? `1px solid ${theme.borderAccent}` : `1px solid transparent`,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                background: crewReadiness >= wp.pct ? theme.accent : theme.progressBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: crewReadiness >= wp.pct ? "#fff" : theme.textDimmer,
              }}>
                {wp.pct === 100 ? "\u2B50" : crewReadiness >= wp.pct ? "\u2713" : `${wp.pct}`}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: crewReadiness >= wp.pct ? theme.heading : theme.textMuted, fontFamily: fontBody }}>
                  {wp.pct}% — {wp.name}
                </div>
                <div style={{ fontSize: 10, color: theme.textDimmer, fontStyle: "italic", lineHeight: 1.3 }}>{wp.message}</div>
              </div>
            </div>
          ))}

          {/* Trail Badges */}
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 16, marginBottom: 8, fontFamily: fontBody }}>
            Trail Badges — Earn by completing each category
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(TRAIL_BADGES).map(([key, badge]) => {
              const descriptions = {
                gear_ready: "All gear items packed",
                trail_medic: "All medical items done",
                admin_pro: "All admin tasks done",
                training_complete: "All training skills done",
                fully_prepared: "All 4 categories at 100%!",
              };
              const earned = myBadges.some(b => b.badge_type === key);
              return (
                <div key={key} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  borderRadius: 10, background: earned ? theme.accentBg : theme.bgAlt,
                  border: `1px solid ${earned ? theme.borderAccent : theme.borderLight}`,
                  opacity: earned ? 1 : 0.6,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{badge.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: earned ? theme.heading : theme.textMuted }}>{badge.title}</div>
                    <div style={{ fontSize: 9, color: theme.textDimmer, lineHeight: 1.3 }}>{descriptions[key]}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 10, color: theme.textDimmest, textAlign: "center", marginTop: 16, fontFamily: fontBody }}>
            Your crew is at <strong style={{ color: theme.heading }}>{crewReadiness}%</strong> readiness — <strong style={{ color: theme.accent }}>{currentWaypoint.name}</strong>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
