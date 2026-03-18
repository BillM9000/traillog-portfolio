import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle, toolbarBtn } from "../utils/theme";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import CouncilPicker from "./CouncilPicker";
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

  const outerStyle: React.CSSProperties = alwaysOpen
    ? { minHeight: "100vh", background: theme.bg, fontFamily: fontBody }
    : { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", overflowY: "auto" };
  const innerStyle: React.CSSProperties = alwaysOpen
    ? { maxWidth: 700, margin: "0 auto", background: theme.bgCard, minHeight: "100vh", border: `1px solid ${theme.border}` }
    : { maxWidth: 700, margin: "20px auto", background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, boxShadow: theme.shadow };

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, margin: 0 }}>
            {isGlobalAdmin ? "\uD83C\uDF10 Platform Admin" : "\u2699\uFE0F Gear Admin"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {alwaysOpen && user && (
              <>
                {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />}
                <span style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>{user.name}</span>
              </>
            )}
            {alwaysOpen && onClose && (
              <button onClick={onClose} style={{ fontSize: 11, color: theme.accent, background: "none", border: `1px solid ${theme.accent}40`, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>Lobby</button>
            )}
            {alwaysOpen && onLogout ? (
              <button onClick={onLogout} style={{ fontSize: 11, color: theme.warn, background: "none", border: `1px solid ${theme.warnBg}`, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600 }}>Sign Out</button>
            ) : (
              <button onClick={onClose} style={{ ...toolbarBtn(theme), padding: "5px 12px" }}>{"\u2715"}</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: `1px solid ${theme.borderLight}`, overflowX: "auto" }}>
          {tabs.map(([k, l]: [string, string]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody, whiteSpace: "nowrap" as const,
              background: tab === k ? theme.pillActiveBg : theme.pillInactiveBg,
              color: tab === k ? theme.pillActiveText : theme.pillInactiveText,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: 20, ...(alwaysOpen ? {} : { maxHeight: "70vh", overflowY: "auto" as const }) }}>
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
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
          style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none" }} />
        <button onClick={() => setEditItem({ name: "", category: "Pack & Carry", priority: "recommended", weight_oz: "", msrp: "", description: "" })}
          style={{ ...toolbarBtn(theme, "primary"), padding: "6px 12px", fontSize: 11 }}>+ Add Item</button>
      </div>

      <div style={{ fontSize: 10, color: theme.textDimmer, marginBottom: 8 }}>{catalog.length} items in catalog</div>

      {Object.entries(grouped).map(([cat, items]: [string, ExtendedCatalogItem[]]) => (
        <div key={cat}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 10, marginBottom: 4, fontFamily: fontDisplay }}>{cat}</div>
          {items.map((item: ExtendedCatalogItem) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
              <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: 600 }}>{item.name}</span>
              <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.priority}</span>
              <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.options?.length || 0} opts</span>
              <button onClick={() => setEditOption({ gearId: item.id, option: { product_name: "", brand: "", price: "", weight_oz: "", tier: "mid", notes: "", affiliate_url: "" } })}
                style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.accent, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>+ Opt</button>
              <button onClick={() => setEditItem(item as any)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
              <button onClick={async () => {
                if (!confirm(`Archive "${item.name}"?`)) return;
                await api.deleteGearCatalogItem(item.id);
                addToast("Archived", "success"); refreshCatalog();
              }} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Archive</button>
            </div>
          ))}
          {/* Show existing product options under each item */}
          {items.map((item: ExtendedCatalogItem) => (item.options || []).length > 0 && (
            <div key={`opts-${item.id}`} style={{ marginLeft: 16, marginBottom: 4 }}>
              {item.options!.map((opt: any) => (
                <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 4, marginBottom: 1, background: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
                  <span style={{ fontSize: 9, color: theme.textDimmer }}>{"\u21B3"}</span>
                  <span style={{ flex: 1, fontSize: 10, color: theme.text }}>{opt.product_name} {opt.brand && `(${opt.brand})`}</span>
                  {opt.affiliate_url && <span style={{ fontSize: 8, color: theme.accent }}>{"\uD83D\uDD17"}</span>}
                  <span style={{ fontSize: 9, color: theme.textDimmer }}>{opt.tier} &middot; ${opt.price || "?"}</span>
                  <button onClick={() => setEditOption({ gearId: item.id, option: opt })}
                    style={{ padding: "1px 6px", borderRadius: 3, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 8, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                  <button onClick={async () => {
                    await api.deleteProductOption(opt.id);
                    addToast("Removed", "success"); refreshCatalog();
                  }} style={{ padding: "1px 6px", borderRadius: 3, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 8, cursor: "pointer", fontFamily: fontBody }}>{"\u2715"}</button>
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

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>Loading troops...</div>;
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: theme.textDimmer }}>{troops.length} troop{troops.length !== 1 ? "s" : ""} registered</div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={{ fontSize: 10, fontWeight: 600, color: theme.accent, background: theme.accentBg, border: `1px solid ${theme.borderAccent}`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody }}>+ Create Troop</button>
        )}
      </div>

      {showCreate && createStep === 2 && (
        <div style={{ marginBottom: 12, padding: 14, borderRadius: 10, border: `1.5px solid ${theme.borderAccent}`, background: theme.bgAlt }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, marginBottom: 4, fontFamily: fontDisplay }}>Set Up First Adventure</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 10 }}>
            <strong style={{ color: theme.heading }}>{createdTroopName}</strong> is ready! Now create the first adventure so members can join.
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
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" as const, marginBottom: 4 }}>Adventure Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {ADVENTURE_TYPES.map((t: any) => (
                  <button key={t.id} type="button" disabled={!t.enabled}
                    onClick={() => t.enabled && setAdvForm({ ...advForm, adventure_type: t.id })}
                    style={{
                      padding: "8px 10px", borderRadius: 6, cursor: t.enabled ? "pointer" : "default",
                      border: advForm.adventure_type === t.id ? `2px solid ${theme.accent}` : `1px solid ${theme.borderLight}`,
                      background: advForm.adventure_type === t.id ? theme.accentBg : theme.bgInput,
                      opacity: t.enabled ? 1 : 0.45, textAlign: "left" as const, fontFamily: fontBody, position: "relative" as const,
                    }}>
                    <div style={{ fontSize: 12, marginBottom: 1 }}>{t.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.enabled ? theme.heading : theme.textDim }}>{t.name}</div>
                    <div style={{ fontSize: 9, color: theme.textDim }}>{t.location}</div>
                    {!t.enabled && <div style={{ position: "absolute" as const, top: 4, right: 6, fontSize: 7, fontWeight: 700, color: theme.textDim, background: theme.border, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>Soon</div>}
                  </button>
                ))}
              </div>
            </div>
            <input value={advForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, name: e.target.value })}
              placeholder={`Crew name (e.g. ${(ADVENTURE_TYPES.find((t: any) => t.id === advForm.adventure_type)?.name || "Philmont")} 2026)`}
              style={inputStyle} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
              {(() => {
                const labels = (ADVENTURE_TYPES.find((t: any) => t.id === advForm.adventure_type) as any)?.dateLabels || (ADVENTURE_TYPES[0] as any).dateLabels;
                return [
                  { key: "depart_date", label: labels.depart },
                  { key: "arrive_date", label: labels.arrive },
                  { key: "return_date", label: labels.return },
                  { key: "home_date", label: labels.home },
                ].map((d: { key: string; label: string }) => (
                  <div key={d.key}>
                    <label style={{ fontSize: 8, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" as const }}>{d.label}</label>
                    <input value={advForm[d.key]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvForm({ ...advForm, [d.key]: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                  </div>
                ));
              })()}
            </div>
            <select value={advForm.itinerary_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdvForm({ ...advForm, itinerary_id: e.target.value })}
              style={{ ...inputStyle, color: advForm.itinerary_id ? theme.text : theme.textDim }}>
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
            <div style={{ display: "flex", gap: 6 }}>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: creating ? "wait" : "pointer", fontFamily: fontDisplay }}>{creating ? "..." : "Create Adventure"}</button>
            </div>
          </form>
        </div>
      )}

      {showCreate && createStep === 1 && (
        <div style={{ marginBottom: 12, padding: 14, borderRadius: 10, border: `1.5px solid ${theme.borderAccent}`, background: theme.bgAlt }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, marginBottom: 8, fontFamily: fontDisplay }}>Create a Troop</div>
          <form onSubmit={handleCreate}>
            <input value={newTroop.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, name: e.target.value })} placeholder="Troop name (e.g. Troop 444)" style={inputStyle} required />
            <CouncilPicker value={newTroop.council_id} onChange={(id: number | string | null) => setNewTroop({ ...newTroop, council_id: id })} />
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={newTroop.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTroop({ ...newTroop, city: e.target.value })} placeholder="City (required)" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} required />
              <select value={newTroop.state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTroop({ ...newTroop, state: e.target.value })} style={{ ...inputStyle, width: 70, marginBottom: 0, cursor: "pointer" }} required>
                <option value="">ST</option>
                {US_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Logo upload (optional) */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {newLogoPreview ? (
                  <img src={newLogoPreview} alt="Logo preview"
                    onError={() => { setNewLogoPreview(null); setNewLogoFile(null); }}
                    style={{ width: 100, height: 100, borderRadius: 6, objectFit: "contain" as const, background: theme.bgAlt, border: `1px solid ${theme.border}` }} />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 6, background: theme.accent + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px dashed ${theme.borderLight}`, fontSize: 14, color: theme.textDim,
                  }}>{"\uD83D\uDCF7"}</div>
                )}
                <div>
                  <label style={{
                    display: "inline-block", padding: "4px 12px", borderRadius: 5,
                    border: "none", background: theme.accent,
                    color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: fontDisplay,
                  }}>
                    {newLogoPreview ? "Change" : "Add Logo"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect}
                      style={{ display: "none" }} />
                  </label>
                  {newLogoPreview && (
                    <button type="button" onClick={() => { setNewLogoFile(null); setNewLogoPreview(null); }} style={{
                      marginLeft: 4, padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent",
                      color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody,
                    }}>Remove</button>
                  )}
                  <div style={{ fontSize: 9, color: theme.textDimmer, fontStyle: "italic" }}>
                    Optional &middot; change later in Troop Settings
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDim }}>Visibility:</span>
                {[true, false].map((isPublic: boolean) => (
                  <button key={String(isPublic)} type="button" onClick={() => setNewTroop({ ...newTroop, is_public: isPublic })} style={{
                    padding: "3px 10px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                    background: newTroop.is_public === isPublic ? theme.accent : theme.bgInput,
                    color: newTroop.is_public === isPublic ? "#fff" : theme.textMuted,
                  }}>{isPublic ? "Public" : "Private"}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: newTroop.is_public ? theme.textDim : theme.warn, padding: "6px 8px", borderRadius: 5, lineHeight: 1.4, background: newTroop.is_public ? theme.bgInput : `${theme.warn}10`, border: `1px solid ${newTroop.is_public ? theme.borderLight : theme.warn + "30"}` }}>
                {newTroop.is_public
                  ? "Troop will be listed so parents and scouts can search and request to join."
                  : "Troop will be hidden from search. Members must be invited by email."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => { setShowCreate(false); setCreateStep(1); }} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: creating ? "wait" : "pointer", fontFamily: fontDisplay }}>{creating ? "..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {troops.length === 0 && !showCreate && (
        <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>No troops registered yet. Click "+ Create Troop" to get started.</div>
      )}
      {troops.map((t: AdminTroop) => (
        <div key={t.id} style={{ marginBottom: 6, borderRadius: 8, border: `1px solid ${theme.borderLight}`, overflow: "hidden" }}>
          {/* Troop row */}
          <div onClick={() => toggleExpand(t.id)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer",
            background: expanded === t.id ? theme.bgAlt : "transparent",
          }}>
            <span style={{ fontSize: 10, color: theme.textDimmer }}>{expanded === t.id ? "\u25BE" : "\u25B8"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{t.name}{t.location ? ` \u00B7 ${t.location}` : ""}</div>
              <div style={{ fontSize: 10, color: theme.textDimmer }}>{t.council || "\u2014"}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: theme.textMuted }}>{t.member_count} members</span>
              {t.pending_count > 0 && (
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 700, background: `${theme.warn}25`, color: theme.warn }}>{t.pending_count} pending</span>
              )}
              <span style={{ fontSize: 10, color: theme.textMuted }}>{t.adventure_count} adv</span>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: t.is_public ? theme.accentBg : `${theme.warn}20`, color: t.is_public ? theme.accent : theme.warn }}>{t.is_public ? "Public" : "Private"}</span>
              {onEnterTroop && (
                showCreate && createStep === 2 && t.id === createdTroopId ? (
                  <span style={{ fontSize: 9, fontWeight: 600, color: theme.textDim, fontStyle: "italic" }}>Finish setup {"\u2193"}</span>
                ) : (
                  <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onEnterTroop(t.id, t); }} style={{
                    padding: "3px 10px", borderRadius: 5, border: `1px solid ${theme.borderAccent}`,
                    background: theme.accentBg, color: theme.accentLight, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", fontFamily: fontBody,
                  }}>Enter {"\u2192"}</button>
                )
              )}
            </div>
          </div>

          {/* Expanded member list */}
          {expanded === t.id && (
            <div style={{ padding: "0 10px 10px", background: theme.bgAlt }}>
              {membersLoading ? (
                <div style={{ fontSize: 11, color: theme.textDimmer, fontStyle: "italic", padding: 6 }}>Loading...</div>
              ) : members.length === 0 ? (
                <div style={{ fontSize: 11, color: theme.textDimmer, fontStyle: "italic", padding: 6 }}>No members.</div>
              ) : (
                <div>
                  {members.map((m: AdminTroopMember) => (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", marginBottom: 2,
                      borderRadius: 6, background: theme.bgCard, border: `1px solid ${theme.borderLight}`,
                    }}>
                      {m.avatar_url && <img src={m.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{m.name}</span>
                        <span style={{ fontSize: 9, color: theme.textDimmer, marginLeft: 6 }}>{m.email}</span>
                      </div>
                      <span style={{ fontSize: 9, color: theme.textDimmer }}>{m.user_type}</span>
                      <span style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
                        background: m.role === "admin" ? theme.accentBg : "transparent",
                        color: m.role === "admin" ? theme.accent : theme.textDimmer,
                      }}>{m.role}</span>
                      {m.status === "pending" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleApprove(t.id, m.user_id)} style={{
                            padding: "2px 8px", borderRadius: 4, border: "none", fontSize: 9, fontWeight: 600,
                            cursor: "pointer", fontFamily: fontBody, background: theme.accent, color: "#fff",
                          }}>Approve</button>
                          <button onClick={() => handleDeny(t.id, m.user_id)} style={{
                            padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", fontSize: 9, fontWeight: 600,
                            cursor: "pointer", fontFamily: fontBody, background: "transparent", color: "#DC2626",
                          }}>Deny</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
                            background: `${theme.accent}15`, color: theme.accent,
                          }}>{m.status}</span>
                          <button onClick={() => handleRemove(t.id, m.user_id)} style={{
                            padding: "2px 6px", borderRadius: 4, border: "1px solid #DC262640", fontSize: 9,
                            cursor: "pointer", fontFamily: fontBody, background: "transparent", color: "#DC2626",
                          }}>Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Delete troop */}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.borderLight}` }}>
                {deleteConfirm === t.id ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, marginBottom: 6 }}>
                      Type &ldquo;{t.name}&rdquo; to confirm deletion. This removes the troop, all adventures, members, and gear data permanently.
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={deleteInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteInput(e.target.value)} placeholder={t.name}
                        style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none" }} />
                      <button onClick={() => deleteInput === t.name && handleDelete(t.id)} disabled={deleteInput !== t.name}
                        style={{ padding: "4px 12px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 700, cursor: deleteInput === t.name ? "pointer" : "not-allowed", fontFamily: fontBody, background: deleteInput === t.name ? "#DC2626" : "#DC262640", color: "#fff" }}>Delete</button>
                      <button onClick={() => { setDeleteConfirm(null); setDeleteInput(""); }}
                        style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${theme.borderLight}`, fontSize: 10, cursor: "pointer", fontFamily: fontBody, background: "transparent", color: theme.textDim }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(t.id)} style={{
                    padding: "4px 10px", borderRadius: 5, border: "1px solid #DC262630", background: "transparent",
                    color: "#DC2626", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  }}>Delete Troop</button>
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
    return <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>Loading affiliate data...</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total Clicks" value={stats.totalClicks || 0} theme={theme} />
        <StatCard label="Products Clicked" value={stats.clicksByProduct?.length || 0} theme={theme} />
        <StatCard label="Active Days" value={stats.clicksByDay?.filter(d => d.clicks > 0).length || 0} theme={theme} />
      </div>

      {/* Top products */}
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, marginBottom: 6, fontFamily: fontDisplay }}>Top Products by Clicks</div>
      {(!stats.clicksByProduct || stats.clicksByProduct.length === 0) ? (
        <div style={{ fontSize: 11, color: theme.textDimmer, fontStyle: "italic", marginBottom: 12 }}>No clicks recorded yet.</div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {stats.clicksByProduct.slice(0, 15).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 4, marginBottom: 2, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
              <span style={{ fontSize: 10, color: theme.textDimmer, fontWeight: 700, width: 20 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 11, color: theme.text }}>{p.product_name || p.gear_name || "Unknown"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent }}>{p.clicks}</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily clicks (last 30 days) */}
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, marginBottom: 6, fontFamily: fontDisplay }}>Daily Clicks (Last 30 Days)</div>
      {(!stats.clicksByDay || stats.clicksByDay.length === 0) ? (
        <div style={{ fontSize: 11, color: theme.textDimmer, fontStyle: "italic" }}>No data yet.</div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
          {stats.clicksByDay.map((d, i) => {
            const maxClicks = Math.max(...stats.clicksByDay!.map(x => x.clicks), 1);
            const h = Math.max((d.clicks / maxClicks) * 70, 2);
            return (
              <div key={i} title={`${d.date}: ${d.clicks} clicks`}
                style={{ flex: 1, height: h, background: d.clicks > 0 ? theme.accent : theme.borderLight, borderRadius: "2px 2px 0 0", minWidth: 4 }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, theme }: StatCardProps): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, textAlign: "center" as const }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent, fontFamily: fontDisplay }}>{value}</div>
      <div style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Platform Settings Tab ───
function SettingsTab({ settings, loaded, setSettings, theme, addToast, allUsers }: SettingsTabProps): React.ReactElement {
  if (!loaded) {
    return <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>Loading settings...</div>;
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, marginBottom: 6 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: fontBody }}>{label}</div>
        {desc && <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? theme.accent : theme.borderLight, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: checked ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
    </div>
  );

  const SectionLabel = ({ children }: SectionLabelProps): React.ReactElement => (
    <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, textTransform: "uppercase" as const, letterSpacing: 1, marginTop: 16, marginBottom: 6 }}>{children}</div>
  );

  const settingsInputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <SectionLabel>Site Access</SectionLabel>
      <Toggle label="Maintenance Mode" desc="Only global admin can access the app" checked={isOn("maintenance_mode", "false")} onChange={(v: boolean) => save("maintenance_mode", v ? "true" : "false")} />
      {isOn("maintenance_mode", "false") && (
        <div style={{ padding: "8px 12px", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, marginBottom: 4 }}>Maintenance Message</div>
          <input defaultValue={get("maintenance_message") || "TrailLog is temporarily down for maintenance. Please check back soon."} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("maintenance_message", e.target.value)} style={settingsInputStyle} />
        </div>
      )}

      <Toggle label="Registration Open" desc="Allow new users to sign up" checked={isOn("registration_enabled", "true")} onChange={(v: boolean) => save("registration_enabled", v ? "true" : "false")} />

      <SectionLabel>Announcement Banner</SectionLabel>
      <Toggle label="Show Banner" desc="Display a banner at the top of every page" checked={isOn("announcement_enabled", "false")} onChange={(v: boolean) => save("announcement_enabled", v ? "true" : "false")} />
      {isOn("announcement_enabled", "false") && (
        <div style={{ padding: "8px 12px", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, marginBottom: 4 }}>Banner Message</div>
          <input defaultValue={get("announcement_banner")} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("announcement_banner", e.target.value)} placeholder="Enter announcement text..." style={{ ...settingsInputStyle, marginBottom: 8 }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, marginBottom: 4 }}>Banner Type</div>
          <select value={get("announcement_type") || "info"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => save("announcement_type", e.target.value)} style={{ ...settingsInputStyle, cursor: "pointer" }}>
            <option value="info">Info (blue)</option>
            <option value="warning">Warning (yellow)</option>
            <option value="success">Success (green)</option>
          </select>
        </div>
      )}

      <SectionLabel>Affiliate</SectionLabel>
      <div style={{ padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: fontBody }}>Amazon Affiliate Tag</div>
        <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 2, marginBottom: 6 }}>Used in AI gear recommendation buy links</div>
        <input defaultValue={get("amazon_affiliate_tag") || "traillog-20"} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("amazon_affiliate_tag", e.target.value)} placeholder="e.g. traillog-20" style={{ ...settingsInputStyle, width: 200 }} />
      </div>

      <GearRefreshSection theme={theme} addToast={addToast} />

      <SectionLabel>Limits</SectionLabel>
      <div style={{ padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: fontBody }}>Max Troops per User</div>
        <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 2, marginBottom: 6 }}>Global admin is exempt from this limit</div>
        <input type="number" min="1" max="10" defaultValue={get("max_troops_per_user") || "2"} onBlur={(e: React.FocusEvent<HTMLInputElement>) => save("max_troops_per_user", e.target.value)} style={{ ...settingsInputStyle, width: 60 }} />
      </div>

      <SystemAdminsSection allUsers={allUsers} theme={theme} addToast={addToast} />

      <SectionLabel>System</SectionLabel>
      {settings.filter(s => !["maintenance_mode", "maintenance_message", "registration_enabled", "announcement_enabled", "announcement_banner", "announcement_type", "max_troops_per_user", "amazon_affiliate_tag"].includes(s.key)).map((s: AdminSetting) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 3, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.text, minWidth: 140 }}>{s.key}</span>
          <span style={{ flex: 1, fontSize: 11, color: theme.textMuted }}>{s.value}</span>
          <span style={{ fontSize: 9, color: theme.textDimmer, fontStyle: "italic" }}>system</span>
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
    <div style={{ padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: fontBody }}>AI Gear Recommendations</div>
      <div style={{ fontSize: 10, color: theme.textDimmer, marginTop: 2, marginBottom: 6 }}>
        Background job refreshes cached recommendations every 7 days. Last refresh: {lastRefresh}
        {status?.in_progress && <span style={{ color: "#f59e0b", marginLeft: 6 }}>(refresh in progress)</span>}
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing || status?.in_progress}
        style={{
          padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
          fontFamily: fontBody, cursor: refreshing ? "not-allowed" : "pointer",
          background: refreshing ? theme.borderLight : "#10b981", color: "#fff",
          opacity: refreshing || status?.in_progress ? 0.6 : 1,
        }}
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

  const adminInputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.textDimmer, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>System Administrators</div>
      {admins.map((a: SystemAdmin) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{a.name || "Unnamed"}</div>
            <div style={{ fontSize: 10, color: theme.textDimmer }}>{a.email}</div>
          </div>
          {admins.length > 1 && (
            <button onClick={() => handleDemote(a.id, a.name || a.email)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${(theme as any).danger || "#dc3545"}`, background: "transparent", color: (theme as any).danger || "#dc3545", cursor: "pointer", fontFamily: fontBody }}>Remove</button>
          )}
        </div>
      ))}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px dashed ${theme.borderLight}`, background: "transparent", color: theme.accent, cursor: "pointer", fontFamily: fontBody, marginTop: 4, width: "100%" }}>+ Add System Admin</button>
      ) : (
        <div style={{ padding: "8px 12px", marginTop: 4, borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, marginBottom: 4 }}>Email of existing user to promote</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={addEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddEmail(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handlePromote()} placeholder="user@example.com" style={{ ...adminInputStyle, flex: 1 }} />
            <button onClick={handlePromote} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: fontBody, whiteSpace: "nowrap" as const }}>Promote</button>
            <button onClick={() => { setShowAdd(false); setAddEmail(""); }} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 6, background: "transparent", color: theme.textDim, border: `1px solid ${theme.borderLight}`, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
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
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
        Toggle visibility of global gear items for your troop. Hidden items won't appear in your troop's gear list.
      </div>

      <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", marginBottom: 10, boxSizing: "border-box" as const }} />

      {Object.entries(grouped).map(([cat, items]: [string, ExtendedCatalogItem[]]) => (
        <div key={cat}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 10, marginBottom: 4, fontFamily: fontDisplay }}>{cat}</div>
          {items.map((item: ExtendedCatalogItem) => {
            const isHidden = hiddenIds.has(item.id);
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 2,
                background: isHidden ? theme.bgAlt + "80" : theme.bgAlt,
                border: `1px solid ${theme.borderLight}`, opacity: isHidden ? 0.5 : 1,
              }}>
                <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: isHidden ? 400 : 600, textDecoration: isHidden ? "line-through" as const : "none" as const }}>{item.name}</span>
                <button onClick={async () => {
                  await api.setTroopGearOverride(troopId!, item.id, !isHidden);
                  refreshTroopData(); addToast(isHidden ? "Shown" : "Hidden", "success");
                }} style={{
                  padding: "3px 8px", borderRadius: 4, border: "none", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                  background: isHidden ? theme.accent : "#DC262620", color: isHidden ? "#fff" : "#DC2626",
                }}>{isHidden ? "Show" : "Hide"}</button>
              </div>
            );
          })}
        </div>
      ))}

      {/* Troop Custom Gear */}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: `1px solid ${theme.borderLight}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay }}>Custom Troop Items</div>
          <button onClick={() => setEditCustomItem({ name: "", category: "Custom", priority: "recommended", weight_oz: "", description: "" })}
            style={{ ...toolbarBtn(theme, "primary"), padding: "4px 10px", fontSize: 10 }}>+ Add</button>
        </div>
        {troopCustomGear.length === 0 && (
          <div style={{ fontSize: 11, color: theme.textDimmer, fontStyle: "italic" }}>No custom items yet. Add troop-specific gear here.</div>
        )}
        {troopCustomGear.map((item: TroopCustomGear) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 2, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
            <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: 600 }}>{item.name}</span>
            <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.category}</span>
            <button onClick={async () => { await api.deleteTroopCustomGear(troopId!, item.id); refreshTroopData(); addToast("Removed", "success"); }}
              style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 450, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginTop: 0 }}>
          {item.id ? "Edit Item" : "Add Item"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          <LabeledInput label="Name" value={form.name} onChange={(v: string) => set("name", v)} theme={theme} />
          <LabeledInput label="Category" value={form.category} onChange={(v: string) => set("category", v)} theme={theme} />
          {!simple && <LabeledInput label="Subcategory" value={form.subcategory || ""} onChange={(v: string) => set("subcategory", v)} theme={theme} />}
          <LabeledInput label="Description" value={form.description || ""} onChange={(v: string) => set("description", v)} theme={theme} textarea />
          <div style={{ display: "flex", gap: 8 }}>
            <LabeledInput label="Weight (oz)" value={form.weight_oz as string || ""} onChange={(v: string) => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="MSRP ($)" value={form.msrp as string || ""} onChange={(v: string) => set("msrp", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Priority</label>
              <select value={form.priority || "recommended"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("priority", e.target.value)}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
                <option value="essential">Essential</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Sharing Type</label>
              <select value={form.sharing_type || "personal"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { set("sharing_type", e.target.value); set("is_crew_shared", e.target.value !== "personal" ? 1 : 0); }}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
                <option value="personal">Personal</option>
                <option value="crew">Crew Shared</option>
                <option value="buddy">Buddy Split</option>
                <option value="provided">Philmont Provided</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: (theme as any).forestDeep || theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Save</button>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 450, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginTop: 0 }}>
          {option.id ? "Edit Product Option" : "Add Product Option"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          <LabeledInput label="Product Name" value={form.product_name || ""} onChange={(v: string) => set("product_name", v)} theme={theme} />
          <LabeledInput label="Brand" value={form.brand || ""} onChange={(v: string) => set("brand", v)} theme={theme} />
          <div style={{ display: "flex", gap: 8 }}>
            <LabeledInput label="Price ($)" value={form.price as string || ""} onChange={(v: string) => set("price", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="Weight (oz)" value={form.weight_oz as string || ""} onChange={(v: string) => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Tier</label>
              <select value={form.tier || "mid"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("tier", e.target.value)}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
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
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: (theme as any).forestDeep || theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, theme, type = "text", textarea, placeholder }: LabeledInputProps): React.ReactElement {
  const style: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600, display: "block", marginBottom: 2 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} rows={3} style={{ ...style, resize: "vertical" as const }} placeholder={placeholder} />
        : <input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} type={type} style={style} placeholder={placeholder} />
      }
    </div>
  );
}
