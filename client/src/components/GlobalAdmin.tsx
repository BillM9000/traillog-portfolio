import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import CouncilPicker from "./CouncilPicker";
import clsx from "clsx";
import type { ThemeColors, GearCatalogItem, ProductOption, GearOverride, TroopCustomGear, User, Itinerary } from "../types";

// ── Local interfaces ──

interface GlobalAdminProps {
  isGlobalAdmin: boolean;
  troopId: number | null;
  onClose: () => void;
  onEnterTroop?: (troopId: number, troop: AdminTroop) => void;
  onLogout?: () => void;
  user?: User | null;
  alwaysOpen?: boolean;
}

interface AdminTroop {
  id: number;
  name: string;
  council?: string;
  location?: string;
  member_count: number;
  pending_count: number;
  adventure_count: number;
  is_public: boolean;
}

interface AdminTroopMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar_url?: string;
  user_type: string;
  role: string;
  status: string;
}

interface AffiliateStats {
  totalClicks: number;
  clicksByProduct?: { product_name?: string; gear_name?: string; clicks: number }[];
  clicksByDay?: { date: string; clicks: number }[];
}

interface AdminSetting {
  key: string;
  value: string;
}

interface GearRefreshStatus {
  last_refresh?: string;
  in_progress?: boolean;
}

interface SystemAdmin {
  id: number;
  name?: string;
  email: string;
  is_admin: number;
}

interface ExtendedCatalogItem extends GearCatalogItem {
  priority?: string;
  weight_oz?: number;
  msrp?: number;
  options?: (ProductOption & { product_name?: string; brand?: string; price?: number; weight_oz?: number; tier?: string; star_rating?: number; notes?: string; affiliate_url?: string })[];
  subcategory?: string;
}

interface ItemFormData {
  id?: number;
  name: string;
  category: string;
  subcategory?: string;
  priority?: string;
  weight_oz?: number | string | null;
  msrp?: number | string | null;
  description?: string;
  sharing_type?: string;
  is_crew_shared?: number;
}

interface OptionFormData {
  id?: number;
  product_name?: string;
  brand?: string;
  price?: number | string | null;
  weight_oz?: number | string | null;
  tier?: string;
  star_rating?: number | string | null;
  notes?: string;
  affiliate_url?: string;
}

interface EditOptionState {
  gearId: number;
  option: OptionFormData;
}

interface NewTroopForm {
  name: string;
  council_id: number | string | null;
  city: string;
  state: string;
  description: string;
  is_public: boolean;
}

interface AdvForm {
  name: string;
  adventure_type: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
  [key: string]: string;
}

// ── Sub-component props ──

interface CatalogTabProps {
  catalog: ExtendedCatalogItem[];
  grouped: Record<string, ExtendedCatalogItem[]>;
  search: string;
  setSearch: (s: string) => void;
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
  refreshCatalog: () => void;
  setEditItem: (item: ItemFormData | null) => void;
  setEditOption: (opt: EditOptionState | null) => void;
}

interface TroopsTabProps {
  troops: AdminTroop[];
  loaded: boolean;
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
  onRefresh: () => void;
  onEnterTroop?: (troopId: number, troop: AdminTroop) => void;
}

interface AffiliateTabProps {
  stats: AffiliateStats | null;
  theme: ThemeColors;
}

interface StatCardProps {
  label: string;
  value: number;
  theme: ThemeColors;
}

interface SettingsTabProps {
  settings: AdminSetting[];
  loaded: boolean;
  setSettings: React.Dispatch<React.SetStateAction<AdminSetting[]>>;
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
  allUsers: User[];
}

interface GearRefreshSectionProps {
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
}

interface SystemAdminsSectionProps {
  allUsers: User[];
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
}

interface TroopOverridesTabProps {
  grouped: Record<string, ExtendedCatalogItem[]>;
  search: string;
  setSearch: (s: string) => void;
  hiddenIds: Set<number>;
  troopId: number | null;
  troopCustomGear: TroopCustomGear[];
  theme: ThemeColors;
  addToast: (msg: string, type: string) => void;
  refreshTroopData: () => void;
  setEditCustomItem: (item: ItemFormData | null) => void;
}

interface ItemEditModalProps {
  item: ItemFormData;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (data: ItemFormData) => Promise<void>;
  simple?: boolean;
}

interface OptionEditModalProps {
  option: OptionFormData;
  gearId: number;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (data: OptionFormData) => Promise<void>;
}

interface LabeledInputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  theme: ThemeColors;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}

interface ToggleProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

interface SectionLabelProps {
  children: React.ReactNode;
}

// ── Main Component ──

