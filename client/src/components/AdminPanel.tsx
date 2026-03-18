import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAdventure } from "../contexts/AdventureContext";
import { fontBody, fontDisplay, memberTypeBadge, participationBadge, toolbarBtn } from "../utils/theme";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import ConfirmModal from "./ConfirmModal";
import CouncilPicker from "./CouncilPicker";
import type { ThemeColors, Adventure, AdventureMember, Crew, AdventureType, Invitation, LinkRequest, Itinerary } from "../types";

interface Troop {
  id: number;
  name: string;
  council_id: number | null;
  location: string;
  description: string;
  is_public: number;
}

interface TroopMember {
  user_id: number;
  name: string;
  email?: string;
  role: string;
  status: string;
  user_type: string;
  participation?: string;
  requested_adventures?: string[];
}

interface MilestoneConfig {
  count: number;
  icon: string;
}

interface RemoveMemberState {
  userId: number | null;
  name: string;
  isManual: boolean;
  memberId?: number;
}

interface CrewFormState {
  name?: string;
  depart_date?: string;
  arrive_date?: string;
  return_date?: string;
  home_date?: string;
  itinerary_id?: string;
}

interface NewCrewState {
  name: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
}

interface NewAdvState {
  name: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
  adventure_type: string;
}

interface AdminPanelProps {
  troop: Troop;
  adventure: Adventure;
  troopMembers: TroopMember[];
  adventureMembers: AdventureMember[];
  currentUserId: number;
  onClose: () => void;
  onRefresh: () => void;
  onSelectAdventure: (adventureId: number) => void;
}

