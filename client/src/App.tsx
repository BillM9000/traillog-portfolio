import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { AdventureProvider, useAdventure } from "./contexts/AdventureContext";
import { useToast } from "./contexts/ToastContext";
import { api } from "./api";
import { DAYS_FULL } from "./utils/constants";
import { getMonthsRange, daysInMonth, dateKey, parseDateKey, dayOfWeek, isPast, normalizeDateEntry } from "./utils/dates";
import { useIsDesktop } from "./hooks/useIsDesktop";
import clsx from "clsx";
import type { User, Membership, Adventure, AdventureMember, Skill, Achievement, ThemeColors, MonthRange, OnboardingState } from "./types";

import { Calendar as CalendarIcon, ClipboardCheck, Map, Backpack, FileText, FolderOpen, Home, Settings } from "lucide-react";

// Shared components — always in main bundle
import Header from "./components/Header";
import MemberBar from "./components/MemberBar";
import ConfirmModal from "./components/ConfirmModal";
import Sidebar from "./components/desktop/Sidebar";
import TopBar from "./components/desktop/TopBar";
import DashboardOverview from "./components/desktop/DashboardOverview";
import MembersTable from "./components/desktop/MembersTable";

// Lazy-loaded: top-level views (mutually exclusive)
const LandingPage = lazy(() => import("./components/LandingPage"));
const ProfileSetup = lazy(() => import("./components/ProfileSetup"));
const HomeDashboard = lazy(() => import("./components/HomeDashboard"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));
const AdventurePicker = lazy(() => import("./components/AdventurePicker"));
const HelpSystem = lazy(() => import("./components/HelpSystem"));

// Lazy-loaded: tab views (only one visible at a time)
const Calendar = lazy(() => import("./components/Calendar"));
const Skills = lazy(() => import("./components/Skills"));
const Itinerary = lazy(() => import("./components/Itinerary"));
const GearList = lazy(() => import("./components/GearList"));
const Reports = lazy(() => import("./components/Reports"));
const Documents = lazy(() => import("./components/Documents"));
const TrainingEvents = lazy(() => import("./components/TrainingEvents"));
const ParentDashboard = lazy(() => import("./components/ParentDashboard"));

