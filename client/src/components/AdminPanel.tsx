import { useState, useEffect } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAdventure } from "../contexts/AdventureContext";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import ConfirmModal from "./ConfirmModal";
import CouncilPicker from "./CouncilPicker";
import type { Adventure, AdventureMember, Crew, Invitation, LinkRequest, Itinerary } from "../types";

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
  const { mode } = useTheme();
  const { addToast } = useToast();
  const { selectedCrewId, crews, selectedCrew, refreshCrews, refreshAll: refreshAdventureAll } = useAdventure();
  const [tab, setTab] = useState<string>("adventure");
  const [troopName] = useState<string>(troop?.name || "");
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
  const [inviteCodeVal, setInviteCodeVal] = useState<string>("");
  const [inviteCodeLoaded, setInviteCodeLoaded] = useState<boolean>(false);
  const [regeneratingCode, setRegeneratingCode] = useState<boolean>(false);
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
  const [newCrew, setNewCrew] = useState<NewCrewState>({ name: "", itinerary_id: "" });
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

  useEffect(() => {
    if (troop?.id && !inviteCodeLoaded) {
      api.getTroopInviteCode(troop.id).then(r => { setInviteCodeVal(r.invite_code || ""); setInviteCodeLoaded(true); }).catch(() => setInviteCodeLoaded(true));
    }
  }, [troop?.id, inviteCodeLoaded]);

  const handleRegenerateCode = async () => {
    if (!troop?.id) return;
    setRegeneratingCode(true);
    try {
      const r = await api.regenerateInviteCode(troop.id);
      setInviteCodeVal(r.invite_code);
      addToast("Invite code regenerated", "success");
    } catch { addToast("Failed to regenerate code", "error"); }
    finally { setRegeneratingCode(false); }
  };

  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

  const saveTroop = async () => {
    if (!troopCouncilId) { addToast("Council is required", "error"); return; }
    setSaving(true);
    try {
      const location = [troopCity.trim(), troopState].filter(Boolean).join(", ");
      const isCustomCouncil = typeof troopCouncilId === "string" && troopCouncilId.startsWith("custom:");
      const councilPayload = isCustomCouncil ? { council: (troopCouncilId as string).slice(7), council_id: null } : { council_id: troopCouncilId };
      await api.updateTroop(troop.id, { ...councilPayload, location: normalize(location), description: normalize(troopDesc), is_public: troopPublic });
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
    try {
      await api.removeCrewMember(selectedCrewId as number, userId);
      // Also remove from troop so they don't see the troop on their dashboard
      await api.removeMember(troop.id, userId);
      setConfirmRemoveMember(null); onRefresh(); addToast("Member removed", "success");
    }
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
      // Auto-prefix: ensure crew name starts with "Crew " for consistency
      // e.g. user types "614-B" → becomes "Crew 614-B"
      let crewName = newCrew.name.trim();
      if (!crewName.toLowerCase().startsWith("crew")) {
        crewName = "Crew " + crewName;
      }
      await api.createCrew(adventure.id, { ...newCrew, name: crewName });
      setNewCrew({ name: "", itinerary_id: "" });
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

  const isDark = mode === "dark";
  const tabs: [string, string][] = [["adventure", "Adventure"], ["crews", "Crews"], ["members", "Members"], ["troop", "Troop"]];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[999]" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="bg-tl-card rounded-[14px] p-0 w-[420px] max-h-[85vh] overflow-hidden border border-tl-border flex flex-col" style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div className="px-[18px] pt-4 pb-3 border-b border-tl-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <div className="font-display text-[16px] font-bold text-tl-heading">Admin Panel</div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-[18px] text-tl-text-dimmer cursor-pointer leading-none">&times;</button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-tl-border">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx(
              "flex-1 py-[9px] text-[11px] font-semibold cursor-pointer font-body border-none",
              tab === k ? "bg-tl-bg-alt text-tl-text border-b-2 border-b-tl-accent" : "bg-transparent text-tl-text-muted border-b-2 border-b-transparent"
            )}>{l}</button>
          ))}
        </div>

        {/* Content */}
        <div className="px-[18px] py-4 overflow-y-auto flex-1">
          {tab === "adventure" && (
            <>
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Crew Name</label>
              <input value={advName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvName(e.target.value.slice(0, 30))} maxLength={30} className="tl-input mb-2" />
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Description</label>
              <input value={advDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvDesc(e.target.value)} className="tl-input mb-2" placeholder="Optional description" />

              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Adventure Type</label>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {ADVENTURE_TYPES.map((at: any) => (
                  <button key={at.id} type="button" onClick={() => at.enabled && setAdvType(at.id)} className={clsx(
                    "p-[8px_10px] rounded-[7px] text-left font-body",
                    advType === at.id ? "border-2 border-tl-accent bg-tl-accent-bg" : "border-[1.5px] border-tl-border-light",
                    !at.enabled && "opacity-45 cursor-default",
                    at.enabled && advType !== at.id && "bg-tl-bg-alt",
                    !at.enabled && "bg-tl-bg",
                    at.enabled && "cursor-pointer"
                  )}>
                    <div className="text-[16px]">{at.icon}</div>
                    <div className={clsx("text-[11px] font-bold", advType === at.id ? "text-tl-accent" : "text-tl-heading")}>{at.name}</div>
                    <div className="text-[9px] text-tl-text-dim">{at.enabled ? at.location : "Coming Soon"}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{dateLabels.depart}</label><input value={departDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setDepartDate(v);
                  if (v && arriveDate && arriveDate < v) setArriveDate("");
                  if (v && returnDate && returnDate < v) setReturnDate("");
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" max={arriveDate || undefined} className="tl-input !mb-0" /></div>
                <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{dateLabels.arrive}</label><input value={arriveDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setArriveDate(v);
                  if (v && returnDate && returnDate < v) setReturnDate("");
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" min={departDate || undefined} max={returnDate || undefined} className="tl-input !mb-0" /></div>
                <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{dateLabels.return}</label><input value={returnDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setReturnDate(v);
                  if (v && homeDate && homeDate < v) setHomeDate("");
                }} type="date" min={arriveDate || departDate || undefined} max={homeDate || undefined} className="tl-input !mb-0" /></div>
                <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{dateLabels.home}</label><input value={homeDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeDate(e.target.value)} type="date" min={returnDate || arriveDate || undefined} className="tl-input !mb-0" /></div>
              </div>

              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Itinerary</label>
              <select value={advItinerary} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvItinerary(e.target.value)} className={clsx("tl-input mb-2", advItinerary ? "text-tl-text" : "text-tl-text-dim")}>
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

              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Status</label>
              <select value={advStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvStatus(e.target.value)} className="tl-input mb-2 text-tl-text">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>

              {/* Training Milestones */}
              {milestonesLoaded && (
                <div className="mt-3 p-3 rounded-[8px] border border-tl-border bg-tl-bg-alt">
                  <div className="text-[11px] font-bold text-tl-heading mb-1.5">Attendance Milestones</div>
                  <div className="text-[10px] text-tl-text-dim mb-2">Badges awarded when members reach these attendance counts.</div>
                  {milestones.map((ms, i) => (
                    <div key={i} className="flex gap-1.5 items-center mb-1">
                      <input type="number" min={1} max={100} value={ms.count} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = [...milestones];
                        next[i] = { ...next[i], count: parseInt(e.target.value) || 1 };
                        setMilestones(next);
                      }} className="w-[50px] px-1.5 py-1 rounded-[4px] border border-tl-border bg-tl-card text-tl-text text-[12px] text-center font-body outline-none" />
                      <input type="text" maxLength={2} value={ms.icon} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = [...milestones];
                        next[i] = { ...next[i], icon: e.target.value };
                        setMilestones(next);
                      }} className="w-[36px] px-1.5 py-1 rounded-[4px] border border-tl-border bg-tl-card text-tl-text text-[14px] text-center outline-none" />
                      <span className="text-[10px] text-tl-text-dim flex-1">{ms.count === 1 ? "Attended 1 Training" : `Attended ${ms.count} Trainings`}</span>
                      {milestones.length > 1 && (
                        <button onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="bg-transparent border-none cursor-pointer text-tl-text-dimmest text-[14px] px-1 py-0">✕</button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5 mt-1.5">
                    {milestones.length < 10 && (
                      <button onClick={() => setMilestones([...milestones, { count: (milestones[milestones.length - 1]?.count || 0) + 2, icon: "⭐" }])} className="px-2.5 py-[3px] rounded-[6px] border border-tl-border bg-transparent text-tl-text-dim text-[10px] font-semibold cursor-pointer font-body">+ Add</button>
                    )}
                    <button onClick={async () => {
                      try {
                        const result = await api.updateMilestonesConfig(adventure.id, milestones) as { milestones: MilestoneConfig[] };
                        setMilestones(result.milestones);
                        addToast("Milestones updated", "success");
                      } catch (e: unknown) { addToast((e as Error).message, "error"); }
                    }} className="px-2.5 py-[3px] rounded-[6px] border-none bg-tl-accent text-white text-[10px] font-semibold cursor-pointer font-body">Save Milestones</button>
                  </div>
                </div>
              )}

              <button onClick={saveAdventure} disabled={saving} className={clsx("w-full py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[12px] font-semibold font-body mt-1", saving ? "cursor-wait" : "cursor-pointer")}>
                {saving ? "Saving..." : "Save Adventure"}
              </button>

              {/* Create New Adventure */}
              <div className="mt-5 p-3 rounded-[8px] border-[1.5px] border-tl-border-accent" style={{ background: isDark ? "#1e2418" : "#f4f9ee" }}>
                <div className="text-[10px] font-bold text-tl-accent uppercase mb-2">New Adventure</div>
                {!showCreateAdv ? (
                  <button onClick={openCreateAdventure} className="w-full py-2.5 rounded-[7px] border-[1.5px] border-dashed border-tl-border-accent bg-transparent text-tl-accent text-[12px] font-semibold cursor-pointer font-body">+ Create Another Adventure</button>
                ) : (() => {
                  const newTypeConfig = ADVENTURE_TYPES.find((t: any) => t.id === newAdv.adventure_type) || ADVENTURE_TYPES[0];
                  const newDateLabels = newTypeConfig.dateLabels;
                  return (
                  <>
                    <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Adventure Type</label>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {ADVENTURE_TYPES.map((at: any) => (
                        <button key={at.id} type="button" onClick={() => at.enabled && setNewAdv({ ...newAdv, adventure_type: at.id })} className={clsx(
                          "p-[6px_8px] rounded-[6px] text-left font-body",
                          newAdv.adventure_type === at.id ? "border-2 border-tl-accent bg-tl-accent-bg" : "border-[1.5px] border-tl-border-light",
                          !at.enabled && "opacity-45 cursor-default",
                          at.enabled && newAdv.adventure_type !== at.id && "bg-tl-bg-alt",
                          !at.enabled && "bg-tl-bg",
                          at.enabled && "cursor-pointer"
                        )}>
                          <div className="text-[14px]">{at.icon}</div>
                          <div className={clsx("text-[10px] font-bold", newAdv.adventure_type === at.id ? "text-tl-accent" : "text-tl-heading")}>{at.name}</div>
                          <div className="text-[8px] text-tl-text-dim">{at.enabled ? at.location : "Coming Soon"}</div>
                        </button>
                      ))}
                    </div>
                    <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Crew Name</label>
                    <input value={newAdv.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdv({ ...newAdv, name: e.target.value.slice(0, 30) })} placeholder="e.g. Crew 614" maxLength={30} className="tl-input mb-2" />
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{newDateLabels.depart}</label><input value={newAdv.depart_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, depart_date: v };
                        if (v && u.arrive_date && u.arrive_date < v) u.arrive_date = "";
                        if (v && u.return_date && u.return_date < v) u.return_date = "";
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" max={newAdv.arrive_date || undefined} className="tl-input !mb-0" /></div>
                      <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{newDateLabels.arrive}</label><input value={newAdv.arrive_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, arrive_date: v };
                        if (v && u.return_date && u.return_date < v) u.return_date = "";
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" min={newAdv.depart_date || undefined} max={newAdv.return_date || undefined} className="tl-input !mb-0" /></div>
                      <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{newDateLabels.return}</label><input value={newAdv.return_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        const u = { ...newAdv, return_date: v };
                        if (v && u.home_date && u.home_date < v) u.home_date = "";
                        setNewAdv(u);
                      }} type="date" min={newAdv.arrive_date || newAdv.depart_date || undefined} max={newAdv.home_date || undefined} className="tl-input !mb-0" /></div>
                      <div><label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">{newDateLabels.home}</label><input value={newAdv.home_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdv({ ...newAdv, home_date: e.target.value })} type="date" min={newAdv.return_date || newAdv.arrive_date || undefined} className="tl-input !mb-0" /></div>
                    </div>
                    <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Itinerary</label>
                    <select value={newAdv.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAdv({ ...newAdv, itinerary_id: e.target.value })} className={clsx("tl-input mb-2", newAdv.itinerary_id ? "text-tl-text" : "text-tl-text-dim")}>
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
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowCreateAdv(false)} className="flex-1 py-2.5 rounded-[7px] border border-tl-border-light bg-tl-bg-alt text-tl-text text-[12px] font-semibold cursor-pointer font-body">Cancel</button>
                      <button onClick={createNewAdventure} disabled={creatingAdv} className={clsx("flex-1 py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[12px] font-semibold font-body", creatingAdv ? "cursor-wait" : "cursor-pointer")}>{creatingAdv ? "Creating..." : "Create Adventure"}</button>
                    </div>
                  </>
                  );
                })()}
              </div>

              <div className="mt-5 p-3 rounded-[8px]" style={{ border: "1.5px solid #c0604040", background: isDark ? "#2a1a1a" : "#fdf0f0" }}>
                <div className="text-[10px] font-bold text-tl-danger uppercase mb-2">Danger Zone</div>
                <button onClick={() => setConfirmDeleteAdv(true)} className="tl-btn-danger w-full py-2">Delete Adventure</button>
              </div>
            </>
          )}

          {tab === "crews" && (
            <>
              <div className="text-[11px] font-bold text-tl-heading mb-2">Crews ({crews.length})</div>
              {crews.map((crew: Crew) => (
                <div key={crew.id} className={clsx(
                  "p-[10px_12px] rounded-[8px] mb-1.5 border-[1.5px]",
                  crew.id === selectedCrewId ? "bg-tl-accent-bg border-tl-border-accent" : "bg-tl-bg-alt border-tl-border"
                )}>
                  {editingCrew === crew.id ? (
                    <>
                      <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Crew Name</label>
                      <input value={crewForm.name || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrewForm({ ...crewForm, name: e.target.value.slice(0, 30) })} maxLength={30} className="tl-input mb-2" />
                      <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Itinerary</label>
                      <select value={crewForm.itinerary_id || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCrewForm({ ...crewForm, itinerary_id: e.target.value })} className={clsx("tl-input mb-2", crewForm.itinerary_id ? "text-tl-text" : "text-tl-text-dim")}>
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
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditingCrew(null)} className="flex-1 py-2 rounded-[6px] border border-tl-border-light bg-tl-bg-alt text-tl-text text-[11px] font-semibold cursor-pointer font-body">Cancel</button>
                        <button onClick={saveCrew} disabled={savingCrew} className={clsx("flex-1 py-2 rounded-[6px] border-none bg-tl-accent text-white text-[11px] font-semibold font-body", savingCrew ? "cursor-wait" : "cursor-pointer")}>{savingCrew ? "Saving..." : "Save"}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[13px] font-bold text-tl-heading font-display">{crew.name}</div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditCrew(crew)} className="text-[9px] text-tl-accent bg-transparent border border-tl-border-accent px-2 py-[2px] rounded-[4px] cursor-pointer font-body">Edit</button>
                          {crews.length > 1 && (
                            <button onClick={() => setConfirmDeleteCrew(crew.id)} className="text-[9px] text-tl-danger bg-transparent px-2 py-[2px] rounded-[4px] cursor-pointer font-body" style={{ border: "1px solid #c0604040" }}>Delete</button>
                          )}
                        </div>
                      </div>
                      {crew.itinerary_id && <div className="text-[10px] text-tl-text-dim">Itinerary: {crew.itinerary_id}</div>}
                      {crew.depart_date && crew.home_date && (
                        <div className="text-[10px] text-tl-text-dim">
                          {new Date(crew.depart_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(crew.home_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Create new crew */}
              <div className="mt-2.5 p-3 rounded-[8px] border-[1.5px] border-tl-border-accent" style={{ background: isDark ? "#1e2418" : "#f4f9ee" }}>
                <div className="text-[10px] font-bold text-tl-accent uppercase mb-2">Add Crew</div>
                {!showCreateCrew ? (
                  <button onClick={() => setShowCreateCrew(true)} className="w-full py-2.5 rounded-[7px] border-[1.5px] border-dashed border-tl-border-accent bg-transparent text-tl-accent text-[12px] font-semibold cursor-pointer font-body">+ Add Sister Crew</button>
                ) : (
                  <>
                    <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Crew Name</label>
                    <input value={newCrew.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCrew({ ...newCrew, name: e.target.value.slice(0, 30) })} maxLength={30} className="tl-input mb-2" placeholder={crews.length > 0 ? `e.g. ${crews[0].name?.replace(/-[A-Za-z]+$/, "") || "Crew"}-B` : "e.g. Crew 614-B"} />
                    <div className="text-[10px] text-tl-text-dim mb-2 p-2 rounded-[6px] bg-tl-bg-alt border border-tl-border">
                      Dates are shared across all crews in this adventure. To change dates, edit the adventure settings above. Sister crews can have different itineraries.
                    </div>
                    <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Itinerary</label>
                    <select value={newCrew.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCrew({ ...newCrew, itinerary_id: e.target.value })} className={clsx("tl-input mb-2", newCrew.itinerary_id ? "text-tl-text" : "text-tl-text-dim")}>
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
                    <div className="flex gap-1.5">
                      <button onClick={() => setShowCreateCrew(false)} className="flex-1 py-2 rounded-[6px] border border-tl-border-light bg-tl-bg-alt text-tl-text text-[11px] font-semibold cursor-pointer font-body">Cancel</button>
                      <button onClick={createNewCrew} disabled={creatingCrew} className={clsx("flex-1 py-2 rounded-[6px] border-none bg-tl-accent text-white text-[11px] font-semibold font-body", creatingCrew ? "cursor-wait" : "cursor-pointer")}>{creatingCrew ? "Creating..." : "Create Crew"}</button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {tab === "members" && (
            <>
              {/* Invite Code */}
              <div className="mb-3.5 p-[10px_12px] rounded-[8px] bg-tl-bg-alt border border-tl-border">
                <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Invite Code</label>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="tl-input !mb-0 flex-1 font-mono tracking-widest text-center text-sm font-bold">
                    {inviteCodeVal || "—"}
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (inviteCodeVal) { navigator.clipboard.writeText(inviteCodeVal); addToast("Copied!", "success"); } }}
                    disabled={!inviteCodeVal}
                    className="px-2.5 py-[5px] rounded-[6px] border border-tl-border-light bg-tl-bg-alt text-tl-text text-[11px] font-semibold cursor-pointer font-body"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={regeneratingCode}
                    className="px-2.5 py-[5px] rounded-[6px] border border-tl-border-light bg-tl-bg-alt text-tl-text-dim text-[11px] font-body cursor-pointer"
                  >
                    {regeneratingCode ? "..." : "New Code"}
                  </button>
                </div>
                <div className="text-[10px] text-tl-text-dim">
                  Share this code with members so they can join your unit instantly.
                </div>
              </div>

              {/* Pending Troop Join Requests */}
              {(troopMembers || []).filter(m => m.status === "pending").length > 0 && (
                <div className="mb-3.5 p-[10px_12px] rounded-[8px]" style={{ background: isDark ? "#2a2820" : "#faf5e8", border: `1px solid ${isDark ? "#E8A84C40" : "#C4A03540"}` }}>
                  <div className="text-[10px] font-bold text-tl-gold uppercase mb-1.5">Pending Join Requests</div>
                  {(troopMembers || []).filter(m => m.status === "pending").map(m => (
                    <div key={m.user_id} className="py-1.5 border-b border-tl-border">
                      <div className="flex items-center gap-1.5">
                        <span className="flex-1 text-[12px] font-semibold text-tl-text font-body">{m.name}</span>
                        <span className={m.user_type === "adult" ? "tl-member-badge-adult" : "tl-member-badge-scout"}>{(m.user_type || "?").toUpperCase()}</span>
                        {m.participation === "support" && (
                          <span className="text-[8px] font-bold rounded-[3px] px-[5px] py-[1px]" style={{ color: "#6c757d", background: "#6c757d20" }}>SUPPORT</span>
                        )}
                        <button onClick={async () => { try { await api.approveMember(troop.id, m.user_id); onRefresh(); addToast(`${m.name} approved`, "success"); } catch (e: unknown) { addToast((e as Error).message, "error"); } }} className="text-[10px] font-semibold text-tl-accent bg-tl-accent-bg border border-tl-border-accent px-2.5 py-[3px] rounded-[6px] cursor-pointer font-body">Approve</button>
                        <button onClick={async () => { try { await api.denyMember(troop.id, m.user_id); onRefresh(); addToast(`${m.name} denied`, "success"); } catch (e: unknown) { addToast((e as Error).message, "error"); } }} className="text-[10px] font-semibold px-2.5 py-[3px] rounded-[6px] cursor-pointer font-body" style={{ color: "#c08080", background: isDark ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030" }}>Deny</button>
                      </div>
                      {m.requested_adventures && m.requested_adventures.length > 0 && (
                        <div className="text-[9px] text-tl-text-dim mt-0.5 pl-0.5">
                          Requested {m.requested_adventures.length} adventure{m.requested_adventures.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[11px] font-bold text-tl-heading mb-2">Adventure Members</div>
              {(adventureMembers || []).map(m => {
                const key = m.is_manual ? `manual-${m.id}` : `user-${m.user_id}`;
                return (
                  <div key={key} className="p-[8px_10px] bg-tl-bg-alt rounded-[7px] mb-1 border border-tl-border">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[12px] font-semibold text-tl-text">{m.name}</span>
                        {m.is_manual ? (
                          <>
                            <span className="tl-member-badge-scout">SCOUT</span>
                            <span className="text-[9px] font-semibold text-tl-text-dim bg-tl-bg-alt px-1 py-[1px] rounded-[3px] border border-tl-border-light">manual</span>
                          </>
                        ) : (
                          <>
                            <span className={m.user_type === "adult" ? "tl-member-badge-adult" : "tl-member-badge-scout"}>{(m.user_type || "?").toUpperCase()}</span>
                            <span className={clsx(
                              "inline-block px-1.5 py-[2px] rounded-[6px] text-[9px] font-semibold ml-1",
                              m.participation === "support" ? "bg-[#8a6d3b] text-white border-none" : "bg-transparent text-tl-text-muted border border-tl-border-light"
                            )}>{m.participation}</span>
                          </>
                        )}
                        {m.role === "admin" && <span className="text-[8px] font-bold text-tl-accent bg-tl-accent-bg px-1 py-[1px] rounded-[3px]">ADMIN</span>}
                      </div>
                      {m.is_manual ? (
                        <button onClick={() => setConfirmRemoveMember({ userId: null, name: m.name, isManual: true, memberId: m.id })} className="text-[10px] text-tl-danger bg-transparent px-2 py-[2px] rounded-[4px] cursor-pointer font-body" style={{ border: "1px solid #c0604040" }}>Remove</button>
                      ) : m.user_id !== currentUserId && m.role !== "admin" ? (
                        <button onClick={() => setConfirmRemoveMember({ userId: m.user_id, name: m.name, isManual: false })} className="text-[10px] text-tl-danger bg-transparent px-2 py-[2px] rounded-[4px] cursor-pointer font-body" style={{ border: "1px solid #c0604040" }}>Remove</button>
                      ) : null}
                    </div>
                    {!m.is_manual && (
                      <div className="flex gap-1 flex-wrap items-center">
                        {m.email && <span className="text-[10px] text-tl-text-dimmest">{m.email}</span>}
                        <button onClick={() => toggleRole(m.user_id!, m.role)} className="text-[10px] text-tl-accent bg-transparent border-none cursor-pointer underline font-body">{m.role === "admin" ? "Demote" : "Make Admin"}</button>
                        <button onClick={() => toggleUserType(m.user_id!, m.user_type || "")} className="text-[10px] bg-transparent border-none cursor-pointer underline font-body" style={{ color: m.user_type === "adult" ? "#5080b0" : "#508050" }}>{m.user_type === "adult" ? "Change to Scout" : "Change to Adult"}</button>
                        <button onClick={() => toggleParticipation(m.user_id!, m.participation)} className="text-[10px] bg-transparent border-none cursor-pointer underline font-body" style={{ color: "#8a6d3b" }}>{m.participation === "trekking" ? "Set Support" : "Set Trekking"}</button>
                        {m.user_type === "adult" && (() => {
                          const scouts = m.linked_scouts || [];
                          const linkedScoutIds = new Set(scouts);
                          const availScouts = allScouts.filter(s => {
                            const sid = s.is_manual ? -s.id : s.user_id;
                            return !linkedScoutIds.has(sid!);
                          });
                          return (
                            <div className="flex gap-[3px] flex-wrap items-center">
                              {scouts.map(sid => {
                                const linked = sid > 0 ? (adventureMembers || []).find(x => x.user_id === sid) : (adventureMembers || []).find(x => x.id === Math.abs(sid));
                                if (!linked) return null;
                                return (
                                  <span key={sid} className="text-[9px] text-tl-accent bg-tl-accent-bg px-1.5 py-[1px] rounded-[4px] inline-flex items-center gap-[3px] border border-tl-border-accent">
                                    {linked.name}
                                    <span onClick={() => handleRemoveScoutLink(m.user_id!, scouts, sid)} className="cursor-pointer font-bold text-[10px] text-tl-danger leading-none">×</span>
                                  </span>
                                );
                              })}
                              {scouts.length < 3 && availScouts.length > 0 && (
                                <select value="" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const v = parseInt(e.target.value); if (v) handleAddScoutLink(m.user_id!, scouts, v); }} className="text-[9px] px-1 py-[1px] bg-tl-input border border-tl-border-light rounded-[3px] text-tl-text font-body">
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
                  <div className="text-[11px] font-bold text-tl-heading mt-3.5 mb-2">Add from Troop</div>
                  {availableMembers.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between p-[8px_10px] bg-tl-bg-alt rounded-[7px] mb-1 border border-tl-border">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-tl-text">{m.name}</span>
                        <span className={m.user_type === "adult" ? "tl-member-badge-adult" : "tl-member-badge-scout"}>{(m.user_type || "?").toUpperCase()}</span>
                      </div>
                      <button onClick={() => addMemberToAdventure(m.user_id)} className="text-[10px] text-tl-accent bg-transparent border border-tl-border-accent px-2 py-[2px] rounded-[4px] cursor-pointer font-body">Add</button>
                    </div>
                  ))}
                </>
              )}

              {/* Add Manual Member */}
              <div className="mt-3.5 p-[10px_12px] bg-tl-bg-alt rounded-[8px] border border-tl-border">
                <div className="text-[11px] font-bold text-tl-heading mb-1">Add Manual Member</div>
                <div className="text-[10px] text-tl-text-dim mb-1.5">For scouts without email accounts</div>
                <div className="flex gap-1.5">
                  <input value={manualName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualName(e.target.value)} placeholder="Scout name" className="tl-input flex-1 !mb-0" onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addManual()} />
                  <button onClick={addManual} disabled={addingManual} className="tl-btn-primary px-3.5 py-2">{addingManual ? "..." : "Add"}</button>
                </div>
              </div>

              {/* Invite by Email */}
              <div className="mt-2.5 p-[10px_12px] bg-tl-bg-alt rounded-[8px] border border-tl-border">
                <div className="text-[11px] font-bold text-tl-heading mb-1.5">Invite by Email</div>
                <div className="flex gap-1.5">
                  <input value={inviteEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)} placeholder="email@example.com" type="email" className="tl-input flex-1 !mb-0" onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendInvite()} />
                  <button onClick={sendInvite} disabled={sendingInvite} className="tl-btn-primary px-3.5 py-2">{sendingInvite ? "..." : "Send"}</button>
                </div>
              </div>

              {invitations.filter(i => i.status === "pending").length > 0 && (
                <div className="mt-2.5">
                  <div className="text-[10px] font-bold text-tl-text-dim uppercase mb-1.5">Pending Invitations</div>
                  {invitations.filter(i => i.status === "pending").map(inv => (
                    <div key={inv.id} className="text-[11px] text-tl-text-muted py-1 border-b border-tl-border">
                      {inv.email} <span className="text-[10px] text-tl-text-dimmest">sent {new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Link Requests */}
              {linkRequests.filter(r => r.status === "pending").length > 0 && (
                <div className="mt-2.5 p-[10px_12px] rounded-[8px]" style={{ background: isDark ? "#2a2820" : "#faf5e8", border: `1px solid ${isDark ? "#E8A84C40" : "#C4A03540"}` }}>
                  <div className="text-[10px] font-bold text-tl-gold uppercase mb-1.5">Pending Link Requests</div>
                  {linkRequests.filter(r => r.status === "pending").map(req => (
                    <div key={req.id} className="flex items-center gap-1.5 py-1.5 border-b border-tl-border">
                      <span className="flex-1 text-[11px] text-tl-text font-body">
                        <strong>{req.requester_name}</strong> wants to link to <strong>{req.scout_name}</strong>
                      </span>
                      <button onClick={() => approveLinkReq(req.id)} className="text-[10px] font-semibold text-tl-accent bg-tl-accent-bg border border-tl-border-accent px-2.5 py-[3px] rounded-[6px] cursor-pointer font-body">Approve</button>
                      <button onClick={() => denyLinkReq(req.id)} className="text-[10px] font-semibold px-2.5 py-[3px] rounded-[6px] cursor-pointer font-body" style={{ color: "#c08080", background: isDark ? "#3a2020" : "#fde8e8", border: "1px solid #5a3030" }}>Deny</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "troop" && (
            <>
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Unit Name</label>
              <div className="tl-input mb-2 opacity-60 cursor-default">{troopName}</div>
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Council</label>
              <CouncilPicker value={troopCouncilId} onChange={(id: number | string | null) => setTroopCouncilId(id)} />
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Location</label>
              <div className="flex gap-1.5 mb-1.5">
                <input value={troopCity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTroopCity(e.target.value)} className="tl-input flex-1 !mb-0" placeholder="City" />
                <select value={troopState} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTroopState(e.target.value)} className="tl-input !w-[70px] !mb-0 cursor-pointer">
                  <option value="">State</option>
                  {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Description</label>
              <input value={troopDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTroopDesc(e.target.value)} className="tl-input mb-2" />

              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Troop Logo</label>
              <div className="flex items-center gap-3 mb-2.5">
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Troop logo"
                    className="w-[80px] h-[80px] rounded-[8px] object-contain bg-tl-bg-alt border border-tl-border"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-[80px] h-[80px] rounded-[8px] flex items-center justify-center text-[24px] font-extrabold text-tl-accent border border-dashed border-tl-border" style={{ background: isDark ? "#8BA86830" : "#5B7A3A30" }}>
                    {troop?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className={clsx(
                    "px-3 py-[5px] rounded-[6px] border border-tl-border-accent bg-tl-accent-bg text-tl-accent-light text-[11px] font-semibold font-body text-center",
                    uploadingLogo ? "cursor-wait" : "cursor-pointer"
                  )}>
                    {uploadingLogo ? "..." : "Upload"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload}
                      className="hidden" disabled={uploadingLogo} />
                  </label>
                  {logoUrl && !logoError && (
                    <button onClick={handleLogoDelete} disabled={uploadingLogo} className="px-2 py-[3px] rounded-[4px] border-none bg-transparent text-tl-text-dim text-[11px] cursor-pointer font-body">Remove</button>
                  )}
                </div>
                <span className="text-[11px] text-tl-text-dim">PNG, JPG, or WebP · Max 500KB</span>
              </div>

              <label className="block text-[10px] font-bold text-tl-text-dim uppercase mb-1">Visibility</label>
              <div className="flex items-center gap-2.5 mb-2">
                <button type="button" onClick={() => setTroopPublic(!troopPublic)} className={clsx(
                  "px-3.5 py-[5px] rounded-[6px] border-none text-[11px] font-semibold cursor-pointer font-body text-white",
                  troopPublic ? "bg-tl-accent" : "bg-tl-text-dimmer"
                )}>{troopPublic ? "Public" : "Private"}</button>
                <span className="text-[11px] text-tl-text-dim">
                  {troopPublic ? "Searchable by parents and scouts" : "Invite-only — members must be invited by email"}
                </span>
              </div>

              <button onClick={saveTroop} disabled={saving} className={clsx("w-full py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-[12px] font-semibold font-body mt-1", saving ? "cursor-wait" : "cursor-pointer")}>
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
