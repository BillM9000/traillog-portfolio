import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, memberTypeBadge, TRAIL_BADGES } from "../utils/theme";

export default function MemberBar({ members, active, setActive, pendingMembers, isAdmin, currentUserId, onConfirmDelete, onRemoveManual, onApproveMember, onDenyMember, achievements, onRequestLink }) {
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
    const isActive = active === memberIdx;
    const isYou = m.user_id === currentUserId;
    const userBadges = badgesByUser[m.user_id] || [];
    const avatarBg = (m.user_type === "adult" || (!m.user_type && !m.is_manual)) ? "#5B7A3A" : "#8B6E4E";

    // Simple readiness approximation
    const skillsDone = (m.skills || []).length;
    const gearDone = (m.gear || []).length;
    const readinessApprox = Math.min(100, Math.round(((skillsDone + gearDone) / 20) * 100));

    return (
      <div key={m.is_manual ? `m-${m.id}` : `u-${m.user_id}`} onClick={() => setActive(active === memberIdx ? null : memberIdx)} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
        cursor: "pointer", marginBottom: 6, transition: "all .15s",
        background: isActive ? (theme.name === "dark" ? "#2E3328" : "#F7F3ED") : "transparent",
        border: isActive ? `1.5px solid ${theme.borderLight}` : "1.5px solid transparent",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16, background: avatarBg, color: "#FDFAF5", fontFamily: fontDisplay,
            }}>
              {(m.name || "?")[0].toUpperCase()}
            </div>
          )}
          {/* Tiny progress arc under avatar */}
          <div style={{
            position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)",
            width: 24, height: 4, borderRadius: 2, background: theme.border, overflow: "hidden",
          }}>
            <div style={{
              width: `${readinessApprox}%`, height: "100%", borderRadius: 2,
              background: readinessApprox > 50 ? theme.accent : theme.urgency,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Name + metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: theme.heading, fontFamily: fontDisplay }}>
              {m.name}
            </span>
            {isYou && (
              <span style={{
                fontSize: 10, background: theme.accent, color: "#fff", padding: "1px 6px",
                borderRadius: 8, fontWeight: 600, letterSpacing: 0.5, fontFamily: fontBody,
              }}>YOU</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2, fontFamily: fontBody }}>
            {m.is_manual ? "Manual" : (m.user_type === "adult" ? "Adult" : "Scout")}
            {m.participation === "support" && " \u00B7 Support"}
            {m.user_type === "adult" && m.linked_to && (() => { const linked = members.find(x => x.user_id === m.linked_to); return linked ? ` \u00B7 Parent of ${linked.name}` : ""; })()}
            {(m.dates || []).length > 0 && ` \u00B7 ${(m.dates || []).length} date${(m.dates || []).length === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Trail badges — only visible on your own row */}
        {isYou && userBadges.length > 0 && (
          <span style={{ fontSize: 12, flexShrink: 0 }} title={userBadges.map(b => TRAIL_BADGES[b]?.title).join(", ")} aria-label={`Trail badges: ${userBadges.map(b => TRAIL_BADGES[b]?.title).join(", ")}`}>
            {userBadges.map(b => TRAIL_BADGES[b]?.icon || "").join("")}
          </span>
        )}

        {/* Remove button */}
        {isAdmin && m.user_id !== currentUserId && !m.is_manual && (
          <button onClick={e => { e.stopPropagation(); onConfirmDelete(memberIdx); }}
            style={{ background: "none", border: "none", color: theme.danger, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
            aria-label={`Remove ${m.name}`} title="Remove">{"×"}</button>
        )}
        {isAdmin && m.is_manual && (
          <button onClick={e => { e.stopPropagation(); onRemoveManual(m.id); }}
            style={{ background: "none", border: "none", color: theme.danger, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
            aria-label={`Remove ${m.name}`} title="Remove manual member">{"×"}</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: theme.bgAlt, borderBottom: `1px solid ${theme.border}`, padding: "42px 16px 14px 16px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>Crew</span>
        <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 500, fontFamily: fontBody }}>
          {trekkingMembers.length} trekking{supportMembers.length > 0 ? ` \u00B7 ${supportMembers.length} support` : ""}
        </span>
      </div>

      {/* Trekking members */}
      {trekkingMembers.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, fontFamily: fontBody }}>
            Trekking
          </div>
          <div style={{ marginBottom: supportMembers.length > 0 ? 8 : 0 }}>
            {trekkingMembers.map(renderMember)}
          </div>
        </>
      )}

      {trekkingMembers.length === 0 && members.length === 0 && (
        <span style={{ fontSize: 13, color: theme.textDim, fontStyle: "italic", fontFamily: fontBody }}>No approved members yet.</span>
      )}

      {/* Support members */}
      {supportMembers.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8a6d3b", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6, marginTop: 8, fontFamily: fontBody }}>
            Support
          </div>
          <div>
            {supportMembers.map(renderMember)}
          </div>
        </>
      )}

      {/* Pending requests */}
      {isAdmin && pendingMembers.length > 0 && (
        <div style={{ background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 12, padding: "10px 14px", marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: fontBody }}>
            Pending Requests ({pendingMembers.length})
          </div>
          {pendingMembers.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: theme.text, flex: 1, fontFamily: fontBody }}>
                {m.name} <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
              </span>
              <button onClick={() => onApproveMember(m.user_id)} style={{
                fontSize: 11, fontWeight: 600, color: theme.accent, background: theme.accentBg,
                border: `1px solid ${theme.borderAccent}`, padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontFamily: fontBody,
              }}>Approve</button>
              <button onClick={() => onDenyMember(m.user_id)} style={{
                fontSize: 11, fontWeight: 600, color: "#c08080", background: theme.name === "dark" ? "#3a2020" : "#fde8e8",
                border: "1px solid #5a3030", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontFamily: fontBody,
              }}>Deny</button>
            </div>
          ))}
        </div>
      )}

      {/* Self-link request for unlinked adults (non-admin) */}
      {(() => {
        const currentMember = members.find(m => m.user_id === currentUserId);
        if (!currentMember || currentMember.user_type !== "adult" || currentMember.linked_to || isAdmin) return null;
        const scouts = members.filter(m => !m.is_manual && m.user_type === "scout");
        if (scouts.length === 0) return null;
        return (
          <div style={{ padding: "10px 14px", marginTop: 10, background: theme.name === "dark" ? "#1e2418" : "#f4f9ee", borderRadius: 10, border: `1px solid ${theme.borderAccent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 4, fontFamily: fontDisplay }}>Link to your Scout</div>
            <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 6, fontFamily: fontBody }}>Select your scout to request a link (admin approval required)</div>
            <select onChange={e => { if (e.target.value && onRequestLink) { onRequestLink(parseInt(e.target.value)); e.target.value = ""; } }} defaultValue="" style={{
              width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
              background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, cursor: "pointer",
            }}>
              <option value="" disabled>Select scout...</option>
              {scouts.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
            </select>
          </div>
        );
      })()}

      {/* Active member indicator */}
      {am && (
        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 10, fontFamily: fontBody }}>
          Editing: <strong style={{ color: theme.accent, fontFamily: fontDisplay }}>{am.name}</strong> — click or drag dates
        </div>
      )}
    </div>
  );
}
