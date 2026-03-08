import { useState } from "react";
import { fontBody } from "../utils/theme";

export default function MemberBar({ members, active, setActive, isAdmin, adminPin, onAddMember, onConfirmDelete, onReset }) {
  const [newName, setNewName] = useState("");
  const am = active !== null ? members[active] : null;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || members.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    await onAddMember(name);
    setNewName("");
  };

  return (
    <div style={{ background: "#212a24", borderBottom: "1px solid #2d3830", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6a7a6a", textTransform: "uppercase", letterSpacing: 1 }}>Crew</span>
        <span style={{ flex: 1 }} />
        {isAdmin && (
          <button onClick={onReset} style={{ background: "#3a2020", border: "1px solid #5a3030", color: "#c08080", padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Reset All
          </button>
        )}
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
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); onConfirmDelete(i); }}
                style={{ background: "none", border: "none", color: "#6a4040", fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}
                title="Remove">
                x
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && !isAdmin && (
          <span style={{ fontSize: 12, color: "#5a6a5a", fontStyle: "italic" }}>
            No members yet. Ask your crew admin to add everyone.
          </span>
        )}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Add parent name..."
            style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1.5px solid #3d4a40", background: "#1a2420", color: "#e0dcd6", fontSize: 12, fontFamily: fontBody, outline: "none" }}
          />
          <button onClick={handleAdd} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Add
          </button>
        </div>
      )}

      {am && (
        <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 6 }}>
          Editing: <strong style={{ color: am.color.bg }}>{am.name}</strong> — click or drag dates
        </div>
      )}
    </div>
  );
}
