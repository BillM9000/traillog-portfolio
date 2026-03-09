import { useTheme } from "../contexts/ThemeContext";
import { fontBody } from "../utils/theme";

export default function MemberBar({ members, active, setActive, pendingMembers, isAdmin, currentUserId, onConfirmDelete, onApproveMember, onDenyMember }) {
  const { theme } = useTheme();
  const am = active !== null ? members[active] : null;

  return (
    <div style={{ background: theme.bgAlt, borderBottom: `1px solid ${theme.border}`, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Crew</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {members.map((m, i) => (
          <div key={m.id} onClick={() => setActive(active === i ? null : i)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, cursor: "pointer",
            background: active === i ? `${m.color.bg}18` : "transparent",
            border: active === i ? `1.5px solid ${m.color.bg}60` : "1.5px solid transparent",
            transition: "all .15s",
          }}>
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: m.color.bg }} />
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
              {m.name}
              {m.user_id === currentUserId && <span style={{ fontSize: 9, color: theme.accent }}> (you)</span>}
            </span>
            <span style={{ fontSize: 10, color: theme.textDim }}>{m.dates.length}d</span>
            {isAdmin && m.user_id !== currentUserId && (
              <button onClick={e => { e.stopPropagation(); onConfirmDelete(i); }}
                style={{ background: "none", border: "none", color: theme.danger, fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}
                title="Remove">
                x
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <span style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>
            No approved members yet.
          </span>
        )}
      </div>

      {/* Pending requests (admin only) */}
      {isAdmin && pendingMembers.length > 0 && (
        <div style={{ background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 7, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
            Pending Requests ({pendingMembers.length})
          </div>
          {pendingMembers.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: theme.text, flex: 1 }}>
                {m.name} <span style={{ fontSize: 10, color: theme.textDim }}>({m.user_type || "unknown"})</span>
              </span>
              <button onClick={() => onApproveMember(m.user_id)}
                style={{ fontSize: 10, fontWeight: 600, color: theme.accentLight, background: theme.accentBg, border: `1px solid ${theme.borderAccent}`, padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody }}>
                Approve
              </button>
              <button onClick={() => onDenyMember(m.user_id)}
                style={{ fontSize: 10, fontWeight: 600, color: "#c08080", background: theme.name === "dark" ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody }}>
                Deny
              </button>
            </div>
          ))}
        </div>
      )}

      {am && (
        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 6 }}>
          Editing: <strong style={{ color: am.color.bg }}>{am.name}</strong> — click or drag dates
        </div>
      )}
    </div>
  );
}
