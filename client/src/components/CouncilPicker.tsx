import { useState, useEffect, useRef, CSSProperties } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import type { Council, ThemeColors } from "../types";

interface CouncilPickerProps {
  value: number | string | null;
  onChange: (value: number | string) => void;
  style?: CSSProperties;
}

let councilsCache: Council[] | null = null;

export default function CouncilPicker({ value, onChange, style }: CouncilPickerProps) {
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

  const inputStyle: CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 13,
    border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    ...style,
  };

  if (customMode) {
    return (
      <div ref={ref} style={{ position: "relative", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 4 }}>
          Enter your council name exactly as it appears on scouting.org
        </div>
        <input
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="e.g. Pathway to Adventure Council"
          style={inputStyle}
          autoFocus
        />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            onClick={() => {
              if (customName.trim()) {
                onChange("custom:" + customName.trim());
                setCustomMode(false);
              }
            }}
            disabled={!customName.trim()}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: customName.trim() ? theme.accent : theme.borderLight,
              color: customName.trim() ? "#fff" : theme.textDim,
              border: "none", cursor: customName.trim() ? "pointer" : "default",
            }}
          >
            Use This Council
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomName(""); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              background: "transparent", color: theme.textDim,
              border: `1px solid ${theme.borderLight}`, cursor: "pointer",
            }}
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 8 }}>
      <input
        value={open ? search : (selected ? selected.name : isCustomValue ? customDisplayName : "")}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        placeholder="Search council by name, city, or state..."
        style={inputStyle}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          maxHeight: 220, overflowY: "auto", background: theme.bg,
          border: `1.5px solid ${theme.border}`, borderRadius: 6, marginTop: 2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {filtered.slice(0, 50).map(c => (
            <div key={c.id}
              onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              style={{
                padding: "6px 10px", fontSize: 12, cursor: "pointer",
                background: c.id === value ? theme.accent + "20" : "transparent",
                color: theme.text,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.accent + "15")}
              onMouseLeave={e => (e.currentTarget.style.background = c.id === value ? theme.accent + "20" : "transparent")}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <span style={{ color: theme.textDim, marginLeft: 6, fontSize: 11 }}>
                {c.city && c.state ? `${c.city}, ${c.state}` : ""}
                {c.council_num ? ` · #${c.council_num}` : ""}
              </span>
            </div>
          ))}
          {filtered.length === 0 && search && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: theme.textDim }}>
              No councils match "{search}"
            </div>
          )}
          {/* Don't see your council? */}
          <div
            onClick={() => { setOpen(false); setCustomMode(true); setCustomName(search || ""); }}
            style={{
              padding: "8px 10px", fontSize: 11, cursor: "pointer",
              borderTop: `1px solid ${theme.borderLight}`,
              color: theme.accent, fontWeight: 600,
            }}
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
