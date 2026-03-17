import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import { US_STATES, ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import TroopLogo from "./TroopLogo";

export default function Lobby({ user, memberships, onRefresh, onLogout, isGlobalAdmin, onGlobalAdminClick, onEnterTroop }) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [troops, setTroops] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTroop, setNewTroop] = useState({ name: "", council: "", city: "", state: "", description: "", is_public: true });
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [newLogoPreview, setNewLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createStep, setCreateStep] = useState(1);
  const [createdTroopId, setCreatedTroopId] = useState(null);
  const [createdTroopName, setCreatedTroopName] = useState("");
  const [advForm, setAdvForm] = useState({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
  const [itineraries, setItineraries] = useState([]);

  useEffect(() => {
    api.getTroops().then(setTroops).catch(console.error);
  }, [memberships]);

  const handleJoin = async (troopId) => {
    try {
      await api.joinTroop(troopId);
      await onRefresh();
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be PNG, JPG, or WebP");
      return;
    }
    if (file.size > 500 * 1024) {
      setError("Logo must be under 500KB");
      return;
    }
    setNewLogoFile(file);
    setNewLogoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTroop.name.trim()) return setError("Troop name required");
    if (!newTroop.council.trim()) return setError("Council is required");
    if (!newTroop.city.trim()) return setError("City is required");
    if (!newTroop.state) return setError("State is required");
    setLoading(true);
    setError("");
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

      // Move to Step 2: adventure creation (don't refresh App yet — it would unmount Lobby)
      setCreatedTroopId(created.id);
      setCreatedTroopName(newTroop.name.trim());
      setCreateStep(2);
      setError("");
      // Refresh troop list locally so it appears
      try { setTroops(await api.getTroops()); } catch {}
      // Pre-fetch itineraries
      try { setItineraries(await api.getItineraries()); } catch {}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setNewLogoFile(null);
      setNewLogoPreview(null);
    }
  };

  const pendingRequests = memberships.filter(m => m.status === "pending");

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 7, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody,
    outline: "none", marginBottom: 8, boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      fontFamily: fontBody, color: theme.text,
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 800, color: theme.heading, margin: 0 }}>
              Trail<span style={{ color: theme.accentLight }}>Log</span>
            </h1>
            <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>Welcome, {user.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
          {isGlobalAdmin && (
            <button onClick={onGlobalAdminClick} style={{
              fontSize: 11, color: theme.accent, background: "none", border: `1px solid ${theme.accent}40`,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
            }}>🌐 Platform Admin</button>
          )}
          <button onClick={onLogout} style={{
            fontSize: 11, color: theme.warn, background: "none", border: `1px solid ${theme.warnBg}`,
            padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: fontBody, fontWeight: 600,
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 20px" }}>
        {pendingRequests.length > 0 && (
          <div style={{ ...card(theme), border: `1px solid ${theme.gold}40` }}>
            <div style={{ ...cardTitle(theme), color: theme.gold }}>Pending Requests</div>
            {pendingRequests.map(m => (
              <div key={m.troop_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>
                <span><strong>{m.troop_name}</strong> — waiting for admin approval...</span>
                <button onClick={async () => {
                  try { await api.leaveTroop(m.troop_id); await onRefresh(); addToast("Request withdrawn", "success"); }
                  catch (e) { addToast(e.message, "error"); }
                }} style={{
                  padding: "3px 8px", borderRadius: 5, border: `1px solid ${theme.warn}40`, background: "transparent",
                  color: theme.warn, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, flexShrink: 0,
                }}>Withdraw</button>
              </div>
            ))}
          </div>
        )}

        <div style={card(theme)}>
          <div style={cardTitle(theme)}>Available Troops</div>
          {troops.length === 0 ? (
            <p style={{ fontSize: 12, color: theme.textDim, fontStyle: "italic" }}>{user.user_type === "scout" ? "No troops yet. A troop leader will need to create one." : "No troops yet. Create one to get started!"}</p>
          ) : (
            troops.map(t => {
              const membership = memberships.find(m => m.troop_id === t.id);
              return (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: theme.bgAlt, borderRadius: 8, marginBottom: 6,
                  border: `1px solid ${theme.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <TroopLogo troopId={t.id} name={t.name} size={56} theme={theme} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading }}>{t.name}</div>
                      {(t.council || t.location) && (
                        <div style={{ fontSize: 11, color: theme.textDim }}>
                          {[t.council, t.location].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {!t.council && t.description && <div style={{ fontSize: 11, color: theme.textDim }}>{t.description}</div>}
                    </div>
                  </div>
                  {membership ? (
                    membership.status === "approved" && onEnterTroop ? (
                      showCreate && createStep === 2 && t.id === createdTroopId ? (
                        <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, fontStyle: "italic" }}>Finish setup below ↓</span>
                      ) : (
                      <button onClick={() => onEnterTroop(t.id, t)} style={{
                        padding: "5px 12px", borderRadius: 6, border: "none",
                        background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: fontDisplay,
                      }}>Enter →</button>
                      )
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                        background: `${theme.gold}20`, color: theme.gold,
                        border: `1px solid ${theme.gold}40`,
                      }}>Pending</span>
                    )
                  ) : isGlobalAdmin ? (
                    <button onClick={() => onEnterTroop(t.id, t)} style={{
                      padding: "5px 12px", borderRadius: 6, border: "none",
                      background: theme.accent, color: "#fff", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: fontDisplay,
                    }}>Enter →</button>
                  ) : (
                    <button onClick={() => handleJoin(t.id)} style={{
                      padding: "5px 12px", borderRadius: 6, border: "none", background: theme.accent,
                      color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                    }}>Request to Join</button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!showCreate && user.user_type !== "scout" && (
          <button onClick={() => { setShowCreate(true); setCreateStep(1); }} style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${theme.borderLight}`,
            background: "transparent", color: theme.accent, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: fontBody,
          }}>+ Create a New Troop</button>
        )}
        {showCreate && createStep === 2 ? (
          <div style={card(theme)}>
            <div style={cardTitle(theme)}>Set Up Your First Adventure</div>
            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 14 }}>
              <strong style={{ color: theme.heading }}>{createdTroopName}</strong> is ready! Now create your first adventure so members can join.
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!advForm.name.trim()) return setError("Adventure name required");
              setLoading(true);
              setError("");
              try {
                await api.createAdventure(createdTroopId, advForm);
                await onRefresh();
                if (onEnterTroop) onEnterTroop(createdTroopId);
              } catch (e) {
                setError(e.message);
              } finally {
                setLoading(false);
              }
            }}>
              {/* Adventure Type Selector */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Adventure Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {ADVENTURE_TYPES.map(t => (
                    <button key={t.id} type="button" disabled={!t.enabled}
                      onClick={() => t.enabled && setAdvForm({ ...advForm, adventure_type: t.id })}
                      style={{
                        padding: "10px 12px", borderRadius: 8, cursor: t.enabled ? "pointer" : "default",
                        border: advForm.adventure_type === t.id ? `2px solid ${theme.accent}` : `1.5px solid ${theme.borderLight}`,
                        background: advForm.adventure_type === t.id ? theme.accentBg : t.enabled ? theme.bgAlt : theme.bgAlt,
                        opacity: t.enabled ? 1 : 0.45, textAlign: "left", fontFamily: fontBody,
                        position: "relative",
                      }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.enabled ? theme.heading : theme.textDim }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>{t.location}</div>
                      {!t.enabled && (
                        <div style={{
                          position: "absolute", top: 6, right: 8, fontSize: 8, fontWeight: 700,
                          color: theme.textDim, background: theme.border, padding: "2px 6px", borderRadius: 4,
                          textTransform: "uppercase", letterSpacing: 0.5,
                        }}>Coming Soon</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <input value={advForm.name} onChange={e => setAdvForm({ ...advForm, name: e.target.value })}
                placeholder={`Crew name (e.g. ${(ADVENTURE_TYPES.find(t => t.id === advForm.adventure_type)?.name || "Philmont")} 2026)`}
                style={inputStyle} required />
              {(() => {
                const labels = ADVENTURE_TYPES.find(t => t.id === advForm.adventure_type)?.dateLabels || ADVENTURE_TYPES[0].dateLabels;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.depart}</label>
                      <input value={advForm.depart_date} onChange={e => setAdvForm({ ...advForm, depart_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.arrive}</label>
                      <input value={advForm.arrive_date} onChange={e => setAdvForm({ ...advForm, arrive_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.return}</label>
                      <input value={advForm.return_date} onChange={e => setAdvForm({ ...advForm, return_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: theme.textDim, textTransform: "uppercase" }}>{labels.home}</label>
                      <input value={advForm.home_date} onChange={e => setAdvForm({ ...advForm, home_date: e.target.value })} type="date" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                  </div>
                );
              })()}
              <select value={advForm.itinerary_id} onChange={e => setAdvForm({ ...advForm, itinerary_id: e.target.value })}
                style={{ ...inputStyle, color: advForm.itinerary_id ? theme.text : theme.textDim }}>
                <option value="">Select itinerary (optional)...</option>
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
              {error && <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "10px 0", borderRadius: 7, border: "none",
                background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: loading ? "wait" : "pointer", fontFamily: fontBody,
              }}>{loading ? "..." : "Create Adventure & Enter"}</button>
            </form>
          </div>
        ) : showCreate && createStep === 1 ? (
          <div style={card(theme)}>
            <div style={cardTitle(theme)}>Create a Troop</div>
            <form onSubmit={handleCreate}>
              <input value={newTroop.name} onChange={e => setNewTroop({ ...newTroop, name: e.target.value })}
                placeholder="Troop or crew name (e.g. Troop 10, Crew 614)" style={inputStyle} required />
              <input value={newTroop.council} onChange={e => setNewTroop({ ...newTroop, council: e.target.value })}
                placeholder="Council (e.g. Northeast Illinois Council)" style={inputStyle} required maxLength={60} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={newTroop.city} onChange={e => setNewTroop({ ...newTroop, city: e.target.value })}
                  placeholder="City (required)" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} required />
                <select value={newTroop.state} onChange={e => setNewTroop({ ...newTroop, state: e.target.value })}
                  style={{ ...inputStyle, width: 80, marginBottom: 0, cursor: "pointer" }} required>
                  <option value="">State</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Logo upload (optional) */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  {newLogoPreview ? (
                    <img src={newLogoPreview} alt="Logo preview"
                      onError={() => { setNewLogoPreview(null); setNewLogoFile(null); }}
                      style={{ width: 100, height: 100, borderRadius: 8, objectFit: "contain", background: theme.bgAlt, border: `1px solid ${theme.border}` }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 8, background: theme.accent + "20",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px dashed ${theme.borderLight}`, fontSize: 20, color: theme.textDim,
                    }}>📷</div>
                  )}
                  <div>
                    <label style={{
                      display: "inline-block", padding: "5px 12px", borderRadius: 6,
                      border: "none", background: theme.accent,
                      color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: fontDisplay,
                    }}>
                      {newLogoPreview ? "Change" : "Add Logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect}
                        style={{ display: "none" }} />
                    </label>
                    {newLogoPreview && (
                      <button type="button" onClick={() => { setNewLogoFile(null); setNewLogoPreview(null); }} style={{
                        marginLeft: 6, padding: "3px 8px", borderRadius: 4, border: "none", background: "transparent",
                        color: theme.textDim, fontSize: 10, cursor: "pointer", fontFamily: fontBody,
                      }}>Remove</button>
                    )}
                    <div style={{ fontSize: 10, color: theme.textDim, marginTop: 3 }}>
                      Optional · PNG, JPG, or WebP · Max 500KB
                    </div>
                    <div style={{ fontSize: 10, color: theme.textDimmer, fontStyle: "italic" }}>
                      You can always add or change this later in Troop Settings
                    </div>
                  </div>
                </div>
              </div>

              {/* Visibility toggle */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.heading }}>Troop Visibility</span>
                  <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${theme.borderLight}` }}>
                    {[true, false].map(isPublic => (
                      <button key={String(isPublic)} type="button" onClick={() => setNewTroop({ ...newTroop, is_public: isPublic })} style={{
                        padding: "4px 14px", border: "none", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", fontFamily: fontBody,
                        background: newTroop.is_public === isPublic ? theme.accent : "transparent",
                        color: newTroop.is_public === isPublic ? "#fff" : theme.textMuted,
                      }}>{isPublic ? "Public" : "Private"}</button>
                    ))}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: newTroop.is_public ? theme.textDim : theme.warn,
                  padding: "8px 10px", borderRadius: 6, lineHeight: 1.5,
                  background: newTroop.is_public ? theme.bgAlt : (theme.name === "dark" ? "#3a2820" : "#fef3e8"),
                  border: `1px solid ${newTroop.is_public ? theme.borderLight : theme.warn + "40"}`,
                }}>
                  {newTroop.is_public
                    ? "Your troop will be listed so parents and scouts can search by name and request to join. This is the easiest way to get your crew onboarded."
                    : "Your troop will be hidden from search. You'll need to invite each member by email. Only people you invite will be able to find and join your troop."}
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setShowCreate(false); setCreateStep(1); setCreatedTroopId(null); }} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: `1px solid ${theme.borderLight}`,
                  background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
                }}>Cancel</button>
                <button type="submit" disabled={loading} style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  background: theme.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: loading ? "wait" : "pointer", fontFamily: fontDisplay, letterSpacing: 0.3,
                }}>{loading ? "..." : "Create"}</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
