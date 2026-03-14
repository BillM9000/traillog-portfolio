import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { AdventureProvider, useAdventure } from "./contexts/AdventureContext";
import { useToast } from "./contexts/ToastContext";
import { api } from "./api";
import { DAYS_FULL } from "./utils/constants";
import { getMonthsRange, daysInMonth, dateKey, parseDateKey, dayOfWeek, isPast } from "./utils/dates";
import { fontBody, fontDisplay } from "./utils/theme";

import { Calendar as CalendarIcon, BarChart3, ClipboardCheck, Map, Backpack, FileText } from "lucide-react";
import LandingPage from "./components/LandingPage";
import ProfileSetup from "./components/ProfileSetup";
import Lobby from "./components/Lobby";
import AdventurePicker from "./components/AdventurePicker";
import Header from "./components/Header";
import MemberBar from "./components/MemberBar";
import Calendar, { parseDateEntry, getMemberPeriod } from "./components/Calendar";
import Results from "./components/Results";
import Skills from "./components/Skills";
import Itinerary from "./components/Itinerary";
import GearList from "./components/GearList";
import GearAIChat from "./components/GearAIChat";
import GlobalAdmin from "./components/GlobalAdmin";
import ConfirmModal from "./components/ConfirmModal";
import AdminPanel from "./components/AdminPanel";
import TrainingEvents from "./components/TrainingEvents";
import ProfilePage from "./components/ProfilePage";
import Reports from "./components/Reports";

function AnnouncementBanner({ settings }) {
  if (!settings?.announcement_enabled || !settings?.announcement_banner) return null;
  const typeColors = { info: { bg: "#e8f4fd", border: "#b8daff", text: "#0c5460" }, warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404" }, success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" } };
  const c = typeColors[settings.announcement_type] || typeColors.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: "8px 16px", fontSize: 13, fontFamily: fontBody, fontWeight: 600, textAlign: "center" }}>
      {settings.announcement_banner}
    </div>
  );
}

