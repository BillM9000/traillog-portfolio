import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import clsx from "clsx";
import type { Council } from "../types";

interface CouncilPickerProps {
  value: number | string | null;
  onChange: (value: number | string) => void;
  className?: string;
}

let councilsCache: Council[] | null = null;

export default function CouncilPicker({ value, onChange, className }: CouncilPickerProps) {
  const { theme } = useTheme();
  const [councils, setCouncils] = useState<Council[]>(councilsCache || []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (councilsCache) return;
    api.getCouncils().then((data: Council[]) => { councilsCache = data; setCouncils(data); }).catch(() => {});
  }, []);

  // Set display text from value (council_id or custom string)
  const isCustomValue = typeof value === "string" && value.startsWith("custom:");
  const customDisplayName = isCustomValue ? (value as string).slice(7) : "";
  const selected = !isCustomValue && value ? councils.find(c => c.id === value) : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCustomMode(false); } };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? councils.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase())) ||
        (c.state && c.state.toLowerCase().includes(search.toLowerCase())) ||
        (c.council_num && String(c.council_num).includes(search))
      )
    : councils;

  const inputClasses = clsx(
    "w-full py-[7px] px-2.5 rounded-[6px] text-[13px] border-[1.5px] border-tl-border bg-tl-bg text-tl-text font-[inherit] outline-none box-border",
    className
  );

  if (customMode) {
    return (
      <div ref={ref} className="relative mb-2">
        <div className="text-[11px] text-tl-text-dim mb-1">
          Enter your council name exactly as it appears on scouting.org
        </div>
        <input
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="e.g. Pathway to Adventure Council"
          className={inputClasses}
          autoFocus
        />
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={() => {
              if (customName.trim()) {
                onChange("custom:" + customName.trim());
                setCustomMode(false);
              }
            }}
            disabled={!customName.trim()}
            className={clsx(
              "py-[5px] px-3 rounded-[6px] text-xs font-semibold border-none",
              customName.trim()
                ? "bg-tl-accent text-white cursor-pointer"
                : "bg-tl-border-light text-tl-text-dim cursor-default"
            )}
          >
            Use This Council
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomName(""); }}
            className="py-[5px] px-3 rounded-[6px] text-xs bg-transparent text-tl-text-dim border border-tl-border-light cursor-pointer"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mb-2">
      <input
        value={open ? search : (selected ? selected.name : isCustomValue ? customDisplayName : "")}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        placeholder="Search council by name, city, or state..."
        className={inputClasses}
        autoComplete="off"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 z-[999] max-h-[220px] overflow-y-auto bg-tl-bg border-[1.5px] border-tl-border rounded-[6px] mt-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
          {filtered.slice(0, 50).map(c => (
            <div key={c.id}
              onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              className="px-2.5 py-1.5 text-xs cursor-pointer text-tl-text hover:bg-tl-accent/[0.08]"
              style={c.id === value ? { background: `${theme.accent}20` } : undefined}
              onMouseEnter={e => { if (c.id !== value) e.currentTarget.style.background = theme.accent + "15"; }}
              onMouseLeave={e => (e.currentTarget.style.background = c.id === value ? theme.accent + "20" : "transparent")}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-tl-text-dim ml-1.5 text-[11px]">
                {c.city && c.state ? `${c.city}, ${c.state}` : ""}
                {c.council_num ? ` · #${c.council_num}` : ""}
              </span>
            </div>
          ))}
          {filtered.length === 0 && search && (
            <div className="py-2 px-2.5 text-xs text-tl-text-dim">
              No councils match "{search}"
            </div>
          )}
          {/* Don't see your council? */}
          <div
            onClick={() => { setOpen(false); setCustomMode(true); setCustomName(search || ""); }}
            className="py-2 px-2.5 text-[11px] cursor-pointer border-t border-tl-border-light text-tl-accent font-semibold hover:bg-tl-accent/[0.06]"
            onMouseEnter={e => (e.currentTarget.style.background = theme.accent + "10")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Don't see your council? Enter it manually →
          </div>
        </div>
      )}
    </div>
  );
}
