import { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { card, cardTitle, fontBody, fontDisplay } from "../utils/theme";

export default function Skills({ members, active, skills, analysis, isAdmin, onToggleSkill, onAddSkill, onRemoveSkill, adventureId, updateMemberLocally }) {
  const { theme, mode } = useTheme();
  const [expandedCats, setExpandedCats] = useState(new Set(["training"]));
  const [gearItems, setGearItems] = useState([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCategory, setAddCategory] = useState("training");
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState(null);

  const am = active !== null ? members[active] : null;

  useEffect(() => {
    api.getGear().then(setGearItems).catch(console.error);
  }, []);

  // Split skills by category
  const trainingSkills = useMemo(() => skills.filter(s => s.category === "training"), [skills]);
  const medicalSkills = useMemo(() => skills.filter(s => s.category === "medical"), [skills]);
  const adminSkills = useMemo(() => skills.filter(s => s.category === "admin"), [skills]);

  // Compute readiness per category per member
  const readiness = useMemo(() => {
    if (members.length === 0) return { training: 0, gear: 0, medical: 0, admin: 0, overall: 0 };

    const calc = (items, field) => {
      if (items.length === 0) return 100;
      const total = items.length * members.length;
      const done = members.reduce((sum, m) => sum + (m[field] || []).filter(id => items.some(s => s.id === id)).length, 0);
      return total > 0 ? Math.round((done / total) * 100) : 0;
    };

    const training = calc(trainingSkills, "skills");
    const medical = calc(medicalSkills, "medical");
    const admin = calc(adminSkills, "admin_tasks");

    // Gear readiness
    const gearTotal = gearItems.length * members.length;
    const gearDone = members.reduce((sum, m) => sum + (m.gear || []).length, 0);
    const gear = gearTotal > 0 ? Math.round((gearDone / gearTotal) * 100) : 0;

    const overall = Math.round((training + gear + medical + admin) / 4);
    return { training, gear, medical, admin, overall };
  }, [members, trainingSkills, medicalSkills, adminSkills, gearItems]);

  // Toggle for medical/admin categories
  const toggleMedical = async (skillId) => {
    if (active === null || !adventureId) return;
    const m = members[active];
    const current = m.medical || [];
    const has = current.includes(skillId);
    const updated = has ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id, { medical: updated });
    try {
      await api.updateAdventureMedical(adventureId, m.user_id, updated);
    } catch (e) { console.error(e); }
  };

  const toggleAdmin = async (skillId) => {
    if (active === null || !adventureId) return;
    const m = members[active];
    const current = m.admin_tasks || [];
    const has = current.includes(skillId);
    const updated = has ? current.filter(s => s !== skillId) : [...current, skillId];
    if (updateMemberLocally) updateMemberLocally(m.user_id, { admin_tasks: updated });
    try {
      await api.updateAdventureAdmin(adventureId, m.user_id, updated);
    } catch (e) { console.error(e); }
  };

  const [addError, setAddError] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  const handleAdd = async () => {
    const name = newSkillName.trim();
    if (!name) {
      setAddError("Item name is required");
      return;
    }
    if (!adventureId || addingSkill) return;
    setAddError("");
    setAddingSkill(true);
    try {
      await onAddSkill(name, newSkillDesc, addCategory);
      setNewSkillName("");
      setNewSkillDesc("");
      setShowAddForm(false);
    } catch (e) { console.error(e); }
    setAddingSkill(false);
  };

  const categories = [
    { id: "training", label: "Training", icon: "🎒", pct: readiness.training, skills: trainingSkills, field: "skills", toggle: onToggleSkill },
    { id: "gear", label: "Gear", icon: "🎒", pct: readiness.gear },
    { id: "medical", label: "Medical", icon: "🏥", pct: readiness.medical, skills: medicalSkills, field: "medical", toggle: toggleMedical },
    { id: "admin", label: "Admin", icon: "📋", pct: readiness.admin, skills: adminSkills, field: "admin_tasks", toggle: toggleAdmin },
  ];

  return (
    <div>
      {/* Overall readiness */}
      <div style={card(theme)}>
        <div style={cardTitle(theme)}>Crew Readiness Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.progressBg} strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={theme.accent} strokeWidth="6"
                strokeDasharray={`${readiness.overall * 1.76} ${176 - readiness.overall * 1.76}`}
                strokeLinecap="round" transform="rotate(-90 32 32)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{readiness.overall}%</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: theme.textMuted, width: 60 }}>{cat.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: theme.progressBg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${cat.pct}%`, borderRadius: 3, background: cat.pct >= 80 ? theme.accent : cat.pct >= 50 ? theme.gold : theme.danger, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, width: 30, textAlign: "right" }}>{cat.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: theme.textDim }}>
          {active !== null
            ? <>Editing for <strong style={{ color: am.color.bg }}>{am.name}</strong>. Click items to check off.</>
            : "Select your name above to check off completed items."}
        </div>
      </div>

      {/* Category sections */}
      {categories.filter(c => c.skills).map(cat => (
        <div key={cat.id} style={{ marginBottom: 6 }}>
          <div onClick={() => setExpandedCats(prev => { const next = new Set(prev); next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id); return next; })}
            style={{ ...card(theme), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{cat.label}</span>
              <span style={{ fontSize: 10, color: theme.textDimmer }}>
                {members.length > 0 && `${cat.pct}% complete`}
              </span>
            </div>
            <span style={{ fontSize: 14, color: theme.textDimmer, transform: expandedCats.has(cat.id) ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
          </div>

          {expandedCats.has(cat.id) && (
            <div style={{ padding: "4px 0" }}>
              {cat.skills.map(s => {
                const chk = am && (am[cat.field] || []).includes(s.id);
                const completedBy = members.filter(m => (m[cat.field] || []).includes(s.id));
                const remaining = members.filter(m => !(m[cat.field] || []).includes(s.id));

                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 7, marginBottom: 2,
                    background: chk ? theme.accentBg : theme.bgAlt,
                    border: chk ? `1.5px solid ${theme.borderAccent}` : `1px solid ${theme.border}`,
                    cursor: active !== null ? "pointer" : "default",
                  }} onClick={() => cat.toggle(s.id)}>
                    <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: chk ? theme.accentLight : theme.text }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: theme.textDimmer }}>{s.desc}</div>
                      {members.length > 0 && (
                        <div style={{ fontSize: 10, color: completedBy.length > 0 ? theme.accent : theme.textDimmer, marginTop: 1 }}>
                          {completedBy.length > 0 && completedBy.map(m => m.name).join(", ")}
                          {remaining.length > 0 && <span style={{ color: theme.warn }}>{completedBy.length > 0 ? " | " : ""}Needs: {remaining.map(m => m.name).join(", ")}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, border: `2px solid ${chk ? theme.accent : theme.borderLight}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: theme.accent, flexShrink: 0,
                    }}>
                      {chk && "\u2713"}
                    </div>
                    {isAdmin && !s.isDefault && (
                      confirmDeleteSkill === s.id ? (
                        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 3 }}>
                          <button onClick={() => { onRemoveSkill(s.id); setConfirmDeleteSkill(null); }}
                            style={{ fontSize: 9, color: "#fff", background: theme.danger, border: "none", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>Delete</button>
                          <button onClick={() => setConfirmDeleteSkill(null)}
                            style={{ fontSize: 9, color: theme.textDimmer, background: theme.bgAlt, border: `1px solid ${theme.border}`, borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontFamily: fontBody }}>No</button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSkill(s.id); }} title="Remove"
                          style={{ background: "none", border: "none", color: theme.danger, fontSize: 12, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>
                          x
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Add skill form */}
      {isAdmin && (
        <div style={{ marginTop: 4 }}>
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} style={{
              width: "100%", padding: "10px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
              background: "transparent", color: theme.accent, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
            }}>+ Add Checklist Item</button>
          ) : (
            <div style={card(theme)}>
              <select value={addCategory} onChange={e => setAddCategory(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }}>
                <option value="training">Training</option>
                <option value="medical">Medical</option>
                <option value="admin">Admin</option>
              </select>
              <input value={newSkillName} onChange={e => { setNewSkillName(e.target.value); setAddError(""); }} placeholder="Item name"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${addError ? theme.danger : theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: addError ? 2 : 6, boxSizing: "border-box" }} />
              {addError && <div style={{ fontSize: 10, color: theme.danger, marginBottom: 4 }}>{addError}</div>}
              <input value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} placeholder="Description (optional)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                <button onClick={handleAdd} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
