import { useState, useEffect } from "react";
import { TRAVEL_DATE } from "../utils/constants";

export function useCountdown() {
  const [countdown, setCountdown] = useState({});

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = TRAVEL_DATE - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, gone: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      setCountdown({ days, hours, minutes, seconds, weeks, remDays, gone: false });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return countdown;
}
