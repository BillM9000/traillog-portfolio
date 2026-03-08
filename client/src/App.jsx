import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "./api";

const ITINERARY = [
  { day: 1, camp: "Camping HQ", miles: 0, gain: 0, loss: 0, type: "Base Camp", notes: "Arrival, gear issue, shakedown" },
  { day: 2, camp: "Aguila", miles: 5.9, gain: 2920, loss: 1510, type: "Trail", notes: "Bus to Zastrow, Ranger Training" },
  { day: 3, camp: "Miners Park", miles: 4.6, gain: 2000, loss: 2310, type: "Staffed", notes: "Rock Climbing, showers" },
  { day: 4, camp: "Clarks Fork", miles: 6.8, gain: 3800, loss: 4290, type: "Staffed", notes: "Western Lore, Tooth of Time optional" },
  { day: 5, camp: "Minnette Meadows", miles: 8.2, gain: 3290, loss: 2960, type: "Dry Camp", notes: "Food pickup Ute Gulch, carry 4-6L water" },
  { day: 6, camp: "Mistletoe", miles: 6.9, gain: 3290, loss: 2730, type: "Dry Camp", notes: "Conservation project 10:30am, burn zone" },
  { day: 7, camp: "Head of Dean", miles: 5.5, gain: 1820, loss: 1480, type: "Staffed", notes: "COPE Challenge Course" },
  { day: 8, camp: "Ewells Park", miles: 4.7, gain: 2320, loss: 1670, type: "Trail", notes: "Baldy prep day, sleep early" },
  { day: 9, camp: "Ewells Park", miles: 11.9, gain: 6650, loss: 6650, type: "Layover", notes: "BALDY 12,441' — daypacks only" },
  { day: 10, camp: "Pueblano", miles: 4.0, gain: 970, loss: 2300, type: "Staffed", notes: "Celebration camp, campfire show" },
  { day: 11, camp: "Dean Skyline", miles: 6.4, gain: 3290, loss: 2950, type: "Dry Camp", notes: "3rd dry camp, carry from S. Ponil" },
  { day: 12, camp: "Camping HQ", miles: 3.7, gain: 1470, loss: 2810, type: "Base Camp", notes: "Hike to Ponil, bus, closing campfire" },
];

const TRAVEL_DATE = new Date(2026, 5, 13, 0, 0, 0);

const MONTHS_AHEAD = 5;
const DAYS_ABBR = ["S","M","T","W","T","F","S"];
const DAYS_FULL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getMonthsRange() {
  const ms = [], n = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(n.getFullYear(), n.getMonth() + i, 1);
    ms.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return ms;
}
function dimOf(y, m) { return new Date(y, m + 1, 0).getDate(); }
function dk(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function parseDk(k) { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); }
function dowOf(y, m, d) { return new Date(y, m, d).getDay(); }
function isPast(y, m, d) { const t = new Date(); t.setHours(0,0,0,0); return new Date(y,m,d) < t; }
function fmtDate(k) { const d = parseDk(k); return `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`; }
function fmtDateFull(k) { const d = parseDk(k); return `${DAYS_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`; }

