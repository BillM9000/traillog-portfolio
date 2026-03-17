import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { AdventureProvider, useAdventure } from "./contexts/AdventureContext";
import { useToast } from "./contexts/ToastContext";
import { api } from "./api";
import { DAYS_FULL } from "./utils/constants";
import { getMonthsRange, daysInMonth, dateKey, parseDateKey, dayOfWeek, isPast } from "./utils/dates";
import { fontBody, fontDisplay } from "./utils/theme";

import { Calendar as CalendarIcon, ClipboardCheck, Map, Backpack, FileText } from "lucide-react";
import LandingPage from "./components/LandingPage";
import ProfileSetup from "./components/ProfileSetup";
import HomeDashboard from "./components/HomeDashboard";
import HelpSystem from "./components/HelpSystem";
import AdventurePicker from "./components/AdventurePicker";
import Header from "./components/Header";
import MemberBar from "./components/MemberBar";
import Calendar, { normalizeDateEntry } from "./components/Calendar";
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

  // ── Deep link from email CTAs (?troop=X&adventure=Y&tab=Z) ──
  const deepLinkRef = useRef(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("troop");
    const a = params.get("adventure");
    const tab = params.get("tab");
    if (t && a) {
      deepLinkRef.current = { troopId: Number(t), adventureId: Number(a), tab: tab || null };
      // Clean URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Navigation state ──
  const [troopId, setTroopId] = useState(null);
  const [adventureId, setAdventureId] = useState(null);
  const [showGlobalAdmin, setShowGlobalAdmin] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isGlobalAdmin = !!user?.is_global_admin;

  // Apply deep link after auth loads — keep ref alive until MainView reads the tab
  useEffect(() => {
    if (user && deepLinkRef.current && !troopId && !adventureId) {
      const dl = deepLinkRef.current;
      // Don't null the ref yet — MainView needs to read dl.tab on first render
      setTroopId(dl.troopId);
      setAdventureId(dl.adventureId);
    }
  }, [user, troopId, adventureId]);

  // Go home = clear troop and adventure selection
  const goHome = () => { setTroopId(null); setAdventureId(null); };

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
        onEnterTroop={(id) => { setTroopId(id); setAdventureId(null); setShowProfilePage(false); }}
        onLogout={logout}
      />
    </div>
  );

  // Home Dashboard — shown when no troop+adventure selected
  if (!troopId || !adventureId) {
    // If troopId is set but no adventureId, show adventure picker for that troop
    if (troopId && !adventureId) {
      const currentMembership = memberships.find(m => m.troop_id === troopId);
      const isAdmin = currentMembership?.role === "admin" || isGlobalAdmin;
      return (
        <>
          <AdventurePicker
            user={user}
            troop={{ id: troopId, name: currentMembership?.troop_name || "Troop", council: currentMembership?.troop_council, location: currentMembership?.troop_location }}
            isAdmin={isAdmin}
            onSelect={(id) => { setAdventureId(id); }}
            onBack={goHome}
            onLogout={logout}
            skipAutoSelect={false}
            isGlobalAdmin={isGlobalAdmin}
            onGlobalAdminClick={() => setShowGlobalAdmin(true)}
          />
          {showGlobalAdmin && (
            <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={troopId} onClose={() => setShowGlobalAdmin(false)} />
          )}
        </>
      );
    }

    // No troop selected — show home dashboard
    return (
      <>
        <AnnouncementBanner settings={publicSettings} />
        <HomeDashboard
          user={user} memberships={memberships} onRefresh={refresh} onLogout={logout}
          isGlobalAdmin={isGlobalAdmin}
          onGlobalAdminClick={() => setShowGlobalAdmin(true)}
          onEnterAdventure={(tid, aid) => {
            setTroopId(tid);
            if (aid) setAdventureId(aid);
            // If aid is null (e.g. troop with no adventures), will show adventure picker
          }}
          onViewProfile={() => setShowProfilePage(true)}
          onHelpClick={() => setShowHelp(true)}
        />
        {showGlobalAdmin && (
          <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={null} onClose={() => { setShowGlobalAdmin(false); refresh(); }}
            onEnterTroop={(id) => { setTroopId(id); setShowGlobalAdmin(false); }}
            onLogout={logout} user={user} alwaysOpen={false} />
        )}
        {showHelp && (
          <HelpSystem onClose={() => setShowHelp(false)} user={user} isAdmin={false} isGlobalAdmin={isGlobalAdmin} />
        )}
      </>
    );
  }

  // Find selected troop membership (global admin can enter any troop)
  const currentMembership = memberships.find(m => m.troop_id === troopId);
  const isAdmin = currentMembership?.role === "admin" || isGlobalAdmin;

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
        initialTab={(() => { const t = deepLinkRef.current?.tab || null; deepLinkRef.current = null; return t; })()}
        onSwitchTroop={(id) => { setTroopId(id); setAdventureId(null); }}
        onGoHome={goHome}
        onSelectAdventure={(id) => setAdventureId(id)}
        onLogout={logout}
        onRefresh={refresh}
        onViewProfile={() => setShowProfilePage(true)}
        onHelpClick={() => setShowHelp(true)}
      />
      {showHelp && (
        <HelpSystem onClose={() => setShowHelp(false)} user={user} isAdmin={isAdmin} isGlobalAdmin={isGlobalAdmin} />
      )}
    </AdventureProvider>
  );
}

