import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { api } from "../api";

const AdventureContext = createContext(null);

export function AdventureProvider({ adventureId, troopId, children }) {
  const [adventure, setAdventure] = useState(null);
  const [crews, setCrews] = useState([]);
  const [selectedCrewId, setSelectedCrewId] = useState(null);
  const [members, setMembers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [achievements, setAchievements] = useState({ badges: [], milestones: [] });
  const [gearCatalog, setGearCatalog] = useState([]);
  const [memberGearMap, setMemberGearMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Selected crew object (null when "all" is selected)
  const selectedCrew = useMemo(() => {
    if (!selectedCrewId || selectedCrewId === "all" || crews.length === 0) return null;
    return crews.find(c => c.id === selectedCrewId) || null;
  }, [crews, selectedCrewId]);

  const refreshAdventure = useCallback(async () => {
    if (!adventureId) return;
    try {
      const adv = await api.getAdventure(adventureId);
      setAdventure(adv);
    } catch (e) {
      console.error("Failed to load adventure:", e);
    }
  }, [adventureId]);

  const refreshCrews = useCallback(async () => {
    if (!adventureId) return;
    try {
      const crewList = await api.getCrews(adventureId);
      setCrews(crewList);
      // Auto-select first crew if none selected or current selection invalid
      if (crewList.length > 0) {
        setSelectedCrewId(prev => {
          if (prev && crewList.some(c => c.id === prev)) return prev;
          return crewList[0].id;
        });
      }
    } catch (e) {
      console.error("Failed to load crews:", e);
    }
  }, [adventureId]);

  // Fetch itinerary when selected crew changes (crew owns itinerary_id)
  useEffect(() => {
    if (!selectedCrew) {
      // Fallback: use adventure itinerary_id if no crew
      if (adventure?.itinerary_id) {
        api.getItinerary(adventure.itinerary_id).then(setItinerary).catch(() => setItinerary(null));
      } else {
        setItinerary(null);
      }
      return;
    }
    if (selectedCrew.itinerary_id) {
      api.getItinerary(selectedCrew.itinerary_id).then(setItinerary).catch(() => setItinerary(null));
    } else {
      setItinerary(null);
    }
  }, [selectedCrew, adventure]);

  const refreshMembers = useCallback(async () => {
    if (selectedCrewId === "all") {
      // Multi-crew view: fetch all crew members with crew_name labels
      if (!adventureId) return;
      try {
        setMembers(await api.getAllCrewMembers(adventureId));
      } catch (e) {
        console.error("Failed to load all crew members:", e);
      }
      return;
    }
    if (!selectedCrewId) {
      // Fallback to adventure members if no crew selected yet
      if (!adventureId) return;
      try {
        setMembers(await api.getAdventureMembers(adventureId));
      } catch (e) {
        console.error("Failed to load members:", e);
      }
      return;
    }
    try {
      setMembers(await api.getCrewMembers(selectedCrewId));
    } catch (e) {
      console.error("Failed to load crew members:", e);
    }
  }, [adventureId, selectedCrewId]);

  const refreshSkills = useCallback(async () => {
    if (!adventureId) return;
    try {
      // Skills stay adventure-scoped (shared across crews)
      setSkills(await api.getAdventureSkills(adventureId));
    } catch (e) {
      console.error("Failed to load skills:", e);
    }
  }, [adventureId]);

  const refreshAchievements = useCallback(async () => {
    if (!adventureId) return;
    try {
      // Achievements stay adventure-scoped for now
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
      // Gear is still adventure-scoped in member_gear table
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
    await Promise.all([refreshAdventure(), refreshCrews(), refreshMembers(), refreshSkills(), refreshAchievements(), refreshGearCatalog(), refreshMemberGear()]);
  }, [refreshAdventure, refreshCrews, refreshMembers, refreshSkills, refreshAchievements, refreshGearCatalog, refreshMemberGear]);

  // Initial load
  useEffect(() => {
    if (!adventureId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([refreshAdventure(), refreshCrews()])
      .then(() => Promise.all([refreshMembers(), refreshSkills(), refreshAchievements(), refreshGearCatalog(), refreshMemberGear()]))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adventureId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch members when selected crew changes (after initial load)
  useEffect(() => {
    if (loading || !selectedCrewId) return;
    refreshMembers();
  }, [selectedCrewId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart trek dates from selected crew (source of truth), fallback to adventure
  const trekDates = useMemo(() => {
    const src = selectedCrew || adventure;
    if (!src) return null;
    const parse = (d) => d ? new Date(d + "T00:00:00") : null;
    return {
      depart: parse(src.depart_date),
      arrive: parse(src.arrive_date),
      return: parse(src.return_date),
      home: parse(src.home_date),
      // Legacy compat
      trek: parse(src.trek_date || src.arrive_date),
    };
  }, [selectedCrew, adventure]);

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
      // Crew state
      crews, selectedCrewId, selectedCrew, setSelectedCrewId, refreshCrews,
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
