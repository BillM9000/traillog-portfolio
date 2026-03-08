import { useState } from "react";
import { card, cardTitle, fontBody } from "../utils/theme";

export default function Skills({ members, active, skills, analysis, isAdmin, onToggleSkill, onAddSkill, onRemoveSkill }) {
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const am = active !== null ? members[active] : null;

  const handleAdd = async () => {
    const name = newSkillName.trim();
    if (!name) return;
    await onAddSkill(name, newSkillDesc);
    setNewSkillName("");
    setNewSkillDesc("");
    setShowAddForm(false);
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={cardTitle}>Training Skills Checklist</div>
        {isAdmin && (
          <button onClick={() => setShowAddForm(!showAddForm)}
            style={{ fontSize: 10, fontWeight: 600, color: "#7aba7a", background: "#2a3d2e", border: "1px solid #3d5a45", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody }}>
            {showAddForm ? "Cancel" : "+ Add Skill"}
          </button>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div style={{ background: "#1a2420", borderRadius: 7, padding: 10, marginBottom: 10, border: "1px solid #3d5a45" }}>
          <input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="Skill name"
            style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #3d4a40", background: "#232e27", color: "#e0dcd6", fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
          <input value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} placeholder="Short description (optional)"
            style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #3d4a40", background: "#232e27", color: "#e0dcd6", fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
          <button onClick={handleAdd}
            style={{ padding: "6px 16px", borderRadius: 5, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Add Skill
          </button>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#6a7a6a", marginBottom: 8 }}>
        {active !== null
          ? <>Toggling for <strong style={{ color: am.color.bg }}>{am.name}</strong>. Click any skill.</>
          : "Select your name above, then check off completed skills."}
      </div>

      {skills.map(s => {
        const gap = analysis.skillGap?.find(g => g.id === s.id);
        const chk = am && (am.skills || []).includes(s.id);
        return (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 7, marginBottom: 3,
            background: chk ? "#2a3d2e" : "#1a2420",
            border: chk ? "1.5px solid #3d5a45" : "1px solid #2a332c",
            transition: "all .12s",
          }}>
            <span onClick={() => onToggleSkill(s.id)} style={{ fontSize: 18, width: 26, textAlign: "center", cursor: active !== null ? "pointer" : "default" }}>
              {s.icon}
            </span>
            <div style={{ flex: 1, cursor: active !== null ? "pointer" : "default" }} onClick={() => onToggleSkill(s.id)}>
              <div style={{ fontSize: 12, fontWeight: 600, color: chk ? "#7aba7a" : "#c0d0c0" }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "#5a6a5a" }}>{s.desc}</div>
              {gap && gap.completedBy.length > 0 && (
                <div style={{ fontSize: 10, color: "#4a7a4a", marginTop: 1 }}>
                  {gap.completedBy.join(", ")}
                  {gap.remaining.length > 0 && <span style={{ color: "#7a6a5a" }}> | Needs: {gap.remaining.join(", ")}</span>}
                </div>
              )}
            </div>
            <div onClick={() => onToggleSkill(s.id)}
              style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${chk ? "#5a9a65" : "#3a4a3a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#5a9a65", flexShrink: 0, cursor: active !== null ? "pointer" : "default" }}>
              {chk && "✓"}
            </div>
            {isAdmin && !s.isDefault && (
              <button onClick={() => onRemoveSkill(s.id)} title="Remove skill"
                style={{ background: "none", border: "none", color: "#6a4040", fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>
                x
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
