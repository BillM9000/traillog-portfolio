import { useState, useEffect, useMemo } from "react";

export function useCountdown(trekDates) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!trekDates) return {};
    // Support legacy single date or new trekDates object
    const dates = (trekDates && trekDates.depart !== undefined) ? trekDates : null;
    if (!dates) {
      // Legacy: single date passed
      const target = trekDates instanceof Date ? trekDates : new Date(trekDates + "T00:00:00");
      const diff = target - now;
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, gone: true, label: "Trek" };
      const days = Math.floor(diff / 86400000);
      return { days, hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), weeks: Math.floor(days / 7), remDays: days % 7, gone: false, label: "Trek" };
    }

    const { depart, arrive, return: ret, home } = dates;
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    if (depart && today < depart) {
      const diff = depart - now;
      const days = Math.floor(diff / 86400000);
      return { days, hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), weeks: Math.floor(days / 7), remDays: days % 7, gone: false, phase: "pre", label: "Departure" };
    }
    if (arrive && today < arrive) {
      const diff = arrive - now;
      const days = Math.floor(diff / 86400000);
      return { days, hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), weeks: Math.floor(days / 7), remDays: days % 7, gone: false, phase: "travel_there", label: "Arrival at Philmont" };
    }
    if (ret && today < ret) {
      const daysIn = arrive ? Math.floor((today - arrive) / 86400000) + 1 : 0;
      return { phase: "on_trek", label: `Day ${daysIn} of Trek`, gone: false, onTrek: true };
    }
    if (home && today < home) {
      const diff = home - now;
      const days = Math.floor(diff / 86400000);
      return { days, hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), weeks: Math.floor(days / 7), remDays: days % 7, gone: false, phase: "travel_back", label: "Home" };
    }
    if (depart || arrive) {
      return { gone: true, phase: "complete", label: "Welcome home! Time to share stories" };
    }
    return {};
  }, [trekDates, now]);
}
