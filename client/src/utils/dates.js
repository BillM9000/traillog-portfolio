import { MONTHS_AHEAD, MONTH_NAMES, DAYS_FULL } from "./constants";

export function getMonthsRange() {
  const ms = [];
  const n = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(n.getFullYear(), n.getMonth() + i, 1);
    ms.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return ms;
}

export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayOfWeek(y, m, d) {
  return new Date(y, m, d).getDay();
}

export function isPast(y, m, d) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return new Date(y, m, d) < t;
}

export function formatDateShort(k) {
  const d = parseDateKey(k);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function formatDateFull(k) {
  const d = parseDateKey(k);
  return `${DAYS_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}