export default function AdminPanel({ troop, adventure, troopMembers, adventureMembers, currentUserId, onClose, onRefresh, onSelectAdventure }: AdminPanelProps) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const { selectedCrewId, crews, selectedCrew, refreshCrews, refreshAll: refreshAdventureAll } = useAdventure();
  const [tab, setTab] = useState<string>("adventure");
  const [troopName, setTroopName] = useState<string>(troop?.name || "");
  const [troopCouncilId, setTroopCouncilId] = useState<number | string | null>(troop?.council_id || null);
  const [troopCity, setTroopCity] = useState<string>(() => {
    const loc = troop?.location || "";
    const parts = loc.split(",").map(s => s.trim());
    return parts.length >= 2 ? parts.slice(0, -1).join(", ") : loc;
  });
  const [troopState, setTroopState] = useState<string>(() => {
    const loc = troop?.location || "";
    const parts = loc.split(",").map(s => s.trim());
    return parts.length >= 2 && (US_STATES as readonly string[]).includes(parts[parts.length - 1]) ? parts[parts.length - 1] : "";
  });
  const [troopDesc, setTroopDesc] = useState<string>(troop?.description || "");
  const [troopPublic, setTroopPublic] = useState<boolean>(troop?.is_public !== 0);
  const [advName, setAdvName] = useState<string>(adventure?.name || "");
  const [advDesc, setAdvDesc] = useState<string>((adventure as any)?.description || "");
  const [departDate, setDepartDate] = useState<string>(adventure?.depart_date || "");
  const [arriveDate, setArriveDate] = useState<string>(adventure?.arrive_date || (adventure as any)?.trek_date || "");
  const [returnDate, setReturnDate] = useState<string>(adventure?.return_date || "");
  const [homeDate, setHomeDate] = useState<string>(adventure?.home_date || "");
  const [advStatus, setAdvStatus] = useState<string>((adventure as any)?.status || "active");
  const [advType, setAdvType] = useState<string>(adventure?.adventure_type || "philmont");
  const [advItinerary, setAdvItinerary] = useState<string>(adventure?.itinerary_id || "");
  const [confirmItineraryChange, setConfirmItineraryChange] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sendingInvite, setSendingInvite] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>("");
  const [addingManual, setAddingManual] = useState<boolean>(false);
  const [confirmDeleteAdv, setConfirmDeleteAdv] = useState<boolean>(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<RemoveMemberState | null>(null);

  // Attendance milestones
  const [milestones, setMilestones] = useState<MilestoneConfig[]>([]);
  const [milestonesLoaded, setMilestonesLoaded] = useState<boolean>(false);

  // Crew management state
  const [editingCrew, setEditingCrew] = useState<number | null>(null);
  const [crewForm, setCrewForm] = useState<CrewFormState>({});
  const [savingCrew, setSavingCrew] = useState<boolean>(false);
  const [showCreateCrew, setShowCreateCrew] = useState<boolean>(false);
  const [newCrew, setNewCrew] = useState<NewCrewState>({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
  const [creatingCrew, setCreatingCrew] = useState<boolean>(false);
  const [confirmDeleteCrew, setConfirmDeleteCrew] = useState<number | null>(null);

  // New adventure creation
  const [showCreateAdv, setShowCreateAdv] = useState<boolean>(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [newAdv, setNewAdv] = useState<NewAdvState>({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
  const [creatingAdv, setCreatingAdv] = useState<boolean>(false);

  // Troop logo
  const [logoUrl, setLogoUrl] = useState<string | null>(troop?.id ? `/api/troops/${troop.id}/logo?t=${Date.now()}` : null);
  const [logoError, setLogoError] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { addToast("Use PNG, JPG, or WebP", "error"); return; }
    if (file.size > 500 * 1024) { addToast("Image too large (max 500KB)", "error"); return; }
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await api.uploadTroopLogo(troop.id, reader.result as string);
          setLogoUrl(`/api/troops/${troop.id}/logo?t=${Date.now()}`);
          setLogoError(false);
          addToast("Logo uploaded", "success");
        } catch (err: unknown) { addToast((err as Error).message, "error"); }
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) { addToast((err as Error).message, "error"); setUploadingLogo(false); }
  };

  const handleLogoDelete = async () => {
    setUploadingLogo(true);
    try {
      await api.deleteTroopLogo(troop.id);
      setLogoUrl(null);
      setLogoError(true);
      addToast("Logo removed", "success");
    } catch (err: unknown) { addToast((err as Error).message, "error"); }
    setUploadingLogo(false);
  };

  // Link requests
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);

  useEffect(() => {
    if (adventure?.id) {
      api.getInvitations(adventure.id).then(setInvitations).catch(() => {});
      api.getLinkRequests(adventure.id).then(setLinkRequests).catch(() => {});
    }
  }, [adventure?.id]);

  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

  const saveTroop = async () => {
    if (!troopName.trim()) { addToast("Troop name is required", "error"); return; }
    if (!troopCouncilId) { addToast("Council is required", "error"); return; }
    setSaving(true);
    try {
      const location = [troopCity.trim(), troopState].filter(Boolean).join(", ");
      const isCustomCouncil = typeof troopCouncilId === "string" && troopCouncilId.startsWith("custom:");
      const councilPayload = isCustomCouncil ? { council: (troopCouncilId as string).slice(7), council_id: null } : { council_id: troopCouncilId };
      await api.updateTroop(troop.id, { name: normalize(troopName), ...councilPayload, location: normalize(location), description: normalize(troopDesc), is_public: troopPublic });
      onRefresh(); addToast("Troop saved", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setSaving(false);
  };

  const typeConfig = ADVENTURE_TYPES.find((t: any) => t.id === advType) || ADVENTURE_TYPES[0];
  const dateLabels = typeConfig.dateLabels;

  const doSaveAdventure = async () => {
    setSaving(true);
    try {
      await api.updateAdventure(adventure.id, {
        name: normalize(advName), description: normalize(advDesc),
        depart_date: departDate || null, arrive_date: arriveDate || null,
        return_date: returnDate || null, home_date: homeDate || null,
        status: advStatus, adventure_type: advType, itinerary_id: advItinerary || null,
      });
      onRefresh(); addToast("Adventure saved", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setSaving(false);
  };

  const saveAdventure = async () => {
    // Validate date sequence: depart ≤ arrive ≤ return ≤ home
    const dates = [departDate, arriveDate, returnDate, homeDate].filter(Boolean);
    if (dates.length >= 2) {
      const labels = [dateLabels.depart, dateLabels.arrive, dateLabels.return, dateLabels.home];
      const vals = [departDate, arriveDate, returnDate, homeDate];
      for (let i = 0; i < vals.length - 1; i++) {
        if (vals[i] && vals[i + 1] && vals[i] > vals[i + 1]) {
          addToast(`${labels[i + 1]} cannot be before ${labels[i]}`, "error");
          return;
        }
      }
    }
    // Confirm if itinerary changed
    const origItinerary = adventure?.itinerary_id || "";
    if (advItinerary !== origItinerary) {
      setConfirmItineraryChange(true);
      return;
    }
    doSaveAdventure();
  };

  const deleteAdventure = async () => {
    try { await api.deleteAdventure(adventure.id); addToast("Adventure deleted", "success"); onClose(); onRefresh(); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
    setConfirmDeleteAdv(false);
  };

  const addMemberToAdventure = async (userId: number) => {
    try { await api.addCrewMember(selectedCrewId as number, userId, "member"); onRefresh(); addToast("Member added", "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const removeMemberFromAdventure = async (userId: number) => {
    try { await api.removeCrewMember(selectedCrewId as number, userId); setConfirmRemoveMember(null); onRefresh(); addToast("Member removed", "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const toggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try { await api.updateCrewMemberRole(selectedCrewId as number, userId, newRole); onRefresh(); addToast(`Role: ${newRole}`, "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const toggleParticipation = async (userId: number, current: string) => {
    const next = current === "trekking" ? "support" : "trekking";
    try { await api.updateCrewParticipation(selectedCrewId as number, userId, next); onRefresh(); addToast(`Set to ${next}`, "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const toggleUserType = async (userId: number, current: string) => {
    const next = current === "adult" ? "scout" : "adult";
    try { await api.updateMemberUserType(adventure.id, userId, next); onRefresh(); addToast(`Changed to ${next}`, "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleAddScoutLink = async (userId: number, currentScouts: number[], newScoutId: number) => {
    const updated = [...(currentScouts || []), newScoutId].slice(0, 3);
    try { await api.linkCrewMember(selectedCrewId as number, userId, updated); onRefresh(); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };
  const handleRemoveScoutLink = async (userId: number, currentScouts: number[], removeId: number) => {
    const updated = (currentScouts || []).filter(id => id !== removeId);
    try { await api.linkCrewMember(selectedCrewId as number, userId, updated); onRefresh(); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
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
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setSendingInvite(false);
  };

  const addManual = async () => {
    if (!manualName.trim()) { addToast("Scout name is required", "error"); return; }
    setAddingManual(true);
    try {
      await api.addCrewManualMember(selectedCrewId as number, manualName.trim());
      setManualName(""); onRefresh(); addToast("Manual member added", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setAddingManual(false);
  };

  const removeManual = async (memberId: number) => {
    try { await api.removeCrewManualMember(selectedCrewId as number, memberId); setConfirmRemoveMember(null); onRefresh(); addToast("Manual member removed", "success"); }
    catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const approveLinkReq = async (requestId: number) => {
    try {
      await api.approveLinkRequest(adventure.id, requestId);
      setLinkRequests(await api.getLinkRequests(adventure.id));
      onRefresh();
      addToast("Link approved", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const denyLinkReq = async (requestId: number) => {
    try {
      await api.denyLinkRequest(adventure.id, requestId);
      setLinkRequests(await api.getLinkRequests(adventure.id));
      addToast("Link denied", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  // Crew management functions
  const startEditCrew = (crew: Crew) => {
    setEditingCrew(crew.id);
    setCrewForm({ name: crew.name, depart_date: crew.depart_date || "", arrive_date: crew.arrive_date || "", return_date: crew.return_date || "", home_date: crew.home_date || "", itinerary_id: crew.itinerary_id || "" });
  };

  const saveCrew = async () => {
    if (!editingCrew) return;
    if (!crewForm.name?.trim()) { addToast("Crew name is required", "error"); return; }
    setSavingCrew(true);
    try {
      await api.updateCrew(editingCrew, crewForm);
      refreshCrews();
      refreshAdventureAll();
      setEditingCrew(null);
      addToast("Crew saved", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setSavingCrew(false);
  };

  const createNewCrew = async () => {
    if (!newCrew.name?.trim()) { addToast("Crew name is required", "error"); return; }
    setCreatingCrew(true);
    try {
      await api.createCrew(adventure.id, newCrew);
      setNewCrew({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
      setShowCreateCrew(false);
      refreshCrews();
      addToast("Crew created", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setCreatingCrew(false);
  };

  const deleteCrew = async (crewId: number) => {
    try {
      await api.deleteCrew(crewId);
      refreshCrews();
      refreshAdventureAll();
      setConfirmDeleteCrew(null);
      addToast("Crew deleted", "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); setConfirmDeleteCrew(null); }
  };

  useEffect(() => {
    api.getItineraries().then(setItineraries).catch(() => {});
  }, []);

  useEffect(() => {
    if (adventure?.id) {
      api.getMilestonesConfig(adventure.id).then((ms: MilestoneConfig[]) => { setMilestones(ms); setMilestonesLoaded(true); }).catch(() => {});
    }
  }, [adventure?.id]);

  const openCreateAdventure = () => {
    setShowCreateAdv(true);
  };

  const createNewAdventure = async () => {
    if (!newAdv.name.trim()) { addToast("Crew name is required", "error"); return; }
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
      setNewAdv({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
      setShowCreateAdv(false);
      onClose();
      if (onSelectAdventure) onSelectAdventure(adv.id);
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    setCreatingAdv(false);
  };

  const advMemberIds = new Set((adventureMembers || []).filter(m => !m.is_manual).map(m => m.user_id));
  const availableMembers = (troopMembers || []).filter(m => m.status === "approved" && !advMemberIds.has(m.user_id));
  const allScouts = (adventureMembers || []).filter(m => m.is_manual || m.user_type === "scout");

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none", marginBottom: 8, boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" };
  const tabs: [string, string][] = [["adventure", "Adventure"], ["crews", "Crews"], ["members", "Members"], ["troop", "Troop"]];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={onClose}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ background: theme.bgCard, borderRadius: 14, padding: 0, width: 420, maxHeight: "85vh", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column" }}>
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
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, background: tab === k ? theme.bgAlt : "transparent", color: tab === k ? theme.text : theme.textMuted, border: "none", borderBottom: tab === k ? `2px solid ${theme.accent}` : "2px solid transparent" }}>{l}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          {tab === "adventure" && (
            <>
              <label style={labelStyle}>Crew Name</label>
              <input value={advName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvName(e.target.value.slice(0, 30))} maxLength={30} style={inputStyle} />
              <label style={labelStyle}>Description</label>
              <input value={advDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvDesc(e.target.value)} style={inputStyle} placeholder="Optional description" />

              <label style={labelStyle}>Adventure Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {ADVENTURE_TYPES.map((at: any) => (
                  <button key={at.id} type="button" onClick={() => at.enabled && setAdvType(at.id)} style={{
                    padding: "8px 10px", borderRadius: 7, cursor: at.enabled ? "pointer" : "default",
                    border: advType === at.id ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                    background: advType === at.id ? theme.accentBg : (at.enabled ? theme.bgAlt : theme.bg),
                    opacity: at.enabled ? 1 : 0.45, textAlign: "left", fontFamily: fontBody,
                  }}>
                    <div style={{ fontSize: 16 }}>{at.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: advType === at.id ? theme.accent : theme.heading }}>{at.name}</div>
                    <div style={{ fontSize: 9, color: theme.textDim }}>{at.enabled ? at.location : "Coming Soon"}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={labelStyle}>{dateLabels.depart}</label><input value={departDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setDepartDate(v);
                  if (v && arriveDate && arriveDate < v) setArriveDate("");
                  if (v && returnDate && returnDate < v) setReturnDate("");
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" max={arriveDate || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>{dateLabels.arrive}</label><input value={arriveDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setArriveDate(v);
                  if (v && returnDate && returnDate < v) setReturnDate("");
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" min={departDate || undefined} max={returnDate || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>{dateLabels.return}</label><input value={returnDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setReturnDate(v);
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" min={arriveDate || departDate || undefined} max={homeDate || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><label style={labelStyle}>{dateLabels.home}</label><input value={homeDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeDate(e.target.value)} type="date" min={returnDate || arriveDate || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
              </div>

              <label style={labelStyle}>Itinerary</label>
              <select value={advItinerary} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvItinerary(e.target.value)} style={{ ...inputStyle, color: advItinerary ? theme.text : theme.textDim }}>
                <option value="">Select itinerary...</option>
                {[12, 9, 7].map(days => {
                  const group = itineraries.filter(it => it.days === days).sort((a, b) => {
                    const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                    return na - nb;
                  });
                  return group.length > 0 ? (
                    <optgroup key={days} label={`${days}-Day Treks`}>
                      {group.map(it => <option key={it.id} value={it.id}>{it.name} — {it.miles} mi, {it.rating}</option>)}
                    </optgroup>
                  ) : null;
                })}
              </select>

              <label style={labelStyle}>Status</label>
              <select value={advStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvStatus(e.target.value)} style={{ ...inputStyle, color: theme.text }}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>

              {/* Training Milestones */}
              {milestonesLoaded && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgAlt }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 6 }}>Attendance Milestones</div>
                  <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 8 }}>Badges awarded when members reach these attendance counts.</div>
                  {milestones.map((ms, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <input type="number" min={1} max={100} value={ms.count} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = [...milestones];
                        next[i] = { ...next[i], count: parseInt(e.target.value) || 1 };
                        setMilestones(next);
                      }} style={{ width: 50, padding: "4px 6px", borderRadius: 4, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.text, fontSize: 12, textAlign: "center" as const, fontFamily: fontBody }} />
                      <input type="text" maxLength={2} value={ms.icon} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = [...milestones];
                        next[i] = { ...next[i], icon: e.target.value };
                        setMilestones(next);
                      }} style={{ width: 36, padding: "4px 6px", borderRadius: 4, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.text, fontSize: 14, textAlign: "center" as const }} />
                      <span style={{ fontSize: 10, color: theme.textDim, flex: 1 }}>{ms.count === 1 ? "Attended 1 Training" : `Attended ${ms.count} Trainings`}</span>
                      {milestones.length > 1 && (
                        <button onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDimmest, fontSize: 14, padding: "0 4px" }}>✕</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {milestones.length < 10 && (
                      <button onClick={() => setMilestones([...milestones, { count: (milestones[milestones.length - 1]?.count || 0) + 2, icon: "⭐" }])} style={{
                        padding: "3px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                      }}>+ Add</button>
                    )}
                    <button onClick={async () => {
                      try {
                        const result = await api.updateMilestonesConfig(adventure.id, milestones) as { milestones: MilestoneConfig[] };
                        setMilestones(result.milestones);
                        addToast("Milestones updated", "success");
                      } catch (e: unknown) { addToast((e as Error).message, "error"); }
                    }} style={{
                      padding: "3px 10px", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                    }}>Save Milestones</button>
                  </div>
                </div>
              )}

              <button onClick={saveAdventure} disabled={saving} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", fontFamily: fontBody, marginTop: 4 }}>
                {saving ? "Saving..." : "Save Adventure"}
              </button>

              {/* Create New Adventure */}
              <div style={{ marginTop: 20, padding: 12, borderRadius: 8, border: `1.5px solid ${theme.borderAccent}`, background: theme.name === "dark" ? "#1e2418" : "#f4f9ee" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: "uppercase" as const, marginBottom: 8 }}>New Adventure</div>
                {!showCreateAdv ? (
                  <button onClick={openCreateAdventure} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: `1.5px dashed ${theme.borderAccent}`, background: "transparent", color: theme.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>+ Create Another Adventure</button>
                ) : (() => {
                  const newTypeConfig = ADVENTURE_TYPES.find((t: any) => t.id === newAdv.adventure_type) || ADVENTURE_TYPES[0];
                  const newDateLabels = newTypeConfig.dateLabels;
                  return (
                  <>
                    <label style={labelStyle}>Adventure Type</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      {ADVENTURE_TYPES.map((at: any) => (
                        <button key={at.id} type="button" onClick={() => at.enabled && setNewAdv({ ...newAdv, adventure_type: at.id })} style={{
                          padding: "6px 8px", borderRadius: 6, cursor: at.enabled ? "pointer" : "default",
                          border: newAdv.adventure_type === at.id ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                          background: newAdv.adventure_type === at.id ? theme.accentBg : (at.enabled ? theme.bgAlt : theme.bg),
                          opacity: at.enabled ? 1 : 0.45, textAlign: "left" as const, fontFamily: fontBody,
                        }}>
                          <div style={{ fontSize: 14 }}>{at.icon}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: newAdv.adventure_type === at.id ? theme.accent : theme.heading }}>{at.name}</div>
                          <div style={{ fontSize: 8, color: theme.textDim }}>{at.enabled ? at.location : "Coming Soon"}</div>
                        </button>
                      ))}
                    </div>
                    <label style={labelStyle}>Crew Name</label>
                    <input value={newAdv.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdv({ ...newAdv, name: e.target.value.slice(0, 30) })} placeholder="e.g. Crew 614" maxLength={30} style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div><label style={labelStyle}>{newDateLabels.depart}</label><input value={newAdv.depart_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, depart_date: v };
                        if (v && u.arrive_date && u.arrive_date < v) u.arrive_date = "";
                        if (v && u.return_date && u.return_date < v) u.return_date = "";
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" max={newAdv.arrive_date || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{newDateLabels.arrive}</label><input value={newAdv.arrive_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, arrive_date: v };
                        if (v && u.return_date && u.return_date < v) u.return_date = "";
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" min={newAdv.depart_date || undefined} max={newAdv.return_date || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{newDateLabels.return}</label><input value={newAdv.return_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, return_date: v };
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" min={newAdv.arrive_date || newAdv.depart_date || undefined} max={newAdv.home_date || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{newDateLabels.home}</label><input value={newAdv.home_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdv({ ...newAdv, home_date: e.target.value })} type="date" min={newAdv.return_date || newAdv.arrive_date || undefined} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                    </div>
                    <label style={labelStyle}>Itinerary</label>
                    <select value={newAdv.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAdv({ ...newAdv, itinerary_id: e.target.value })} style={{ ...inputStyle, color: newAdv.itinerary_id ? theme.text : theme.textDim }}>
                      <option value="">Select itinerary...</option>
                      {[12, 9, 7].map(days => {
                        const group = itineraries.filter(it => it.days === days).sort((a, b) => {
                          const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                          return na - nb;
                        });
                        return group.length > 0 ? (
                          <optgroup key={days} label={`${days}-Day Treks`}>
                            {group.map(it => <option key={it.id} value={it.id}>{it.name} ({it.miles} mi, {it.rating})</option>)}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setShowCreateAdv(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                      <button onClick={createNewAdventure} disabled={creatingAdv} style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: creatingAdv ? "wait" : "pointer", fontFamily: fontBody }}>{creatingAdv ? "Creating..." : "Create Adventure"}</button>
                    </div>
                  </>
                  );
                })()}
              </div>

              <div style={{ marginTop: 20, padding: 12, borderRadius: 8, border: `1.5px solid ${theme.danger}40`, background: theme.name === "dark" ? "#2a1a1a" : "#fdf0f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.danger, textTransform: "uppercase" as const, marginBottom: 8 }}>Danger Zone</div>
                <button onClick={() => setConfirmDeleteAdv(true)} style={{ ...toolbarBtn(theme, "danger"), width: "100%", padding: "8px 0" }}>Delete Adventure</button>
              </div>
            </>
          )}

          {tab === "crews" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 8 }}>Crews ({crews.length})</div>
              {crews.map((crew: Crew) => (
                <div key={crew.id} style={{ padding: "10px 12px", background: crew.id === selectedCrewId ? theme.accentBg : theme.bgAlt, borderRadius: 8, marginBottom: 6, border: `1.5px solid ${crew.id === selectedCrewId ? theme.borderAccent : theme.border}` }}>
                  {editingCrew === crew.id ? (
                    <>
                      <label style={labelStyle}>Crew Name</label>
                      <input value={crewForm.name || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, name: e.target.value.slice(0, 30) })} maxLength={30} style={inputStyle} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                        <div><label style={labelStyle}>{dateLabels.depart}</label><input value={crewForm.depart_date || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                        <div><label style={labelStyle}>{dateLabels.arrive}</label><input value={crewForm.arrive_date || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                        <div><label style={labelStyle}>{dateLabels.return}</label><input value={crewForm.return_date || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                        <div><label style={labelStyle}>{dateLabels.home}</label><input value={crewForm.home_date || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      </div>
                      <label style={labelStyle}>Itinerary</label>
                      <select value={crewForm.itinerary_id || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCrewForm({ ...crewForm, itinerary_id: e.target.value })} style={{ ...inputStyle, color: crewForm.itinerary_id ? theme.text : theme.textDim }}>
                        <option value="">Select itinerary...</option>
                        {[12, 9, 7].map(days => {
                          const group = itineraries.filter(it => it.days === days).sort((a, b) => {
                            const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                            return na - nb;
                          });
                          return group.length > 0 ? (
                            <optgroup key={days} label={`${days}-Day Treks`}>
                              {group.map(it => <option key={it.id} value={it.id}>{it.name} — {it.miles} mi, {it.rating}</option>)}
                            </optgroup>
                          ) : null;
                        })}
                      </select>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditingCrew(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                        <button onClick={saveCrew} disabled={savingCrew} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: savingCrew ? "wait" : "pointer", fontFamily: fontBody }}>{savingCrew ? "Saving..." : "Save"}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>{crew.name}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => startEditCrew(crew)} style={{ fontSize: 9, color: theme.accent, background: "none", border: `1px solid ${theme.borderAccent}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                          {crews.length > 1 && (
                            <button onClick={() => setConfirmDeleteCrew(crew.id)} style={{ fontSize: 9, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Delete</button>
                          )}
                        </div>
                      </div>
                      {crew.itinerary_id && <div style={{ fontSize: 10, color: theme.textDim }}>Itinerary: {crew.itinerary_id}</div>}
                      {crew.depart_date && crew.home_date && (
                        <div style={{ fontSize: 10, color: theme.textDim }}>
                          {new Date(crew.depart_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(crew.home_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Create new crew */}
              <div style={{ marginTop: 10, padding: 12, borderRadius: 8, border: `1.5px solid ${theme.borderAccent}`, background: theme.name === "dark" ? "#1e2418" : "#f4f9ee" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: "uppercase" as const, marginBottom: 8 }}>Add Crew</div>
                {!showCreateCrew ? (
                  <button onClick={() => setShowCreateCrew(true)} style={{ width: "100%", padding: "10px 0", borderRadius: 7, border: `1.5px dashed ${theme.borderAccent}`, background: "transparent", color: theme.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>+ Add Sister Crew</button>
                ) : (
                  <>
                    <label style={labelStyle}>Crew Name</label>
                    <input value={newCrew.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, name: e.target.value.slice(0, 30) })} maxLength={30} style={inputStyle} placeholder="e.g. Crew 614-B" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                      <div><label style={labelStyle}>{dateLabels.depart}</label><input value={newCrew.depart_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{dateLabels.arrive}</label><input value={newCrew.arrive_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{dateLabels.return}</label><input value={newCrew.return_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                      <div><label style={labelStyle}>{dateLabels.home}</label><input value={newCrew.home_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                    </div>
                    <label style={labelStyle}>Itinerary</label>
                    <select value={newCrew.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCrew({ ...newCrew, itinerary_id: e.target.value })} style={{ ...inputStyle, color: newCrew.itinerary_id ? theme.text : theme.textDim }}>
                      <option value="">Select itinerary...</option>
                      {[12, 9, 7].map(days => {
                        const group = itineraries.filter(it => it.days === days).sort((a, b) => {
                          const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                          return na - nb;
                        });
                        return group.length > 0 ? (
                          <optgroup key={days} label={`${days}-Day Treks`}>
                            {group.map(it => <option key={it.id} value={it.id}>{it.name} — {it.miles} mi, {it.rating}</option>)}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setShowCreateCrew(false)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
                      <button onClick={createNewCrew} disabled={creatingCrew} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: creatingCrew ? "wait" : "pointer", fontFamily: fontBody }}>{creatingCrew ? "Creating..." : "Create Crew"}</button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {tab === "members" && (
            <>
              {/* Pending Troop Join Requests */}
              {(troopMembers || []).filter(m => m.status === "pending").length > 0 && (
                <div style={{ marginBottom: 14, padding: "10px 12px", background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, textTransform: "uppercase" as const, marginBottom: 6 }}>Pending Join Requests</div>
                  {(troopMembers || []).filter(m => m.status === "pending").map(m => (
                    <div key={m.user_id} style={{ padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: fontBody }}>{m.name}</span>
                        <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
                        {m.participation === "support" && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: "#6c757d", background: "#6c757d20", padding: "1px 5px", borderRadius: 3 }}>SUPPORT</span>
                        )}
                        <button onClick={async () => { try { await api.approveMember(troop.id, m.user_id); onRefresh(); addToast(`${m.name} approved`, "success"); } catch (e: unknown) { addToast((e as Error).message, "error"); } }} style={{ fontSize: 10, fontWeight: 600, color: theme.accent, background: theme.accentBg, border: `1px solid ${theme.borderAccent}`, padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody }}>Approve</button>
                        <button onClick={async () => { try { await api.denyMember(troop.id, m.user_id); onRefresh(); addToast(`${m.name} denied`, "success"); } catch (e: unknown) { addToast((e as Error).message, "error"); } }} style={{ fontSize: 10, fontWeight: 600, color: "#c08080", background: theme.name === "dark" ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody }}>Deny</button>
                      </div>
                      {m.requested_adventures && m.requested_adventures.length > 0 && (
                        <div style={{ fontSize: 9, color: theme.textDim, marginTop: 2, paddingLeft: 2 }}>
                          Requested {m.requested_adventures.length} adventure{m.requested_adventures.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 8 }}>Adventure Members</div>
              {(adventureMembers || []).map(m => {
                const key = m.is_manual ? `manual-${m.id}` : `user-${m.user_id}`;
                return (
                  <div key={key} style={{ padding: "8px 10px", background: theme.bgAlt, borderRadius: 7, marginBottom: 4, border: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{m.name}</span>
                        {m.is_manual ? (
                          <>
                            <span style={memberTypeBadge(theme, "scout")}>SCOUT</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: theme.textDim, background: theme.bgAlt, padding: "1px 4px", borderRadius: 3, border: `1px solid ${theme.borderLight}` }}>manual</span>
                          </>
                        ) : (
                          <>
                            <span style={memberTypeBadge(theme, m.user_type)}>{(m.user_type || "?").toUpperCase()}</span>
                            <span style={participationBadge(theme, m.participation)}>{m.participation}</span>
                          </>
                        )}
                        {m.role === "admin" && <span style={{ fontSize: 8, fontWeight: 700, color: theme.accent, background: theme.accentBg, padding: "1px 4px", borderRadius: 3 }}>ADMIN</span>}
                      </div>
                      {m.is_manual ? (
                        <button onClick={() => setConfirmRemoveMember({ userId: null, name: m.name, isManual: true, memberId: m.id })} style={{ fontSize: 10, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
                      ) : m.user_id !== currentUserId && m.role !== "admin" ? (
                        <button onClick={() => setConfirmRemoveMember({ userId: m.user_id, name: m.name, isManual: false })} style={{ fontSize: 10, color: theme.danger, background: "none", border: `1px solid ${theme.danger}40`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
                      ) : null}
                    </div>
                    {!m.is_manual && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, alignItems: "center" }}>
                        {m.email && <span style={{ fontSize: 10, color: theme.textDimmest }}>{m.email}</span>}
                        <button onClick={() => toggleRole(m.user_id!, m.role)} style={{ fontSize: 10, color: theme.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.role === "admin" ? "Demote" : "Make Admin"}</button>
                        <button onClick={() => toggleUserType(m.user_id!, m.user_type || "")} style={{ fontSize: 10, color: m.user_type === "adult" ? "#5080b0" : "#508050", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.user_type === "adult" ? "Change to Scout" : "Change to Adult"}</button>
                        <button onClick={() => toggleParticipation(m.user_id!, m.participation)} style={{ fontSize: 10, color: "#8a6d3b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: fontBody }}>{m.participation === "trekking" ? "Set Support" : "Set Trekking"}</button>
                        {m.user_type === "adult" && (() => {
                          const scouts = m.linked_scouts || [];
                          const linkedScoutIds = new Set(scouts);
                          const availScouts = allScouts.filter(s => {
                            const sid = s.is_manual ? -s.id : s.user_id;
                            return !linkedScoutIds.has(sid!);
                          });
                          return (
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, alignItems: "center" }}>
                              {scouts.map(sid => {
                                const linked = sid > 0 ? (adventureMembers || []).find(x => x.user_id === sid) : (adventureMembers || []).find(x => x.id === Math.abs(sid));
                                if (!linked) return null;
                                return (
                                  <span key={sid} style={{ fontSize: 9, color: theme.accent, background: theme.accentBg, padding: "1px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3, border: `1px solid ${theme.borderAccent}` }}>
                                    {linked.name}
                                    <span onClick={() => handleRemoveScoutLink(m.user_id!, scouts, sid)} style={{ cursor: "pointer", fontWeight: 700, fontSize: 10, color: theme.danger, lineHeight: 1 }}>×</span>
                                  </span>
                                );
                              })}
                              {scouts.length < 3 && availScouts.length > 0 && (
                                <select value="" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const v = parseInt(e.target.value); if (v) handleAddScoutLink(m.user_id!, scouts, v); }} style={{ fontSize: 9, padding: "1px 4px", background: theme.bgInput, border: `1px solid ${theme.borderLight}`, borderRadius: 3, color: theme.text, fontFamily: fontBody }}>
                                  <option value="">{scouts.length === 0 ? "Link to scout..." : "+ Add scout"}</option>
                                  {availScouts.map(s => <option key={s.is_manual ? `m${s.id}` : s.user_id} value={s.is_manual ? -s.id : s.user_id!}>{s.name}</option>)}
                                </select>
                              )}
                            </div>
                          );
                        })()}
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
                  <input value={manualName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualName(e.target.value)} placeholder="Scout name" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addManual()} />
                  <button onClick={addManual} disabled={addingManual} style={{ ...toolbarBtn(theme, "primary"), padding: "8px 14px" }}>{addingManual ? "..." : "Add"}</button>
                </div>
              </div>

              {/* Invite by Email */}
              <div style={{ marginTop: 10, padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginBottom: 6 }}>Invite by Email</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={inviteEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendInvite()} />
                  <button onClick={sendInvite} disabled={sendingInvite} style={{ ...toolbarBtn(theme, "primary"), padding: "8px 14px" }}>{sendingInvite ? "..." : "Send"}</button>
                </div>
              </div>

              {invitations.filter(i => i.status === "pending").length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" as const, marginBottom: 6 }}>Pending Invitations</div>
                  {invitations.filter(i => i.status === "pending").map(inv => (
                    <div key={inv.id} style={{ fontSize: 11, color: theme.textMuted, padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
                      {inv.email} <span style={{ fontSize: 10, color: theme.textDimmest }}>sent {new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Link Requests */}
              {linkRequests.filter(r => r.status === "pending").length > 0 && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: theme.name === "dark" ? "#2a2820" : "#faf5e8", border: `1px solid ${theme.gold}40`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.gold, textTransform: "uppercase" as const, marginBottom: 6 }}>Pending Link Requests</div>
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
              <input value={troopName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTroopName(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Council</label>
              <CouncilPicker value={troopCouncilId} onChange={(id: number | string | null) => setTroopCouncilId(id)} />
              <label style={labelStyle}>Location</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={troopCity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTroopCity(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} placeholder="City" />
                <select value={troopState} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTroopState(e.target.value)} style={{ ...inputStyle, width: 70, marginBottom: 0, cursor: "pointer" }}>
                  <option value="">State</option>
                  {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label style={labelStyle}>Description</label>
              <input value={troopDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTroopDesc(e.target.value)} style={inputStyle} />

              <label style={labelStyle}>Troop Logo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Troop logo"
                    style={{ width: 80, height: 80, borderRadius: 8, objectFit: "contain" as const, background: theme.bgAlt, border: `1px solid ${theme.border}` }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: 8, background: theme.accent + "30",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 800, color: theme.accent, border: `1px dashed ${theme.border}`,
                  }}>
                    {troop?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  <label style={{
                    padding: "5px 12px", borderRadius: 6, border: `1px solid ${theme.borderAccent}`,
                    background: theme.accentBg, color: theme.accentLight, fontSize: 11, fontWeight: 600,
                    cursor: uploadingLogo ? "wait" : "pointer", fontFamily: fontBody, textAlign: "center" as const,
                  }}>
                    {uploadingLogo ? "..." : "Upload"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload}
                      style={{ display: "none" }} disabled={uploadingLogo} />
                  </label>
                  {logoUrl && !logoError && (
                    <button onClick={handleLogoDelete} disabled={uploadingLogo} style={{
                      padding: "3px 8px", borderRadius: 4, border: "none", background: "transparent",
                      color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody,
                    }}>Remove</button>
                  )}
                </div>
                <span style={{ fontSize: 11, color: theme.textDim }}>PNG, JPG, or WebP · Max 500KB</span>
              </div>

              <label style={labelStyle}>Visibility</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <button type="button" onClick={() => setTroopPublic(!troopPublic)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: fontBody,
                  background: troopPublic ? theme.accent : theme.textDimmer, color: "#fff",
                }}>{troopPublic ? "Public" : "Private"}</button>
                <span style={{ fontSize: 11, color: theme.textDim }}>
                  {troopPublic ? "Searchable by parents and scouts" : "Invite-only — members must be invited by email"}
                </span>
              </div>

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
      {confirmItineraryChange && (
        <ConfirmModal title="Change Itinerary?" message="Changing the itinerary will update the trek plan for all crew members. Everyone will be notified by email." confirmLabel="Change Itinerary" onConfirm={() => { setConfirmItineraryChange(false); doSaveAdventure(); }} onCancel={() => { setConfirmItineraryChange(false); setAdvItinerary(adventure?.itinerary_id || ""); }} />
      )}
      {confirmRemoveMember && (
        <ConfirmModal title="Remove Member?" message={`Remove ${confirmRemoveMember.name} from this adventure? They will lose all their gear selections and calendar dates.`} confirmLabel="Remove" onConfirm={() => confirmRemoveMember.isManual ? removeManual(confirmRemoveMember.memberId!) : removeMemberFromAdventure(confirmRemoveMember.userId!)} onCancel={() => setConfirmRemoveMember(null)} />
      )}
      {confirmDeleteCrew && (
        <ConfirmModal title="Delete Crew?" message="This permanently deletes this crew and all its member data. Members will need to be re-added to another crew." confirmLabel="Delete Crew" onConfirm={() => deleteCrew(confirmDeleteCrew)} onCancel={() => setConfirmDeleteCrew(null)} />
      )}
    </div>
  );
}
