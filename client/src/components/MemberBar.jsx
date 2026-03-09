import { useTheme } from "../contexts/ThemeContext";
import { fontBody, memberTypeBadge, TRAIL_BADGES } from "../utils/theme";

export default function MemberBar({ members, active, setActive, pendingMembers, isAdmin, currentUserId, onConfirmDelete, onApproveMember, onDenyMember, achievements }) {
  const { theme } = useTheme();
  const am = active !== null ? members[active] : null;

  const trekkingMembers = members.filter(m => m.participation === "trekking");
  const supportMembers = members.filter(m => m.participation === "support");

  const badgesByUser = {};
  if (achievements?.badges) {
    achievements.badges.forEach(b => {
      if (!badgesByUser[b.user_id]) badgesByUser[b.user_id] = [];
      badgesByUser[b.user_id].push(b.badge_type);
    });
  }

  const renderMember = (m) => {
    const memberIdx = members.indexOf(m);
    const userBadges = badgesByUser[m.user_id] || [];
    return (
      <div key={m.is_manual ? `m-${m.id}` : `u-${m.user_id}`} onClick={() => setActive(active === memberIdx ? null : memberIdx)} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, cursor: "pointer",
        background: active === memberIdx ? `${m.color?.bg || theme.accent}18` : "transparent",
        border: active === memberIdx ? `1.5px solid ${m.color?.bg || theme.accent}60` : "1.5px solid transparent",
        transition: "all .15s",
      }}>
        {m.avatar_url ? (
          <img src={m.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%" }} />
        ) : (
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: m.color?.bg || theme.accent }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
          {m.name}
          {m.user_id === currentUserId && <span style={{ fontSize: 9, color: theme.accent }}> (you)</span>}
        </span>
        <span style={memberTypeBadge(theme, m.user_type || (m.is_manual ? "scout" : ""))}>
          {m.is_manual ? "M" : (m.user_type === "adult" ? "A" : "S")}
        </span>
        {userBadges.length > 0 && (
          <span style={{ fontSize: 10 }} title={userBadges.map(b => TRAIL_BADGES[b]?.title).join(", ")}>
            {userBadges.map(b => TRAIL_BADGES[b]?.icon || "").join("")}
          </span>
        )}
        <span style={{ fontSize: 10, color: theme.textDim }}>{(m.dates || []).length}d</span>
        {isAdmin && m.user_id !== currentUserId && !m.is_manual && (
          <button onClick={e => { e.stopPropagation(); onConfirmDelete(memberIdx); }}
            style={{ background: "none", border: "none", color: theme.danger, fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}
            title="Remove">x</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: theme.bgAlt, borderBottom: `1px solid ${theme.border}`, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Crew</span>
        {trekkingMembers.length > 0 && <span style={{ fontSize: 10, color: theme.textDimmer }}>({trekkingMembers.length} trekking{supportMembers.length > 0 ? `, ${supportMembers.length} support` : ""})</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: supportMembers.length > 0 ? 4 : 8 }}>
        {trekkingMembers.map(renderMember)}
        {trekkingMembers.length === 0 && members.length === 0 && (
          <span style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>No approved members yet.</span>
        )}
      </div>

      {supportMembers.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#8a6d3b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 4 }}>Support</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {supportMembers.map(renderMember)}
          </div>
        </>
      )}

      {isAdmin && pendingMembers.length > 0 && (
        <div style={{ background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 7, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Pending Requests ({pendingMembers.length})</div>
          {pendingMembers.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: theme.text, flex: 1 }}>
                {m.name} <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
              </span>
              <button onClick={() => onApproveMember(m.user_id)} style={{ fontSize: 10, fontWeight: 600, color: theme.accentLight, background: theme.accentBg, border: `1px solid ${theme.borderAccent}`, padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody }}>Approve</button>
              <button onClick={() => onDenyMember(m.user_id)} style={{ fontSize: 10, fontWeight: 600, color: "#c08080", background: theme.name === "dark" ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody }}>Deny</button>
            </div>
          ))}
        </div>
      )}

      {am && (
        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 6 }}>
          Editing: <strong style={{ color: am.color?.bg || theme.accent }}>{am.name}</strong> — click or drag dates
        </div>
      )}
    </div>
  );
}