function MainView({ user, troopId, adventureId, memberships, approvedTroops, isAdmin, publicSettings, initialTab, onSwitchTroop, onGoHome, onSelectAdventure, onLogout, onRefresh, onViewProfile, onHelpClick }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const { adventure, members, skills, itinerary, trekDate, trekDates, achievements, loading: advLoading, refreshAll, refreshMembers, updateMemberLocally, crews, selectedCrewId, selectedCrew, setSelectedCrewId, refreshCrews } = useAdventure();

  const [troopMembers, setTroopMembers] = useState([]);
  const [troop, setTroop] = useState(null);
  const [active, setActive] = useState(null);
  const validTabs = ["calendar", "results", "skills", "itinerary", "gear", "reports"];
  const [view, setView] = useState(initialTab && validTabs.includes(initialTab) ? initialTab : "calendar");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmManualDelete, setConfirmManualDelete] = useState(null); // { id, name }
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
      // Simple binary availability check (no AM/PM)
      const anyAvail = [];
      for (const m of members) {
        if (m.dates.some(d => normalizeDateEntry(d) === key)) anyAvail.push(m);
      }
      if (anyAvail.length > 0) hm[key] = {
        count: anyAvail.length, pct: anyAvail.length / members.length,
        names: anyAvail.map(m => m.name),
        missing: members.filter(m => !anyAvail.includes(m)).map(m => m.name),
      };
    });
    const bestDates = Object.entries(hm)
      .filter(([, v]) => v.count >= 2)
      .map(([key, val]) => ({ key, ...val, dayName: DAYS_FULL[parseDateKey(key).getDay()] }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 15);
    const trainingSkills = skills.filter(s => s.category === "training");
    const skillGap = trainingSkills.map(s => ({
      ...s,
      completedBy: members.filter(m => (m.skills || []).includes(s.id)).map(m => m.name),
      remaining: members.filter(m => !(m.skills || []).includes(s.id)).map(m => m.name),
    }));
    return { windows: [], bestDates, heatmap: hm, skillGap };
  }, [members, allDateKeys, skills]);

  // ── Member actions ──
  const removeMember = useCallback(async (idx) => {
    if (!isAdmin || !selectedCrewId) return;
    const m = members[idx];
    try {
      await api.removeCrewMember(selectedCrewId, m.user_id);
      refreshMembers();
      if (active === idx) setActive(null);
      else if (active > idx) setActive(active - 1);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  }, [isAdmin, selectedCrewId, members, active, refreshMembers]);

  // ── Date toggling (crew-scoped) ──
  const toggleDate = useCallback((key, mode) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    // Normalize all dates (strip legacy :am/:pm/:all suffixes)
    let newDates = m.dates.map(d => normalizeDateEntry(d)).filter(d => d !== key);
    // Add date if mode is "add"
    if (mode === "add") {
      newDates.push(key);
    }
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateCrewDates(selectedCrewId, m.user_id, newDates));
  }, [active, members, selectedCrewId, debouncedSave, updateMemberLocally]);

  const bulkSelect = useCallback((type) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    // Normalize existing dates (strip legacy :am/:pm/:all suffixes)
    const existingKeys = new Set(m.dates.map(d => normalizeDateEntry(d)));
    const newDates = [...existingKeys];
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        if (isPast(year, month, d)) continue;
        const key = dateKey(year, month, d);
        if (existingKeys.has(key)) continue;
        if (type === "all" || (type === "weekends" && (dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6))) {
          newDates.push(key);
          existingKeys.add(key);
        }
      }
    });
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateCrewDates(selectedCrewId, m.user_id, newDates));
  }, [active, members, months, selectedCrewId, debouncedSave, updateMemberLocally]);

  const clearAll = useCallback(() => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    updateMemberLocally(m.user_id, { dates: [] });
    debouncedSave(() => api.updateCrewDates(selectedCrewId, m.user_id, []));
  }, [active, members, selectedCrewId, debouncedSave, updateMemberLocally]);

  // ── Skill toggling (crew-scoped) ──
  const toggleSkill = useCallback((sid) => {
    if (active === null || !selectedCrewId) return;
    // Don't allow toggling system skills (controlled by attendance milestones)
    const skill = skills.find(s => s.id === sid);
    if (skill?.is_system) return;
    const m = members[active];
    const has = (m.skills || []).includes(sid);
    const newSkills = has ? m.skills.filter(s => s !== sid) : [...(m.skills || []), sid];
    updateMemberLocally(m.user_id, { skills: newSkills });
    debouncedSave(() => api.updateCrewSkills(selectedCrewId, m.user_id, newSkills));
  }, [active, members, skills, selectedCrewId, debouncedSave, updateMemberLocally]);

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
        onGoHome={onGoHome}
        onLogout={onLogout}
        onAdminClick={() => setShowAdmin(true)}
        onRefreshAuth={onRefresh}
        onViewProfile={onViewProfile}
        onHelpClick={onHelpClick}
        achievements={achievements}
      />

      {/* Crew picker — only when multiple crews */}
      {crews.length > 1 && (
        <div style={{ padding: "0 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {crews.map(c => (
              <button key={c.id} onClick={() => setSelectedCrewId(c.id)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                fontFamily: fontBody, cursor: "pointer", transition: "all 0.15s ease",
                border: c.id === selectedCrewId ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                background: c.id === selectedCrewId ? theme.accentBg : theme.bgAlt,
                color: c.id === selectedCrewId ? theme.accent : theme.textDim,
              }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <MemberBar
        members={members} active={active} setActive={setActive}
        pendingMembers={pendingMembers} isAdmin={isAdmin} currentUserId={user.id}
        onConfirmDelete={setConfirmDelete}
        onRemoveManual={(memberId) => {
          const m = members.find(x => x.id === memberId);
          setConfirmManualDelete({ id: memberId, name: m?.name || "this member" });
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
          <>
            <Calendar members={members} active={active} months={months} analysis={analysis}
              trekDates={trekDates} onToggleDate={toggleDate} onBulkSelect={bulkSelect} onClearAll={clearAll} />
            <div style={{ marginTop: 16 }}>
              <TrainingEvents adventureId={adventureId} isAdmin={isAdmin} currentUserId={user.id} members={members} bestDates={analysis.bestDates} />
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
      {confirmManualDelete && (
        <ConfirmModal
          memberName={confirmManualDelete.name}
          onConfirm={async () => {
            try { await api.removeCrewManualMember(selectedCrewId, confirmManualDelete.id); refreshMembers(); } catch (e) { console.error(e); }
            setConfirmManualDelete(null);
          }}
          onCancel={() => setConfirmManualDelete(null)}
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
