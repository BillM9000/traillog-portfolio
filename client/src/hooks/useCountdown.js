import { useState, useEffect } from "react";

export function useCountdown(trekDate) {
  const [countdown, setCountdown] = useState({});

  useEffect(() => {
    if (!trekDate) { setCountdown({}); return; }
    const target = trekDate instanceof Date ? trekDate : new Date(trekDate + "T00:00:00");
    const calc = () => {
      const now = new Date();
      const diff = target - now;
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
  }, [trekDate]);

  return countdown;
}