export default function App() {
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [newName, setNewName] = useState("");
  const [active, setActive] = useState(null);
  const [view, setView] = useState("calendar");
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [countdown, setCountdown] = useState({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // Countdown
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = TRAVEL_DATE - now;
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, gone: true }); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      setCountdown({ days, hours, minutes, seconds, weeks, remDays, gone: false });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  // Load data
  const fetchData = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api.getMembers(), api.getSkills()]);
      setMembers(m);
      setSkills(s);
      setLoaded(true);
    } catch (e) { console.error("Failed to load:", e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll for updates every 15s
  useEffect(() => {
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const months = useMemo(() => getMonthsRange(), []);
  const allDKs = useMemo(() => {
    const s = new Set();
    months.forEach(({year, month}) => { for (let d = 1; d <= dimOf(year, month); d++) s.add(dk(year, month, d)); });
    return [...s];
  }, [months]);

  // Admin login
  const tryLogin = async () => {
    try {
      const { valid } = await api.verifyPin(pinInput);
      if (valid) { setIsAdmin(true); setAdminPin(pinInput); setShowAdminLogin(false); setPinInput(""); setPinError(false); }
      else setPinError(true);
    } catch { setPinError(true); }
  };

  // Debounced save for dates/skills
  const saveDates = useCallback((memberId, dates) => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.updateDates(memberId, dates); } catch (e) { console.error(e); }
      setSaving(false);
    }, 500);
  }, []);

  const saveSkills = useCallback((memberId, skills) => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.updateSkills(memberId, skills); } catch (e) { console.error(e); }
      setSaving(false);
    }, 500);
  }, []);

  // Member management (admin)
  const addMember = async () => {
    if (!isAdmin) return;
    const name = newName.trim();
    if (!name || members.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    try {
      const member = await api.addMember(name, adminPin);
      setMembers(p => [...p, member]);
      setNewName("");
      setActive(members.length);
    } catch (e) { console.error(e); }
  };

  const removeMember = async (idx) => {
    if (!isAdmin) return;
    const m = members[idx];
    try {
      await api.removeMember(m.id, adminPin);
      setMembers(p => p.filter((_, i) => i !== idx));
      if (active === idx) setActive(null);
      else if (active > idx) setActive(active - 1);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  };

  // Dates
  const toggleDate = useCallback((key, mode) => {
    if (active === null) return;
    setMembers(p => {
      const updated = p.map((m, i) => {
        if (i !== active) return m;
        const has = m.dates.includes(key);
        let newDates;
        if (mode === "add" && !has) newDates = [...m.dates, key];
        else if (mode === "remove" && has) newDates = m.dates.filter(d => d !== key);
        else return m;
        saveDates(m.id, newDates);
        return { ...m, dates: newDates };
      });
      return updated;
    });
  }, [active, saveDates]);

  // Skills
  const toggleSkill = (sid) => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      const has = (m.skills||[]).includes(sid);
      const newSkills = has ? m.skills.filter(s => s !== sid) : [...(m.skills||[]), sid];
      saveSkills(m.id, newSkills);
      return { ...m, skills: newSkills };
    }));
  };

  // Add/remove skill (admin)
  const addNewSkill = async () => {
    if (!isAdmin) return;
    const name = newSkillName.trim();
    if (!name) return;
    try {
      const skill = await api.addSkill(name, newSkillDesc, adminPin);
      setSkills(p => [...p, skill]);
      setNewSkillName(""); setNewSkillDesc(""); setShowAddSkill(false);
    } catch (e) { console.error(e); }
  };

  const removeSkillItem = async (sid) => {
    if (!isAdmin) return;
    try {
      await api.removeSkill(sid, adminPin);
      setSkills(p => p.filter(s => s.id !== sid));
      setMembers(p => p.map(m => ({ ...m, skills: (m.skills||[]).filter(s => s !== sid) })));
    } catch (e) { console.error(e); }
  };

  const onDown = (key) => { if (active === null) return; setIsDragging(true); const mode = members[active].dates.includes(key) ? "remove" : "add"; setDragMode(mode); toggleDate(key, mode); };
  const onEnter = (key) => { if (isDragging && dragMode) toggleDate(key, dragMode); };
  useEffect(() => { const up = () => { setIsDragging(false); setDragMode(null); }; window.addEventListener("mouseup", up); return () => window.removeEventListener("mouseup", up); }, []);

  const bulkSelect = (type) => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      const nd = new Set(m.dates);
      months.forEach(({year, month}) => { for (let d = 1; d <= dimOf(year, month); d++) { if (isPast(year, month, d)) continue; if (type === "all" || (type === "weekends" && (dowOf(year,month,d)===0||dowOf(year,month,d)===6))) nd.add(dk(year, month, d)); } });
      const newDates = [...nd];
      saveDates(m.id, newDates);
      return { ...m, dates: newDates };
    }));
  };

  const clearAll = () => {
    if (active === null) return;
    setMembers(p => p.map((m, i) => {
      if (i !== active) return m;
      saveDates(m.id, []);
      return { ...m, dates: [] };
    }));
  };

  // ── Analysis ──
  const analysis = useMemo(() => {
    if (members.length < 2) return { windows: [], bestDates: [], heatmap: {}, skillGap: [] };
    const today = new Date(); today.setHours(0,0,0,0);
    const hm = {};
    allDKs.forEach(key => {
      if (parseDk(key) < today) return;
      const av = members.filter(m => m.dates.includes(key));
      if (av.length > 0) hm[key] = { count: av.length, pct: av.length / members.length, names: av.map(m => m.name), missing: members.filter(m => !m.dates.includes(key)).map(m => m.name) };
    });
    const sorted = Object.entries(hm).filter(([,v]) => v.count >= 2).sort(([a],[b]) => a.localeCompare(b));
    const wins = []; let cur = null;
    sorted.forEach(([key, val]) => {
      const prev = cur ? parseDk(cur.end) : null;
      const thisD = parseDk(key);
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
      const wkBonus = w.dates.some(d => { const dd = parseDk(d.key); return dd.getDay()===0||dd.getDay()===6; }) ? 20 : 0;
      w.score = cons.length * 1000 + w.length * 50 + wkBonus;
      w.missing = members.filter(m => !w.consistentNames.includes(m.name)).map(m => m.name);
      w.suggestion = w.length >= 3 ? "Extended backpacking trip" : w.length >= 2 ? "Overnight shakedown" : "Day hike / skills session";
    });
    wins.sort((a, b) => b.score - a.score);
    const bestDates = Object.entries(hm).map(([key, val]) => ({ key, ...val, dayName: DAYS_FULL[parseDk(key).getDay()] }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 15);
    const skillGap = skills.map(s => ({
      ...s,
      completedBy: members.filter(m => (m.skills||[]).includes(s.id)).map(m => m.name),
      remaining: members.filter(m => !(m.skills||[]).includes(s.id)).map(m => m.name),
    }));
    return { windows: wins.slice(0, 20), bestDates, heatmap: hm, skillGap };
  }, [members, allDKs, skills]);

  const am = active !== null ? members[active] : null;
  const f = "'Instrument Sans','DM Sans',system-ui,sans-serif";
  const df = "'Playfair Display',Georgia,serif";

  return (
    <div style={{ fontFamily: f, background: "#1a1f1c", color: "#e8e4df", minHeight: "100vh", userSelect: "none" }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#2d3830 0%,#1a2420 100%)", borderBottom: "1px solid #3d4a40", padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: df, fontSize: 24, fontWeight: 700, color: "#d4c8a8", margin: 0, letterSpacing: "-0.5px" }}>Crew 614 Training Coordinator</h1>
            <div style={{ fontSize: 12, color: "#8a9a8a", marginTop: 3 }}>Philmont 2026 &bull; Itinerary 12-20 &bull; Super Strenuous &bull; 69 mi &bull; 12 Days</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <span style={{ fontSize: 10, color: "#8a9a5a" }}>saving...</span>}
            {isAdmin ? (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#7aba7a", background: "#2a3d2e", padding: "3px 8px", borderRadius: 5, border: "1px solid #3d5a45" }}>🔒 ADMIN</span>
                <button onClick={() => { setIsAdmin(false); setAdminPin(""); }} style={{ fontSize: 10, color: "#8a6a5a", background: "none", border: "1px solid #5a4030", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontFamily: f, fontWeight: 600 }}>Lock</button>
              </>
            ) : (
              <button onClick={() => setShowAdminLogin(true)} style={{ fontSize: 10, color: "#6a7a6a", background: "#252e28", border: "1px solid #3d4a40", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: f, fontWeight: 600 }}>🔓 Admin</button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            [`${members.length}`, "members"], [`${analysis.windows.length}`, "windows found"],
            [`${analysis.bestDates.filter(d => d.count === members.length).length}`, "full-crew dates"],
            ["⛰️ 12,441'", "Baldy summit"],
          ].map(([v, l], i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#2a352e", padding: "3px 9px", borderRadius: 6, fontSize: 11, color: "#a0b0a0" }}>
              <strong style={{ color: "#d4c8a8" }}>{v}</strong> {l}
            </span>
          ))}
        </div>

        {/* Countdown */}
        {!countdown.gone && countdown.days !== undefined && (
          <div style={{ marginTop: 10, background: "#1a2420", borderRadius: 10, padding: "12px 16px", border: "1px solid #3d4a40", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 auto" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8a6a4a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Travel: Sat 6/13 &ndash; Sat 6/27</div>
              <div style={{ fontSize: 10, color: "#5a6a5a" }}>Expedition: Sun 6/14 &ndash; Fri 6/26</div>
            </div>
            <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                [String(countdown.days).padStart(2,"0"), "days"],
                [String(countdown.hours).padStart(2,"0"), "hrs"],
                [String(countdown.minutes).padStart(2,"0"), "min"],
                [String(countdown.seconds).padStart(2,"0"), "sec"],
              ].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontFamily: df, fontSize: 26, fontWeight: 700, color: countdown.days <= 30 ? "#d4aa44" : countdown.days <= 60 ? "#c0b070" : "#d4c8a8", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#5a6a5a", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: "0 0 auto", textAlign: "right" }}>
              {countdown.days <= 14 && <div style={{ fontSize: 11, fontWeight: 700, color: "#c06040" }}>🔥 GO TIME</div>}
              {countdown.days > 14 && countdown.days <= 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#d4aa44" }}>⚠️ Crunch time</div>}
              {countdown.days > 30 && <div style={{ fontSize: 11, fontWeight: 700, color: "#7a9a6a" }}>⏳ {countdown.weeks}w {countdown.remDays}d to travel</div>}
            </div>
          </div>
        )}
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => { setShowAdminLogin(false); setPinInput(""); setPinError(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#232e27", borderRadius: 12, padding: 24, border: "1px solid #3d4a40", width: 280, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#d4c8a8", fontFamily: df, marginBottom: 4 }}>Admin Login</div>
            <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 14 }}>Enter crew PIN to manage members & skills</div>
            <input type="password" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }} onKeyDown={e => e.key === "Enter" && tryLogin()} placeholder="Enter PIN" autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: pinError ? "1.5px solid #8a4040" : "1.5px solid #3d4a40", background: "#1a2420", color: "#e0dcd6", fontSize: 14, fontFamily: f, outline: "none", textAlign: "center", letterSpacing: 4, boxSizing: "border-box" }} />
            {pinError && <div style={{ fontSize: 11, color: "#c06060", marginTop: 6 }}>Wrong PIN. Try again.</div>}
            <button onClick={tryLogin} style={{ marginTop: 12, padding: "8px 24px", borderRadius: 7, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: f, width: "100%" }}>Unlock</button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setConfirmDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#2a2020", borderRadius: 12, padding: 24, border: "1px solid #5a3030", width: 300, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#d4aa6a", fontFamily: df, marginBottom: 6 }}>Remove {members[confirmDelete]?.name}?</div>
            <div style={{ fontSize: 12, color: "#a09080", marginBottom: 16 }}>This deletes all their availability and skill data permanently.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #3d4a40", background: "#252e28", color: "#a0b0a0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: f }}>Cancel</button>
              <button onClick={() => removeMember(confirmDelete)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#7a3030", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: f }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Members ── */}
      <div style={{ background: "#212a24", borderBottom: "1px solid #2d3830", padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6a7a6a", textTransform: "uppercase", letterSpacing: 1 }}>Crew</span>
          <span style={{ flex: 1 }} />
          {isAdmin && <button onClick={async () => { if(confirm("Clear ALL data?")){ await api.reset(adminPin); fetchData(); setActive(null); }}} style={{ background: "#3a2020", border: "1px solid #5a3030", color: "#c08080", padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: f }}>Reset All</button>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {members.map((m, i) => (
            <div key={m.id} onClick={() => setActive(active === i ? null : i)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, cursor: "pointer",
              background: active === i ? `${m.color.bg}18` : "transparent",
              border: active === i ? `1.5px solid ${m.color.bg}60` : "1.5px solid transparent",
              transition: "all .15s",
            }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: m.color.bg }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e0dcd6" }}>{m.name}</span>
              <span style={{ fontSize: 10, color: "#6a7a6a" }}>{m.dates.length}d</span>
              {isAdmin && <button onClick={e => { e.stopPropagation(); setConfirmDelete(i); }} style={{ background: "none", border: "none", color: "#6a4040", fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }} title="Remove">×</button>}
            </div>
          ))}
          {members.length === 0 && !isAdmin && <span style={{ fontSize: 12, color: "#5a6a5a", fontStyle: "italic" }}>No members yet. Ask your crew admin to add everyone.</span>}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addMember()}
              placeholder="Add parent name..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1.5px solid #3d4a40", background: "#1a2420", color: "#e0dcd6", fontSize: 12, fontFamily: f, outline: "none" }} />
            <button onClick={addMember} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: f }}>Add</button>
          </div>
        )}
        {am && <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 6 }}>Editing: <strong style={{ color: am.color.bg }}>{am.name}</strong> — click or drag dates</div>}
      </div>

      {/* ── Tabs ── */}
      <div style={{ padding: "10px 18px 0" }}>
        <div style={{ display: "flex", gap: 2, background: "#1a2420", borderRadius: 8, padding: 3 }}>
          {[["calendar","📅 Calendar"],["results","🎯 Best Windows"],["skills","✅ Skills"],["itinerary","🗺️ Itinerary"]].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              flex: 1, padding: "7px 0", textAlign: "center", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              background: view === k ? "#3d5a45" : "transparent", color: view === k ? "#e8e4df" : "#5a6a5a",
              border: "none", fontFamily: f, transition: "all .2s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "14px 18px", overflowX: "auto" }}>

        {/* CALENDAR */}
        {view === "calendar" && (<div>
          {active !== null && (
            <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => bulkSelect("weekends")} style={tb("p")}>+ All Weekends</button>
              <button onClick={() => bulkSelect("all")} style={tb()}>+ All Days</button>
              <button onClick={clearAll} style={tb()}>Clear Mine</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: "#4a5a4a" }}>Drag to select ranges</span>
            </div>
          )}
          {members.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, background: "#232e27", borderRadius: 10, border: "1px solid #2d3830" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🏕️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#d4c8a8" }}>Waiting for crew admin to add members</div>
              <div style={{ fontSize: 12, color: "#6a7a6a", marginTop: 4 }}>Once added, select your name and mark available dates.</div>
            </div>
          )}
          {active === null && members.length > 0 && (
            <div style={{ padding: "10px 12px", background: "#232e27", borderRadius: 8, border: "1px solid #2d3830", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>👆</span>
              <span style={{ fontSize: 12, color: "#9aaa9a" }}>Select your name above to enter your availability. Heatmap shows group overlap.</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {months.map(({year, month}) => {
              const dim = dimOf(year, month);
              const start = dowOf(year, month, 1);
              const cells = Array(start).fill(null).concat(Array.from({length: dim}, (_, i) => i + 1));
              return (
                <div key={`${year}-${month}`} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#90a090", marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>{MONTH_NAMES[month]} {year}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", gap: 2 }}>
                    {DAYS_ABBR.map((d, i) => <div key={i} style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4a5a4a" }}>{d}</div>)}
                    {cells.map((d, i) => {
                      if (!d) return <div key={`e${i}`} />;
                      const key = dk(year, month, d);
                      const past = isPast(year, month, d);
                      const wknd = dowOf(year,month,d)===0||dowOf(year,month,d)===6;
                      const sel = am?.dates.includes(key);
                      const heat = analysis.heatmap[key]?.pct || 0;
                      const hc = analysis.heatmap[key]?.count || 0;
                      return (
                        <div key={key} onMouseDown={() => !past && onDown(key)} onMouseEnter={() => !past && onEnter(key)}
                          title={analysis.heatmap[key] ? `${analysis.heatmap[key].names.join(", ")}` : ""}
                          style={{
                            width: 36, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: sel ? 700 : 500, borderRadius: 5,
                            cursor: past || active === null ? "default" : "pointer",
                            opacity: past ? 0.22 : 1,
                            background: sel ? (am?.color?.bg || "#4a7a55") : heat > 0 ? `rgba(74,122,85,${Math.min(heat * 0.3, 0.85)})` : wknd ? "#222b25" : "transparent",
                            color: sel ? "#fff" : heat > 0.5 ? "#b0d0b0" : "#7a8a7a",
                            border: !sel && heat >= 1 ? "1.5px solid #5a9a6580" : "1.5px solid transparent",
                            transition: "all .08s", position: "relative",
                          }}>
                          {d}
                          {hc > 0 && !sel && active === null && (
                            <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 1 }}>
                              {Array.from({length: Math.min(hc, 6)}).map((_, j) => (
                                <div key={j} style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: hc === members.length ? "#5aaa65" : "#6a9a6a" }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {members.length > 0 && (
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#4a5a4a" }}>Overlap:</span>
              {[["rgba(74,122,85,0.25)","Some"],["rgba(74,122,85,0.55)","Most"],["rgba(74,122,85,0.85)","All"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} /><span style={{ fontSize: 10, color: "#5a6a5a" }}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>)}

        {/* RESULTS */}
        {view === "results" && (<div>
          {members.length < 2 ? (
            <div style={{ textAlign: "center", padding: 28, background: "#232e27", borderRadius: 10, border: "1px solid #2d3830" }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>📊</div>
              <div style={{ fontSize: 13, color: "#9aaa9a" }}>Need at least 2 members with availability to show analysis.</div>
            </div>
          ) : (<>
            <div style={card}>
              <div style={ct}>Top Individual Dates</div>
              {analysis.bestDates.length === 0 && <div style={{ fontSize: 12, color: "#5a6a5a" }}>No overlap yet.</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {analysis.bestDates.map(d => (
                  <div key={d.key} style={{
                    padding: "5px 9px", borderRadius: 6, fontSize: 11,
                    background: d.count === members.length ? "#2a3d2e" : "#282e28",
                    border: d.count === members.length ? "1.5px solid #4a7a55" : "1px solid #2d3830",
                  }}>
                    <div style={{ fontWeight: 700, color: d.count === members.length ? "#7aba7a" : "#c0d0c0" }}>
                      {fmtDate(d.key)} <span style={{ fontWeight: 400, color: "#5a6a5a" }}>({d.dayName})</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#6a7a6a", marginTop: 1 }}>
                      {d.count}/{members.length} — {d.names.join(", ")}
                      {d.missing.length > 0 && <span style={{ color: "#8a6a5a" }}> (w/o {d.missing.join(", ")})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...ct, marginTop: 14, marginBottom: 6 }}>Recommended Training Windows</div>
            {analysis.windows.length === 0 && <div style={{ ...card, fontSize: 12, color: "#5a6a5a" }}>No windows yet.</div>}
            {analysis.windows.map((w, i) => (
              <div key={i} style={{
                background: i === 0 ? "#2a3d2e" : "#232e27", borderRadius: 9, padding: 12, marginBottom: 6,
                border: i === 0 ? "1.5px solid #4a7a55" : "1px solid #2d3830",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                  <div>
                    <span style={badge(w.pct === 100 ? "#3d6a45" : w.pct >= 70 ? "#5a7a3d" : "#7a6a30")}>{w.pct}% crew</span>
                    <span style={badge("#2d3830")}>{w.length}d</span>
                    {i === 0 && <span style={badge("#6a4a20")}>⭐ Top Pick</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "#4a5a4a" }}>{w.suggestion}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#d4c8a8", margin: "6px 0 2px" }}>
                  {fmtDateFull(w.start)}{w.start !== w.end ? ` → ${fmtDateFull(w.end)}` : ""}
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "#1a2420", overflow: "hidden", margin: "4px 0" }}>
                  <div style={{ height: "100%", width: `${w.pct}%`, background: w.pct === 100 ? "#5aaa65" : w.pct >= 70 ? "#7aaa55" : "#aa8a44", borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                  ✅ {w.consistentNames.join(", ")}
                  {w.missing.length > 0 && <span> &nbsp;❌ <span style={{ color: "#b08070" }}>{w.missing.join(", ")}</span></span>}
                </div>
                {w.length >= 2 && (
                  <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {["🎒 Loaded hike","🐻 Bear bag drill"].map(t => <span key={t} style={tag()}>{t}</span>)}
                    {w.length >= 2 && <span style={tag()}>🏕️ Overnight shakedown</span>}
                    {w.length >= 3 && <span style={tag("#302520")}>💧 Dry camp water drill</span>}
                  </div>
                )}
              </div>
            ))}
            <div style={{ ...card, marginTop: 14 }}>
              <div style={ct}>Member Summary</div>
              {members.map((m, i) => {
                const fc = m.dates.filter(d => parseDk(d) >= new Date(new Date().setHours(0,0,0,0))).length;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderBottom: i < members.length - 1 ? "1px solid #2a332c" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color.bg }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#d0ccc6", flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: "#6a7a6a" }}>{fc}d avail</span>
                    <div style={{ width: 50, height: 3, borderRadius: 2, background: "#1a2420", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, fc * 1.5)}%`, background: m.color.bg, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}
        </div>)}

        {/* SKILLS */}
        {view === "skills" && (<div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={ct}>Training Skills Checklist</div>
              {isAdmin && (
                <button onClick={() => setShowAddSkill(!showAddSkill)} style={{ fontSize: 10, fontWeight: 600, color: "#7aba7a", background: "#2a3d2e", border: "1px solid #3d5a45", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: f }}>
                  {showAddSkill ? "Cancel" : "+ Add Skill"}
                </button>
              )}
            </div>
            {showAddSkill && isAdmin && (
              <div style={{ background: "#1a2420", borderRadius: 7, padding: 10, marginBottom: 10, border: "1px solid #3d5a45" }}>
                <input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="Skill name"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #3d4a40", background: "#232e27", color: "#e0dcd6", fontSize: 12, fontFamily: f, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                <input value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} placeholder="Short description (optional)"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #3d4a40", background: "#232e27", color: "#e0dcd6", fontSize: 12, fontFamily: f, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                <button onClick={addNewSkill} style={{ padding: "6px 16px", borderRadius: 5, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: f }}>Add Skill</button>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#6a7a6a", marginBottom: 8 }}>
              {active !== null ? <>Toggling for <strong style={{ color: am.color.bg }}>{am.name}</strong>. Click any skill.</> : "Select your name above, then check off completed skills."}
            </div>
            {skills.map(s => {
              const gap = analysis.skillGap?.find(g => g.id === s.id);
              const chk = am && (am.skills||[]).includes(s.id);
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 7, marginBottom: 3,
                  background: chk ? "#2a3d2e" : "#1a2420", border: chk ? "1.5px solid #3d5a45" : "1px solid #2a332c",
                  transition: "all .12s",
                }}>
                  <span onClick={() => toggleSkill(s.id)} style={{ fontSize: 18, width: 26, textAlign: "center", cursor: active !== null ? "pointer" : "default" }}>{s.icon}</span>
                  <div style={{ flex: 1, cursor: active !== null ? "pointer" : "default" }} onClick={() => toggleSkill(s.id)}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: chk ? "#7aba7a" : "#c0d0c0" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#5a6a5a" }}>{s.desc}</div>
                    {gap && gap.completedBy.length > 0 && (
                      <div style={{ fontSize: 10, color: "#4a7a4a", marginTop: 1 }}>
                        ✅ {gap.completedBy.join(", ")}
                        {gap.remaining.length > 0 && <span style={{ color: "#7a6a5a" }}> • Needs: {gap.remaining.join(", ")}</span>}
                      </div>
                    )}
                  </div>
                  <div onClick={() => toggleSkill(s.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${chk ? "#5a9a65" : "#3a4a3a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#5a9a65", flexShrink: 0, cursor: active !== null ? "pointer" : "default" }}>
                    {chk && "✓"}
                  </div>
                  {isAdmin && !s.isDefault && (
                    <button onClick={() => removeSkillItem(s.id)} title="Remove skill" style={{ background: "none", border: "none", color: "#6a4040", fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>)}

        {/* ITINERARY */}
        {view === "itinerary" && (<div>
          <div style={card}>
            <div style={ct}>Itinerary 12-20 Quick Reference</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {[["🟢","Staffed"],["🟠","Dry Camp"],["⭐","Layover"],["⚪","Trail/Base"]].map(([e,l]) => (
                <span key={l} style={tag()}>{e} {l}</span>
              ))}
            </div>
            {ITINERARY.map(it => (
              <div key={it.day} style={{
                display: "flex", gap: 10, padding: "9px 10px", borderRadius: 7, marginBottom: 3, alignItems: "flex-start",
                background: it.type === "Dry Camp" ? "#2a2520" : it.type === "Staffed" ? "#202d28" : it.type === "Layover" ? "#2d2a20" : "#232e27",
                border: it.type === "Layover" ? "1.5px solid #aa8a44" : "1px solid #2a332c",
              }}>
                <div style={{ width: 30, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: "#5a6a5a", fontWeight: 700 }}>DAY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#d4c8a8", fontFamily: df }}>{it.day}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: it.type === "Layover" ? "#d4aa44" : it.type === "Dry Camp" ? "#c08a5a" : "#b8c8b8" }}>{it.camp}</div>
                  <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 1 }}>{it.notes}</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 55, flexShrink: 0 }}>
                  {it.miles > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#90a090" }}>{it.miles}mi</div>}
                  {it.gain > 0 && <div style={{ fontSize: 9, color: "#4a7a4a" }}>↑{it.gain.toLocaleString()}'</div>}
                  {it.loss > 0 && <div style={{ fontSize: 9, color: "#7a4a4a" }}>↓{it.loss.toLocaleString()}'</div>}
                </div>
                <span style={{ ...tag(it.type==="Staffed"?"#2a3530":it.type==="Dry Camp"?"#302520":it.type==="Layover"?"#302d20":"#252e28"), fontSize: 9, whiteSpace: "nowrap" }}>{it.type}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: "10px 11px", background: "#2a2520", borderRadius: 7, border: "1px solid #3d3028" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d4aa6a" }}>⚠️ Key Training Priorities</div>
              <div style={{ fontSize: 11, color: "#a09080", lineHeight: 1.9, marginTop: 4 }}>
                {[
                  ["💧","Water carry:","3 dry camps (Days 5, 6, 11) — practice hauling 4-6L/person"],
                  ["🥾","Big days:","Day 5 (8.2mi) + Day 9 (11.9mi Baldy) — build to loaded 10+ mi"],
                  ["⛰️","Elevation:","Day 9 = 6,650' gain+loss — stair/hill training essential"],
                  ["☀️","Heat:","Days 5-6 burn zone, full sun — train in heat when possible"],
                  ["⏰","Early starts:","Multiple pre-dawn departures required"],
                  ["🏕️","Shakedowns:","Min 2 full overnights with loaded packs before arrival"],
                ].map(([ic, b, t]) => (
                  <div key={b}>{ic} <strong style={{ color: "#d4c8a8" }}>{b}</strong> {t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>)}
      </div>
    </div>
  );
}

// ── Style helpers ──
const card = { background: "#232e27", borderRadius: 9, padding: 12, marginBottom: 8, border: "1px solid #2a332c" };
const ct = { fontSize: 13, fontWeight: 700, color: "#d4c8a8", marginBottom: 7, fontFamily: "'Playfair Display',Georgia,serif" };
const badge = (bg) => ({ display: "inline-block", padding: "2px 7px", borderRadius: 9, fontSize: 10, fontWeight: 600, background: bg || "#3d5a45", color: "#e8e4df", marginRight: 3 });
const tag = (bg) => ({ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: bg || "#2a332c", color: "#b0c0b0", marginRight: 2, marginBottom: 2 });
const tb = (v) => ({
  padding: "4px 9px", borderRadius: 5, border: "1px solid #3d4a40", fontSize: 10, fontWeight: 600,
  cursor: "pointer", fontFamily: "'Instrument Sans',system-ui,sans-serif",
  background: v === "p" ? "#3d5a45" : "#252e28", color: v === "p" ? "#c0d8c0" : "#6a7a6a",
});
