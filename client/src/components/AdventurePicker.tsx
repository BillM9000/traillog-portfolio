import { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";
import clsx from "clsx";
import type { User, Adventure, AdventureType } from "../types";

interface Troop {
  id: number;
  name: string;
  council?: string;
  location?: string;
}

interface Itinerary {
  id: string;
  name: string;
  days: number;
  miles: number;
  rating: string;
  stops?: unknown[];
}

interface AdventureForm {
  name: string;
  depart_date: string;
  arrive_date: string;
  return_date: string;
  home_date: string;
  itinerary_id: string;
  adventure_type: string;
}

interface AdventureWithStatus extends Adventure {
  status?: "active" | "archived";
}

interface AdventurePickerProps {
  user: User;
  troop: Troop;
  isAdmin: boolean;
  onSelect: (adventureId: number) => void;
  onBack: () => void;
  onLogout: () => void;
  skipAutoSelect?: boolean;
  isGlobalAdmin?: boolean;
  onGlobalAdminClick?: () => void;
}

export default function AdventurePicker({ user, troop, isAdmin, onSelect, onBack, onLogout, skipAutoSelect, isGlobalAdmin, onGlobalAdminClick }: AdventurePickerProps) {
  const { theme } = useTheme();
  const [adventures, setAdventures] = useState<AdventureWithStatus[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AdventureForm>({ name: "", depart_date: "", arrive_date: "", return_date: "", home_date: "", itinerary_id: "", adventure_type: "philmont" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getAdventures(troop.id).then((advs: AdventureWithStatus[]) => {
      setAdventures(advs);
      // Auto-enter if only 1 active adventure (unless user explicitly navigated back)
      const active = advs.filter(a => a.status === "active");
      if (active.length === 1 && !skipAutoSelect) onSelect(active[0].id);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [troop.id]);

  const openCreate = async () => {
    if (itineraries.length === 0) {
      try { setItineraries(await api.getItineraries() as unknown as Itinerary[]); } catch {}
    }
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Adventure name required");
    setLoading(true);
    setError("");
    try {
      const adv = await api.createAdventure(troop.id, form as unknown as Record<string, unknown>);
      onSelect(adv.id);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-tl-bg flex items-center justify-center">
        <div className="text-tl-text-dim text-sm font-body">Loading adventures...</div>
      </div>
    );
  }

  const activeAdventures = adventures.filter(a => a.status === "active");

  return (
    <div className="min-h-screen bg-tl-bg font-body text-tl-text">
      <div className="py-[18px] px-5 border-b border-tl-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div>
            <h1 className="font-display text-xl font-extrabold text-tl-heading m-0">
              {troop.name}
            </h1>
            {troop.council && (
              <div className="text-[11px] text-tl-text-muted font-body">
                {[troop.council, troop.location].filter(Boolean).join(" \u00B7 ")}
              </div>
            )}
            <div className="text-[11px] text-tl-text-dim font-body">Select an adventure</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[11px] text-tl-accent bg-transparent border border-tl-border-accent py-1 px-2.5 rounded-[5px] cursor-pointer font-body font-semibold">
            Back
          </button>
          {isGlobalAdmin && (
            <button onClick={onGlobalAdminClick} className="text-[11px] text-tl-accent bg-transparent border border-tl-accent/25 py-1 px-2.5 rounded-[5px] cursor-pointer font-body font-semibold">
              {"\uD83C\uDF10"} Platform Admin
            </button>
          )}
          <button onClick={onLogout} className="text-[11px] text-tl-warn bg-transparent border border-tl-warn-bg py-1 px-2.5 rounded-[5px] cursor-pointer font-body font-semibold">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-[500px] mx-auto py-6 px-5">
        <div className="tl-card">
          <div className="tl-card-title">Adventures</div>
          {activeAdventures.length === 0 && !showCreate ? (
            <p className="text-xs text-tl-text-dim italic">
              No adventures yet. {isAdmin ? "Create one to get started!" : "Ask an admin to create an adventure."}
            </p>
          ) : (
            activeAdventures.map(a => (
              <div key={a.id} onClick={() => onSelect(a.id)}
                className="flex items-center justify-between py-3 px-3.5 bg-tl-bg-alt rounded-btn mb-1.5 border border-tl-border cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <span className="text-[22px]">{(ADVENTURE_TYPES as AdventureType[]).find(t => t.id === a.adventure_type)?.icon || "\uD83C\uDFD4\uFE0F"}</span>
                  <div>
                    <div className="text-sm font-bold text-tl-heading font-display">{a.name}</div>
                    <div className="text-[11px] text-tl-text-dim mt-0.5">
                      {a.itinerary_id && `Itinerary ${a.itinerary_id}`}
                      {(a.arrive_date || a.trek_date) && ` \u2022 ${a.arrive_date || a.trek_date}`}
                    </div>
                  </div>
                </div>
                <span className="text-lg text-tl-text-dimmer">{"\u203A"}</span>
              </div>
            ))
          )}
        </div>

        {isAdmin && !showCreate && (
          <button onClick={openCreate}
            className="w-full py-3 rounded-btn border-[1.5px] border-dashed border-tl-border-light bg-transparent text-tl-accent text-[13px] font-semibold cursor-pointer font-body">
            + Create Adventure
          </button>
        )}

        {isAdmin && showCreate && (
          <div className="tl-card">
            <div className="tl-card-title">New Adventure</div>
            <form onSubmit={handleCreate}>
              {/* Adventure Type Selector */}
              <div className="mb-2.5">
                <label className="text-[9px] font-bold text-tl-text-dim uppercase mb-1 block">Adventure Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(ADVENTURE_TYPES as AdventureType[]).map(t => (
                    <button key={t.id} type="button" disabled={!t.enabled}
                      onClick={() => t.enabled && setForm({ ...form, adventure_type: t.id })}
                      className={clsx(
                        "py-2.5 px-3 rounded-btn cursor-default text-left font-body relative",
                        form.adventure_type === t.id
                          ? "border-2 border-tl-accent bg-tl-accent-bg"
                          : "border-[1.5px] border-tl-border-light bg-tl-bg-alt",
                        t.enabled ? "cursor-pointer opacity-100" : "opacity-45"
                      )}
                    >
                      <div className="text-sm mb-0.5">{t.icon}</div>
                      <div className={clsx("text-xs font-bold", t.enabled ? "text-tl-heading" : "text-tl-text-dim")}>{t.name}</div>
                      <div className="text-[10px] text-tl-text-dim">{t.location}</div>
                      {!t.enabled && (
                        <div className="absolute top-1.5 right-2 text-[8px] font-bold text-tl-text-dim bg-tl-border py-0.5 px-1.5 rounded uppercase tracking-wide">
                          Coming Soon
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={`Adventure name (e.g. ${((ADVENTURE_TYPES as AdventureType[]).find(t => t.id === form.adventure_type)?.name || "Philmont")} 2026)`}
                className="tl-input w-full mb-2" required />
              {(() => {
                const labels = (ADVENTURE_TYPES as AdventureType[]).find(t => t.id === form.adventure_type)?.dateLabels || (ADVENTURE_TYPES as AdventureType[])[0].dateLabels;
                return (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <div>
                      <label className="text-[9px] font-bold text-tl-text-dim uppercase">{labels.depart}</label>
                      <input value={form.depart_date} onChange={e => setForm({ ...form, depart_date: e.target.value })} type="date" className="tl-input w-full !mb-0" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-tl-text-dim uppercase">{labels.arrive}</label>
                      <input value={form.arrive_date} onChange={e => setForm({ ...form, arrive_date: e.target.value })} type="date" className="tl-input w-full !mb-0" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-tl-text-dim uppercase">{labels.return}</label>
                      <input value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} type="date" className="tl-input w-full !mb-0" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-tl-text-dim uppercase">{labels.home}</label>
                      <input value={form.home_date} onChange={e => setForm({ ...form, home_date: e.target.value })} type="date" className="tl-input w-full !mb-0" />
                    </div>
                  </div>
                );
              })()}
              <select value={form.itinerary_id} onChange={e => setForm({ ...form, itinerary_id: e.target.value })}
                className={clsx("tl-input w-full", form.itinerary_id ? "text-tl-text" : "text-tl-text-dim")}>
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
              {error && <div className="text-xs text-tl-danger mb-2">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-[7px] border border-tl-border-light bg-tl-bg-alt text-tl-text-muted text-xs font-semibold cursor-pointer font-body">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className={clsx(
                    "flex-1 py-2.5 rounded-[7px] border-none bg-tl-accent text-white text-xs font-semibold font-body",
                    loading ? "cursor-wait" : "cursor-pointer"
                  )}>
                  {loading ? "..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
