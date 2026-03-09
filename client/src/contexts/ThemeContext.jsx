import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const dark = {
  name: "dark",
  bg: "#1A1F16",
  bgAlt: "#252B1F",
  bgCard: "#252B1F",
  bgInput: "#2E3328",
  bgHeader: "linear-gradient(175deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)",
  bgCountdown: "#1A2412",
  bgTab: "#1A1F16",
  bgTabActive: "#B8CC9A",
  bgHover: "#2E3328",
  border: "#3A3D34",
  borderLight: "#4A4D40",
  borderAccent: "#7A9A5A",
  borderAmber: "#6B5420",
  text: "#E8E0D4",
  textMuted: "#B0A898",
  textDim: "#8B8478",
  textDimmer: "#6B6458",
  textDimmest: "#4A4D40",
  textOnDark: "#E8E0D4",
  textOnDarkSub: "#B8CC9A",
  textOnDarkDim: "#7A9A5A",
  heading: "#E8E0D4",
  accent: "#8BA868",
  accentLight: "#B8CC9A",
  accentPale: "#3A4D2A",
  accentBg: "#2E3328",
  warn: "#8a6a5a",
  warnBg: "#2E2618",
  danger: "#c06040",
  gold: "#E8A84C",
  goldDim: "#8a6a4a",
  urgency: "#E8A84C",
  urgencyBg: "#2E2618",
  urgencyBgEnd: "#3A2E1A",
  forestDeep: "#B8CC9A",
  forestMid: "#4E6635",
  forestLight: "#6B8847",
  pillActiveBg: "#B8CC9A",
  pillActiveText: "#1A1F16",
  pillInactiveBg: "#2E3328",
  pillInactiveText: "#8B8478",
  statBg: "#252B1F",
  heatLow: "rgba(139,168,104,0.2)",
  heatMed: "rgba(139,168,104,0.4)",
  heatHigh: "rgba(139,168,104,0.65)",
  heatFull: "#8BA868",
  weekendBg: "#222b1f",
  selectedBg: "#8BA868",
  selectedText: "#1A1F16",
  progressBg: "#1A2412",
  memberDot: "#7A9A5A",
  shadow: "none",
};

const light = {
  name: "light",
  bg: "#FDFAF5",
  bgAlt: "#F3F0E8",
  bgCard: "#F3F0E8",
  bgInput: "#FDFAF5",
  bgHeader: "linear-gradient(175deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)",
  bgCountdown: "#F3F0E8",
  bgTab: "#FDFAF5",
  bgTabActive: "#3A4D2A",
  bgHover: "#EDE7DB",
  border: "#DDD6C8",
  borderLight: "#C4B599",
  borderAccent: "#5B7A3A",
  borderAmber: "#E8C896",
  text: "#2C2416",
  textMuted: "#6B5D4D",
  textDim: "#8B7D6B",
  textDimmer: "#A09080",
  textDimmest: "#C4B599",
  textOnDark: "#FDFAF5",
  textOnDarkSub: "#D4E4B8",
  textOnDarkDim: "#B8CC9A",
  heading: "#2C2416",
  accent: "#5B7A3A",
  accentLight: "#B8CC9A",
  accentPale: "#D4E4B8",
  accentBg: "#D4E4B8",
  warn: "#8a6a5a",
  warnBg: "#FFF3E0",
  danger: "#c06040",
  gold: "#C4A035",
  goldDim: "#a08a60",
  urgency: "#C47A2A",
  urgencyBg: "#FFF3E0",
  urgencyBgEnd: "#FFE8CC",
  forestDeep: "#3A4D2A",
  forestMid: "#4E6635",
  forestLight: "#6B8847",
  pillActiveBg: "#3A4D2A",
  pillActiveText: "#FDFAF5",
  pillInactiveBg: "#EDE7DB",
  pillInactiveText: "#6B5D4D",
  statBg: "#F3F0E8",
  heatLow: "rgba(91,122,58,0.15)",
  heatMed: "rgba(91,122,58,0.35)",
  heatHigh: "rgba(91,122,58,0.55)",
  heatFull: "#5B7A3A",
  weekendBg: "#F3F0E8",
  selectedBg: "#5B7A3A",
  selectedText: "#FDFAF5",
  progressBg: "#EDE7DB",
  memberDot: "#5B7A3A",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
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