export default function App() {
  const { user, memberships, approvedTroops, loading, login, signup, logout, updateProfile, refresh } = useAuth();
  const { theme } = useTheme();

  // ── Public settings (banner, registration, maintenance) ──
  const [publicSettings, setPublicSettings] = useState(null);
  useEffect(() => {
    api.getPublicSettings().then(setPublicSettings).catch(() => {});
  }, []);

  // ── Navigation state ──
  const [troopId, setTroopId] = useState(null);
  const [adventureId, setAdventureId] = useState(null);
  const [wentBack, setWentBack] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [showGlobalAdmin, setShowGlobalAdmin] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [lobbyTroop, setLobbyTroop] = useState(null); // troop data for global admin entering non-member troop
  const isGlobalAdmin = !!user?.is_global_admin;

  // Auto-select first approved troop (but not if user navigated to lobby)
  useEffect(() => {
    if (approvedTroops.length > 0 && !troopId && !showLobby) {
      setTroopId(approvedTroops[0].troop_id);
    }
  }, [approvedTroops, troopId, showLobby]);

  // ── Auth gates ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: theme.textDim, fontSize: 14, fontFamily: fontBody }}>Loading...</div>
      </div>
    );
  }

  if (!user) return (<><AnnouncementBanner settings={publicSettings} /><LandingPage onLogin={login} onSignup={signup} registrationEnabled={publicSettings?.registration_enabled !== false} /></>);
  if (!user.age_confirmed || !user.user_type) return <ProfileSetup user={user} onComplete={updateProfile} />;

  // Profile page — shown when user clicks "View Profile" from any context
  if (showProfilePage) return (
    <div style={{ minHeight: "100vh", background: theme.bg }}>
      <ProfilePage
        memberships={memberships}
        onBack={() => setShowProfilePage(false)}
        onEnterTroop={(id) => { setTroopId(id); setShowLobby(false); setShowProfilePage(false); }}
        onLogout={logout}
      />
    </div>
  );

  // Global admin with no troops: go straight to Platform Admin (unless they clicked Lobby)
  if (isGlobalAdmin && approvedTroops.length === 0 && !troopId && !showLobby) return (
    <>
      <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={null}
        onClose={() => { setShowLobby(true); }}
        onEnterTroop={(id, troopData) => { setTroopId(id); setLobbyTroop(troopData || null); setShowLobby(false); }}
        onLogout={logout} user={user}
        alwaysOpen />
    </>
  );
  if (approvedTroops.length === 0 || showLobby) return (
    <>
      <Lobby user={user} memberships={memberships} onRefresh={refresh} onLogout={logout}
        isGlobalAdmin={isGlobalAdmin} onGlobalAdminClick={() => setShowGlobalAdmin(true)}
        onEnterTroop={(id, troopData) => { setTroopId(id); setLobbyTroop(troopData || null); setShowLobby(false); }} />
      {showGlobalAdmin && (
        <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={null} onClose={() => { setShowGlobalAdmin(false); refresh(); }} />
      )}
    </>
  );

  // Find selected troop membership (global admin can enter any troop)
  const currentMembership = memberships.find(m => m.troop_id === troopId);
  const isAdmin = currentMembership?.role === "admin" || isGlobalAdmin;

  // Adventure picker gate
  if (!adventureId) {
    return (
      <>
        <AdventurePicker
          user={user}
          troop={{ id: troopId, name: currentMembership?.troop_name || lobbyTroop?.name || "Troop", council: currentMembership?.troop_council || lobbyTroop?.council, location: currentMembership?.troop_location || lobbyTroop?.location }}
          isAdmin={isAdmin}
          onSelect={(id) => { setAdventureId(id); setWentBack(false); }}
          onBack={() => { setTroopId(null); setShowLobby(true); setWentBack(false); }}
          onLogout={logout}
          skipAutoSelect={wentBack}
          isGlobalAdmin={isGlobalAdmin}
          onGlobalAdminClick={() => setShowGlobalAdmin(true)}
        />
        {showGlobalAdmin && (
          <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={troopId} onClose={() => setShowGlobalAdmin(false)} />
        )}
      </>
    );
  }

  // Main app wrapped in AdventureProvider
  return (
    <AdventureProvider adventureId={adventureId} troopId={troopId}>
      <MainView
        user={user}
        troopId={troopId}
        adventureId={adventureId}
        memberships={memberships}
        approvedTroops={approvedTroops}
        isAdmin={isAdmin}
        publicSettings={publicSettings}
        onSwitchTroop={(id) => { setTroopId(id); setAdventureId(null); }}
        onBackToAdventures={() => { setAdventureId(null); setWentBack(true); }}
        onSelectAdventure={(id) => setAdventureId(id)}
        onLogout={logout}
        onRefresh={refresh}
        onViewProfile={() => setShowProfilePage(true)}
      />
    </AdventureProvider>
  );
}

