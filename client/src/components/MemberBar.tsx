import { useTheme } from "../contexts/ThemeContext";
import { useAdventure } from "../contexts/AdventureContext";
import { memberTypeBadge, TRAIL_BADGES } from "../utils/theme";
import { computeMemberReadiness } from "../utils/readiness";
import clsx from "clsx";
import type { AdventureMember, ThemeColors, Achievement, Skill, GearCatalogItem, MemberGearItem } from "../types";

type MemberGearMap = Record<number, MemberGearItem[]>;

interface PendingMember {
  id: number;
  user_id: number;
  name: string;
  user_type: string | null;
}

interface MemberBarProps {
  members: AdventureMember[];
  active: number | null;
  setActive: (index: number | null) => void;
  pendingMembers: PendingMember[];
  isAdmin: boolean;
  currentUserId: number;
  onConfirmDelete: (memberIndex: number) => void;
  onRemoveManual: (manualId: number) => void;
  onApproveMember: (userId: number) => void;
  onDenyMember: (userId: number) => void;
  achievements: Achievement | null;
  onRequestLink?: (scoutUserId: number) => void;
  view: string;
  allCrewsMode: boolean;
}

export default function MemberBar({ members, active, setActive, pendingMembers, isAdmin, currentUserId, onConfirmDelete, onRemoveManual, onApproveMember, onDenyMember, achievements, onRequestLink, view, allCrewsMode }: MemberBarProps) {
  const { theme } = useTheme();
  const { memberGearMap, skills, gearCatalog } = useAdventure();
  const am = active !== null ? members[active] : null;

  const trekkingMembers = members.filter(m => m.participation === "trekking");
  const supportMembers = members.filter(m => m.participation === "support");

  const badgesByUser: Record<number, string[]> = {};
  if (achievements?.badges) {
    achievements.badges.forEach(b => {
      if (!badgesByUser[b.user_id]) badgesByUser[b.user_id] = [];
      badgesByUser[b.user_id].push(b.badge_id);
    });
  }

  const renderMember = (m: AdventureMember) => {
    const memberIdx = members.indexOf(m);
    const isActive = active === memberIdx;
    const isYou = m.user_id === currentUserId;
    const userBadges = badgesByUser[m.user_id as number] || [];
    const avatarBg = (m.user_type === "adult" || (!m.user_type && !m.is_manual)) ? "#5B7A3A" : "#8B6E4E";

    // Readiness using shared calculation (single source of truth)
    const readinessApprox = computeMemberReadiness(m, skills, gearCatalog, memberGearMap);

    return (
      <div key={m.is_manual ? `m-${m.id}` : `u-${m.user_id}`} onClick={() => !allCrewsMode && setActive(active === memberIdx ? null : memberIdx)} className={clsx(
        "flex items-center gap-3 px-3.5 py-3 rounded-xl mb-1.5 transition-all duration-150",
        allCrewsMode ? "cursor-default" : "cursor-pointer",
        isActive
          ? "border-[1.5px] border-tl-border-light"
          : "border-[1.5px] border-transparent"
      )} style={isActive ? { background: theme.name === "dark" ? "#2E3328" : "#F7F3ED" } : undefined}>
        {/* Avatar */}
        <div className="relative shrink-0">
          {(m as AdventureMember & { avatar_url?: string }).avatar_url ? (
            <img src={(m as AdventureMember & { avatar_url?: string }).avatar_url} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[16px] text-[#FDFAF5] font-display" style={{ background: avatarBg }}>
              {(m.name || "?")[0].toUpperCase()}
            </div>
          )}
          {/* Tiny progress arc under avatar */}
          <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-6 h-1 rounded-sm bg-tl-border overflow-hidden">
            <div className="h-full rounded-sm transition-[width] duration-500 ease-in-out" style={{
              width: `${readinessApprox}%`,
              background: readinessApprox > 50 ? theme.accent : theme.urgency,
            }} />
          </div>
        </div>

        {/* Name + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px] text-tl-heading font-display">
              {m.name}
            </span>
            {isYou && (
              <span className="text-[10px] bg-tl-accent text-white px-1.5 py-[1px] rounded-lg font-semibold tracking-[0.5px] font-body">YOU</span>
            )}
          </div>
          <div className="text-xs text-tl-text-dim mt-0.5 font-body">
            {m.is_manual ? "Scout" : (m.user_type === "adult" ? "Adult" : "Scout")}
            {allCrewsMode && m.crew_name && ` \u00B7 ${m.crew_name}`}
            {m.role === "admin" && " \u00B7 Admin"}
            {m.participation === "support" && " \u00B7 Support"}
            {m.user_type === "adult" && (m.linked_scouts || []).length > 0 && (() => { const names = (m.linked_scouts || []).map((sid: number) => { const linked = sid > 0 ? members.find(x => x.user_id === sid) : members.find(x => x.id === Math.abs(sid)); return linked ? linked.name : null; }).filter(Boolean); return names.length > 0 ? ` \u00B7 Parent of ${names.join(", ")}` : ""; })()}
            {(m.dates || []).length > 0 && ` \u00B7 ${(m.dates || []).length} date${(m.dates || []).length === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Trail badges — only visible on your own row */}
        {isYou && userBadges.length > 0 && (
          <span className="text-xs shrink-0" title={userBadges.map(b => TRAIL_BADGES[b]?.title).join(", ")} aria-label={`Trail badges: ${userBadges.map(b => TRAIL_BADGES[b]?.title).join(", ")}`}>
            {userBadges.map(b => TRAIL_BADGES[b]?.icon || "").join("")}
          </span>
        )}

        {/* Remove button */}
        {isAdmin && m.user_id !== currentUserId && !m.is_manual && (
          <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onConfirmDelete(memberIdx); }}
            className="bg-none border-none text-tl-danger text-[16px] cursor-pointer px-1 py-0 leading-none shrink-0"
            aria-label={`Remove ${m.name}`} title="Remove">{"×"}</button>
        )}
        {isAdmin && m.is_manual && (
          <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemoveManual(m.id); }}
            className="bg-none border-none text-tl-danger text-[16px] cursor-pointer px-1 py-0 leading-none shrink-0"
            aria-label={`Remove ${m.name}`} title="Remove manual member">{"×"}</button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-tl-bg-alt border-b border-tl-border pt-[42px] px-4 pb-3.5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-lg font-extrabold text-tl-heading font-display">
          {allCrewsMode ? "All Crews" : "Crew"}
        </span>
        <span className="text-xs text-tl-text-dim font-medium font-body">
          {trekkingMembers.length} trekking{supportMembers.length > 0 ? ` \u00B7 ${supportMembers.length} support` : ""}
        </span>
      </div>

      {/* All Crews mode: group by crew_name */}
      {allCrewsMode && (() => {
        const crewGroups: Record<string, AdventureMember[]> = {};
        for (const m of members) {
          const cn = m.crew_name || "Crew";
          if (!crewGroups[cn]) crewGroups[cn] = [];
          crewGroups[cn].push(m);
        }
        return Object.entries(crewGroups).map(([crewName, crewMembers]) => (
          <div key={crewName} className="mb-2.5">
            <div className="text-[10px] font-bold text-tl-accent tracking-[1.2px] uppercase mb-1.5 font-body">
              {crewName}
            </div>
            {crewMembers.map(renderMember)}
          </div>
        ));
      })()}

      {/* Single crew mode: trekking/support split */}
      {!allCrewsMode && trekkingMembers.length > 0 && (
        <>
          <div className="text-[10px] font-bold text-tl-text-dim tracking-[1.2px] uppercase mb-1.5 font-body">
            Trekking
          </div>
          <div className={supportMembers.length > 0 ? "mb-2" : ""}>
            {trekkingMembers.map(renderMember)}
          </div>
        </>
      )}

      {trekkingMembers.length === 0 && members.length === 0 && (
        <span className="text-[13px] text-tl-text-dim italic font-body">No approved members yet.</span>
      )}

      {/* Support members */}
      {!allCrewsMode && supportMembers.length > 0 && (
        <>
          <div className="text-[10px] font-bold text-[#8a6d3b] tracking-[1.2px] uppercase mb-1.5 mt-2 font-body">
            Support
          </div>
          <div>
            {supportMembers.map(renderMember)}
          </div>
        </>
      )}

      {/* Pending requests */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className={clsx(
          "rounded-xl px-3.5 py-2.5 mt-2.5",
          theme.name === "dark" ? "bg-[#2a2820]" : "bg-[#faf5e8]"
        )} style={{ border: `1px solid ${theme.gold}40` }}>
          <div className="text-[10px] font-bold text-tl-gold mb-1.5 uppercase tracking-[1.2px] font-body">
            Pending Requests ({pendingMembers.length})
          </div>
          {pendingMembers.map(m => (
            <div key={m.id} className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px] text-tl-text flex-1 font-body">
                {m.name} <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
              </span>
              <button onClick={() => onApproveMember(m.user_id)} className="text-[11px] font-semibold text-tl-accent bg-tl-accent-bg border border-tl-border-accent px-3 py-1 rounded-lg cursor-pointer font-body">Approve</button>
              <button onClick={() => onDenyMember(m.user_id)} className={clsx(
                "text-[11px] font-semibold text-[#c08080] border border-[#5a3030] px-3 py-1 rounded-lg cursor-pointer font-body",
                theme.name === "dark" ? "bg-[#3a2020]" : "bg-[#fde8e8]"
              )}>Deny</button>
            </div>
          ))}
        </div>
      )}

      {/* Self-link request for unlinked adults (non-admin) */}
      {(() => {
        const currentMember = members.find(m => m.user_id === currentUserId);
        if (!currentMember || currentMember.user_type !== "adult" || (currentMember.linked_scouts || []).length > 0 || currentMember.linked_to || isAdmin) return null;
        const scouts = members.filter(m => !m.is_manual && m.user_type === "scout");
        if (scouts.length === 0) return null;
        return (
          <div className={clsx(
            "px-3.5 py-2.5 mt-2.5 rounded-[10px] border border-tl-border-accent",
            theme.name === "dark" ? "bg-[#1e2418]" : "bg-[#f4f9ee]"
          )}>
            <div className="text-[11px] font-bold text-tl-heading mb-1 font-display">Link to your Scout</div>
            <div className="text-[11px] text-tl-text-dim mb-1.5 font-body">Select your scout to request a link (admin approval required)</div>
            <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { if (e.target.value && onRequestLink) { onRequestLink(parseInt(e.target.value)); e.target.value = ""; } }} defaultValue="" className="w-full py-2 px-2.5 rounded-[7px] border-[1.5px] border-tl-border-light bg-tl-input text-tl-text text-xs font-body cursor-pointer">
              <option value="" disabled>Select scout...</option>
              {scouts.map(s => <option key={s.user_id} value={s.user_id as number}>{s.name}</option>)}
            </select>
          </div>
        );
      })()}

      {/* Active member indicator — contextual hint per tab */}
      {am && (
        <div className="text-xs text-tl-text-dim mt-2.5 font-body">
          Editing: <strong className="text-tl-accent font-display">{am.name}</strong>
          {view === "calendar" && " — tap dates to set availability"}
          {view === "gear" && " — manage gear checklist below"}
          {view === "skills" && " — check off readiness items"}
        </div>
      )}
    </div>
  );
}
