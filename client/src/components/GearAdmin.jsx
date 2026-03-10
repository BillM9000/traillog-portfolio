import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle, toolbarBtn } from "../utils/theme";

export default function GearAdmin({ isGlobalAdmin, troopId, onClose }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState(isGlobalAdmin ? "items" : "troop");
  const [catalog, setCatalog] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editOption, setEditOption] = useState(null);
  const [editRetailer, setEditRetailer] = useState(null);

  // Troop-level state
  const [troopOverrides, setTroopOverrides] = useState([]);
  const [troopCustomGear, setTroopCustomGear] = useState([]);
  const [editCustomItem, setEditCustomItem] = useState(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const data = await api.getGearCatalog();
      setCatalog(data);
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
  const grouped = {};
  for (const item of filteredCatalog) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const hiddenIds = new Set(troopOverrides.filter(o => o.hidden).map(o => o.gear_catalog_id));

  const tabs = [];
  if (isGlobalAdmin) {
    tabs.push(["items", "Items"], ["retailers", "Retailers"]);
  }
  tabs.push(["troop", "Troop Overrides"]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", overflowY: "auto" }}>
      <div style={{ maxWidth: 700, margin: "20px auto", background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, margin: 0 }}>
            ⚙️ Gear Admin
          </h2>
          <button onClick={onClose} style={{ ...toolbarBtn(theme), padding: "5px 12px" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: `1px solid ${theme.borderLight}` }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody,
              background: tab === k ? theme.pillActiveBg : theme.pillInactiveBg,
              color: tab === k ? theme.pillActiveText : theme.pillInactiveText,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Global Admin: Items */}
          {tab === "items" && isGlobalAdmin && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none" }} />
                <button onClick={() => setEditItem({ name: "", category: "Pack & Carry", priority: "recommended", weight_oz: "", msrp: "", description: "" })}
                  style={{ ...toolbarBtn(theme, "primary"), padding: "6px 12px", fontSize: 11 }}>+ Add Item</button>
              </div>

              <div style={{ fontSize: 10, color: theme.textDimmer, marginBottom: 8 }}>{catalog.length} items in catalog</div>

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 10, marginBottom: 4, fontFamily: fontDisplay }}>{cat}</div>
                  {items.map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
                      <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.priority}</span>
                      <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.options?.length || 0} opts</span>
                      <button onClick={() => setEditItem(item)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                      <button onClick={async () => {
                        if (!confirm(`Archive "${item.name}"?`)) return;
                        await api.deleteGearCatalogItem(item.id);
                        addToast("Archived", "success"); refreshCatalog();
                      }} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Archive</button>
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
                style={{ ...toolbarBtn(theme, "primary"), padding: "6px 12px", fontSize: 11, marginBottom: 12 }}>+ Add Retailer</button>
              {retailers.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 6, marginBottom: 3, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: theme.text }}>{r.name}</span>
                  <span style={{ fontSize: 9, color: theme.textDimmer }}>{r.has_affiliate ? `${r.commission_rate}% via ${r.affiliate_network}` : "No affiliate"}</span>
                  <button onClick={() => setEditRetailer(r)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                </div>
              ))}
            </div>
          )}

          {/* Troop Overrides */}
          {tab === "troop" && (
            <div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
                Toggle visibility of global gear items for your troop. Hidden items won't appear in your troop's gear list.
              </div>

              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.heading, marginTop: 10, marginBottom: 4, fontFamily: fontDisplay }}>{cat}</div>
                  {items.map(item => {
                    const isHidden = hiddenIds.has(item.id);
                    return (
                      <div key={item.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 2,
                        background: isHidden ? theme.bgAlt + "80" : theme.bgAlt,
                        border: `1px solid ${theme.borderLight}`, opacity: isHidden ? 0.5 : 1,
                      }}>
                        <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: isHidden ? 400 : 600, textDecoration: isHidden ? "line-through" : "none" }}>{item.name}</span>
                        <button onClick={async () => {
                          await api.setTroopGearOverride(troopId, item.id, !isHidden);
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
                {troopCustomGear.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 2, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
                    <span style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontSize: 9, color: theme.textDimmer }}>{item.category}</span>
                    <button onClick={async () => { await api.deleteTroopCustomGear(troopId, item.id); refreshTroopData(); addToast("Removed", "success"); }}
                      style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Remove</button>
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
            await api.addTroopCustomGear(troopId, data); addToast("Added", "success");
            setEditCustomItem(null); refreshTroopData();
          }} simple />
      )}
    </div>
  );
}

// Simple edit modal for gear items
function ItemEditModal({ item, theme, onClose, onSave, simple }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 450, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginTop: 0 }}>
          {item.id ? "Edit Item" : "Add Item"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <LabeledInput label="Name" value={form.name} onChange={v => set("name", v)} theme={theme} />
          <LabeledInput label="Category" value={form.category} onChange={v => set("category", v)} theme={theme} />
          {!simple && <LabeledInput label="Subcategory" value={form.subcategory || ""} onChange={v => set("subcategory", v)} theme={theme} />}
          <LabeledInput label="Description" value={form.description || ""} onChange={v => set("description", v)} theme={theme} textarea />
          <div style={{ display: "flex", gap: 8 }}>
            <LabeledInput label="Weight (oz)" value={form.weight_oz || ""} onChange={v => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="MSRP ($)" value={form.msrp || ""} onChange={v => set("msrp", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Priority</label>
              <select value={form.priority || "recommended"} onChange={e => set("priority", e.target.value)}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
                <option value="essential">Essential</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Crew Shared?</label>
              <select value={form.is_crew_shared || 0} onChange={e => set("is_crew_shared", parseInt(e.target.value))}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: theme.forestDeep || theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function RetailerEditModal({ retailer, theme, onClose, onSave }) {
  const [form, setForm] = useState({ ...retailer });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginTop: 0 }}>
          {retailer.id ? "Edit Retailer" : "Add Retailer"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <LabeledInput label="Name" value={form.name} onChange={v => set("name", v)} theme={theme} />
          <LabeledInput label="URL" value={form.url || ""} onChange={v => set("url", v)} theme={theme} />
          <div style={{ display: "flex", gap: 8 }}>
            <LabeledInput label="Commission Rate (%)" value={form.commission_rate || ""} onChange={v => set("commission_rate", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="Network" value={form.affiliate_network || ""} onChange={v => set("affiliate_network", v)} theme={theme} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: theme.forestDeep || theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, theme, type = "text", textarea }) {
  const style = { width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600, display: "block", marginBottom: 2 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...style, resize: "vertical" }} />
        : <input value={value} onChange={e => onChange(e.target.value)} type={type} style={style} />
      }
    </div>
  );
}