function MainView({ user, troopId, adventureId, memberships, approvedTroops, isAdmin, publicSettings, onSwitchTroop, onBackToAdventures, onSelectAdventure, onLogout, onRefresh, onViewProfile }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const { adventure, members, skills, itinerary, trekDate, trekDates, achievements, loading: advLoading, refreshAll, refreshMembers, updateMemberLocally } = useAdventure();

  const [troopMembers, setTroopMembers] = useState([]);
  const [troop, setTroop] = useState(null);
  const [active, setActive] = useState(null);
  const [view, setView] = useState("calendar");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showGearAdmin, setShowGearAdmin] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // Check if current user is global admin (set by server in /api/auth/me)
  const isGlobalAdmin = !!user?.is_global_admin;

  // Fetch troop data
  useEffect(() => {
    if (!troopId) return;
    api.getTroop(troopId).then(setTroop).catch(console.error);
    api.getMembers(troopId).then(setTroopMembers).catch(console.error);
  }, [troopId]);

  // Periodic refresh
  useEffect(() => {
    if (!adventureId) return;
    const id = setInterval(refreshAll, 60000);
    return () => clearInterval(id);
  }, [adventureId, refreshAll]);

  // Auto-select current user
  useEffect(() => {
    if (!user || members.length === 0) return;
    const myIdx = members.findIndex(m => m.user_id === user.id);
    if (myIdx >= 0 && active === null) setActive(myIdx);
  }, [user, members, active]);

  // ── Debounced saves ──
  const debouncedSave = useCallback((fn) => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await fn(); } catch (e) { console.error(e); }
      setSaving(false);
    }, 500);
  }, []);

  // Cleanup save timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ── Analysis engine ──
  const months = useMemo(() => getMonthsRange(), []);
  const allDateKeys = useMemo(() => {
    const s = new Set();
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) s.add(dateKey(year, month, d));
    });
    return [...s];
  }, [months]);

  const analysis = useMemo(() => {
    if (members.length < 2) return { windows: [], bestDates: [], heatmap: {}, skillGap: [] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hm = {};
    allDateKeys.forEach(key => {
      if (parseDateKey(key) < today) return;
      // Check who is available for this date, broken down by period
      const amAvail = []; // available in morning (has "am" or "all")
      const pmAvail = []; // available in afternoon (has "pm" or "all")
      const anyAvail = []; // available at all
      for (const m of members) {
        const periods = getMemberPeriod(m.dates, key);
        if (periods.length === 0) continue;
        anyAvail.push(m);
        if (periods.includes("all") || periods.includes("am")) amAvail.push(m);
        if (periods.includes("all") || periods.includes("pm")) pmAvail.push(m);
      }
      if (anyAvail.length > 0) hm[key] = {
        count: anyAvail.length, pct: anyAvail.length / members.length,
        names: anyAvail.map(m => m.name),
        missing: members.filter(m => !anyAvail.includes(m)).map(m => m.name),
        amCount: amAvail.length, amPct: amAvail.length / members.length,
        amNames: amAvail.map(m => m.name),
        pmCount: pmAvail.length, pmPct: pmAvail.length / members.length,
        pmNames: pmAvail.map(m => m.name),
        // Best period for this date
        bestPeriod: amAvail.length >= pmAvail.length ? "am" : "pm",
        bestPeriodCount: Math.max(amAvail.length, pmAvail.length),
      };
    });
    const sorted = Object.entries(hm).filter(([, v]) => v.count >= 2).sort(([a], [b]) => a.localeCompare(b));
    const wins = []; let cur = null;
    sorted.forEach(([key, val]) => {
      const prev = cur ? parseDateKey(cur.end) : null;
      const thisD = parseDateKey(key);
      if (cur && prev && (thisD - prev) / 86400000 === 1) { cur.end = key; cur.dates.push({ key, ...val }); }
      else { if (cur) wins.push(cur); cur = { start: key, end: key, dates: [{ key, ...val }] }; }
    });
    if (cur) wins.push(cur);
    wins.forEach(w => {
      const cons = members.filter(m => w.dates.every(d => d.names.includes(m.name)));
      w.consistentNames = cons.map(m => m.name);
      w.consistentCount = cons.length;
      w.pct = Math.round((cons.length / members.length) * 100);
      w.length = w.dates.length;
      const wkBonus = w.dates.some(d => { const dd = parseDateKey(d.key); return dd.getDay() === 0 || dd.getDay() === 6; }) ? 20 : 0;
      w.score = cons.length * 1000 + w.length * 50 + wkBonus;
      w.missing = members.filter(m => !w.consistentNames.includes(m.name)).map(m => m.name);
      w.suggestion = w.length >= 5 ? "Multi-night trek" : w.length >= 3 ? "Extended backpacking" : w.length >= 2 ? "Overnight shakedown" : "Day hike";
    });
    wins.sort((a, b) => b.score - a.score);
    const bestDates = Object.entries(hm).map(([key, val]) => ({ key, ...val, dayName: DAYS_FULL[parseDateKey(key).getDay()] }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 15);
    const trainingSkills = skills.filter(s => s.category === "training");
    const skillGap = trainingSkills.map(s => ({
      ...s,
      completedBy: members.filter(m => (m.skills || []).includes(s.id)).map(m => m.name),
      remaining: members.filter(m => !(m.skills || []).includes(s.id)).map(m => m.name),
    }));
    return { windows: wins.slice(0, 20), bestDates, heatmap: hm, skillGap };
  }, [members, allDateKeys, skills]);

  // ── Member actions ──
  const removeMember = useCallback(async (idx) => {
    if (!isAdmin) return;
    const m = members[idx];
    try {
      await api.removeAdventureMember(adventureId, m.user_id);
      refreshMembers();
      if (active === idx) setActive(null);
      else if (active > idx) setActive(active - 1);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  }, [isAdmin, adventureId, members, active, refreshMembers]);

  // ── Date toggling (adventure-scoped) ──
  const toggleDate = useCallback((key, mode, period) => {
    if (active === null) return;
    const m = members[active];
    // Remove any existing entries for this date key
    let newDates = m.dates.filter(d => {
      const { date } = parseDateEntry(d);
      return date !== key;
    });
    // Add new entry if mode is "add"
    if (mode === "add" && period) {
      newDates.push(`${key}:${period}`);
    }
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateAdventureDates(adventureId, m.user_id, newDates));
  }, [active, members, adventureId, debouncedSave, updateMemberLocally]);

  const bulkSelect = useCallback((type) => {
    if (active === null) return;
    const m = members[active];
    // Build set of existing date keys that already have entries
    const existingKeys = new Set();
    const existing = [...m.dates];
    for (const d of existing) {
      const { date } = parseDateEntry(d);
      existingKeys.add(date);
    }
    const newDates = [...existing];
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        if (isPast(year, month, d)) continue;
        const key = dateKey(year, month, d);
        if (existingKeys.has(key)) continue; // don't overwrite existing entries
        if (type === "all" || (type === "weekends" && (dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6))) {
          newDates.push(`${key}:all`);
          existingKeys.add(key);
        }
      }
    });
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateAdventureDates(adventureId, m.user_id, newDates));
  }, [active, members, months, adventureId, debouncedSave, updateMemberLocally]);

  const clearAll = useCallback(() => {
    if (active === null) return;
    const m = members[active];
    updateMemberLocally(m.user_id, { dates: [] });
    debouncedSave(() => api.updateAdventureDates(adventureId, m.user_id, []));
  }, [active, members, adventureId, debouncedSave, updateMemberLocally]);

  // ── Skill toggling (adventure-scoped) ──
  const toggleSkill = useCallback((sid) => {
    if (active === null) return;
    const m = members[active];
    const has = (m.skills || []).includes(sid);
    const newSkills = has ? m.skills.filter(s => s !== sid) : [...(m.skills || []), sid];
    updateMemberLocally(m.user_id, { skills: newSkills });
    debouncedSave(() => api.updateAdventureSkills(adventureId, m.user_id, newSkills));
  }, [active, members, adventureId, debouncedSave, updateMemberLocally]);

  const addNewSkill = useCallback(async (name, desc, category = "training") => {
    if (!isAdmin) return;
    try {
      await api.addAdventureSkill(adventureId, name, desc, category);
      await refreshAll();
    } catch (e) { console.error(e); }
  }, [isAdmin, adventureId, refreshAll]);

  const removeSkillItem = useCallback(async (sid) => {
    if (!isAdmin) return;
    try {
      await api.removeAdventureSkill(adventureId, sid);
      refreshAll();
    } catch (e) { console.error(e); }
  }, [isAdmin, adventureId, refreshAll]);

  // ── Pending members (from troop members list) ──
  const pendingMembers = troopMembers.filter(m => m.status === "pending");

  const approveMemberFn = useCallback(async (userId) => {
    try {
      await api.approveMember(troopId, userId);
      api.getMembers(troopId).then(setTroopMembers).catch(console.error);
    } catch (e) { console.error(e); }
  }, [troopId]);

  const denyMemberFn = useCallback(async (userId) => {
    try {
      await api.denyMember(troopId, userId);
      api.getMembers(troopId).then(setTroopMembers).catch(console.error);
    } catch (e) { console.error(e); }
  }, [troopId]);

  const requestLinkFn = useCallback(async (scoutUserId) => {
    try {
      await api.createLinkRequest(adventureId, scoutUserId);
      addToast("Link request sent! Admin will review.", "success");
    } catch (e) { addToast(e.message || "Failed to send request", "error"); }
  }, [adventureId, addToast]);

  if (advLoading) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: theme.textDim, fontSize: 14, fontFamily: fontBody }}>Loading adventure...</div>
      </div>
    );
  }

  const tabs = [
    ["calendar", "Training", CalendarIcon],
    ["results", "Best Windows", BarChart3],
    ["skills", "Readiness", ClipboardCheck],
    ["itinerary", "Itinerary", Map],
    ["gear", "Gear", Backpack],
    ["reports", "Reports", FileText],
  ];

  return (
    <div style={{ fontFamily: fontBody, background: theme.bg, color: theme.text, minHeight: "100vh", userSelect: "none" }}>
      <AnnouncementBanner settings={publicSettings} />
      <Header
        user={user} troop={troop} adventure={adventure} members={members} analysis={analysis}
        trekDate={trekDate} trekDates={trekDates} saving={saving} isAdmin={isAdmin} approvedTroops={approvedTroops}
        onSwitchTroop={onSwitchTroop}
        onBackToAdventures={onBackToAdventures}
        onLogout={onLogout}
        onAdminClick={() => setShowAdmin(true)}
        onRefreshAuth={onRefresh}
        onViewProfile={onViewProfile}
        achievements={achievements}
      />

      <MemberBar
        members={members} active={active} setActive={setActive}
        pendingMembers={pendingMembers} isAdmin={isAdmin} currentUserId={user.id}
        onConfirmDelete={setConfirmDelete}
        onRemoveManual={async (memberId) => {
          try { await api.removeManualMember(adventureId, memberId); refreshMembers(); } catch (e) { console.error(e); }
        }}
        onApproveMember={approveMemberFn} onDenyMember={denyMemberFn}
        achievements={achievements}
        onRequestLink={requestLinkFn}
        view={view}
      />

      {/* CTA Banner */}
      <CTABanner members={members} active={active} setView={setView} theme={theme} />

      {/* Tabs — 3×2 Grid (all visible on mobile) */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {tabs.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "7px 4px", borderRadius: 10, border: view === k ? `1.5px solid ${theme.accent}` : `1px solid ${theme.borderLight}`,
              cursor: "pointer", fontSize: 11, fontWeight: view === k ? 700 : 600, fontFamily: fontBody,
              background: view === k ? theme.pillActiveBg : theme.pillInactiveBg,
              color: view === k ? theme.pillActiveText : theme.pillInactiveText,
              boxShadow: view === k ? "0 2px 8px rgba(58,77,42,0.18)" : "none",
              transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}><Icon size={13} strokeWidth={2.5} />{l}</button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div style={{ padding: "0 16px 18px 16px", overflowX: "auto" }}>
        {view === "calendar" && (
          <Calendar members={members} active={active} months={months} analysis={analysis}
            trekDates={trekDates} onToggleDate={toggleDate} onBulkSelect={bulkSelect} onClearAll={clearAll} />
        )}
        {view === "results" && (
          <>
            <Results members={members} analysis={analysis} />
            <div style={{ marginTop: 16 }}>
              <TrainingEvents adventureId={adventureId} isAdmin={isAdmin} currentUserId={user.id} members={members} />
            </div>
          </>
        )}
        {view === "skills" && (
          <Skills members={members} active={active} skills={skills} analysis={analysis}
            isAdmin={isAdmin} onToggleSkill={toggleSkill} onAddSkill={addNewSkill} onRemoveSkill={removeSkillItem}
            adventureId={adventureId} updateMemberLocally={updateMemberLocally}
            achievements={achievements}
          />
        )}
        {view === "itinerary" && <Itinerary adventureId={adventureId} adventure={adventure} isAdmin={isAdmin} onRefresh={refreshAll} />}
        {view === "gear" && (
          <div>
            {/* Gear admin & AI chat buttons */}
            {isAdmin && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={() => setShowGearAdmin(true)} style={{
                  padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.textDim, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: fontBody,
                }}>{isGlobalAdmin ? "🌐 Global Admin" : "⚙️ Gear Admin"}</button>
                <button onClick={() => setShowAIChat(!showAIChat)} style={{
                  padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.borderLight}`,
                  background: showAIChat ? theme.accent : theme.bgAlt,
                  color: showAIChat ? "#fff" : theme.textDim,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                }}>🤖 AI Advisor</button>
              </div>
            )}
            <GearList troopId={troopId} adventureId={adventureId} members={members} active={active} setActive={setActive} updateMemberLocally={updateMemberLocally} />
          </div>
        )}
        {view === "reports" && (
          <Reports members={members} analysis={analysis} adventure={adventure} isAdmin={isAdmin} trekDates={trekDates} />
        )}
      </div>

      {/* Modals */}
      {confirmDelete !== null && (
        <ConfirmModal
          memberName={members[confirmDelete]?.name}
          onConfirm={() => removeMember(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showAdmin && (
        <AdminPanel
          troop={troop}
          adventure={adventure}
          troopMembers={troopMembers}
          adventureMembers={members}
          currentUserId={user.id}
          onClose={() => setShowAdmin(false)}
          onRefresh={() => { refreshAll(); api.getTroop(troopId).then(setTroop).catch(console.error); }}
          onSelectAdventure={onSelectAdventure}
        />
      )}

      {showGearAdmin && (
        <GlobalAdmin
          isGlobalAdmin={isGlobalAdmin}
          troopId={troopId}
          onClose={() => { setShowGearAdmin(false); refreshAll(); }}
        />
      )}

      {showAIChat && (
        <GearAIChat adventureId={adventureId} onClose={() => setShowAIChat(false)} />
      )}
    </div>
  );
}

// CTA Banner — shows highest-priority action for active member
function CTABanner({ members, active, setView, theme }) {
  const am = active !== null ? members[active] : null;
  const { memberGearMap } = useAdventure();
  if (!am) return null;

  const items = [];
  if ((am.dates || []).length === 0) {
    items.push({ emoji: "\u{1F97E}", title: "No training dates set yet", desc: "Coordinate with your crew to plan group hikes \u2192", tab: "calendar" });
  }
  // Use new gear system — check memberGearMap
  const memberGearItems = memberGearMap[am.user_id] || [];
  const gearDone = memberGearItems.filter(g => g.status === "owned" || g.status === "packed").length;
  if (gearDone === 0) {
    items.push({ emoji: "\u{1F392}", title: "Gear checklist not started", desc: "Browse the catalog and start checking off gear \u2192", tab: "gear" });
  }
  const skillsDone = (am.skills || []).length;
  if (skillsDone === 0) {
    items.push({ emoji: "\u{1F4CB}", title: "Readiness skills incomplete", desc: "Complete your readiness checklist \u2192", tab: "skills" });
  }

  if (items.length === 0) return null;
  const item = items[0]; // Show highest priority

  return (
    <div
      onClick={() => setView(item.tab)}
      style={{
        margin: "12px 16px 12px 16px",
        background: `linear-gradient(135deg, ${theme.urgencyBg} 0%, ${theme.urgencyBgEnd || theme.urgencyBg} 100%)`,
        border: `1.5px solid ${theme.borderAmber || theme.urgency}`,
        borderRadius: 14, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "transform 0.15s ease",
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: theme.urgency, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.name === "dark" ? theme.urgency : "#8B5E1A", fontFamily: fontDisplay }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: theme.name === "dark" ? theme.textMuted : "#A67C3D", marginTop: 2, fontFamily: fontBody }}>
          {item.desc}
        </div>
      </div>
    </div>
  );
}
