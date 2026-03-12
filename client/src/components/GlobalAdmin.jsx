import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle, toolbarBtn } from "../utils/theme";
import { US_STATES } from "../utils/constants";

export default function GlobalAdmin({ isGlobalAdmin, troopId, onClose, onEnterTroop, onLogout, user, alwaysOpen }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState(isGlobalAdmin ? (alwaysOpen ? "troops" : "catalog") : "troop");
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editOption, setEditOption] = useState(null);

  // Troop-level state
  const [troopOverrides, setTroopOverrides] = useState([]);
  const [troopCustomGear, setTroopCustomGear] = useState([]);
  const [editCustomItem, setEditCustomItem] = useState(null);

  // Global admin state
  const [troops, setTroops] = useState([]);
  const [troopsLoaded, setTroopsLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const data = await api.getGearCatalog();
      setCatalog(data);
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
    if (troopId) refreshTroopData();
  }, [refreshCatalog, refreshTroopData, troopId]);

  // Load global admin data on tab switch
  useEffect(() => {
    if (!isGlobalAdmin) return;
    if (tab === "troops" && !troopsLoaded) {
      api.getAdminTroops().then(d => { setTroops(d); setTroopsLoaded(true); }).catch(console.error);
    }
    if (tab === "users" && users.length === 0) {
      api.getAdminUsers().then(setUsers).catch(console.error);
    }
    if (tab === "settings" && !settingsLoaded) {
      api.getAdminSettings().then(d => { setSettings(d); setSettingsLoaded(true); }).catch(console.error);
    }
    if (tab === "affiliate" && !affiliateStats) {
      api.getAffiliateStats().then(setAffiliateStats).catch(console.error);
    }
  }, [tab, isGlobalAdmin, troopsLoaded, users.length, settingsLoaded, affiliateStats]);

  const filteredCatalog = catalog.filter(item => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || item.category.toLowerCase().includes(s);
  });

  const grouped = {};
  for (const item of filteredCatalog) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const hiddenIds = new Set(troopOverrides.filter(o => o.hidden).map(o => o.gear_catalog_id));

  const tabs = [];
  if (isGlobalAdmin) {
    tabs.push(["catalog", "Gear Catalog"], ["troops", "Troop Overview"], ["affiliate", "Affiliate"], ["settings", "Settings"]);
  }
  if (troopId) tabs.push(["troop", "Troop Overrides"]);

  const outerStyle = alwaysOpen
    ? { minHeight: "100vh", background: theme.bg, fontFamily: fontBody }
    : { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", overflowY: "auto" };
  const innerStyle = alwaysOpen
    ? { maxWidth: 700, margin: "0 auto", background: theme.bgCard, minHeight: "100vh", border: `1px solid ${theme.border}` }
    : { maxWidth: 700, margin: "20px auto", background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, boxShadow: theme.shadow };

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, margin: 0 }}>
            {isGlobalAdmin ? "🌐 Platform Admin" : "⚙️ Gear Admin"}
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
              <button onClick={onClose} style={{ ...toolbarBtn(theme), padding: "5px 12px" }}>✕</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px", borderBottom: `1px solid ${theme.borderLight}`, overflowX: "auto" }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: fontBody, whiteSpace: "nowrap",
              background: tab === k ? theme.pillActiveBg : theme.pillInactiveBg,
              color: tab === k ? theme.pillActiveText : theme.pillInactiveText,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: 20, ...(alwaysOpen ? {} : { maxHeight: "70vh", overflowY: "auto" }) }}>
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
              onRefresh={() => api.getAdminTroops().then(d => { setTroops(d); setTroopsLoaded(true); })}
              onEnterTroop={onEnterTroop} />
          )}

          {/* ── Affiliate Analytics Tab ── */}
          {tab === "affiliate" && isGlobalAdmin && (
            <AffiliateTab stats={affiliateStats} theme={theme} />
          )}

          {/* ── Platform Settings Tab ── */}
          {tab === "settings" && isGlobalAdmin && (
            <SettingsTab settings={settings} loaded={settingsLoaded} setSettings={setSettings} theme={theme} addToast={addToast} />
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
          onSave={async (data) => {
            if (data.id) {
              await api.updateGearCatalogItem(data.id, data); addToast("Updated", "success");
            } else {
              await api.createGearCatalogItem(data); addToast("Created", "success");
            }
            setEditItem(null); refreshCatalog();
          }} />
      )}

      {/* Edit Product Option Modal */}
      {editOption && (
        <OptionEditModal option={editOption.option} gearId={editOption.gearId} theme={theme}
          onClose={() => setEditOption(null)}
          onSave={async (data) => {
            if (data.id) {
              await api.updateProductOption(data.id, data); addToast("Option updated", "success");
            } else {
              await api.addProductOption(editOption.gearId, data); addToast("Option added", "success");
            }
            setEditOption(null); refreshCatalog();
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

// ─── Gear Catalog Tab ───
function CatalogTab({ catalog, grouped, search, setSearch, theme, addToast, refreshCatalog, setEditItem, setEditOption }) {
  return (
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
              <button onClick={() => setEditOption({ gearId: item.id, option: { product_name: "", brand: "", price: "", weight_oz: "", tier: "mid", notes: "", affiliate_url: "" } })}
                style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.accent, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>+ Opt</button>
              <button onClick={() => setEditItem(item)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
              <button onClick={async () => {
                if (!confirm(`Archive "${item.name}"?`)) return;
                await api.deleteGearCatalogItem(item.id);
                addToast("Archived", "success"); refreshCatalog();
              }} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Archive</button>
            </div>
          ))}
          {/* Show existing product options under each item */}
          {items.map(item => (item.options || []).length > 0 && (
            <div key={`opts-${item.id}`} style={{ marginLeft: 16, marginBottom: 4 }}>
              {item.options.map(opt => (
                <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 4, marginBottom: 1, background: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
                  <span style={{ fontSize: 9, color: theme.textDimmer }}>↳</span>
                  <span style={{ flex: 1, fontSize: 10, color: theme.text }}>{opt.product_name} {opt.brand && `(${opt.brand})`}</span>
                  {opt.affiliate_url && <span style={{ fontSize: 8, color: theme.accent }}>🔗</span>}
                  <span style={{ fontSize: 9, color: theme.textDimmer }}>{opt.tier} · ${opt.price || "?"}</span>
                  <button onClick={() => setEditOption({ gearId: item.id, option: opt })}
                    style={{ padding: "1px 6px", borderRadius: 3, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 8, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                  <button onClick={async () => {
                    await api.deleteProductOption(opt.id);
                    addToast("Removed", "success"); refreshCatalog();
                  }} style={{ padding: "1px 6px", borderRadius: 3, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 8, cursor: "pointer", fontFamily: fontBody }}>✕</button>
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
function TroopsTab({ troops, loaded, theme, addToast, onRefresh, onEnterTroop }) {
  const [expanded, setExpanded] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTroop, setNewTroop] = useState({ name: "", council: "", city: "", state: "", description: "", is_public: true });
  const [creating, setCreating] = useState(false);
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [newLogoPreview, setNewLogoPreview] = useState(null);

  const refreshMembers = async (troopId) => {
    try {
      const data = await api.getAdminTroopMembers(troopId);
      setMembers(data);
    } catch (e) { addToast(e.message, "error"); }
  };

  const toggleExpand = async (troopId) => {
    if (expanded === troopId) { setExpanded(null); return; }
    setExpanded(troopId);
    setMembersLoading(true);
    try {
      const data = await api.getAdminTroopMembers(troopId);
      setMembers(data);
    } catch (e) { addToast(e.message, "error"); }
    finally { setMembersLoading(false); }
  };

  const handleApprove = async (troopId, userId) => {
    try {
      await api.approveMember(troopId, userId);
      addToast("Approved", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleDeny = async (troopId, userId) => {
    try {
      await api.denyMember(troopId, userId);
      addToast("Denied", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleRemove = async (troopId, userId) => {
    try {
      await api.removeMember(troopId, userId);
      addToast("Removed", "success");
      refreshMembers(troopId);
      onRefresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleDelete = async (troopId) => {
    try {
      await api.deleteAdminTroop(troopId);
      addToast("Troop deleted", "success");
      setDeleteConfirm(null);
      setDeleteInput("");
      onRefresh();
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { addToast("Logo must be under 500KB", "error"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { addToast("PNG, JPG, or WebP only", "error"); return; }
    setNewLogoFile(file);
    setNewLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTroop.name.trim()) { addToast("Troop name required", "error"); return; }
    if (!newTroop.council.trim()) { addToast("Council is required", "error"); return; }
    if (!newTroop.city.trim()) { addToast("City is required", "error"); return; }
    if (!newTroop.state) { addToast("State is required", "error"); return; }
    setCreating(true);
    try {
      const location = [newTroop.city.trim(), newTroop.state].filter(Boolean).join(", ");
      const created = await api.createTroop({ ...newTroop, location });

      // Upload logo if one was selected
      if (newLogoFile && created?.id) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(newLogoFile);
          });
          await api.uploadTroopLogo(created.id, base64);
        } catch (logoErr) {
          console.warn("Logo upload failed, can set later:", logoErr);
        }
      }

      setNewTroop({ name: "", council: "", city: "", state: "", description: "", is_public: true });
      setNewLogoFile(null);
      setNewLogoPreview(null);
      setShowCreate(false);
      addToast("Troop created", "success");
      onRefresh();
    } catch (e) { addToast(e.message, "error"); }
    finally { setCreating(false); }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", marginBottom: 6, boxSizing: "border-box" };

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

      {showCreate && (
        <div style={{ marginBottom: 12, padding: 14, borderRadius: 10, border: `1.5px solid ${theme.borderAccent}`, background: theme.bgAlt }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading, marginBottom: 8, fontFamily: fontDisplay }}>Create a Troop</div>
          <form onSubmit={handleCreate}>
            <input value={newTroop.name} onChange={e => setNewTroop({ ...newTroop, name: e.target.value })} placeholder="Troop name (e.g. Troop 444)" style={inputStyle} required />
            <input value={newTroop.council} onChange={e => setNewTroop({ ...newTroop, council: e.target.value })} placeholder="Council (required)" style={inputStyle} required maxLength={60} />
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={newTroop.city} onChange={e => setNewTroop({ ...newTroop, city: e.target.value })} placeholder="City (required)" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} required />
              <select value={newTroop.state} onChange={e => setNewTroop({ ...newTroop, state: e.target.value })} style={{ ...inputStyle, width: 70, marginBottom: 0, cursor: "pointer" }} required>
                <option value="">ST</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Logo upload (optional) */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {newLogoPreview ? (
                  <img src={newLogoPreview} alt="Logo preview"
                    style={{ width: 40, height: 40, borderRadius: 6, objectFit: "contain", background: theme.bgAlt, border: `1px solid ${theme.border}` }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 6, background: theme.accent + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px dashed ${theme.borderLight}`, fontSize: 14, color: theme.textDim,
                  }}>📷</div>
                )}
                <div>
                  <label style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 5,
                    border: `1px solid ${theme.borderAccent}`, background: theme.accentBg,
                    color: theme.accentLight, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
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
                    Optional · change later in Troop Settings
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDim }}>Visibility:</span>
                {[true, false].map(isPublic => (
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
              <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: creating ? "wait" : "pointer", fontFamily: fontBody }}>{creating ? "..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {troops.length === 0 && !showCreate && (
        <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>No troops registered yet. Click "+ Create Troop" to get started.</div>
      )}
      {troops.map(t => (
        <div key={t.id} style={{ marginBottom: 6, borderRadius: 8, border: `1px solid ${theme.borderLight}`, overflow: "hidden" }}>
          {/* Troop row */}
          <div onClick={() => toggleExpand(t.id)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer",
            background: expanded === t.id ? theme.bgAlt : "transparent",
          }}>
            <span style={{ fontSize: 10, color: theme.textDimmer }}>{expanded === t.id ? "▾" : "▸"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.heading }}>{t.name}{t.location ? ` · ${t.location}` : ""}</div>
              <div style={{ fontSize: 10, color: theme.textDimmer }}>{t.council || "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: theme.textMuted }}>{t.member_count} members</span>
              {t.pending_count > 0 && (
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 700, background: `${theme.warn}25`, color: theme.warn }}>{t.pending_count} pending</span>
              )}
              <span style={{ fontSize: 10, color: theme.textMuted }}>{t.adventure_count} adv</span>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: t.is_public ? theme.accentBg : `${theme.warn}20`, color: t.is_public ? theme.accent : theme.warn }}>{t.is_public ? "Public" : "Private"}</span>
              {onEnterTroop && (
                <button onClick={(e) => { e.stopPropagation(); onEnterTroop(t.id, t); }} style={{
                  padding: "3px 10px", borderRadius: 5, border: `1px solid ${theme.borderAccent}`,
                  background: theme.accentBg, color: theme.accentLight, fontSize: 10, fontWeight: 600,
                  cursor: "pointer", fontFamily: fontBody,
                }}>Enter →</button>
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
                  {members.map(m => (
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
                      Type "{t.name}" to confirm deletion. This removes the troop, all adventures, members, and gear data permanently.
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder={t.name}
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
function AffiliateTab({ stats, theme }) {
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
            const maxClicks = Math.max(...stats.clicksByDay.map(x => x.clicks), 1);
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

function StatCard({ label, value, theme }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: theme.bgAlt, border: `1px solid ${theme.borderLight}`, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent, fontFamily: fontDisplay }}>{value}</div>
      <div style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Platform Settings Tab ───
function SettingsTab({ settings, loaded, setSettings, theme, addToast }) {
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  const saveSetting = async (key) => {
    try {
      await api.updateAdminSetting(key, editValue);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: editValue } : s));
      addToast(`Saved ${key}`, "success");
      setEditKey(null);
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>Loading settings...</div>;
  }
  if (settings.length === 0) {
    return <div style={{ fontSize: 12, color: theme.textDimmer, fontStyle: "italic" }}>No settings found.</div>;
  }

  const PROTECTED_KEYS = ["schema_version"];

  return (
    <div>
      <div style={{ fontSize: 10, color: theme.textDimmer, marginBottom: 8 }}>{settings.length} platform settings</div>
      {settings.map(s => {
        const isProtected = PROTECTED_KEYS.includes(s.key);
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 3, background: theme.bgAlt, border: `1px solid ${theme.borderLight}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.text, minWidth: 140 }}>{s.key}</span>
            {editKey === s.key ? (
              <>
                <input value={editValue} onChange={e => setEditValue(e.target.value)}
                  style={{ flex: 1, padding: "4px 6px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none" }} />
                <button onClick={() => saveSetting(s.key)} style={{ padding: "2px 8px", borderRadius: 4, border: "none", background: theme.accent, color: "#fff", fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Save</button>
                <button onClick={() => setEditKey(null)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 11, color: theme.textMuted }}>{s.value}</span>
                {isProtected ? (
                  <span style={{ fontSize: 9, color: theme.textDimmer, fontStyle: "italic" }}>system</span>
                ) : (
                  <button onClick={() => { setEditKey(s.key); setEditValue(s.value); }}
                    style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 9, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Troop Overrides Tab ───
function TroopOverridesTab({ grouped, search, setSearch, hiddenIds, troopId, troopCustomGear, theme, addToast, refreshTroopData, setEditCustomItem }) {
  return (
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
  );
}

// ─── Item Edit Modal ───
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

// ─── Product Option Edit Modal ───
function OptionEditModal({ option, gearId, theme, onClose, onSave }) {
  const [form, setForm] = useState({ ...option });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 450, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, marginTop: 0 }}>
          {option.id ? "Edit Product Option" : "Add Product Option"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <LabeledInput label="Product Name" value={form.product_name || ""} onChange={v => set("product_name", v)} theme={theme} />
          <LabeledInput label="Brand" value={form.brand || ""} onChange={v => set("brand", v)} theme={theme} />
          <div style={{ display: "flex", gap: 8 }}>
            <LabeledInput label="Price ($)" value={form.price || ""} onChange={v => set("price", v ? parseFloat(v) : null)} theme={theme} type="number" />
            <LabeledInput label="Weight (oz)" value={form.weight_oz || ""} onChange={v => set("weight_oz", v ? parseFloat(v) : null)} theme={theme} type="number" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600 }}>Tier</label>
              <select value={form.tier || "mid"} onChange={e => set("tier", e.target.value)}
                style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody }}>
                <option value="budget">Budget</option>
                <option value="mid">Mid-Range</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <LabeledInput label="Star Rating (1-5)" value={form.star_rating || ""} onChange={v => set("star_rating", v ? parseInt(v) : null)} theme={theme} type="number" />
          </div>
          <LabeledInput label="Notes" value={form.notes || ""} onChange={v => set("notes", v)} theme={theme} textarea />
          <LabeledInput label="Affiliate URL" value={form.affiliate_url || ""} onChange={v => set("affiliate_url", v)} theme={theme} placeholder="https://amazon.com/dp/...?tag=yourtag-20" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: "transparent", color: theme.textDim, fontSize: 11, cursor: "pointer", fontFamily: fontBody }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: theme.forestDeep || theme.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, theme, type = "text", textarea, placeholder }) {
  const style = { width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.borderLight}`, background: theme.bgInput, color: theme.text, fontSize: 11, fontFamily: fontBody, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 9, color: theme.textDimmer, fontWeight: 600, display: "block", marginBottom: 2 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...style, resize: "vertical" }} placeholder={placeholder} />
        : <input value={value} onChange={e => onChange(e.target.value)} type={type} style={style} placeholder={placeholder} />
      }
    </div>
  );
}
