import { MONTHS_AHEAD, MONTH_NAMES, DAYS_FULL } from "./constants";
import type { MonthRange, DateEntry } from "../types";

export function getMonthsRange(): MonthRange[] {
  const ms: MonthRange[] = [];
  const n = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(n.getFullYear(), n.getMonth() + i, 1);
    ms.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return ms;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(y, m, d).getDay();
}

export function isPast(y: number, m: number, d: number): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return new Date(y, m, d) < t;
}

export function formatDateShort(k: string): string {
  const d = parseDateKey(k);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function formatDateFull(k: string): string {
  const d = parseDateKey(k);
  return `${DAYS_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// Strip legacy period suffixes: "2026-03-15:am" → "2026-03-15"
export function normalizeDateEntry(entry: string): string {
  const idx = entry.lastIndexOf(":");
  if (idx > 0 && ["am", "pm", "all"].includes(entry.slice(idx + 1))) {
    return entry.slice(0, idx);
  }
  return entry;
}

// Backward-compat wrapper
export function parseDateEntry(entry: string): DateEntry {
  return { date: normalizeDateEntry(entry), period: "all" };
}
