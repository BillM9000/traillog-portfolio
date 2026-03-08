import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "./api";
import { DAYS_FULL } from "./utils/constants";
import { getMonthsRange, daysInMonth, dateKey, parseDateKey, dayOfWeek, isPast } from "./utils/dates";
import { fontBody } from "./utils/theme";

import Header from "./components/Header";
import MemberBar from "./components/MemberBar";
import Calendar from "./components/Calendar";
import Results from "./components/Results";
import Skills from "./components/Skills";
import Itinerary from "./components/Itinerary";
import AdminModal from "./components/AdminModal";
import ConfirmModal from "./components/ConfirmModal";

export default function App() {
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [active, setActive] = useState(null);
  const [view, setView] = useState("calendar");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // ── Data fetching ──
  const fetchData = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api.getMembers(), api.getSkills()]);
      setMembers(m);
      setSkills(s);
    } catch (e) { console.error("Failed to load:", e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Computed ──
  const months = useMemo(() => getMonthsRange(), []);
  const allDateKeys = useMemo(() => {
    const s = new Set();
    months.forEach(({ year, month }) => {
      for (let d = 1; d <= daysInMonth(year, month); d++) s.add(dateKey(year, month, d));
    });
    return [...s];
  }, [months]);

  // ── Debounced saves ──
  const debouncedSave = useCallback((fn) => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await fn(); } catch (e) { console.error(e); }
      setSaving(false);
    }, 500);
  }, []);

  // ── Member actions ──
  const addMember = useCallback(async (name) => {
    if (!isAdmin) return;
    try {
      const member = await api.addMember(name, adminPin);
      setMembers(p => [...p, member]);
      setActive(members.length);
    } catch (e) { console.error(e); }
  }, [isAdmin, adminPin, members.length]);

  const removeMember = useCallback(async (idx) => {
    if (!isAdmin) return;
    const m = members[idx];
    try {
      await api.removeMember(m.id, adminPin);
      setMembers(p => p.filter((_, i) => i !== idx));
      if (active === idx) setActive(null);
      else if (active > idx) setActive(active - 1);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  }, [isAdmin, adminPin, members, active]);

  // ── Date toggling ──
  const toggleDate = useCallback((key, mode) => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      const has = m.dates.includes(key);
      let newDates;
      if (mode === "add" && !has) newDates = [...m.dates, key];
      else if (mode === "remove" && has) newDates = m.dates.filter(d => d !== key);
      else return m;
      debouncedSave(() => api.updateDates(m.id, newDates));
      return { ...m, dates: newDates };
    }));
  }, [active, debouncedSave]);

  const bulkSelect = useCallback((type) => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      const nd = new Set(m.dates);
      months.forEach(({ year, month }) => {
        for (let d = 1; d <= daysInMonth(year, month); d++) {
          if (isPast(year, month, d)) continue;
          if (type === "all" || (type === "weekends" && (dayOfWeek(year, month, d) === 0 || dayOfWeek(year, month, d) === 6)))
            nd.add(dateKey(year, month, d));
        }
      });
      const newDates = [...nd];
      debouncedSave(() => api.updateDates(m.id, newDates));
      return { ...m, dates: newDates };
    }));
  }, [active, months, debouncedSave]);

  const clearAll = useCallback(() => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      debouncedSave(() => api.updateDates(m.id, []));
      return { ...m, dates: [] };
    }));
  }, [active, debouncedSave]);

  // ── Skill toggling ──
  const toggleSkill = useCallback((sid) => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      const has = (m.skills || []).includes(sid);
      const newSkills = has ? m.skills.filter(s => s !== sid) : [...(m.skills || []), sid];
      debouncedSave(() => api.updateSkills(m.id, newSkills));
      return { ...m, skills: newSkills };
    }));
  }, [active, debouncedSave]);

  const addNewSkill = useCallback(async (name, desc) => {
    if (!isAdmin) return;
    try {
      const skill = await api.addSkill(name, desc, adminPin);
      setSkills(p => [...p, skill]);
    } catch (e) { console.error(e); }
  }, [isAdmin, adminPin]);

  const removeSkillItem = useCallback(async (sid) => {
    if (!isAdmin) return;
    try {
      await api.removeSkill(sid, adminPin);
      setSkills(p => p.filter(s => s.id !== sid));
      setMembers(p => p.map(m => ({ ...m, skills: (m.skills || []).filter(s => s !== sid) })));
    } catch (e) { console.error(e); }
  }, [isAdmin, adminPin]);

  // ── Analysis engine ──
  const analysis = useMemo(() => {
    if (members.length < 2) return { windows: [], bestDates: [], heatmap: {}, skillGap: [] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hm = {};
    allDateKeys.forEach(key => {
      if (parseDateKey(key) < today) return;
      const av = members.filter(m => m.dates.includes(key));
      if (av.length > 0) hm[key] = {
        count: av.length,
        pct: av.length / members.length,
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
      w.suggestion = w.length >= 3 ? "Extended backpacking trip" : w.length >= 2 ? "Overnight shakedown" : "Day hike / skills session";
    });
    wins.sort((a, b) => b.score - a.score);
    const bestDates = Object.entries(hm).map(([key, val]) => ({ key, ...val, dayName: DAYS_FULL[parseDateKey(key).getDay()] }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 15);
    const skillGap = skills.map(s => ({
      ...s,
      completedBy: members.filter(m => (m.skills || []).includes(s.id)).map(m => m.name),
      remaining: members.filter(m => !(m.skills || []).includes(s.id)).map(m => m.name),
    }));
    return { windows: wins.slice(0, 20), bestDates, heatmap: hm, skillGap };
  }, [members, allDateKeys, skills]);

  // ── Render ──
  const tabs = [
    ["calendar", "Calendar"],
    ["results", "Best Windows"],
    ["skills", "Skills"],
    ["itinerary", "Itinerary"],
  ];

  return (
    <div style={{ fontFamily: fontBody, background: "#1a1f1c", color: "#e8e4df", minHeight: "100vh", userSelect: "none" }}>
      <Header
        members={members} analysis={analysis} saving={saving} isAdmin={isAdmin}
        onAdminLogin={() => setShowAdminLogin(true)}
        onAdminLogout={() => { setIsAdmin(false); setAdminPin(""); }}
      />

      <MemberBar
        members={members} active={active} setActive={setActive}
        isAdmin={isAdmin} adminPin={adminPin}
        onAddMember={addMember}
        onConfirmDelete={setConfirmDelete}
        onReset={async () => { if (confirm("Clear ALL data?")) { await api.reset(adminPin); fetchData(); setActive(null); } }}
      />

      {/* Tabs */}
      <div style={{ padding: "10px 18px 0" }}>
        <div style={{ display: "flex", gap: 2, background: "#1a2420", borderRadius: 8, padding: 3 }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              flex: 1, padding: "7px 0", textAlign: "center", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              background: view === k ? "#3d5a45" : "transparent", color: view === k ? "#e8e4df" : "#5a6a5a",
              border: "none", fontFamily: fontBody, transition: "all .2s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div style={{ padding: "14px 18px", overflowX: "auto" }}>
        {view === "calendar" && (
          <Calendar members={members} active={active} months={months} analysis={analysis}
            onToggleDate={toggleDate} onBulkSelect={bulkSelect} onClearAll={clearAll} />
        )}
        {view === "results" && <Results members={members} analysis={analysis} />}
        {view === "skills" && (
          <Skills members={members} active={active} skills={skills} analysis={analysis}
            isAdmin={isAdmin} onToggleSkill={toggleSkill} onAddSkill={addNewSkill} onRemoveSkill={removeSkillItem} />
        )}
        {view === "itinerary" && <Itinerary />}
      </div>

      {/* Modals */}
      {showAdminLogin && (
        <AdminModal
          onSuccess={(pin) => { setIsAdmin(true); setAdminPin(pin); setShowAdminLogin(false); }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}
      {confirmDelete !== null && (
        <ConfirmModal
          memberName={members[confirmDelete]?.name}
          onConfirm={() => removeMember(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
