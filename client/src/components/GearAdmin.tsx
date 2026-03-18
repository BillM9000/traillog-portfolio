import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import clsx from "clsx";
import type { ThemeColors } from "../types";

interface GearCatalogItemLocal {
  id?: number;
  name: string;
  category: string;
  subcategory?: string;
  priority: string;
  weight_oz: number | string | null;
  msrp?: number | string | null;
  description: string;
  sharing_type?: string;
  is_crew_shared?: number;
  options?: any[];
}

interface RetailerLocal {
  id?: number;
  name: string;
  url?: string;
  has_affiliate?: number;
  commission_rate?: number | string | null;
  affiliate_network?: string;
}

interface TroopCustomGearLocal {
  id: number;
  name: string;
  category: string;
  priority?: string;
  weight_oz?: number | string | null;
  description?: string;
}

interface TroopOverrideLocal {
  gear_catalog_id: number;
  hidden: boolean;
}

interface GearAdminProps {
  isGlobalAdmin: boolean;
  troopId: number | null;
  onClose: () => void;
}

export default function GearAdmin({ isGlobalAdmin, troopId, onClose }: GearAdminProps) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState(isGlobalAdmin ? "items" : "troop");
  const [catalog, setCatalog] = useState<GearCatalogItemLocal[]>([]);
  const [retailers, setRetailers] = useState<RetailerLocal[]>([]);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<GearCatalogItemLocal | null>(null);
  const [editOption, setEditOption] = useState<any | null>(null);
  const [editRetailer, setEditRetailer] = useState<RetailerLocal | null>(null);

  // Troop-level state
  const [troopOverrides, setTroopOverrides] = useState<TroopOverrideLocal[]>([]);
  const [troopCustomGear, setTroopCustomGear] = useState<TroopCustomGearLocal[]>([]);
  const [editCustomItem, setEditCustomItem] = useState<GearCatalogItemLocal | null>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const data = await api.getGearCatalog();
      setCatalog(data as unknown as GearCatalogItemLocal[]);
    } catch (e) { console.error(e); }
  }, []);

  const refreshRetailers = useCallback(async () => {
    try {
      const data = await api.getRetailers();
      setRetailers(data);
    } catch (e) { console.error(e); }
  }, []);

  const refreshTroopData = useCallback(async () => {
    if (!troopId) return;
    try {
      const [overrides, custom] = await Promise.all([
        api.getTroopGearOverrides(troopId),
        api.getTroopCustomGear(troopId),
      ]);
      setTroopOverrides(overrides);
      setTroopCustomGear(custom);
    } catch (e) { console.error(e); }
  }, [troopId]);

  useEffect(() => {
    refreshCatalog();
    if (isGlobalAdmin) refreshRetailers();
    if (troopId) refreshTroopData();
  }, [refreshCatalog, refreshRetailers, refreshTroopData, isGlobalAdmin, troopId]);

  const filteredCatalog = catalog.filter(item => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || item.category.toLowerCase().includes(s);
  });

  // Group by category
  const grouped: Record<string, GearCatalogItemLocal[]> = {};
  for (const item of filteredCatalog) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const hiddenIds = new Set(troopOverrides.filter(o => o.hidden).map(o => o.gear_catalog_id));

  const tabs: [string, string][] = [];
  if (isGlobalAdmin) {
    tabs.push(["items", "Items"], ["retailers", "Retailers"]);
  }
  tabs.push(["troop", "Troop Overrides"]);

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="max-w-[700px] mx-auto my-5 bg-tl-card rounded-[16px] border border-tl-border shadow-card">
        {/* Header */}
        <div className="px-5 py-4 border-b border-tl-border-light flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-tl-heading font-display m-0">
            {"\u2699\uFE0F"} Gear Admin
          </h2>
          <button onClick={onClose} className="tl-btn py-[5px] px-3">{"\u2715"}</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2.5 border-b border-tl-border-light">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={clsx(
                "py-1.5 px-3.5 rounded-btn border-none text-xs font-semibold cursor-pointer font-body",
                tab === k
                  ? "bg-tl-pill-active-bg text-tl-pill-active-text"
                  : "bg-tl-pill-inactive-bg text-tl-pill-inactive-text"
              )}>{l}</button>
          ))}
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* Global Admin: Items */}
          {tab === "items" && isGlobalAdmin && (
            <div>
              <div className="flex gap-2 mb-3">
                <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
                  className="flex-1 py-[7px] px-2.5 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body outline-none" />
                <button onClick={() => setEditItem({ name: "", category: "Pack & Carry", priority: "recommended", weight_oz: "", msrp: "", description: "" })}
                  className="tl-btn-primary py-1.5 px-3 text-[11px]">+ Add Item</button>
              </div>

              <div className="text-[10px] text-tl-text-dimmer mb-2">{catalog.length} items in catalog</div>

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[11px] font-bold text-tl-heading mt-2.5 mb-1 font-display">{cat}</div>
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-badge-sm mb-0.5 bg-tl-bg-alt border border-tl-border-light">
                      <span className="flex-1 text-[11px] text-tl-text font-semibold">{item.name}</span>
                      <span className="text-[9px] text-tl-text-dimmer">{item.priority}</span>
                      <span className="text-[9px] text-tl-text-dimmer">{item.options?.length || 0} opts</span>
                      <button onClick={() => setEditItem(item)} className="py-0.5 px-2 rounded-[4px] border border-tl-border-light bg-transparent text-tl-text-dim text-[9px] cursor-pointer font-body">Edit</button>
                      <button onClick={async () => {
                        if (!confirm(`Archive "${item.name}"?`)) return;
                        await api.deleteGearCatalogItem(item.id!);
                        addToast("Archived", "success"); refreshCatalog();
                      }} className="py-0.5 px-2 rounded-[4px] bg-transparent text-[#DC2626] text-[9px] cursor-pointer font-body" style={{ border: "1px solid #DC262640" }}>Archive</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Global Admin: Retailers */}
          {tab === "retailers" && isGlobalAdmin && (
            <div>
              <button onClick={() => setEditRetailer({ name: "", url: "", has_affiliate: 0 })}
                className="tl-btn-primary py-1.5 px-3 text-[11px] mb-3">+ Add Retailer</button>
              {retailers.map(r => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-badge-sm mb-[3px] bg-tl-bg-alt border border-tl-border-light">
                  <span className="flex-1 text-xs font-semibold text-tl-text">{r.name}</span>
                  <span className="text-[9px] text-tl-text-dimmer">{r.has_affiliate ? `${r.commission_rate}% via ${r.affiliate_network}` : "No affiliate"}</span>
                  <button onClick={() => setEditRetailer(r)} className="py-0.5 px-2 rounded-[4px] border border-tl-border-light bg-transparent text-tl-text-dim text-[9px] cursor-pointer font-body">Edit</button>
                </div>
              ))}
            </div>
          )}

          {/* Troop Overrides */}
          {tab === "troop" && (
            <div>
              <div className="text-xs text-tl-text-muted mb-3">
                Toggle visibility of global gear items for your troop. Hidden items won't appear in your troop's gear list.
              </div>

              <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full py-[7px] px-2.5 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body outline-none mb-2.5 box-border" />

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[11px] font-bold text-tl-heading mt-2.5 mb-1 font-display">{cat}</div>
                  {items.map(item => {
                    const isHidden = hiddenIds.has(item.id!);
                    return (
                      <div key={item.id}
                        className={clsx(
                          "flex items-center gap-2 py-[5px] px-2 rounded-badge-sm mb-0.5 border border-tl-border-light",
                          isHidden ? "opacity-50" : "opacity-100"
                        )}
                        style={{ background: isHidden ? theme.bgAlt + "80" : theme.bgAlt }}>
                        <span className={clsx(
                          "flex-1 text-[11px] text-tl-text",
                          isHidden ? "font-normal line-through" : "font-semibold"
                        )}>{item.name}</span>
                        <button onClick={async () => {
                          await api.setTroopGearOverride(troopId!, item.id!, !isHidden);
                          refreshTroopData(); addToast(isHidden ? "Shown" : "Hidden", "success");
                        }} className={clsx(
                          "py-[3px] px-2 rounded-[4px] border-none text-[9px] font-semibold cursor-pointer font-body",
                          isHidden ? "bg-tl-accent text-white" : "bg-[#DC262620] text-[#DC2626]"
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
                    className="tl-btn-primary py-1 px-2.5 text-[10px]">+ Add</button>
                </div>
                {troopCustomGear.length === 0 && (
                  <div className="text-[11px] text-tl-text-dimmer italic">No custom items yet. Add troop-specific gear here.</div>
                )}
                {troopCustomGear.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-[5px] px-2 rounded-badge-sm mb-0.5 bg-tl-bg-alt border border-tl-border-light">
                    <span className="flex-1 text-[11px] text-tl-text font-semibold">{item.name}</span>
                    <span className="text-[9px] text-tl-text-dimmer">{item.category}</span>
                    <button onClick={async () => { await api.deleteTroopCustomGear(troopId!, item.id); refreshTroopData(); addToast("Removed", "success"); }}
                      className="py-0.5 px-2 rounded-[4px] bg-transparent text-[#DC2626] text-[9px] cursor-pointer font-body" style={{ border: "1px solid #DC262640" }}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editItem && (
        <ItemEditModal item={editItem} theme={theme} onClose={() => setEditItem(null)}
          onSave={async (data) => {
            if (data.id) {
              await api.updateGearCatalogItem(data.id, data); addToast("Updated", "success");
            } else {
              await api.createGearCatalogItem(data); addToast("Created", "success");
            }
            setEditItem(null); refreshCatalog();
          }} />
      )}

      {/* Edit Retailer Modal */}
      {editRetailer && (
        <RetailerEditModal retailer={editRetailer} theme={theme} onClose={() => setEditRetailer(null)}
          onSave={async (data) => {
            if (data.id) {
              await api.updateRetailer(data.id, data); addToast("Updated", "success");
            } else {
              await api.createRetailer(data); addToast("Created", "success");
            }
            setEditRetailer(null); refreshRetailers();
          }} />
      )}

      {/* Edit Custom Item Modal */}
      {editCustomItem && (
        <ItemEditModal item={editCustomItem} theme={theme} onClose={() => setEditCustomItem(null)}
          onSave={async (data) => {
            await api.addTroopCustomGear(troopId!, data); addToast("Added", "success");
            setEditCustomItem(null); refreshTroopData();
          }} simple />
      )}
    </div>
  );
}

// Simple edit modal for gear items
interface ItemEditModalProps {
  item: GearCatalogItemLocal;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (data: GearCatalogItemLocal) => Promise<void>;
  simple?: boolean;
}

interface GearCatalogItemLocal {
  id?: number;
  name: string;
  category: string;
  subcategory?: string;
  priority: string;
  weight_oz: number | string | null;
  msrp?: number | string | null;
  description: string;
  sharing_type?: string;
  is_crew_shared?: number;
  options?: any[];
}

function ItemEditModal({ item, theme, onClose, onSave, simple }: ItemEditModalProps) {
  const [form, setForm] = useState<GearCatalogItemLocal>({ ...item });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-[450px] bg-tl-card rounded-[14px] border border-tl-border shadow-card p-5">
        <h3 className="text-[15px] font-bold text-tl-heading font-display mt-0">
          {item.id ? "Edit Item" : "Add Item"}
        </h3>
        <div className="flex flex-col gap-2">
          <LabeledInput label="Name" value={form.name} onChange={(v: string) => set("name", v)} theme={theme} />
          <LabeledInput label="Category" value={form.category} onChange={(v: string) => set("category", v)} theme={theme} />
          {!simple && <LabeledInput label="Subcategory" value={form.subcategory || ""} onChange={(v: string) => set("subcategory", v)} theme={theme} />}
          <LabeledInput label="Description" value={form.description || ""} onChange={(v: string) => set("description", v)} theme={theme} textarea />
          <div className="flex gap-2">
            <LabeledInput label="Weight (oz)" value={form.weight_oz || ""} onChange={(v: string) => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="MSRP ($)" value={form.msrp || ""} onChange={(v: string) => set("msrp", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div className="flex gap-2">
            <div>
              <label className="text-[9px] text-tl-text-dimmer font-semibold">Priority</label>
              <select value={form.priority || "recommended"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("priority", e.target.value)}
                className="block w-full py-1.5 px-2 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body">
                <option value="essential">Essential</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-tl-text-dimmer font-semibold">Sharing Type</label>
              <select value={form.sharing_type || "personal"} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { set("sharing_type", e.target.value); set("is_crew_shared", e.target.value !== "personal" ? 1 : 0); }}
                className="block w-full py-1.5 px-2 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body">
                <option value="personal">Personal</option>
                <option value="crew">Crew Shared</option>
                <option value="buddy">Buddy Split</option>
                <option value="provided">Philmont Provided</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="py-1.5 px-3.5 rounded-badge-sm border border-tl-border-light bg-transparent text-tl-text-dim text-[11px] cursor-pointer font-body">Cancel</button>
          <button onClick={() => onSave(form)} className="py-1.5 px-3.5 rounded-badge-sm border-none bg-tl-forest-deep text-white text-[11px] font-semibold cursor-pointer font-body">Save</button>
        </div>
      </div>
    </div>
  );
}

interface RetailerEditModalProps {
  retailer: RetailerLocal;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (data: RetailerLocal) => Promise<void>;
}

interface RetailerLocal {
  id?: number;
  name: string;
  url?: string;
  has_affiliate?: number;
  commission_rate?: number | string | null;
  affiliate_network?: string;
}

function RetailerEditModal({ retailer, theme, onClose, onSave }: RetailerEditModalProps) {
  const [form, setForm] = useState<RetailerLocal>({ ...retailer });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-[400px] bg-tl-card rounded-[14px] border border-tl-border shadow-card p-5">
        <h3 className="text-[15px] font-bold text-tl-heading font-display mt-0">
          {retailer.id ? "Edit Retailer" : "Add Retailer"}
        </h3>
        <div className="flex flex-col gap-2">
          <LabeledInput label="Name" value={form.name} onChange={(v: string) => set("name", v)} theme={theme} />
          <LabeledInput label="URL" value={form.url || ""} onChange={(v: string) => set("url", v)} theme={theme} />
          <div className="flex gap-2">
            <LabeledInput label="Commission Rate (%)" value={form.commission_rate || ""} onChange={(v: string) => set("commission_rate", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="Network" value={form.affiliate_network || ""} onChange={(v: string) => set("affiliate_network", v)} theme={theme} />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="py-1.5 px-3.5 rounded-badge-sm border border-tl-border-light bg-transparent text-tl-text-dim text-[11px] cursor-pointer font-body">Cancel</button>
          <button onClick={() => onSave(form)} className="py-1.5 px-3.5 rounded-badge-sm border-none bg-tl-forest-deep text-white text-[11px] font-semibold cursor-pointer font-body">Save</button>
        </div>
      </div>
    </div>
  );
}

interface LabeledInputProps {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
  theme: ThemeColors;
  type?: string;
  textarea?: boolean;
}

function LabeledInput({ label, value, onChange, theme, type = "text", textarea }: LabeledInputProps) {
  return (
    <div className="flex-1">
      <label className="text-[9px] text-tl-text-dimmer font-semibold block mb-0.5">{label}</label>
      {textarea
        ? <textarea value={value ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} rows={3}
            className="w-full py-1.5 px-2 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body outline-none box-border resize-y" />
        : <input value={value ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} type={type}
            className="w-full py-1.5 px-2 rounded-badge-sm border border-tl-border-light bg-tl-input text-tl-text text-[11px] font-body outline-none box-border" />
      }
    </div>
  );
}
