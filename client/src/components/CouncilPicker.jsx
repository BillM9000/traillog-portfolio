import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";

let councilsCache = null;

export default function CouncilPicker({ value, onChange, style }) {
  const { theme } = useTheme();
  const [councils, setCouncils] = useState(councilsCache || []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (councilsCache) return;
    api.getCouncils().then(data => { councilsCache = data; setCouncils(data); }).catch(() => {});
  }, []);

  // Set display text from value (council_id)
  const selected = value ? councils.find(c => c.id === value) : null;

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? councils.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.state && c.state.toLowerCase().includes(search.toLowerCase())))
    : councils;

  const inputStyle = {
    width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 13,
    border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    ...style,
  };

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 8 }}>
      <input
        value={open ? search : (selected ? selected.name : "")}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        placeholder="Search council..."
        style={inputStyle}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          maxHeight: 200, overflowY: "auto", background: theme.bg,
          border: `1.5px solid ${theme.border}`, borderRadius: 6, marginTop: 2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: theme.textDim }}>No councils found</div>
          )}
          {filtered.slice(0, 50).map(c => (
            <div key={c.id}
              onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              style={{
                padding: "6px 10px", fontSize: 12, cursor: "pointer",
                background: c.id === value ? theme.accent + "20" : "transparent",
                color: theme.text,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.accent + "15"}
              onMouseLeave={e => e.currentTarget.style.background = c.id === value ? theme.accent + "20" : "transparent"}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              {c.city && c.state && <span style={{ color: theme.textDim, marginLeft: 6, fontSize: 11 }}>{c.city}, {c.state}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
