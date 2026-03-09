import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, memberTypeBadge, participationBadge, toolbarBtn } from "../utils/theme";
import Logo from "./Logo";
import ConfirmModal from "./ConfirmModal";

export default function AdminPanel({ troop, adventure, troopMembers, adventureMembers, onClose, onRefresh, onSelectAdventure }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState("adventure");
  const [troopName, setTroopName] = useState(troop?.name || "");
  const [troopDesc, setTroopDesc] = useState(troop?.description || "");
  const [advName, setAdvName] = useState(adventure?.name || "");
  const [advDesc, setAdvDesc] = useState(adventure?.description || "");
  const [departDate, setDepartDate] = useState(adventure?.depart_date || "");
  const [arriveDate, setArriveDate] = useState(adventure?.arrive_date || adventure?.trek_date || "");
  const [returnDate, setReturnDate] = useState(adventure?.return_date || "");
  const [homeDate, setHomeDate] = useState(adventure?.home_date || "");
  const [advStatus, setAdvStatus] = useState(adventure?.status || "active");
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [manualName, setManualName] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [confirmDeleteAdv, setConfirmDeleteAdv] = useState(false);

  // New adventure creation
  const [showCreateAdv, setShowCreateAdv] = useState(false);
  const [itineraries, setItineraries] = useState([]);
  const [newAdv, setNewAdv] = useState({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
  const [creatingAdv, setCreatingAdv] = useState(false);

  // Link requests
  const [linkRequests, setLinkRequests] = useState([]);

  useEffect(() => {
    if (adventure?.id) {
      api.getInvitations(adventure.id).then(setInvitations).catch(() => {});
      api.getLinkRequests(adventure.id).then(setLinkRequests).catch(() => {});
    }
  }, [adventure?.id]);

  const normalize = (s) => s.replace(/\s+/g, " ").trim();

  const saveTroop = async () => {
    if (!troopName.trim()) { addToast("Troop name is required", "error"); return; }
    setSaving(true);
    try {
      await api.updateTroop(troop.id, { name: normalize(troopName), description: normalize(troopDesc) });
      onRefresh(); addToast("Troop saved", "success");
    } catch (e) { addToast(e.message, "error"); }
    setSaving(false);
  };

  const saveAdventure = async () => {
    // Validate date sequence: depart ≤ arrive ≤ return ≤ home
    const dates = [departDate, arriveDate, returnDate, homeDate].filter(Boolean);
    if (dates.length >= 2) {
      const labels = ["Depart Home", "Arrive Philmont", "Depart Philmont", "Return Home"];
      const vals = [departDate, arriveDate, returnDate, homeDate];
      for (let i = 0; i < vals.length - 1; i++) {
        if (vals[i] && vals[i + 1] && vals[i] > vals[i + 1]) {
          addToast(`${labels[i + 1]} cannot be before ${labels[i]}`, "error");
          return;
        }
      }
    }
    setSaving(true);
    try {
      await api.updateAdventure(adventure.id, {
        name: normalize(advName), description: normalize(advDesc),
        depart_date: departDate || null, arrive_date: arriveDate || null,
        return_date: returnDate || null, home_date: homeDate || null, status: advStatus,
      });
      onRefresh(); addToast("Adventure saved", "success");
    } catch (e) { addToast(e.message, "error"); }
    setSaving(false);
  };

  const deleteAdventure = async () => {
    try { await api.deleteAdventure(adventure.id); addToast("Adventure deleted", "success"); onClose(); onRefresh(); }
    catch (e) { addToast(e.message, "error"); }
    setConfirmDeleteAdv(false);
  };

  const addMemberToAdventure = async (userId) => {
    try { await api.addAdventureMember(adventure.id, userId, "member"); onRefresh(); addToast("Member added", "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const removeMemberFromAdventure = async (userId) => {
    try { await api.removeAdventureMember(adventure.id, userId); onRefresh(); addToast("Member removed", "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try { await api.updateMemberRole(adventure.id, userId, newRole); onRefresh(); addToast(`Role: ${newRole}`, "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const toggleParticipation = async (userId, current) => {
    const next = current === "trekking" ? "support" : "trekking";
    try { await api.updateParticipation(adventure.id, userId, next); onRefresh(); addToast(`Set to ${next}`, "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const toggleUserType = async (userId, current) => {
    const next = current === "adult" ? "scout" : "adult";
    try { await api.updateMemberUserType(adventure.id, userId, next); onRefresh(); addToast(`Changed to ${next}`, "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const handleLink = async (userId, linkedTo) => {
    try { await api.linkMember(adventure.id, userId, linkedTo || null); onRefresh(); }
    catch (e) { addToast(e.message, "error"); }
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) { addToast("Email address is required", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { addToast("Please enter a valid email address", "error"); return; }
    setSendingInvite(true);
    try {
      await api.sendInvitation(adventure.id, inviteEmail.trim());
      setInviteEmail(""); setInvitations(await api.getInvitations(adventure.id));
      addToast("Invitation sent!", "success");
    } catch (e) { addToast(e.message, "error"); }
    setSendingInvite(false);
  };

  const addManual = async () => {
    if (!manualName.trim()) { addToast("Scout name is required", "error"); return; }
    setAddingManual(true);
    try {
      await api.addManualMember(adventure.id, manualName.trim());
      setManualName(""); onRefresh(); addToast("Manual member added", "success");
    } catch (e) { addToast(e.message, "error"); }
    setAddingManual(false);
  };

  const removeManual = async (memberId) => {
    try { await api.removeManualMember(adventure.id, memberId); onRefresh(); addToast("Manual member removed", "success"); }
    catch (e) { addToast(e.message, "error"); }
  };

  const approveLinkReq = async (requestId) => {
    try {
      await api.approveLinkRequest(adventure.id, requestId);
      setLinkRequests(await api.getLinkRequests(adventure.id));
      onRefresh();
      addToast("Link approved", "success");
    } catch (e) { addToast(e.message, "error"); }
  };

  const denyLinkReq = async (requestId) => {
    try {
      await api.denyLinkRequest(adventure.id, requestId);
      setLinkRequests(await api.getLinkRequests(adventure.id));
      addToast("Link denied", "success");
    } catch (e) { addToast(e.message, "error"); }
  };

  const openCreateAdventure = async () => {
    if (itineraries.length === 0) {
      try { setItineraries(await api.getItineraries()); } catch {}
    }
    setShowCreateAdv(true);
  };

  const createNewAdventure = async () => {
    if (!newAdv.name.trim()) { addToast("Adventure name is required", "error"); return; }
    // Validate date sequence
    const dates = [newAdv.depart_date, newAdv.arrive_date, newAdv.return_date, newAdv.home_date].filter(Boolean);
    if (dates.length >= 2) {
      const labels = ["Depart Home", "Arrive Philmont", "Depart Philmont", "Return Home"];
      const vals = [newAdv.depart_date, newAdv.arrive_date, newAdv.return_date, newAdv.home_date];
      for (let i = 0; i < vals.length - 1; i++) {
        if (vals[i] && vals[i + 1] && vals[i] > vals[i + 1]) {
          addToast(`${labels[i + 1]} cannot be before ${labels[i]}`, "error");
          return;
        }
      }
    }
    setCreatingAdv(true);
    try {
      const adv = await api.createAdventure(troop.id, newAdv);
      addToast(`"${newAdv.name}" created!`, "success");
      setNewAdv({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
      setShowCreateAdv(false);
      onClose();
      if (onSelectAdventure) onSelectAdventure(adv.id);
    } catch (e) { addToast(e.message, "error"); }
    setCreatingAdv(false);
  };

  const advMemberIds = new Set((adventureMembers || []).filter(m => !m.is_manual).map(m => m.user_id));
  const availableMembers = (troopMembers || []).filter(m => m.status === "approved" && !advMemberIds.has(m.user_id));
  const allScouts = (adventureMembers || []).filter(m => !m.is_manual && m.user_type === "scout");

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 8, boxSizing: "border-box" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" };
  const tabs = [["adventure", "Adventure"], ["members", "Members"], ["troop", "Troop"]];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.bgCard, borderRadius: 14, padding: 0, width: 420, maxHeight: "85vh", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={24} />
            <div style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: theme.heading }}>Admin Panel</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: theme.textDimmer, cursor: "pointer", lineHeight: 1 }}>&times;</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${theme.border}` }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, background: tab === k ? theme.bgAlt : "transparent", color: tab === k ? theme.text : theme.textDimmer, border: "none", borderBottom: tab === k ? `2px solid ${theme.accent}` : "2px solid transparent" }}>{l}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          {tab === "adventure" && (
            <>
              <label style={labelStyle}>Adventure Name</label>
              <input value={advName} onChange={e => setAdvName(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Description</label>
              <input value={advDesc} onChange={e => setAdvDesc(e.target.value)} style={inputStyle} placeholder="Optional description" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={labelStyle}>Depart Home</label><input value={departDate} onChange={e => setDepartDate(e.target.value)} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>Arrive Philmont</label><input value={arriveDate} onChange={e => setArriveDate(e.target.value)} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>Depart Philmont</label><input value={returnDate} onChange={e => setReturnDate(e.target.value)} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>Return Home</label><input value={homeDate} onChange={e => setHomeDate(e.target.value)} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
              </div>

              <label style={labelStyle}>Status</label>
              <select value={advStatus} onChange={e => setAdvStatus(e.target.value)} style={{ ...inputStyle, color: theme.text }}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>

              <button onClick={saveAdventure} disabled={saving} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", fontFamily: fontBody, marginTop: 4 }}>
                {saving ? "Saving..." : "Save Adventure"}
              </button>

              {/* Create New Adventure */}
              <div style={{ marginTop: 20, padding: 12, borderRadius: 8, border: `1.5px solid ${theme.borderAccent}`, background: theme.name === "dark" ? "#1e2418" : "#f4f9ee" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: "uppercase", marginBottom: 8 }}>New Adventure</div>
                {!showCreateAdv ? (
                  <button onClick={openCreateAdventure} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: `1.5px dashed ${theme.borderAccent}`, background: "transparent", color: theme.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>+ Create Another Adventure</button>
                ) : (
                  <>
                    <label style={labelStyle}>Adventure Name</label>
                    <input value={newAdv.name} onChange={e => setNewAdv({ ...newAdv, name: e.target.value })} placeholder="e.g. Philmont 2027" style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div><label style={labelStyle}>Depart Home</label><input value={newAdv.depart_date} onChange={e => setNewAdv({ ...newAdv, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>Arrive Philmont</label><input value={newAdv.arrive_date} onChange={e => setNewAdv({ ...newAdv, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>Depart Philmont</label><input value={newAdv.return_date} onChange={e => setNewAdv({ ...newAdv, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>Return Home</label><input value={newAdv.home_date} onChange={e => setNewAdv({ ...newAdv, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                    </div>
                    <label style={labelStyle}>Itinerary</label>
                    <select value={newAdv.itinerary_id} onChange={e => setNewAdv({ ...newAdv, itinerary_id: e.target.value })} style={{ ...inputStyle, color: newAdv.itinerary_id ? theme.text : theme.textDim }}>
                      <option value="">Select itinerary...</option>
                      {itineraries.map(it => (
                        <option key={it.id} value={it.id}>{it.name} ({it.days} days, {it.miles} mi, {it.rating})</option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setShowCreateAdv(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                      <button onClick={createNewAdventure} disabled={creatingAdv} style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: creatingAdv ? "wait" : "pointer", fontFamily: fontBody }}>{creatingAdv ? "Creating..." : "Create Adventure"}</button>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: 20, padding: 12, borderRadius: 8, border: `1.5px solid ${theme.danger}40`, background: theme.name === "dark" ? "#2a1a1a" : "#fdf0f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.danger, textTransform: "uppercase", marginBottom: 8 }}>Danger Zone</div>
                <button onClick={() => setConfirmDeleteAdv(true)} style={{ ...toolbarBtn(theme, "danger"), width: "100%", padding: "8px 0" }}>Delete Adventure</button>
              </div>
            </>
          )}

          {tab === "members" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 8 }}>Adventure Members</div>
              {(adventureMembers || []).map(m => {
                const key = m.is_manual ? `manual-${m.id}` : `user-${m.user_id}`;
                return (
                  <div key={key} style={{ padding: "8px 10px", background: theme.bgAlt, borderRadius: 7, marginBottom: 4, border: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{m.name}</span>
                        {m.is_manual ? (
                          <span style={{ ...memberTypeBadge(theme, "scout"), background: "#888", fontSize: 8 }}>MANUAL</span>
                        ) : (
                          <>
                            <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
                            <span style={participationBadge(theme, m.participation)}>{m.participation}</span>
                          </>
                        )}
                        {m.role === "admin" && <span style={{ fontSize: 8, fontWeight: 700, color: theme.accent, background: theme.accentBg, padding: "1px 4px", borderRadius: 3 }}>ADMIN</span>}
                      </div>
                      {m.is_manual ? (
                        <button onClick={() => removeManual(m.id)} style={{ fontSize: 10, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
                      ) : m.role !== "admin" ? (
                        <button onClick={() => removeMemberFromAdventure(m.user_id)} style={{ fontSize: 10, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
                      ) : null}
                    </div>
                    {!m.is_manual && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {m.email && <span style={{ fontSize: 9, color: theme.textDimmest }}>{m.email}</span>}
                        <button onClick={() => toggleRole(m.user_id, m.role)} style={{ fontSize: 9, color: theme.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.role === "admin" ? "Demote" : "Make Admin"}</button>
                        <button onClick={() => toggleUserType(m.user_id, m.user_type)} style={{ fontSize: 9, color: m.user_type === "adult" ? "#5080b0" : "#508050", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.user_type === "adult" ? "Change to Scout" : "Change to Adult"}</button>
                        <button onClick={() => toggleParticipation(m.user_id, m.participation)} style={{ fontSize: 9, color: "#8a6d3b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.participation === "trekking" ? "Set Support" : "Set Trekking"}</button>
                        {m.user_type === "adult" && (
                          <select value={m.linked_to || ""} onChange={e => handleLink(m.user_id, parseInt(e.target.value) || null)} style={{ fontSize: 9, padding: "1px 4px", background: theme.bgInput, border: `1px solid ${theme.borderLight}`, borderRadius: 3, color: theme.text, fontFamily: fontBody }}>
                            <option value="">Link to scout...</option>
                            {allScouts.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
                          </select>
                        )}
                        {m.linked_to && (() => { const linked = (adventureMembers || []).find(x => x.user_id === m.linked_to); return linked ? <span style={{ fontSize: 9, color: theme.accent }}>Linked: {linked.name}</span> : null; })()}
                      </div>
                    )}
                  </div>
                );
              })}

              {availableMembers.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 14, marginBottom: 8 }}>Add from Troop</div>
                  {availableMembers.map(m => (
                    <div key={m.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: theme.bgAlt, borderRadius: 7, marginBottom: 4, border: `1px solid ${theme.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, color: theme.text }}>{m.name}</span>
                        <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
                      </div>
                      <button onClick={() => addMemberToAdventure(m.user_id)} style={{ fontSize: 10, color: theme.accent, background: "none", border: `1px solid ${theme.borderAccent}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Add</button>
                    </div>
                  ))}
                </>
              )}

              {/* Add Manual Member */}
              <div style={{ marginTop: 14, padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 4 }}>Add Manual Member</div>
                <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 6 }}>For scouts without email accounts</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Scout name" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} onKeyDown={e => e.key === "Enter" && addManual()} />
                  <button onClick={addManual} disabled={addingManual} style={{ ...toolbarBtn(theme, "primary"), padding: "8px 14px" }}>{addingManual ? "..." : "Add"}</button>
                </div>
              </div>

              {/* Invite by Email */}
              <div style={{ marginTop: 10, padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 6 }}>Invite by Email</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} onKeyDown={e => e.key === "Enter" && sendInvite()} />
                  <button onClick={sendInvite} disabled={sendingInvite} style={{ ...toolbarBtn(theme, "primary"), padding: "8px 14px" }}>{sendingInvite ? "..." : "Send"}</button>
                </div>
              </div>

              {invitations.filter(i => i.status === "pending").length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 6 }}>Pending Invitations</div>
                  {invitations.filter(i => i.status === "pending").map(inv => (
                    <div key={inv.id} style={{ fontSize: 11, color: theme.textMuted, padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
                      {inv.email} <span style={{ fontSize: 9, color: theme.textDimmest }}>sent {new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Link Requests */}
              {linkRequests.filter(r => r.status === "pending").length > 0 && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, textTransform: "uppercase", marginBottom: 6 }}>Pending Link Requests</div>
                  {linkRequests.filter(r => r.status === "pending").map(req => (
                    <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
                      <span style={{ flex: 1, fontSize: 11, color: theme.text, fontFamily: fontBody }}>
                        <strong>{req.requester_name}</strong> wants to link to <strong>{req.scout_name}</strong>
                      </span>
                      <button onClick={() => approveLinkReq(req.id)} style={{ fontSize: 10, fontWeight: 600, color: theme.accent, background: theme.accentBg, border: `1px solid ${theme.borderAccent}`, padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody }}>Approve</button>
                      <button onClick={() => denyLinkReq(req.id)} style={{ fontSize: 10, fontWeight: 600, color: "#c08080", background: theme.name === "dark" ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody }}>Deny</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "troop" && (
            <>
              <label style={labelStyle}>Troop Name</label>
              <input value={troopName} onChange={e => setTroopName(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Description</label>
              <input value={troopDesc} onChange={e => setTroopDesc(e.target.value)} style={inputStyle} />
              <button onClick={saveTroop} disabled={saving} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", fontFamily: fontBody, marginTop: 4 }}>
                {saving ? "Saving..." : "Save Troop"}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmDeleteAdv && (
        <ConfirmModal title="Delete Adventure?" message={`This permanently deletes "${adventure?.name}" and all its data.`} confirmLabel="Delete Forever" onConfirm={deleteAdventure} onCancel={() => setConfirmDeleteAdv(false)} />
      )}
    </div>
  );
}