// Lazy-loaded: modals (opened on demand)
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const GlobalAdmin = lazy(() => import("./components/GlobalAdmin"));
const GearAIChat = lazy(() => import("./components/GearAIChat"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard"));
const ApprovalPage = lazy(() => import("./components/ApprovalPage"));
const DesignBiblePage = lazy(() => import("./components/dev/DesignBiblePage"));

function LoadingFallback() {
  return (
    <div className="py-10 px-4 text-center">
      <div className="text-tl-text-dim text-[13px] font-body">Loading...</div>
    </div>
  );
}

interface AnnouncementBannerProps {
  settings: Record<string, any> | null;
}

function AnnouncementBanner({ settings }: AnnouncementBannerProps) {
  if (!settings?.announcement_enabled || !settings?.announcement_banner) return null;
  const typeColors: Record<string, { bg: string; border: string; text: string }> = { info: { bg: "#e8f4fd", border: "#b8daff", text: "#0c5460" }, warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404" }, success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" } };
  const c = typeColors[settings.announcement_type as string] || typeColors.info;
  return (
    <div
      className="py-2 px-4 text-[13px] font-body font-semibold text-center"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {settings.announcement_banner as string}
    </div>
  );
}

export default function App() {
  const { user, memberships, approvedTroops, loading, login, signup, logout, updateProfile, refresh } = useAuth();
  const { theme } = useTheme();
  const isDesktop = useIsDesktop();

  // ── Public settings (banner, registration, maintenance) ──
  const [publicSettings, setPublicSettings] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    api.getPublicSettings().then(setPublicSettings).catch(() => {});
  }, []);

  // ── Onboarding state ──
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const refreshOnboarding = useCallback(async () => {
    try {
      const data = await api.getOnboarding();
      setOnboarding(data);
    } catch {
      // If API fails, assume no onboarding needed
      setOnboarding({ role: "trekker", steps: [], completed: true });
    }
  }, []);

  useEffect(() => {
    if (user && user.age_confirmed && user.user_type) {
      setOnboardingLoading(true);
      refreshOnboarding().finally(() => setOnboardingLoading(false));
    }
  }, [user, refreshOnboarding]);

  // ── Deep link from email CTAs (?troop=X&adventure=Y&tab=Z) ──
  const deepLinkRef = useRef<{ troopId: number; adventureId: number; tab: string | null } | null>(null);
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
  const [troopId, setTroopId] = useState<number | null>(null);
  const [adventureId, setAdventureId] = useState<number | null>(null);
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

  // ── Design Bible (dev only, no auth required) ──
  if (window.location.pathname === "/design-bible") {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DesignBiblePage />
      </Suspense>
    );
  }

  // ── Approval page (standalone, no auth required) ──
  const approvalMatch = window.location.pathname.match(/^\/approve\/(.+)$/);
  if (approvalMatch) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ApprovalPage token={approvalMatch[1]} />
      </Suspense>
    );
  }

  // ── Auth gates ──
  if (loading) {
    return (
      <div className="min-h-screen bg-tl-bg flex items-center justify-center">
        <div className="text-tl-text-dim text-sm font-body">Loading...</div>
      </div>
    );
  }

  if (!user) return (<Suspense fallback={<LoadingFallback />}><AnnouncementBanner settings={publicSettings} /><LandingPage onLogin={login} onSignup={signup} registrationEnabled={publicSettings?.registration_enabled !== false} /></Suspense>);
  if (!user.age_confirmed || !user.user_type) return <Suspense fallback={<LoadingFallback />}><ProfileSetup user={user} onComplete={updateProfile} /></Suspense>;

  // Show forced onboarding wizard if not completed
  const showOnboardingWizard = onboarding !== null && !onboardingLoading && !onboarding.completed;
  if (showOnboardingWizard) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingWizard
          user={user}
          onboarding={onboarding!}
          onRefreshOnboarding={refreshOnboarding}
          onComplete={() => {}} // After completion, onboarding.completed=true triggers re-render
          onRefreshAuth={refresh}
        />
      </Suspense>
    );
  }

  // Profile page — shown when user clicks "View Profile" from any context
  if (showProfilePage) return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="min-h-screen bg-tl-bg">
        <ProfilePage
          memberships={memberships}
          onBack={() => setShowProfilePage(false)}
          onEnterTroop={(id: number) => { setTroopId(id); setAdventureId(null); setShowProfilePage(false); }}
          onLogout={logout}
        />
      </div>
    </Suspense>
  );

  // Home Dashboard — shown when no troop+adventure selected
  if (!troopId || !adventureId) {
    // If troopId is set but no adventureId, show adventure picker for that troop
    if (troopId && !adventureId) {
      const currentMembership = memberships.find(m => m.troop_id === troopId);
      const isAdmin = currentMembership?.role === "admin" || isGlobalAdmin;
      return (
        <Suspense fallback={<LoadingFallback />}>
          <AdventurePicker
            user={user}
            troop={{ id: troopId, name: currentMembership?.troop_name || "Troop", council: currentMembership?.troop_council, location: currentMembership?.troop_location }}
            isAdmin={isAdmin}
            onSelect={(id: number) => { setAdventureId(id); }}
            onBack={goHome}
            onLogout={logout}
            skipAutoSelect={false}
            isGlobalAdmin={isGlobalAdmin}
            onGlobalAdminClick={() => setShowGlobalAdmin(true)}
          />
          {showGlobalAdmin && (
            <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={troopId} onClose={() => setShowGlobalAdmin(false)} />
          )}
        </Suspense>
      );
    }

    // No troop selected — show home dashboard
    const homeContent = (
      <Suspense fallback={<LoadingFallback />}>
        <HomeDashboard
          user={user} memberships={memberships} onRefresh={refresh} onLogout={logout}
          isGlobalAdmin={isGlobalAdmin}
          onGlobalAdminClick={() => setShowGlobalAdmin(true)}
          onEnterAdventure={(tid: number, aid: number | null) => {
            setTroopId(tid);
            if (aid) setAdventureId(aid);
          }}
          onViewProfile={() => setShowProfilePage(true)}
          onHelpClick={() => setShowHelp(true)}
        />
        {showGlobalAdmin && (
          <GlobalAdmin isGlobalAdmin={isGlobalAdmin} troopId={null} onClose={() => { setShowGlobalAdmin(false); refresh(); }}
            onEnterTroop={(id: number) => { setTroopId(id); setShowGlobalAdmin(false); }}
            onLogout={logout} user={user} alwaysOpen={false} />
        )}
        {showHelp && (
          <HelpSystem onClose={() => setShowHelp(false)} user={user} isAdmin={false} isGlobalAdmin={isGlobalAdmin} />
        )}
      </Suspense>
    );

    if (isDesktop) {
      return (
        <div className="flex min-h-screen font-body bg-tl-bg text-tl-text">
          <Sidebar
            user={user}
            isAdmin={false}
            isGlobalAdmin={isGlobalAdmin}
            adventureName={null}
            troopName={null}
            homeActive
            onGoHome={goHome}
            onViewProfile={() => setShowProfilePage(true)}
            onHelpClick={() => setShowHelp(true)}
            onLogout={logout}
            onGlobalAdminClick={() => setShowGlobalAdmin(true)}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <AnnouncementBanner settings={publicSettings} />
            <TopBar
              user={user}
              sectionTitle="Home"
              adventureName={null}
              trekDates={null}
              trekDate={null}
              saving={false}
              onViewProfile={() => setShowProfilePage(true)}
            />
            <div className="flex-1 overflow-y-auto py-4 px-6">
              <div className="max-w-[900px] mx-auto">
                {homeContent}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <AnnouncementBanner settings={publicSettings} />
        {homeContent}
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
        onSwitchTroop={(id: number) => { setTroopId(id); setAdventureId(null); }}
        onGoHome={goHome}
        onSelectAdventure={(id: number) => setAdventureId(id)}
        onLogout={logout}
        onRefresh={refresh}
        onViewProfile={() => setShowProfilePage(true)}
        onHelpClick={() => setShowHelp(true)}
      />
      <Suspense fallback={null}>
        {showHelp && (
          <HelpSystem onClose={() => setShowHelp(false)} user={user} isAdmin={isAdmin} isGlobalAdmin={isGlobalAdmin} />
        )}
      </Suspense>
    </AdventureProvider>
  );
}

interface MainViewProps {
  user: User;
  troopId: number;
  adventureId: number;
  memberships: Membership[];
  approvedTroops: Membership[];
  isAdmin: boolean;
  publicSettings: Record<string, any> | null;
  initialTab: string | null;
  onSwitchTroop: (id: number) => void;
  onGoHome: () => void;
  onSelectAdventure: (id: number) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onViewProfile: () => void;
  onHelpClick: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TroopMember = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Troop = any;

function MainView({ user, troopId, adventureId, memberships, approvedTroops, isAdmin, publicSettings, initialTab, onSwitchTroop, onGoHome, onSelectAdventure, onLogout, onRefresh, onViewProfile, onHelpClick }: MainViewProps) {
  const { theme } = useTheme();
  const isDesktop = useIsDesktop();
  const { addToast } = useToast();
  const { adventure, members, skills, itinerary, trekDate, trekDates, achievements, loading: advLoading, refreshAll, refreshMembers, updateMemberLocally, crews, selectedCrewId, selectedCrew, setSelectedCrewId, refreshCrews, gearCatalog, memberGearMap } = useAdventure();

  const [troopMembers, setTroopMembers] = useState<TroopMember[]>([]);
  const [troop, setTroop] = useState<Troop | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const validTabs = ["calendar", "skills", "itinerary", "gear", "reports", "docs"];
  const [view, setView] = useState(initialTab && validTabs.includes(initialTab) ? initialTab : "calendar");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmManualDelete, setConfirmManualDelete] = useState<{ id: number; name: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showGearAdmin, setShowGearAdmin] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useCallback((fn: () => Promise<any>) => {
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
    const s = new Set<string>();
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) s.add(dateKey(year, month, d));
    });
    return [...s];
  }, [months]);

  const analysis = useMemo(() => {
    if (members.length < 2) return { windows: [] as any[], bestDates: [] as any[], heatmap: {} as any, skillGap: [] as any[] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hm: Record<string, { count: number; pct: number; names: string[]; missing: string[] }> = {};
    allDateKeys.forEach(key => {
      if (parseDateKey(key) < today) return;
      const anyAvail: AdventureMember[] = [];
      for (const m of members) {
        if (m.dates.some((d: string) => normalizeDateEntry(d) === key)) anyAvail.push(m);
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
  const removeMember = useCallback(async (idx: number) => {
    if (!isAdmin || !selectedCrewId) return;
    const m = members[idx];
    try {
      await api.removeCrewMember(selectedCrewId as number, m.user_id);
      refreshMembers();
      if (active === idx) setActive(null);
      else if (active !== null && active > idx) setActive(active - 1);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  }, [isAdmin, selectedCrewId, members, active, refreshMembers]);

  // ── Date toggling (crew-scoped) ──
  const toggleDate = useCallback((key: string, mode: string) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    let newDates = m.dates.map((d: string) => normalizeDateEntry(d)).filter((d: string) => d !== key);
    if (mode === "add") {
      newDates.push(key);
    }
    updateMemberLocally(m.user_id, { dates: newDates });
    debouncedSave(() => api.updateCrewDates(selectedCrewId as number, m.user_id, newDates));
  }, [active, members, selectedCrewId, debouncedSave, updateMemberLocally]);

  const bulkSelect = useCallback((type: string) => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    const existingKeys = new Set(m.dates.map((d: string) => normalizeDateEntry(d)));
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
    debouncedSave(() => api.updateCrewDates(selectedCrewId as number, m.user_id, newDates));
  }, [active, members, months, selectedCrewId, debouncedSave, updateMemberLocally]);

  const clearAll = useCallback(() => {
    if (active === null || !selectedCrewId) return;
    const m = members[active];
    updateMemberLocally(m.user_id, { dates: [] });
    debouncedSave(() => api.updateCrewDates(selectedCrewId as number, m.user_id, []));
  }, [active, members, selectedCrewId, debouncedSave, updateMemberLocally]);

  // ── Skill toggling (crew-scoped) ──
  const toggleSkill = useCallback((sid: number) => {
    if (active === null || !selectedCrewId) return;
    const skill = skills.find(s => s.id === sid);
    if (skill?.is_system) return;
    const m = members[active];
    const has = (m.skills || []).includes(sid);
    const newSkills = has ? m.skills.filter((s: number) => s !== sid) : [...(m.skills || []), sid];
    updateMemberLocally(m.user_id, { skills: newSkills });
    debouncedSave(() => api.updateCrewSkills(selectedCrewId as number, m.user_id, newSkills));
  }, [active, members, skills, selectedCrewId, debouncedSave, updateMemberLocally]);

  const addNewSkill = useCallback(async (name: string, desc: string, category = "training") => {
    if (!isAdmin) return;
    try {
      await api.addAdventureSkill(adventureId, name, desc, category, "");
      await refreshAll();
    } catch (e) { console.error(e); }
  }, [isAdmin, adventureId, refreshAll]);

  const removeSkillItem = useCallback(async (sid: number) => {
    if (!isAdmin) return;
    try {
      await api.removeAdventureSkill(adventureId, sid);
      refreshAll();
    } catch (e) { console.error(e); }
  }, [isAdmin, adventureId, refreshAll]);

  // ── Pending members (from troop members list) ──
  const pendingMembers = troopMembers.filter((m: TroopMember) => m.status === "pending");

  const approveMemberFn = useCallback(async (userId: number) => {
    try {
      await api.approveMember(troopId, userId);
      api.getMembers(troopId).then(setTroopMembers).catch(console.error);
    } catch (e) { console.error(e); }
  }, [troopId]);

  const denyMemberFn = useCallback(async (userId: number) => {
    try {
      await api.denyMember(troopId, userId);
      api.getMembers(troopId).then(setTroopMembers).catch(console.error);
    } catch (e) { console.error(e); }
  }, [troopId]);

  const requestLinkFn = useCallback(async (scoutUserId: number) => {
    try {
      await api.createLinkRequest(adventureId, scoutUserId);
      addToast("Link request sent! Admin will review.", "success");
    } catch (e) { addToast((e as Error).message || "Failed to send request", "error"); }
  }, [adventureId, addToast]);

  if (advLoading) {
    return (
      <div className="min-h-screen bg-tl-bg flex items-center justify-center">
        <div className="text-tl-text-dim text-sm font-body">Loading adventure...</div>
      </div>
    );
  }

  const tabs: [string, string, LucideIcon][] = [
    ["calendar", "Training", CalendarIcon],
    ["skills", "Readiness", ClipboardCheck],
    ["itinerary", "Itinerary", Map],
    ["gear", "Gear", Backpack],
    ["reports", "Reports", FileText],
    ["docs", "Docs", FolderOpen],
  ];

  // Map view key to display title
  const viewTitles: Record<string, string> = {
    calendar: "Training", skills: "Readiness", itinerary: "Itinerary",
    gear: "Gear", reports: "Reports", docs: "Documents",
  };

  // ── Shared content blocks (used in both mobile and desktop) ──
  const crewPicker = crews.length > 1 ? (
    <div className={isDesktop ? "py-3 pb-2" : "pt-9 px-4 pb-2"}>
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setSelectedCrewId("all")} className={clsx(
          "py-1.5 px-3.5 rounded-pill text-xs font-bold font-body cursor-pointer transition-all duration-150",
          selectedCrewId === "all"
            ? "border-2 border-tl-accent bg-tl-accent-bg text-tl-accent"
            : "border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-text-dim"
        )}>
          All Crews
        </button>
        {crews.map(c => (
          <button key={c.id} onClick={() => setSelectedCrewId(c.id)} className={clsx(
            "py-1.5 px-3.5 rounded-pill text-xs font-bold font-body cursor-pointer transition-all duration-150",
            c.id === selectedCrewId
              ? "border-2 border-tl-accent bg-tl-accent-bg text-tl-accent"
              : "border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-text-dim"
          )}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const memberBar = (
    <MemberBar
      members={members} active={selectedCrewId === "all" ? null : active} setActive={setActive}
      pendingMembers={pendingMembers} isAdmin={isAdmin} currentUserId={user.id}
      onConfirmDelete={setConfirmDelete}
      onRemoveManual={(memberId: number) => {
        const m = members.find(x => x.id === memberId);
        setConfirmManualDelete({ id: memberId, name: m?.name || "this member" });
      }}
      onApproveMember={approveMemberFn} onDenyMember={denyMemberFn}
      achievements={achievements}
      onRequestLink={requestLinkFn}
      view={view}
      allCrewsMode={selectedCrewId === "all"}
    />
  );

  const parentDash = (
    <Suspense fallback={null}>
      {(() => {
        const myMember = members.find(m => m.user_id === user.id);
        const linkedScouts = myMember?.linked_scouts?.filter((id: number) => id !== 0) || [];
        if (linkedScouts.length > 0 && selectedCrewId !== "all") {
          return <ParentDashboard linkedScouts={linkedScouts} onViewScout={(idx: number) => { setActive(idx); setView("training"); }} />;
        }
        return null;
      })()}
    </Suspense>
  );

  const viewContent = (
    <Suspense fallback={<LoadingFallback />}>
      <div className={clsx(isDesktop ? "pb-6" : "px-4 pb-[18px]", "overflow-x-auto")}>
        {view === "calendar" && (
          <>
            <TrainingEvents adventureId={adventureId} isAdmin={isAdmin} currentUserId={user.id} members={members} bestDates={analysis.bestDates} />
            <div className="mt-4">
              <Calendar members={members} active={selectedCrewId === "all" ? null : active} months={months} analysis={analysis}
                trekDates={trekDates} onToggleDate={toggleDate} onBulkSelect={bulkSelect} onClearAll={clearAll}
                allCrewsMode={selectedCrewId === "all"} />
            </div>
          </>
        )}
        {view === "skills" && (
          <Skills members={members} active={active} skills={skills} analysis={analysis}
            isAdmin={isAdmin} onToggleSkill={toggleSkill} onAddSkill={addNewSkill} onRemoveSkill={removeSkillItem}
            adventureId={adventureId} updateMemberLocally={updateMemberLocally}
            achievements={achievements as any}
          />
        )}
        {view === "itinerary" && <Itinerary adventureId={adventureId} adventure={adventure} isAdmin={isAdmin} onRefresh={refreshAll} />}
        {view === "gear" && (
          <div>
            {isAdmin && (
              <div className="flex gap-1.5 mb-2">
                <button onClick={() => setShowGearAdmin(true)}
                  className="py-1.5 px-3 rounded-btn border border-tl-border-light bg-tl-bg-alt text-tl-text-dim text-[11px] font-semibold cursor-pointer font-body">
                  {isGlobalAdmin ? "\uD83C\uDF10 Global Admin" : "\u2699\uFE0F Gear Admin"}
                </button>
                <button onClick={() => setShowAIChat(!showAIChat)}
                  className={clsx(
                    "py-1.5 px-3 rounded-btn border border-tl-border-light text-[11px] font-semibold cursor-pointer font-body",
                    showAIChat ? "bg-tl-accent text-white" : "bg-tl-bg-alt text-tl-text-dim"
                  )}>
                  {"\uD83E\uDD16"} AI Advisor
                </button>
              </div>
            )}
            <GearList troopId={troopId} adventureId={adventureId} members={members} active={active} setActive={setActive} updateMemberLocally={updateMemberLocally} />
          </div>
        )}
        {view === "reports" && (
          <Reports members={members} analysis={analysis} adventure={adventure} isAdmin={isAdmin} trekDates={trekDates} />
        )}
        {view === "docs" && (
          <Documents adventureId={adventureId} isAdmin={isAdmin} />
        )}
      </div>
    </Suspense>
  );

  const modals = (
    <>
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
            try { await api.removeCrewManualMember(selectedCrewId as number, confirmManualDelete.id); refreshMembers(); } catch (e) { console.error(e); }
            setConfirmManualDelete(null);
          }}
          onCancel={() => setConfirmManualDelete(null)}
        />
      )}
      <Suspense fallback={null}>
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
      </Suspense>
    </>
  );

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="flex min-h-screen font-body bg-tl-bg text-tl-text">
        <Sidebar
          user={user}
          view={view}
          setView={setView}
          isAdmin={isAdmin}
          isGlobalAdmin={isGlobalAdmin}
          adventureName={adventure?.name || null}
          troopName={troop?.name || null}
          troopId={troopId}
          trekDates={trekDates}
          memberCount={members.length}
          trekkingCount={members.filter(m => m.participation === "trekking").length}
          onGoHome={onGoHome}
          onAdminClick={() => setShowAdmin(true)}
          onViewProfile={onViewProfile}
          onHelpClick={onHelpClick}
          onLogout={onLogout}
          onGlobalAdminClick={() => setShowGearAdmin(true)}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <AnnouncementBanner settings={publicSettings} />
          <TopBar
            user={user}
            sectionTitle={viewTitles[view] || "TrailLog"}
            adventureName={adventure?.name || null}
            trekDates={trekDates}
            trekDate={trekDate}
            saving={saving}
            onViewProfile={onViewProfile}
          />
          <div className="flex-1 overflow-y-auto py-4 px-6">
            <div className="max-w-[900px] mx-auto">
              {(view === "calendar" || view === "skills") && (
                <>
                  <DashboardOverview
                    members={members}
                    skills={skills}
                    gearCatalog={gearCatalog}
                    memberGearMap={memberGearMap}
                    adventure={adventure}
                    trekDates={trekDates}
                  />
                  {crewPicker}
                  <MembersTable
                    members={members}
                    skills={skills}
                    gearCatalog={gearCatalog}
                    memberGearMap={memberGearMap}
                    active={selectedCrewId === "all" ? null : active}
                    setActive={setActive}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                  />
                  {parentDash}
                  <CTABanner members={members} active={active} setView={setView} theme={theme} />
                </>
              )}
              {viewContent}
            </div>
          </div>
        </main>
        {modals}
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <main className="font-body bg-tl-bg text-tl-text min-h-screen select-none pb-[76px]">
      <AnnouncementBanner settings={publicSettings} />
      <Header
        user={user} troop={troop} adventure={adventure} members={members} analysis={analysis}
        trekDate={trekDate} trekDates={trekDates} saving={saving} isAdmin={isAdmin} approvedTroops={approvedTroops as any}
        onSwitchTroop={onSwitchTroop}
        onGoHome={onGoHome}
        onLogout={onLogout}
        onAdminClick={() => setShowAdmin(true)}
        onRefreshAuth={onRefresh}
        onViewProfile={onViewProfile}
        onHelpClick={onHelpClick}
        achievements={achievements as any}
      />
      {crewPicker}
      {memberBar}
      {parentDash}
      <CTABanner members={members} active={active} setView={setView} theme={theme} />

      {/* Section tabs — inline scrollable nav above content */}
      <div className="px-4 pt-1 pb-2 overflow-x-auto">
        <div className="flex gap-1.5">
          {tabs.map(([k, l, Icon]) => (
            <button key={k} onClick={() => { setView(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={clsx(
                "py-[7px] px-3 rounded-tab cursor-pointer text-[11px] font-body flex items-center gap-1 whitespace-nowrap transition-all duration-200 shrink-0",
                view === k
                  ? "border-[1.5px] border-tl-accent font-bold bg-tl-pill-active-bg text-tl-pill-active-text shadow-[0_2px_8px_rgba(58,77,42,0.18)]"
                  : "border border-tl-border-light font-semibold bg-tl-pill-inactive-bg text-tl-pill-inactive-text shadow-none"
              )}
            ><Icon size={13} strokeWidth={2.5} />{l}</button>
          ))}
        </div>
      </div>

      {viewContent}
      {modals}

      {/* Bottom navigation bar — iOS/Android style */}
      <BottomNavBar
        view={view}
        onGoHome={onGoHome}
        onSetView={(v: string) => { setView(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onViewProfile={onViewProfile}
      />
    </main>
  );
}

// CTA Banner — shows highest-priority action for active member
interface CTABannerProps {
  members: AdventureMember[];
  active: number | null;
  setView: (view: string) => void;
  theme: ThemeColors;
}

function CTABanner({ members, active, setView, theme }: CTABannerProps) {
  const am = active !== null ? members[active] : null;
  const { memberGearMap } = useAdventure();
  if (!am) return null;

  const items: { emoji: string; title: string; desc: string; tab: string }[] = [];
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
      className="mx-4 my-3 rounded-card py-3.5 px-4 flex items-center gap-3 cursor-pointer transition-transform duration-150"
      style={{
        background: `linear-gradient(135deg, ${theme.urgencyBg} 0%, ${theme.urgencyBgEnd || theme.urgencyBg} 100%)`,
        border: `1.5px solid ${theme.borderAmber || theme.urgency}`,
      }}
    >
      <div
        className="w-[38px] h-[38px] rounded-badge shrink-0 flex items-center justify-center text-lg"
        style={{ background: theme.urgency }}
      >
        {item.emoji}
      </div>
      <div className="flex-1">
        <div
          className="text-sm font-bold font-display"
          style={{ color: theme.name === "dark" ? theme.urgency : "#8B5E1A" }}
        >
          {item.title}
        </div>
        <div
          className="text-xs mt-0.5 font-body"
          style={{ color: theme.name === "dark" ? theme.textMuted : "#A67C3D" }}
        >
          {item.desc}
        </div>
      </div>
    </div>
  );
}

// Bottom Navigation Bar — mobile only, iOS/Android style
interface BottomNavBarProps {
  view: string;
  onGoHome: () => void;
  onSetView: (view: string) => void;
  onViewProfile: () => void;
}

function BottomNavBar({ view, onGoHome, onSetView, onViewProfile }: BottomNavBarProps) {
  const items: { key: string; label: string; Icon: LucideIcon; viewKey?: string }[] = [
    { key: "home", label: "Home", Icon: Home },
    { key: "training", label: "Training", Icon: CalendarIcon, viewKey: "calendar" },
    { key: "gear", label: "Gear", Icon: Backpack, viewKey: "gear" },
    { key: "readiness", label: "Readiness", Icon: ClipboardCheck, viewKey: "skills" },
    { key: "settings", label: "Settings", Icon: Settings },
  ];

  const isActive = (key: string) => {
    if (key === "training") return view === "calendar" || view === "itinerary" || view === "reports" || view === "docs";
    if (key === "gear") return view === "gear";
    if (key === "readiness") return view === "skills";
    return false;
  };

  const handleClick = (key: string, viewKey?: string) => {
    if (key === "home") { onGoHome(); return; }
    if (key === "settings") { onViewProfile(); return; }
    if (viewKey) onSetView(viewKey);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-tl-bg border-t border-tl-border shadow-[0_-1px_6px_rgba(0,0,0,0.06)] safe-area-pb">
      <div className="flex justify-evenly items-center h-[60px]">
        {items.map(({ key, label, Icon, viewKey }) => {
          const active = isActive(key);
          return (
            <button key={key} onClick={() => handleClick(key, viewKey)}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full bg-transparent border-none cursor-pointer transition-colors duration-150",
                active ? "text-tl-accent" : "text-tl-text-dim"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              <span className={clsx("text-[10px] leading-tight", active ? "font-bold" : "font-medium")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