export default function GlobalAdmin({ isGlobalAdmin, troopId, onClose, onEnterTroop, onLogout, user, alwaysOpen }: GlobalAdminProps): React.ReactElement {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState<string>(isGlobalAdmin ? (alwaysOpen ? "troops" : "catalog") : "troop");
  const [catalog, setCatalog] = useState<ExtendedCatalogItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [editItem, setEditItem] = useState<ItemFormData | null>(null);
  const [editOption, setEditOption] = useState<EditOptionState | null>(null);

  // Troop-level state
  const [troopOverrides, setTroopOverrides] = useState<GearOverride[]>([]);
  const [troopCustomGear, setTroopCustomGear] = useState<TroopCustomGear[]>([]);
  const [editCustomItem, setEditCustomItem] = useState<ItemFormData | null>(null);

  // Global admin state
  const [troops, setTroops] = useState<AdminTroop[]>([]);
  const [troopsLoaded, setTroopsLoaded] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);

  const refreshCatalog = useCallback(async (): Promise<void> => {
    try {
      const data = await api.getGearCatalog();
      setCatalog(data as ExtendedCatalogItem[]);
    } catch (e: unknown) { console.error(e); }
  }, []);

  const refreshTroopData = useCallback(async (): Promise<void> => {
    if (!troopId) return;
    try {
      const [overrides, custom] = await Promise.all([
        api.getTroopGearOverrides(troopId),
        api.getTroopCustomGear(troopId),
      ]);
      setTroopOverrides(overrides as GearOverride[]);
      setTroopCustomGear(custom as TroopCustomGear[]);
    } catch (e: unknown) { console.error(e); }
  }, [troopId]);

  useEffect(() => {
    refreshCatalog();
    if (troopId) refreshTroopData();
  }, [refreshCatalog, refreshTroopData, troopId]);

  // Load global admin data on tab switch
  useEffect(() => {
    if (!isGlobalAdmin) return;
    if (tab === "troops" && !troopsLoaded) {
      api.getAdminTroops().then((d: any) => { setTroops(d); setTroopsLoaded(true); }).catch(console.error);
    }
    if ((tab === "users" || tab === "settings") && users.length === 0) {
      api.getAdminUsers().then((d: any) => setUsers(d)).catch(console.error);
    }
    if (tab === "settings" && !settingsLoaded) {
      api.getAdminSettings().then((d: any) => { setSettings(d); setSettingsLoaded(true); }).catch(console.error);
    }
    if (tab === "affiliate" && !affiliateStats) {
      api.getAffiliateStats().then((d: any) => setAffiliateStats(d)).catch(console.error);
    }
  }, [tab, isGlobalAdmin, troopsLoaded, users.length, settingsLoaded, affiliateStats]);

  const filteredCatalog = catalog.filter((item: ExtendedCatalogItem) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || item.category.toLowerCase().includes(s);
  });

  const grouped: Record<string, ExtendedCatalogItem[]> = {};
  for (const item of filteredCatalog) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const hiddenIds = new Set(troopOverrides.filter((o: GearOverride) => o.hidden).map((o: GearOverride) => o.gear_catalog_id));

  const tabs: [string, string][] = [];
  if (isGlobalAdmin) {
    tabs.push(["catalog", "Gear Catalog"], ["troops", "Troop Overview"], ["affiliate", "Affiliate"], ["settings", "Settings"]);
  }
  if (troopId) tabs.push(["troop", "Troop Overrides"]);

  return (
    <div className={clsx(
      alwaysOpen ? "min-h-screen bg-tl-bg font-body" : "fixed inset-0 z-[1000] overflow-y-auto bg-black/50"
    )}>
      <div className={clsx(
        "max-w-[700px] bg-tl-card border border-tl-border",
        alwaysOpen ? "mx-auto min-h-screen" : "mx-auto my-5 rounded-2xl shadow-lg"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tl-border-light">
          <h2 className="text-lg font-extrabold text-tl-heading font-display m-0">
            {isGlobalAdmin ? "\uD83C\uDF10 Platform Admin" : "\u2699\uFE0F Gear Admin"}
          </h2>
          <div className="flex items-center gap-2">
            {alwaysOpen && user && (
              <>
                {user.avatar_url && <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
                <span className="text-[11px] text-tl-text-dim font-body">{user.name}</span>
              </>
            )}
            {alwaysOpen && onClose && (
              <button onClick={onClose} className="text-[11px] text-tl-accent font-body font-semibold px-2.5 py-1 rounded-[5px] cursor-pointer bg-transparent" style={{ border: `1px solid ${theme.accent}40` }}>Lobby</button>
            )}
            {alwaysOpen && onLogout ? (
              <button onClick={onLogout} className="text-[11px] text-tl-warn font-body font-semibold px-2.5 py-1 rounded-[5px] cursor-pointer bg-transparent border border-tl-warn-bg">Sign Out</button>
            ) : (
              <button onClick={onClose} className="tl-btn px-3 py-1.5">{"\u2715"}</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2.5 border-b border-tl-border-light overflow-x-auto">
          {tabs.map(([k, l]: [string, string]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx(
              "px-3.5 py-1.5 rounded-lg border-none text-xs font-semibold cursor-pointer font-body whitespace-nowrap",
              tab === k ? "bg-tl-pill-active-bg text-tl-pill-active-text" : "bg-tl-pill-inactive-bg text-tl-pill-inactive-text"
            )}>{l}</button>
          ))}
        </div>

        <div className={clsx("p-5", !alwaysOpen && "max-h-[70vh] overflow-y-auto")}>
          {/* ── Gear Catalog Tab ── */}
          {tab === "catalog" && isGlobalAdmin && (
            <CatalogTab
              catalog={catalog} grouped={grouped} search={search} setSearch={setSearch}
              theme={theme} addToast={addToast} refreshCatalog={refreshCatalog}
              setEditItem={setEditItem} setEditOption={setEditOption}
            />
          )}

          {/* ── Troop Overview Tab ── */}
          {tab === "troops" && isGlobalAdmin && (
            <TroopsTab troops={troops} loaded={troopsLoaded} theme={theme} addToast={addToast}
              onRefresh={() => api.getAdminTroops().then((d: any) => { setTroops(d); setTroopsLoaded(true); })}
              onEnterTroop={onEnterTroop} />
          )}

          {/* ── Affiliate Analytics Tab ── */}
          {tab === "affiliate" && isGlobalAdmin && (
            <AffiliateTab stats={affiliateStats} theme={theme} />
          )}

          {/* ── Platform Settings Tab ── */}
          {tab === "settings" && isGlobalAdmin && (
            <SettingsTab settings={settings} loaded={settingsLoaded} setSettings={setSettings} theme={theme} addToast={addToast} allUsers={users} />
          )}

          {/* ── Troop Overrides Tab ── */}
          {tab === "troop" && (
            <TroopOverridesTab
              grouped={grouped} search={search} setSearch={setSearch}
              hiddenIds={hiddenIds} troopId={troopId} troopCustomGear={troopCustomGear}
              theme={theme} addToast={addToast}
              refreshTroopData={refreshTroopData} setEditCustomItem={setEditCustomItem}
            />
          )}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editItem && (
        <ItemEditModal item={editItem} theme={theme} onClose={() => setEditItem(null)}
          onSave={async (data: ItemFormData) => {
            if (data.id) {
              await api.updateGearCatalogItem(data.id, data as any); addToast("Updated", "success");
            } else {
              await api.createGearCatalogItem(data as any); addToast("Created", "success");
            }
            setEditItem(null); refreshCatalog();
          }} />
      )}

      {/* Edit Product Option Modal */}
      {editOption && (
        <OptionEditModal option={editOption.option} gearId={editOption.gearId} theme={theme}
          onClose={() => setEditOption(null)}
          onSave={async (data: OptionFormData) => {
            if (data.id) {
              await api.updateProductOption(data.id, data as any); addToast("Option updated", "success");
            } else {
              await api.addProductOption(editOption.gearId, data as any); addToast("Option added", "success");
            }
            setEditOption(null); refreshCatalog();
          }} />
      )}

      {/* Edit Custom Item Modal */}
      {editCustomItem && (
        <ItemEditModal item={editCustomItem} theme={theme} onClose={() => setEditCustomItem(null)}
          onSave={async (data: ItemFormData) => {
            await api.addTroopCustomGear(troopId!, data as any); addToast("Added", "success");
            setEditCustomItem(null); refreshTroopData();
          }} simple />
      )}
    </div>
  );
}

// ─── Gear Catalog Tab ───
function CatalogTab({ catalog, grouped, search, setSearch, theme, addToast, refreshCatalog, setEditItem, setEditOption }: CatalogTabProps): React.ReactElement {
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
          className="tl-input flex-1 text-[11px]" />
        <button onClick={() => setEditItem({ name: "", category: "Pack & Carry", priority: "recommended", weight_oz: "", msrp: "", description: "" })}
          className="tl-btn-primary px-3 py-1.5 text-[11px]">+ Add Item</button>
      </div>

      <div className="text-[10px] text-tl-text-dimmer mb-2">{catalog.length} items in catalog</div>

      {Object.entries(grouped).map(([cat, items]: [string, ExtendedCatalogItem[]]) => (
        <div key={cat}>
          <div className="text-[11px] font-bold text-tl-heading mt-2.5 mb-1 font-display">{cat}</div>
          {items.map((item: ExtendedCatalogItem) => (
            <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 bg-tl-bg-alt border border-tl-border-light">
              <span className="flex-1 text-[11px] text-tl-text font-semibold">{item.name}</span>
              <span className="text-[9px] text-tl-text-dimmer">{item.priority}</span>
              <span className="text-[9px] text-tl-text-dimmer">{item.options?.length || 0} opts</span>
              <button onClick={() => setEditOption({ gearId: item.id, option: { product_name: "", brand: "", price: "", weight_oz: "", tier: "mid", notes: "", affiliate_url: "" } })}
                className="px-2 py-0.5 rounded text-[9px] text-tl-accent cursor-pointer font-body bg-transparent border border-tl-border-light">+ Opt</button>
              <button onClick={() => setEditItem(item as any)} className="px-2 py-0.5 rounded text-[9px] text-tl-text-dim cursor-pointer font-body bg-transparent border border-tl-border-light">Edit</button>
              <button onClick={async () => {
                if (!confirm(`Archive "${item.name}"?`)) return;
                await api.deleteGearCatalogItem(item.id);
                addToast("Archived", "success"); refreshCatalog();
              }} className="px-2 py-0.5 rounded text-[9px] cursor-pointer font-body bg-transparent border border-red-600/25 text-red-600">Archive</button>
            </div>
          ))}
          {/* Show existing product options under each item */}
          {items.map((item: ExtendedCatalogItem) => (item.options || []).length > 0 && (
            <div key={`opts-${item.id}`} className="ml-4 mb-1">
              {item.options!.map((opt: any) => (
                <div key={opt.id} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded mb-px bg-tl-card border border-tl-border-light">
                  <span className="text-[9px] text-tl-text-dimmer">{"\u21B3"}</span>
                  <span className="flex-1 text-[10px] text-tl-text">{opt.product_name} {opt.brand && `(${opt.brand})`}</span>
                  {opt.affiliate_url && <span className="text-[8px] text-tl-accent">{"\uD83D\uDD17"}</span>}
                  <span className="text-[9px] text-tl-text-dimmer">{opt.tier} &middot; ${opt.price || "?"}</span>
                  <button onClick={() => setEditOption({ gearId: item.id, option: opt })}
                    className="px-1.5 py-px rounded-sm text-[8px] text-tl-text-dim cursor-pointer font-body bg-transparent border border-tl-border-light">Edit</button>
                  <button onClick={async () => {
                    await api.deleteProductOption(opt.id);
                    addToast("Removed", "success"); refreshCatalog();
                  }} className="px-1.5 py-px rounded-sm text-[8px] cursor-pointer font-body bg-transparent border border-red-600/25 text-red-600">{"\u2715"}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Troop Overview Tab ───
function TroopsTab({ troops, loaded, theme, addToast, onRefresh, onEnterTroop }: TroopsTabProps): React.ReactElement {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [members, setMembers] = useState<AdminTroopMember[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteInput, setDeleteInput] = useState<string>("");
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [createdTroopId, setCreatedTroopId] = useState<number | null>(null);
  const [createdTroopName, setCreatedTroopName] = useState<string>("");
  const [newTroop, setNewTroop] = useState<NewTroopForm>({ name: "", council_id: null, city: "", state: "", description: "", is_public: true });
  const [creating, setCreating] = useState<boolean>(false);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [advForm, setAdvForm] = useState<AdvForm>({ name: "", adventure_type: "philmont", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
  const [gaItineraries, setGaItineraries] = useState<Itinerary[]>([]);

  const refreshMembers = async (troopId: number): Promise<void> => {
    try {
      const data = await api.getAdminTroopMembers(troopId) as AdminTroopMember[];
      setMembers(data);
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const toggleExpand = async (troopId: number): Promise<void> => {
    if (expanded === troopId) { setExpanded(null); return; }
    setExpanded(troopId);
    setMembersLoading(true);
    try {
      const data = await api.getAdminTroopMembers(troopId) as AdminTroopMember[];
      setMembers(data);
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    finally { setMembersLoading(false); }
  };

  const handleApprove = async (troopId: number, userId: number): Promise<void> => {
    try {
      await api.approveMember(troopId, userId);
      addToast("Approved", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleDeny = async (troopId: number, userId: number): Promise<void> => {
    try {
      await api.denyMember(troopId, userId);
      addToast("Denied", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleRemove = async (troopId: number, userId: number): Promise<void> => {
    try {
      await api.removeMember(troopId, userId);
      addToast("Removed", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleDelete = async (troopId: number): Promise<void> => {
    try {
      await api.deleteAdminTroop(troopId);
      addToast("Troop deleted", "success");
      setDeleteConfirm(null);
      setDeleteInput("");
      onRefresh();
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { addToast("Logo must be under 500KB", "error"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { addToast("PNG, JPG, or WebP only", "error"); return; }
    setNewLogoFile(file);
    setNewLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newTroop.name.trim()) { addToast("Troop name required", "error"); return; }
    if (!newTroop.council_id) { addToast("Council is required", "error"); return; }
    if (!newTroop.city.trim()) { addToast("City is required", "error"); return; }
    if (!newTroop.state) { addToast("State is required", "error"); return; }
    setCreating(true);
    try {
      const location = [newTroop.city.trim(), newTroop.state].filter(Boolean).join(", ");
      const isCustomCouncil = typeof newTroop.council_id === "string" && newTroop.council_id.startsWith("custom:");
      const councilPayload = isCustomCouncil ? { council: (newTroop.council_id as string).slice(7), council_id: null } : { council_id: newTroop.council_id };
      const created = await api.createTroop({ ...newTroop, ...councilPayload, location } as any) as { id: number };

      // Upload logo if one was selected
      if (newLogoFile && created?.id) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(newLogoFile);
          });
          await api.uploadTroopLogo(created.id, base64);
        } catch (logoErr: unknown) {
          console.warn("Logo upload failed, can set later:", logoErr);
        }
      }

      setCreatedTroopId(created.id);
      setCreatedTroopName(newTroop.name.trim());
      setCreateStep(2);
      setNewLogoFile(null);
      setNewLogoPreview(null);
      addToast("Troop created! Now set up the first adventure.", "success");
      onRefresh();
      try { setGaItineraries(await api.getItineraries() as Itinerary[]); } catch {}
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
    finally { setCreating(false); }
  };

  if (!loaded) {
    return <div className="text-xs text-tl-text-dimmer italic">Loading troops...</div>;
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-[10px] text-tl-text-dimmer">{troops.length} troop{troops.length !== 1 ? "s" : ""} registered</div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="text-[10px] font-semibold text-tl-accent bg-tl-accent-bg border border-tl-border-accent px-3 py-1 rounded-md cursor-pointer font-body">+ Create Troop</button>
        )}
      </div>

      {showCreate && createStep === 2 && (
        <div className="mb-3 p-3.5 rounded-[10px] bg-tl-bg-alt border-[1.5px] border-tl-border-accent">
          <div className="text-xs font-bold text-tl-heading mb-1 font-display">Set Up First Adventure</div>
          <div className="text-[10px] text-tl-text-dim mb-2.5">
            <strong className="text-tl-heading">{createdTroopName}</strong> is ready! Now create the first adventure so members can join.
          </div>
          <form onSubmit={async (e: React.FormEvent) => {
            e.preventDefault();
            if (!advForm.name.trim()) { addToast("Adventure name required", "error"); return; }
            setCreating(true);
            try {
              await api.createAdventure(createdTroopId!, advForm as any);
              setShowCreate(false);
              setCreateStep(1);
              setCreatedTroopId(null);
              setCreatedTroopName("");
              setNewTroop({ name: "", council_id: null, city: "", state: "", description: "", is_public: true });
              setAdvForm({ name: "", adventure_type: "philmont", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "" });
              addToast("Adventure created!", "success");
              onRefresh();
            } catch (err: unknown) { addToast((err as Error).message, "error"); }
            finally { setCreating(false); }
          }}>
            <div className="mb-1.5">
              <div className="text-[9px] font-bold text-tl-text-dim uppercase mb-1">Adventure Type</div>
              <div className="grid grid-cols-2 gap-1">
                {ADVENTURE_TYPES.map((t: any) => (
                  <button key={t.id} type="button" disabled={!t.enabled}
                    onClick={() => t.enabled && setAdvForm({ ...advForm, adventure_type: t.id })}
                    className={clsx(
                      "relative p-2.5 rounded-md font-body text-left",
                      advForm.adventure_type === t.id ? "border-2 border-tl-accent bg-tl-accent-bg" : "border border-tl-border-light bg-tl-input",
                      t.enabled ? "cursor-pointer opacity-100" : "cursor-default opacity-45"
                    )}>
                    <div className="text-xs mb-px">{t.icon}</div>
                    <div className={clsx("text-[10px] font-bold", t.enabled ? "text-tl-heading" : "text-tl-text-dim")}>{t.name}</div>
                    <div className="text-[9px] text-tl-text-dim">{t.location}</div>
                    {!t.enabled && <div className="absolute top-1 right-1.5 text-[7px] font-bold text-tl-text-dim bg-tl-border px-1 py-px rounded-sm uppercase">Soon</div>}
                  </button>
                ))}
              </div>
            </div>
            <input value={advForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, name: e.target.value })}
              placeholder={`Crew name (e.g. ${(ADVENTURE_TYPES.find((t: any) => t.id === advForm.adventure_type)?.name || "Philmont")} 2026)`}
              className="tl-input text-[11px] mb-1.5" required />
            <div className="grid grid-cols-2 gap-1 mb-1.5">
              {(() => {
                const labels = (ADVENTURE_TYPES.find((t: any) => t.id === advForm.adventure_type) as any)?.dateLabels || (ADVENTURE_TYPES[0] as any).dateLabels;
                return [
                  { key: "depart_date", label: labels.depart },
                  { key: "arrive_date", label: labels.arrive },
                  { key: "return_date", label: labels.return },
                  { key: "home_date", label: labels.home },
                ].map((d: { key: string; label: string }) => (
                  <div key={d.key}>
                    <label className="text-[8px] font-bold text-tl-text-dim uppercase">{d.label}</label>
                    <input value={advForm[d.key]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, [d.key]: e.target.value })} type="date" className="tl-input text-[11px]" />
                  </div>
                ));
              })()}
            </div>
            <select value={advForm.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvForm({ ...advForm, itinerary_id: e.target.value })}
              className={clsx("tl-input text-[11px] mb-1.5 cursor-pointer", !advForm.itinerary_id && "text-tl-text-dim")}>
              <option value="">Select itinerary (optional)...</option>
              {[12, 9, 7].map((days: number) => {
                const group = gaItineraries.filter((it: Itinerary) => it.days === days).sort((a: Itinerary, b: Itinerary) => {
                  const na = parseInt(a.id.split("-")[1]) || 0, nb = parseInt(b.id.split("-")[1]) || 0;
                  return na - nb;
                });
                return group.length > 0 ? (
                  <optgroup key={days} label={`${days}-Day Treks`}>
                    {group.map((it: Itinerary) => <option key={it.id} value={it.id}>{it.name} ({it.miles} mi, {it.rating})</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
            <div className="flex gap-1.5">
              <button type="submit" disabled={creating} className={clsx("flex-1 py-1.5 rounded-md border-none bg-tl-accent text-white text-[11px] font-bold font-display", creating ? "cursor-wait" : "cursor-pointer")}>{creating ? "..." : "Create Adventure"}</button>
            </div>
          </form>
        </div>
      )}

      {showCreate && createStep === 1 && (
        <div className="mb-3 p-3.5 rounded-[10px] bg-tl-bg-alt border-[1.5px] border-tl-border-accent">
          <div className="text-xs font-bold text-tl-heading mb-2 font-display">Create a Troop</div>
          <form onSubmit={handleCreate}>
            <input value={newTroop.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, name: e.target.value })} placeholder="Troop name (e.g. Troop 444)" className="tl-input text-[11px] mb-1.5" required />
            <CouncilPicker value={newTroop.council_id} onChange={(id: number | string | null) => setNewTroop({ ...newTroop, council_id: id })} />
            <div className="flex gap-1.5 mb-1.5">
              <input value={newTroop.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, city: e.target.value })} placeholder="City (required)" className="tl-input flex-1 text-[11px]" required />
              <select value={newTroop.state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTroop({ ...newTroop, state: e.target.value })} className="tl-input w-[70px] cursor-pointer text-[11px]" required>
                <option value="">ST</option>
                {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Logo upload (optional) */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                {newLogoPreview ? (
                  <img src={newLogoPreview} alt="Logo preview"
                    onError={() => { setNewLogoPreview(null); setNewLogoFile(null); }}
                    className="w-[100px] h-[100px] rounded-md object-contain bg-tl-bg-alt border border-tl-border" />
                ) : (
                  <div className="w-14 h-14 rounded-md flex items-center justify-center text-sm text-tl-text-dim border border-dashed border-tl-border-light" style={{ background: `${theme.accent}20` }}>{"\uD83D\uDCF7"}</div>
                )}
                <div>
                  <label className="inline-block px-3 py-1 rounded-[5px] border-none bg-tl-accent text-white text-[10px] font-bold cursor-pointer font-display">
                    {newLogoPreview ? "Change" : "Add Logo"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect}
                      className="hidden" />
                  </label>
                  {newLogoPreview && (
                    <button type="button" onClick={() => { setNewLogoFile(null); setNewLogoPreview(null); }} className="ml-1 px-1.5 py-0.5 rounded text-[9px] text-tl-text-dim cursor-pointer font-body bg-transparent border-none">Remove</button>
                  )}
                  <div className="text-[9px] text-tl-text-dimmer italic">
                    Optional &middot; change later in Troop Settings
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex gap-1.5 items-center mb-1.5">
                <span className="text-[10px] font-semibold text-tl-text-dim">Visibility:</span>
                {[true, false].map((isPublic: boolean) => (
                  <button key={String(isPublic)} type="button" onClick={() => setNewTroop({ ...newTroop, is_public: isPublic })} className={clsx(
                    "px-2.5 py-0.5 rounded-[5px] border-none text-[10px] font-semibold cursor-pointer font-body",
                    newTroop.is_public === isPublic ? "bg-tl-accent text-white" : "bg-tl-input text-tl-text-muted"
                  )}>{isPublic ? "Public" : "Private"}</button>
                ))}
              </div>
              <div className={clsx("text-[10px] px-2 py-1.5 rounded-[5px] leading-snug", newTroop.is_public ? "text-tl-text-dim bg-tl-input border border-tl-border-light" : "text-tl-warn")}
                style={!newTroop.is_public ? { background: `${theme.warn}10`, border: `1px solid ${theme.warn}30` } : undefined}>
                {newTroop.is_public
                  ? "Troop will be listed so parents and scouts can search and request to join."
                  : "Troop will be hidden from search. Members must be invited by email."}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => { setShowCreate(false); setCreateStep(1); }} className="flex-1 py-1.5 rounded-md border border-tl-border-light bg-transparent text-tl-text-dim text-[11px] font-semibold cursor-pointer font-body">Cancel</button>
              <button type="submit" disabled={creating} className={clsx("flex-1 py-1.5 rounded-md border-none bg-tl-accent text-white text-[11px] font-bold font-display", creating ? "cursor-wait" : "cursor-pointer")}>{creating ? "..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {troops.length === 0 && !showCreate && (
        <div className="text-xs text-tl-text-dimmer italic">No troops registered yet. Click "+ Create Troop" to get started.</div>
      )}
      {troops.map((t: AdminTroop) => (
        <div key={t.id} className="mb-1.5 rounded-lg border border-tl-border-light overflow-hidden">
          {/* Troop row */}
          <div onClick={() => toggleExpand(t.id)} className={clsx(
            "flex items-center gap-2 px-2.5 py-2 cursor-pointer",
            expanded === t.id ? "bg-tl-bg-alt" : "bg-transparent"
          )}>
            <span className="text-[10px] text-tl-text-dimmer">{expanded === t.id ? "\u25BE" : "\u25B8"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-tl-heading">{t.name}{t.location ? ` \u00B7 ${t.location}` : ""}</div>
              <div className="text-[10px] text-tl-text-dimmer">{t.council || "\u2014"}</div>
            </div>
            <div className="flex gap-1.5 items-center shrink-0">
              <span className="text-[10px] text-tl-text-muted">{t.member_count} members</span>
              {t.pending_count > 0 && (
                <span className="text-[9px] px-1.5 py-px rounded-[10px] font-bold text-tl-warn" style={{ background: `${theme.warn}25` }}>{t.pending_count} pending</span>
              )}
              <span className="text-[10px] text-tl-text-muted">{t.adventure_count} adv</span>
              <span className={clsx(
                "text-[9px] px-1.5 py-px rounded-sm font-semibold",
                t.is_public ? "bg-tl-accent-bg text-tl-accent" : "text-tl-warn"
              )} style={!t.is_public ? { background: `${theme.warn}20` } : undefined}>{t.is_public ? "Public" : "Private"}</span>
              {onEnterTroop && (
                showCreate && createStep === 2 && t.id === createdTroopId ? (
                  <span className="text-[9px] font-semibold text-tl-text-dim italic">Finish setup {"\u2193"}</span>
                ) : (
                  <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onEnterTroop(t.id, t); }} className="px-2.5 py-0.5 rounded-[5px] border border-tl-border-accent bg-tl-accent-bg text-tl-accent-light text-[10px] font-semibold cursor-pointer font-body">Enter {"\u2192"}</button>
                )
              )}
            </div>
          </div>

          {/* Expanded member list */}
          {expanded === t.id && (
            <div className="px-2.5 pb-2.5 bg-tl-bg-alt">
              {membersLoading ? (
                <div className="text-[11px] text-tl-text-dimmer italic p-1.5">Loading...</div>
              ) : members.length === 0 ? (
                <div className="text-[11px] text-tl-text-dimmer italic p-1.5">No members.</div>
              ) : (
                <div>
                  {members.map((m: AdminTroopMember) => (
                    <div key={m.id} className="flex items-center gap-2 px-2 py-1 mb-0.5 rounded-md bg-tl-card border border-tl-border-light">
                      {m.avatar_url && <img src={m.avatar_url} alt="" className="w-5 h-5 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold text-tl-text">{m.name}</span>
                        <span className="text-[9px] text-tl-text-dimmer ml-1.5">{m.email}</span>
                      </div>
                      <span className="text-[9px] text-tl-text-dimmer">{m.user_type}</span>
                      <span className={clsx(
                        "text-[9px] px-1 py-px rounded-sm font-semibold",
                        m.role === "admin" ? "bg-tl-accent-bg text-tl-accent" : "bg-transparent text-tl-text-dimmer"
                      )}>{m.role}</span>
                      {m.status === "pending" ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(t.id, m.user_id)} className="px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer font-body bg-tl-accent text-white border-none">Approve</button>
                          <button onClick={() => handleDeny(t.id, m.user_id)} className="px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer font-body bg-transparent border border-red-600/25 text-red-600">Deny</button>
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          <span className="text-[9px] px-1 py-px rounded-sm font-semibold text-tl-accent" style={{ background: `${theme.accent}15` }}>{m.status}</span>
                          <button onClick={() => handleRemove(t.id, m.user_id)} className="px-1.5 py-0.5 rounded text-[9px] cursor-pointer font-body bg-transparent border border-red-600/25 text-red-600">Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Delete troop */}
              <div className="mt-2.5 pt-2 border-t border-tl-border-light">
                {deleteConfirm === t.id ? (
                  <div>
                    <div className="text-[11px] font-semibold mb-1.5 text-red-600">
                      Type &ldquo;{t.name}&rdquo; to confirm deletion. This removes the troop, all adventures, members, and gear data permanently.
                    </div>
                    <div className="flex gap-1.5">
                      <input value={deleteInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)} placeholder={t.name}
                        className="tl-input flex-1 text-[11px]" />
                      <button onClick={() => deleteInput === t.name && handleDelete(t.id)} disabled={deleteInput !== t.name}
                        className={clsx(
                          "px-3 py-1 rounded-[5px] border-none text-[10px] font-bold font-body text-white",
                          deleteInput === t.name ? "cursor-pointer bg-red-600" : "cursor-not-allowed bg-red-600/25"
                        )}>Delete</button>
                      <button onClick={() => { setDeleteConfirm(null); setDeleteInput(""); }}
                        className="px-2.5 py-1 rounded-[5px] border border-tl-border-light text-[10px] cursor-pointer font-body bg-transparent text-tl-text-dim">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(t.id)} className="px-2.5 py-1 rounded-[5px] bg-transparent text-[10px] font-semibold cursor-pointer font-body border border-red-600/20 text-red-600">Delete Troop</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Affiliate Analytics Tab ───
function AffiliateTab({ stats, theme }: AffiliateTabProps): React.ReactElement {
  if (!stats) {
    return <div className="text-xs text-tl-text-dimmer italic">Loading affiliate data...</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex gap-3 mb-4">
        <StatCard label="Total Clicks" value={stats.totalClicks || 0} theme={theme} />
        <StatCard label="Products Clicked" value={stats.clicksByProduct?.length || 0} theme={theme} />
        <StatCard label="Active Days" value={stats.clicksByDay?.filter(d => d.clicks > 0).length || 0} theme={theme} />
      </div>

      {/* Top products */}
      <div className="text-xs font-bold text-tl-heading mb-1.5 font-display">Top Products by Clicks</div>
      {(!stats.clicksByProduct || stats.clicksByProduct.length === 0) ? (
        <div className="text-[11px] text-tl-text-dimmer italic mb-3">No clicks recorded yet.</div>
      ) : (
        <div className="mb-4">
          {stats.clicksByProduct.slice(0, 15).map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded mb-0.5 bg-tl-bg-alt border border-tl-border-light">
              <span className="text-[10px] text-tl-text-dimmer font-bold w-5">#{i + 1}</span>
              <span className="flex-1 text-[11px] text-tl-text">{p.product_name || p.gear_name || "Unknown"}</span>
              <span className="text-[11px] font-bold text-tl-accent">{p.clicks}</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily clicks (last 30 days) */}
      <div className="text-xs font-bold text-tl-heading mb-1.5 font-display">Daily Clicks (Last 30 Days)</div>
      {(!stats.clicksByDay || stats.clicksByDay.length === 0) ? (
        <div className="text-[11px] text-tl-text-dimmer italic">No data yet.</div>
      ) : (
        <div className="flex items-end gap-0.5 h-20">
          {stats.clicksByDay.map((d, i) => {
            const maxClicks = Math.max(...stats.clicksByDay!.map(x => x.clicks), 1);
            const h = Math.max((d.clicks / maxClicks) * 70, 2);
            return (
              <div key={i} title={`${d.date}: ${d.clicks} clicks`}
                className={clsx("flex-1 rounded-t min-w-1", d.clicks > 0 ? "bg-tl-accent" : "bg-tl-border-light")}
                style={{ height: h }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: StatCardProps): React.ReactElement {
  return (
    <div className="flex-1 px-3 py-2.5 rounded-lg bg-tl-bg-alt border border-tl-border-light text-center">
      <div className="text-xl font-extrabold text-tl-accent font-display">{value}</div>
      <div className="text-[9px] text-tl-text-dimmer font-semibold mt-0.5">{label}</div>
    </div>
  );
}

// ─── Platform Settings Tab ───
function SettingsTab({ settings, loaded, setSettings, theme, addToast, allUsers }: SettingsTabProps): React.ReactElement {
  if (!loaded) {
    return <div className="text-xs text-tl-text-dimmer italic">Loading settings...</div>;
  }

  const get = (key: string): string => (settings.find(s => s.key === key)?.value || "");
  const isOn = (key: string, def: string = "true"): boolean => get(key) === "" ? def === "true" : get(key) === "true";

  const save = async (key: string, value: string): Promise<void> => {
    try {
      await api.updateAdminSetting(key, value);
      setSettings(prev => {
        const exists = prev.find(s => s.key === key);
        if (exists) return prev.map(s => s.key === key ? { ...s, value } : s);
        return [...prev, { key, value }];
      });
      addToast(`Saved ${key}`, "success");
    } catch (e: unknown) {
      addToast((e as Error).message, "error");
    }
  };

  const Toggle = ({ label, desc, checked, onChange }: ToggleProps): React.ReactElement => (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-tl-bg-alt border border-tl-border-light mb-1.5">
      <div>
        <div className="text-xs font-semibold text-tl-text font-body">{label}</div>
        {desc && <div className="text-[10px] text-tl-text-dimmer mt-0.5">{desc}</div>}
      </div>
      <div onClick={() => onChange(!checked)} className={clsx("relative cursor-pointer transition-colors duration-200 rounded-[11px]", checked ? "bg-tl-accent" : "bg-tl-border-light")} style={{ width: 40, height: 22 }}>
        <div className="absolute top-0.5 rounded-[9px] bg-white transition-[left] duration-200 shadow-sm" style={{ width: 18, height: 18, left: checked ? 20 : 2 }} />
      </div>
    </div>
  );

  const SectionLabel = ({ children }: SectionLabelProps): React.ReactElement => (
    <div className="text-[10px] font-bold text-tl-text-dimmer uppercase tracking-wide mt-4 mb-1.5">{children}</div>
  );

  return (
    <div>
      <SectionLabel>Site Access</SectionLabel>
      <Toggle label="Maintenance Mode" desc="Only global admin can access the app" checked={isOn("maintenance_mode", "false")} onChange={(v: boolean) => save("maintenance_mode", v ? "true" : "false")} />
      {isOn("maintenance_mode", "false") && (
        <div className="px-3 py-2 mb-1.5">
          <div className="text-[10px] font-semibold text-tl-text-dim mb-1">Maintenance Message</div>
          <input defaultValue={get("maintenance_message") || "TrailLog is temporarily down for maintenance. Please check back soon."} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("maintenance_message", e.target.value)} className="tl-input text-[11px]" />
        </div>
      )}

      <Toggle label="Registration Open" desc="Allow new users to sign up" checked={isOn("registration_enabled", "true")} onChange={(v: boolean) => save("registration_enabled", v ? "true" : "false")} />

      <SectionLabel>Announcement Banner</SectionLabel>
      <Toggle label="Show Banner" desc="Display a banner at the top of every page" checked={isOn("announcement_enabled", "false")} onChange={(v: boolean) => save("announcement_enabled", v ? "true" : "false")} />
      {isOn("announcement_enabled", "false") && (
        <div className="px-3 py-2 mb-1.5">
          <div className="text-[10px] font-semibold text-tl-text-dim mb-1">Banner Message</div>
          <input defaultValue={get("announcement_banner")} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("announcement_banner", e.target.value)} placeholder="Enter announcement text..." className="tl-input text-[11px] mb-2" />
          <div className="text-[10px] font-semibold text-tl-text-dim mb-1">Banner Type</div>
          <select value={get("announcement_type") || "info"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => save("announcement_type", e.target.value)} className="tl-input text-[11px] cursor-pointer">
            <option value="info">Info (blue)</option>
            <option value="warning">Warning (yellow)</option>
            <option value="success">Success (green)</option>
          </select>
        </div>
      )}

      <SectionLabel>Affiliate</SectionLabel>
      <div className="px-3 py-2.5 rounded-lg bg-tl-bg-alt border border-tl-border-light mb-1.5">
        <div className="text-xs font-semibold text-tl-text font-body">Amazon Affiliate Tag</div>
        <div className="text-[10px] text-tl-text-dimmer mt-0.5 mb-1.5">Used in AI gear recommendation buy links</div>
        <input defaultValue={get("amazon_affiliate_tag") || "traillog-20"} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("amazon_affiliate_tag", e.target.value)} placeholder="e.g. traillog-20" className="tl-input text-[11px] w-[200px]" />
      </div>

      <GearRefreshSection theme={theme} addToast={addToast} />

      <SectionLabel>Limits</SectionLabel>
      <div className="px-3 py-2.5 rounded-lg bg-tl-bg-alt border border-tl-border-light mb-1.5">
        <div className="text-xs font-semibold text-tl-text font-body">Max Troops per User</div>
        <div className="text-[10px] text-tl-text-dimmer mt-0.5 mb-1.5">Global admin is exempt from this limit</div>
        <input type="number" min="1" max="10" defaultValue={get("max_troops_per_user") || "2"} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("max_troops_per_user", e.target.value)} className="tl-input text-[11px] w-[60px]" />
      </div>

      <SystemAdminsSection allUsers={allUsers} theme={theme} addToast={addToast} />

      <SectionLabel>System</SectionLabel>
      {settings.filter(s => !["maintenance_mode", "maintenance_message", "registration_enabled", "announcement_enabled", "announcement_banner", "announcement_type", "max_troops_per_user", "amazon_affiliate_tag"].includes(s.key)).map((s: AdminSetting) => (
        <div key={s.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 bg-tl-bg-alt border border-tl-border-light">
          <span className="text-[11px] font-semibold text-tl-text min-w-[140px]">{s.key}</span>
          <span className="flex-1 text-[11px] text-tl-text-muted">{s.value}</span>
          <span className="text-[9px] text-tl-text-dimmer italic">system</span>
        </div>
      ))}
    </div>
  );
}

// ─── Gear Refresh Section ───
function GearRefreshSection({ theme, addToast }: GearRefreshSectionProps): React.ReactElement {
  const [status, setStatus] = useState<GearRefreshStatus | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    api.getGearRefreshStatus().then((d: any) => setStatus(d)).catch(() => {});
  }, []);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await api.refreshGearRecs();
      addToast("Gear recommendation refresh started in background", "success");
      setTimeout(() => {
        api.getGearRefreshStatus().then((d: any) => setStatus(d)).catch(() => {});
      }, 2000);
    } catch (e: unknown) {
      addToast("Failed to start refresh: " + ((e as Error).message || "unknown error"), "error");
    } finally {
      setRefreshing(false);
    }
  };

  const lastRefresh = status?.last_refresh
    ? new Date(status.last_refresh + "Z").toLocaleString()
    : "Never";

  return (
    <div className="px-3 py-2.5 rounded-lg bg-tl-bg-alt border border-tl-border-light mb-1.5">
      <div className="text-xs font-semibold text-tl-text font-body">AI Gear Recommendations</div>
      <div className="text-[10px] text-tl-text-dimmer mt-0.5 mb-1.5">
        Background job refreshes cached recommendations every 7 days. Last refresh: {lastRefresh}
        {status?.in_progress && <span className="ml-1.5 text-amber-500">(refresh in progress)</span>}
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing || status?.in_progress}
        className={clsx(
          "px-3.5 py-1.5 rounded-md border-none text-[11px] font-semibold font-body text-white",
          refreshing ? "cursor-not-allowed bg-tl-border-light" : "cursor-pointer bg-emerald-500",
          (refreshing || status?.in_progress) && "opacity-60"
        )}
      >
        {refreshing || status?.in_progress ? "Refreshing..." : "Refresh AI Gear Recommendations"}
      </button>
    </div>
  );
}

function SystemAdminsSection({ allUsers, theme, addToast }: SystemAdminsSectionProps): React.ReactElement {
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addEmail, setAddEmail] = useState<string>("");

  useEffect(() => {
    api.getSystemAdmins().then((d: any) => setAdmins(d)).catch(console.error);
  }, []);

  const handlePromote = async (): Promise<void> => {
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    const user = allUsers.find(u => u.email.toLowerCase() === email);
    if (!user) { addToast("User not found. They must have an account first.", "error"); return; }
    if ((user as any).is_admin) { addToast("Already a system admin", "error"); return; }
    try {
      await api.promoteAdmin(user.id);
      setAdmins(prev => [...prev, { ...user, is_admin: 1 } as SystemAdmin]);
      setAddEmail("");
      setShowAdd(false);
      addToast(`${user.name || user.email} promoted to system admin`, "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  const handleDemote = async (userId: number, name: string): Promise<void> => {
    if (!confirm(`Remove ${name} as system admin?`)) return;
    try {
      await api.demoteAdmin(userId);
      setAdmins(prev => prev.filter(a => a.id !== userId));
      addToast(`${name} removed as system admin`, "success");
    } catch (e: unknown) { addToast((e as Error).message, "error"); }
  };

  return (
    <div className="mt-4">
      <div className="text-[10px] font-bold text-tl-text-dimmer uppercase tracking-wide mb-1.5">System Administrators</div>
      {admins.map((a: SystemAdmin) => (
        <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-tl-bg-alt border border-tl-border-light mb-1">
          <div>
            <div className="text-xs font-semibold text-tl-text">{a.name || "Unnamed"}</div>
            <div className="text-[10px] text-tl-text-dimmer">{a.email}</div>
          </div>
          {admins.length > 1 && (
            <button onClick={() => handleDemote(a.id, a.name || a.email)} className="text-[10px] px-2 py-1 rounded cursor-pointer font-body bg-transparent border border-tl-danger text-tl-danger">Remove</button>
          )}
        </div>
      ))}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} className="text-[11px] px-3 py-1.5 rounded-md border border-dashed border-tl-border-light bg-transparent text-tl-accent cursor-pointer font-body mt-1 w-full">+ Add System Admin</button>
      ) : (
        <div className="px-3 py-2 mt-1 rounded-lg bg-tl-bg-alt border border-tl-border-light">
          <div className="text-[10px] font-semibold text-tl-text-dim mb-1">Email of existing user to promote</div>
          <div className="flex gap-1.5">
            <input value={addEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddEmail(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handlePromote()} placeholder="user@example.com" className="tl-input flex-1 text-[11px]" />
            <button onClick={handlePromote} className="text-[11px] px-3 py-1.5 rounded-md bg-tl-accent text-white border-none cursor-pointer font-body whitespace-nowrap">Promote</button>
            <button onClick={() => { setShowAdd(false); setAddEmail(""); }} className="text-[11px] px-2.5 py-1.5 rounded-md bg-transparent text-tl-text-dim border border-tl-border-light cursor-pointer font-body">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Troop Overrides Tab ───
function TroopOverridesTab({ grouped, search, setSearch, hiddenIds, troopId, troopCustomGear, theme, addToast, refreshTroopData, setEditCustomItem }: TroopOverridesTabProps): React.ReactElement {
  return (
    <div>
      <div className="text-xs text-tl-text-muted mb-3">
        Toggle visibility of global gear items for your troop. Hidden items won't appear in your troop's gear list.
      </div>

      <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
        className="tl-input text-[11px] mb-2.5" />

      {Object.entries(grouped).map(([cat, items]: [string, ExtendedCatalogItem[]]) => (
        <div key={cat}>
          <div className="text-[11px] font-bold text-tl-heading mt-2.5 mb-1 font-display">{cat}</div>
          {items.map((item: ExtendedCatalogItem) => {
            const isHidden = hiddenIds.has(item.id);
            return (
              <div key={item.id} className={clsx("flex items-center gap-2 px-2 py-1 rounded-md mb-0.5 border border-tl-border-light bg-tl-bg-alt", isHidden && "opacity-50")}>
                <span className={clsx("flex-1 text-[11px] text-tl-text", isHidden ? "font-normal line-through" : "font-semibold")}>{item.name}</span>
                <button onClick={async () => {
                  await api.setTroopGearOverride(troopId!, item.id, !isHidden);
                  refreshTroopData(); addToast(isHidden ? "Shown" : "Hidden", "success");
                }} className={clsx(
                  "px-2 py-0.5 rounded border-none text-[9px] font-semibold cursor-pointer font-body",
                  isHidden ? "bg-tl-accent text-white" : "bg-red-600/[0.13] text-red-600"
                )}>{isHidden ? "Show" : "Hide"}</button>
              </div>
            );
          })}
        </div>
      ))}

      {/* Troop Custom Gear */}
      <div className="mt-5 pt-3 border-t border-tl-border-light">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[13px] font-bold text-tl-heading font-display">Custom Troop Items</div>
          <button onClick={() => setEditCustomItem({ name: "", category: "Custom", priority: "recommended", weight_oz: "", description: "" })}
            className="tl-btn-primary px-2.5 py-1 text-[10px]">+ Add</button>
        </div>
        {troopCustomGear.length === 0 && (
          <div className="text-[11px] text-tl-text-dimmer italic">No custom items yet. Add troop-specific gear here.</div>
        )}
        {troopCustomGear.map((item: TroopCustomGear) => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1 rounded-md mb-0.5 bg-tl-bg-alt border border-tl-border-light">
            <span className="flex-1 text-[11px] text-tl-text font-semibold">{item.name}</span>
            <span className="text-[9px] text-tl-text-dimmer">{item.category}</span>
            <button onClick={async () => { await api.deleteTroopCustomGear(troopId!, item.id); refreshTroopData(); addToast("Removed", "success"); }}
              className="px-2 py-0.5 rounded text-[9px] cursor-pointer font-body bg-transparent border border-red-600/25 text-red-600">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Item Edit Modal ───
function ItemEditModal({ item, theme, onClose, onSave, simple }: ItemEditModalProps): React.ReactElement {
  const [form, setForm] = useState<ItemFormData>({ ...item });
  const set = (k: string, v: unknown): void => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50">
      <div className="w-[450px] bg-tl-card rounded-[14px] border border-tl-border shadow-lg p-5">
        <h3 className="text-[15px] font-bold text-tl-heading font-display mt-0">
          {item.id ? "Edit Item" : "Add Item"}
        </h3>
        <div className="flex flex-col gap-2">
          <LabeledInput label="Name" value={form.name} onChange={(v: string) => set("name", v)} theme={theme} />
          <LabeledInput label="Category" value={form.category} onChange={(v: string) => set("category", v)} theme={theme} />
          {!simple && <LabeledInput label="Subcategory" value={form.subcategory || ""} onChange={(v: string) => set("subcategory", v)} theme={theme} />}
          <LabeledInput label="Description" value={form.description || ""} onChange={(v: string) => set("description", v)} theme={theme} textarea />
          <div className="flex gap-2">
            <LabeledInput label="Weight (oz)" value={form.weight_oz as string || ""} onChange={(v: string) => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="MSRP ($)" value={form.msrp as string || ""} onChange={(v: string) => set("msrp", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div className="flex gap-2">
            <div>
              <label className="text-[9px] text-tl-text-dimmer font-semibold">Priority</label>
              <select value={form.priority || "recommended"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("priority", e.target.value)}
                className="block w-full px-2 py-1.5 rounded-md border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body">
                <option value="essential">Essential</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-tl-text-dimmer font-semibold">Sharing Type</label>
              <select value={form.sharing_type || "personal"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { set("sharing_type", e.target.value); set("is_crew_shared", e.target.value !== "personal" ? 1 : 0); }}
                className="block w-full px-2 py-1.5 rounded-md border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body">
                <option value="personal">Personal</option>
                <option value="crew">Crew Shared</option>
                <option value="buddy">Buddy Split</option>
                <option value="provided">Philmont Provided</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-md border border-tl-border-light bg-transparent text-tl-text-dim text-[11px] cursor-pointer font-body">Cancel</button>
          <button onClick={() => onSave(form)} className="px-3.5 py-1.5 rounded-md border-none text-white text-[11px] font-semibold cursor-pointer font-body bg-tl-forest-deep">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Option Edit Modal ───
function OptionEditModal({ option, gearId, theme, onClose, onSave }: OptionEditModalProps): React.ReactElement {
  const [form, setForm] = useState<OptionFormData>({ ...option });
  const set = (k: string, v: unknown): void => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50">
      <div className="w-[450px] bg-tl-card rounded-[14px] border border-tl-border shadow-lg p-5">
        <h3 className="text-[15px] font-bold text-tl-heading font-display mt-0">
          {option.id ? "Edit Product Option" : "Add Product Option"}
        </h3>
        <div className="flex flex-col gap-2">
          <LabeledInput label="Product Name" value={form.product_name || ""} onChange={(v: string) => set("product_name", v)} theme={theme} />
          <LabeledInput label="Brand" value={form.brand || ""} onChange={(v: string) => set("brand", v)} theme={theme} />
          <div className="flex gap-2">
            <LabeledInput label="Price ($)" value={form.price as string || ""} onChange={(v: string) => set("price", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="Weight (oz)" value={form.weight_oz as string || ""} onChange={(v: string) => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-tl-text-dimmer font-semibold">Tier</label>
              <select value={form.tier || "mid"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("tier", e.target.value)}
                className="block w-full px-2 py-1.5 rounded-md border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body">
                <option value="budget">Budget</option>
                <option value="mid">Mid-Range</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <LabeledInput label="Star Rating (1-5)" value={form.star_rating as string || ""} onChange={(v: string) => set("star_rating", v ? parseInt(v) : null)} theme={theme} type="number" />
          </div>
          <LabeledInput label="Notes" value={form.notes || ""} onChange={(v: string) => set("notes", v)} theme={theme} textarea />
          <LabeledInput label="Affiliate URL" value={form.affiliate_url || ""} onChange={(v: string) => set("affiliate_url", v)} theme={theme} placeholder="https://amazon.com/dp/...?tag=yourtag-20" />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-md border border-tl-border-light bg-transparent text-tl-text-dim text-[11px] cursor-pointer font-body">Cancel</button>
          <button onClick={() => onSave(form)} className="px-3.5 py-1.5 rounded-md border-none text-white text-[11px] font-semibold cursor-pointer font-body bg-tl-forest-deep">Save</button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, theme, type = "text", textarea, placeholder }: LabeledInputProps): React.ReactElement {
  return (
    <div className="flex-1">
      <label className="text-[9px] text-tl-text-dimmer font-semibold block mb-0.5">{label}</label>
      {textarea
        ? <textarea value={value} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} rows={3} className="tl-input text-[11px] resize-y" placeholder={placeholder} />
        : <input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} type={type} className="tl-input text-[11px]" placeholder={placeholder} />
      }
    </div>
  );
}
