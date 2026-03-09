import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api";

const AdventureContext = createContext(null);

export function AdventureProvider({ adventureId, children }) {
  const [adventure, setAdventure] = useState(null);
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAdventure = useCallback(async () => {
    if (!adventureId) return;
    try {
      const adv = await api.getAdventure(adventureId);
      setAdventure(adv);
      if (adv.itinerary_id) {
        const itin = await api.getItinerary(adv.itinerary_id);
        setItinerary(itin);
      }
    } catch (e) {
      console.error("Failed to load adventure:", e);
    }
  }, [adventureId]);

  const refreshMembers = useCallback(async () => {
    if (!adventureId) return;
    try {
      setMembers(await api.getAdventureMembers(adventureId));
    } catch (e) {
      console.error("Failed to load members:", e);
    }
  }, [adventureId]);

  const refreshSkills = useCallback(async () => {
    if (!adventureId) return;
    try {
      setSkills(await api.getAdventureSkills(adventureId));
    } catch (e) {
      console.error("Failed to load skills:", e);
    }
  }, [adventureId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAdventure(), refreshMembers(), refreshSkills()]);
  }, [refreshAdventure, refreshMembers, refreshSkills]);

  // Initial load — only show loading spinner on first mount
  useEffect(() => {
    if (!adventureId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([refreshAdventure(), refreshMembers(), refreshSkills()])
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adventureId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trek date from adventure
  const trekDate = adventure?.trek_date ? new Date(adventure.trek_date + "T00:00:00") : null;

  // Optimistic update — patch a single member in-place without re-fetching
  const updateMemberLocally = useCallback((userId, patch) => {
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, ...patch } : m));
  }, []);

  return (
    <AdventureContext.Provider value={{
      adventure, members, skills, itinerary, trekDate, loading,
      adventureId,
      refreshAdventure, refreshMembers, refreshSkills, refreshAll,
      updateMemberLocally,
    }}>
      {children}
    </AdventureContext.Provider>
  );
}

export function useAdventure() {
  const ctx = useContext(AdventureContext);
  if (!ctx) throw new Error("useAdventure must be inside AdventureProvider");
  return ctx;
}
