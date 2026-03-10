import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { AdventureProvider, useAdventure } from "./contexts/AdventureContext";
import { useToast } from "./contexts/ToastContext";
import { api } from "./api";
import { DAYS_FULL } from "./utils/constants";
import { getMonthsRange, daysInMonth, dateKey, parseDateKey, dayOfWeek, isPast } from "./utils/dates";
import { fontBody, fontDisplay } from "./utils/theme";

import LoginPage from "./components/LoginPage";
import ProfileSetup from "./components/ProfileSetup";
import Lobby from "./components/Lobby";
import AdventurePicker from "./components/AdventurePicker";
import Header from "./components/Header";
import MemberBar from "./components/MemberBar";
import Calendar from "./components/Calendar";
import Results from "./components/Results";
import Skills from "./components/Skills";
import Itinerary from "./components/Itinerary";
import GearList from "./components/GearList";
import GearAIChat from "./components/GearAIChat";
import GlobalAdmin from "./components/GlobalAdmin";
import ConfirmModal from "./components/ConfirmModal";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const { user, memberships, approvedTroops, loading, login, signup, logout, updateProfile, refresh } = useAuth();
  const { theme } = useTheme();

  // ── Navigation state ──
  const [troopId, setTroopId] = useState(null);
  const [adventureId, setAdventureId] = useState(null);
  const [wentBack, setWentBack] = useState(false);

  // Auto-select first approved troop
  useEffect(() => {
    if (approvedTroops.length > 0 && !troopId) {
      setTroopId(approvedTroops[0].troop_id);
    }
  }, [approvedTroops, troopId]);

  // ── Auth gates ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: theme.textDim, fontSize: 14, fontFamily: fontBody }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={login} onSignup={signup} />;
  if (!user.user_type) return <ProfileSetup user={user} onComplete={updateProfile} />;
  if (approvedTroops.length === 0) return <Lobby user={user} memberships={memberships} onRefresh={refresh} onLogout={logout} />;

  // Find selected troop membership
  const currentMembership = memberships.find(m => m.troop_id === troopId);
  const isAdmin = currentMembership?.role === "admin";

  // Adventure picker gate
  if (!adventureId) {
    return (
      <AdventurePicker
        user={user}
        troop={{ id: troopId, name: currentMembership?.troop_name || "Troop" }}
        isAdmin={isAdmin}
        onSelect={(id) => { setAdventureId(id); setWentBack(false); }}
        onBack={() => { setTroopId(null); setWentBack(false); }}
        onLogout={logout}
        skipAutoSelect={wentBack}
      />
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
        onSwitchTroop={(id) => { setTroopId(id); setAdventureId(null); }}
        onBackToAdventures={() => { setAdventureId(null); setWentBack(true); }}
        onSelectAdventure={(id) => setAdventureId(id)}
        onLogout={logout}
        onRefresh={refresh}
      />
    </AdventureProvider>
  );
}

function MainView({ user, troopId, adventureId, memberships, approvedTroops, isAdmin, onSwitchTroop, onBackToAdventures, onSelectAdventure, onLogout, onRefresh }) {
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
      const av = members.filter(m => m.dates.includes(key));
      if (av.length > 0) hm[key] = {
        count: av.length, pct: av.length / members.length,
        names: av.map(m => m.name),
        missing: members.filter(m => !m.dates.includes(key)).map(m => m.name),
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
  const toggleDate = useCallback((key, mode) => {
    if (active === null) return;
    const m = members[active];
    const has = m.dates.includes(key);
    let newDates;
    if (mode === "add" && !has) newDates = [...m.dates, key];
    else if (mode === "remove" && has) newDates = m.dates.filter(d => d !== key);
    else return;
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateAdventureDates(adventureId, m.user_id, newDates));
  }, [active, members, adventureId, debouncedSave, updateMemberLocally]);

  const bulkSelect = useCallback((type) => {
    if (active === null) return;
    const m = members[active];
    const nd = new Set(m.dates);
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        if (isPast(year, month, d)) continue;
        if (type === "all" || (type === "weekends" && (dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6)))
          nd.add(dateKey(year, month, d));
      }
    });
    const newDates = [...nd];
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
    ["calendar", "Training"],
    ["results", "Best Windows"],
    ["skills", "Readiness"],
    ["itinerary", "Itinerary"],
    ["gear", "Gear"],
  ];

  return (
    <div style={{ fontFamily: fontBody, background: theme.bg, color: theme.text, minHeight: "100vh", userSelect: "none" }}>
      <Header
        user={user} troop={troop} adventure={adventure} members={members} analysis={analysis}
        trekDate={trekDate} trekDates={trekDates} saving={saving} isAdmin={isAdmin} approvedTroops={approvedTroops}
        onSwitchTroop={onSwitchTroop}
        onBackToAdventures={onBackToAdventures}
        onLogout={onLogout}
        onAdminClick={() => setShowAdmin(true)}
        onRefreshAuth={onRefresh}
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
      />

      {/* CTA Banner */}
      <CTABanner members={members} active={active} setView={setView} theme={theme} />

      {/* Tabs — Pill Navigation */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: fontBody,
              background: view === k ? theme.pillActiveBg : theme.pillInactiveBg,
              color: view === k ? theme.pillActiveText : theme.pillInactiveText,
              boxShadow: view === k ? "0 2px 8px rgba(58,77,42,0.25)" : "none",
              transition: "all 0.25s ease",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div style={{ padding: "0 16px 18px 16px", overflowX: "auto" }}>
        {view === "calendar" && (
          <Calendar members={members} active={active} months={months} analysis={analysis}
            trekDates={trekDates} onToggleDate={toggleDate} onBulkSelect={bulkSelect} onClearAll={clearAll} />
        )}
        {view === "results" && <Results members={members} analysis={analysis} />}
        {view === "skills" && (
          <Skills members={members} active={active} skills={skills} analysis={analysis}
            isAdmin={isAdmin} onToggleSkill={toggleSkill} onAddSkill={addNewSkill} onRemoveSkill={removeSkillItem}
            adventureId={adventureId} updateMemberLocally={updateMemberLocally}
            achievements={achievements}
          />
        )}
        {view === "itinerary" && <Itinerary adventureId={adventureId} adventure={adventure} />}
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
        margin: "44px 16px 12px 16px",
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
