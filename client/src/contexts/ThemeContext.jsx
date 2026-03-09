import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const dark = {
  name: "dark",
  bg: "#1a1f1c",
  bgAlt: "#232e27",
  bgCard: "#232e27",
  bgInput: "#232e27",
  bgHeader: "linear-gradient(135deg,#2d3830 0%,#1a2420 100%)",
  bgCountdown: "#1a2420",
  bgTab: "#1a2420",
  bgTabActive: "#3d5a45",
  bgHover: "#2a352e",
  border: "#2a332c",
  borderLight: "#3d4a40",
  borderAccent: "#3d5a45",
  text: "#e8e4df",
  textMuted: "#a0b0a0",
  textDim: "#6a7a6a",
  textDimmer: "#5a6a5a",
  textDimmest: "#4a5a4a",
  heading: "#d4c8a8",
  accent: "#4a7a55",
  accentLight: "#7aba7a",
  accentBg: "#2a3d2e",
  warn: "#8a6a5a",
  warnBg: "#5a4030",
  danger: "#c06040",
  gold: "#d4aa6a",
  goldDim: "#8a6a4a",
  statBg: "#2a352e",
  heatLow: "rgba(74,122,85,0.25)",
  heatMed: "rgba(74,122,85,0.55)",
  heatHigh: "rgba(74,122,85,0.85)",
  heatFull: "#5aaa65",
  weekendBg: "#222b25",
  selectedBg: "#4a7a55",
  selectedText: "#fff",
  progressBg: "#1a2420",
  memberDot: "#6a9a6a",
  shadow: "none",
};

const light = {
  name: "light",
  bg: "#f5f3ef",
  bgAlt: "#eae7e1",
  bgCard: "#ffffff",
  bgInput: "#ffffff",
  bgHeader: "linear-gradient(135deg,#3d5a45 0%,#2d4835 100%)",
  bgCountdown: "#f0ede7",
  bgTab: "#e8e5df",
  bgTabActive: "#4a7a55",
  bgHover: "#e8e5df",
  border: "#ddd8d0",
  borderLight: "#ccc7bf",
  borderAccent: "#4a7a55",
  text: "#2d3830",
  textMuted: "#5a6a5a",
  textDim: "#7a8a7a",
  textDimmer: "#8a9a8a",
  textDimmest: "#9aaa9a",
  heading: "#2d3830",
  accent: "#4a7a55",
  accentLight: "#3d6a45",
  accentBg: "#e0f0e4",
  warn: "#8a6a5a",
  warnBg: "#f0e0d0",
  danger: "#c06040",
  gold: "#8a6a30",
  goldDim: "#a08a60",
  statBg: "#e8e5df",
  heatLow: "rgba(74,122,85,0.15)",
  heatMed: "rgba(74,122,85,0.35)",
  heatHigh: "rgba(74,122,85,0.55)",
  heatFull: "#4a9a55",
  weekendBg: "#ece9e3",
  selectedBg: "#4a7a55",
  selectedText: "#fff",
  progressBg: "#e0ddd7",
  memberDot: "#5a9a65",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("theme") || "light");
  const theme = mode === "light" ? light : dark;

  useEffect(() => {
    localStorage.setItem("theme", mode);
    document.body.style.background = mode === "light" ? light.bg : dark.bg;
  }, [mode]);

  const toggle = () => setMode(m => m === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
