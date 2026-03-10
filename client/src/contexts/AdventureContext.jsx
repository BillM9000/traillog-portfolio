import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { api } from "../api";

const AdventureContext = createContext(null);

export function AdventureProvider({ adventureId, troopId, children }) {
  const [adventure, setAdventure] = useState(null);
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [achievements, setAchievements] = useState({ badges: [], milestones: [] });
  const [gearCatalog, setGearCatalog] = useState([]);
  const [memberGearMap, setMemberGearMap] = useState({});
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

  const refreshAchievements = useCallback(async () => {
    if (!adventureId) return;
    try {
      setAchievements(await api.getAchievements(adventureId));
    } catch (e) {
      console.error("Failed to load achievements:", e);
    }
  }, [adventureId]);

  const refreshGearCatalog = useCallback(async () => {
    try {
      const catalog = await api.getGearCatalog(troopId);
      setGearCatalog(catalog);
    } catch (e) {
      console.error("Failed to load gear catalog:", e);
    }
  }, [troopId]);

  const refreshMemberGear = useCallback(async () => {
    if (!adventureId) return;
    try {
      const allGear = await api.getAdventureGearAll(adventureId);
      // Group by user_id
      const map = {};
      for (const g of allGear) {
        if (!map[g.user_id]) map[g.user_id] = [];
        map[g.user_id].push(g);
      }
      setMemberGearMap(map);
    } catch (e) {
      console.error("Failed to load member gear:", e);
    }
  }, [adventureId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAdventure(), refreshMembers(), refreshSkills(), refreshAchievements(), refreshGearCatalog(), refreshMemberGear()]);
  }, [refreshAdventure, refreshMembers, refreshSkills, refreshAchievements, refreshGearCatalog, refreshMemberGear]);

  // Initial load
  useEffect(() => {
    if (!adventureId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([refreshAdventure(), refreshMembers(), refreshSkills(), refreshAchievements(), refreshGearCatalog(), refreshMemberGear()])
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adventureId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart trek dates from adventure
  const trekDates = useMemo(() => {
    if (!adventure) return null;
    const parse = (d) => d ? new Date(d + "T00:00:00") : null;
    return {
      depart: parse(adventure.depart_date),
      arrive: parse(adventure.arrive_date),
      return: parse(adventure.return_date),
      home: parse(adventure.home_date),
      // Legacy compat
      trek: parse(adventure.trek_date || adventure.arrive_date),
    };
  }, [adventure]);

  // Legacy compat
  const trekDate = trekDates?.trek || null;

  // Optimistic update — patch a single member in-place without re-fetching
  const updateMemberLocally = useCallback((userId, patch) => {
    setMembers(prev => prev.map(m => {
      if (m.is_manual) return m.id === userId ? { ...m, ...patch } : m;
      return m.user_id === userId ? { ...m, ...patch } : m;
    }));
  }, []);

  // Trekking vs support members
  const trekkingMembers = useMemo(() => members.filter(m => m.participation === "trekking"), [members]);
  const supportMembers = useMemo(() => members.filter(m => m.participation === "support"), [members]);

  return (
    <AdventureContext.Provider value={{
      adventure, members, skills, itinerary, trekDate, trekDates, loading,
      achievements, trekkingMembers, supportMembers,
      adventureId, troopId,
      gearCatalog, memberGearMap,
      refreshAdventure, refreshMembers, refreshSkills, refreshAchievements,
      refreshGearCatalog, refreshMemberGear, refreshAll,
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
