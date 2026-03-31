import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTheme } from "./ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TextureVariant = "topo" | "waves" | "aurora" | "rock";

export interface AdventureThemeDef {
  id: string;
  name: string;
  base: string;
  heroGradientLight: string;
  heroGradientDark: string;
  sidebarGradientLight: string;
  sidebarGradientDark: string;
  patchSvgUrl: string;
  accentColor: string;
  bgTexture: TextureVariant;
  textureSvgUrl: string;
}

export interface AdventureThemeContextValue {
  def: AdventureThemeDef;
  /** Mode-resolved hero gradient — use directly as CSS `background` */
  heroGradient: string;
  /** Mode-resolved sidebar gradient */
  sidebarGradient: string;
}

// ─── Texture SVG data URLs ────────────────────────────────────────────────────

// Topo contours (cross/plus pattern — matches current app exactly)
const TOPO_SVG = "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

// Wave lines (diagonal, for Sea Base)
const WAVES_SVG = "url(\"data:image/svg+xml,%3Csvg width='60' height='20' viewBox='0 0 60 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q15 0 30 10 Q45 20 60 10' stroke='white' stroke-width='1' fill='none' stroke-opacity='1'/%3E%3C/svg%3E\")";

// Aurora lines (horizontal bands, for Northern Tier)
const AURORA_SVG = "url(\"data:image/svg+xml,%3Csvg width='200' height='60' viewBox='0 0 200 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q50 10 100 20 Q150 30 200 20' stroke='white' stroke-width='1' fill='none' stroke-opacity='1'/%3E%3Cpath d='M0 40 Q50 30 100 40 Q150 50 200 40' stroke='white' stroke-width='0.6' fill='none' stroke-opacity='1'/%3E%3C/svg%3E\")";

// Rock texture (diagonal hatch, for Summit Bechtel)
const ROCK_SVG = "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0M-5 5L5-5M35 45L45 35' stroke='white' stroke-width='1' stroke-opacity='1'/%3E%3C/svg%3E\")";

// ─── Placeholder patch SVGs (inline, simple arrowheads) ──────────────────────
// Phase 2 will render these. Phase 3b replaces with final art assets.

const PHILMONT_PATCH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpolygon points='50,5 95,35 95,85 50,115 5,85 5,35' fill='%233A4D2A' stroke='%23C47A2A' stroke-width='3'/%3E%3Ctext x='50' y='65' text-anchor='middle' fill='%23FDFAF5' font-size='11' font-family='serif' font-weight='bold'%3EPHILMONT%3C/text%3E%3C/svg%3E";

const SEA_BASE_PATCH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpolygon points='50,5 95,35 95,85 50,115 5,85 5,35' fill='%231E5080' stroke='%2300B4A0' stroke-width='3'/%3E%3Ctext x='50' y='60' text-anchor='middle' fill='%23FDFAF5' font-size='10' font-family='serif' font-weight='bold'%3ESEA%3C/text%3E%3Ctext x='50' y='74' text-anchor='middle' fill='%23FDFAF5' font-size='10' font-family='serif' font-weight='bold'%3EBASE%3C/text%3E%3C/svg%3E";

const NORTHERN_TIER_PATCH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpolygon points='50,5 95,35 95,85 50,115 5,85 5,35' fill='%233A4A6C' stroke='%23C0C8D8' stroke-width='3'/%3E%3Ctext x='50' y='57' text-anchor='middle' fill='%23FDFAF5' font-size='9' font-family='serif' font-weight='bold'%3ENORTHERN%3C/text%3E%3Ctext x='50' y='71' text-anchor='middle' fill='%23FDFAF5' font-size='9' font-family='serif' font-weight='bold'%3ETIER%3C/text%3E%3C/svg%3E";

const SUMMIT_PATCH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpolygon points='50,5 95,35 95,85 50,115 5,85 5,35' fill='%233A2A2A' stroke='%23CC3333' stroke-width='3'/%3E%3Ctext x='50' y='60' text-anchor='middle' fill='%23FDFAF5' font-size='10' font-family='serif' font-weight='bold'%3ESUMMIT%3C/text%3E%3Ctext x='50' y='74' text-anchor='middle' fill='%23FDFAF5' font-size='10' font-family='serif' font-weight='bold'%3EBECHTEL%3C/text%3E%3C/svg%3E";

// ─── Theme definitions ────────────────────────────────────────────────────────

const ADVENTURE_THEME_DEFS: Record<string, AdventureThemeDef> = {
  philmont: {
    id: "philmont",
    name: "Philmont Scout Ranch",
    base: "Philmont Scout Ranch",
    heroGradientLight:    "linear-gradient(175deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)",
    heroGradientDark:     "linear-gradient(175deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)",
    sidebarGradientLight: "linear-gradient(180deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)",
    sidebarGradientDark:  "linear-gradient(180deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)",
    patchSvgUrl: PHILMONT_PATCH,
    accentColor: "#C47A2A",
    bgTexture: "topo",
    textureSvgUrl: TOPO_SVG,
  },
  northern_tier: {
    id: "northern_tier",
    name: "Northern Tier",
    base: "Northern Tier",
    heroGradientLight:    "linear-gradient(175deg, #2A3A5C 0%, #3A4A6C 55%, #5A6A8C 100%)",
    heroGradientDark:     "linear-gradient(175deg, #1A2236 0%, #222E4A 55%, #2E3A5C 100%)",
    sidebarGradientLight: "linear-gradient(180deg, #2A3A5C 0%, #3A4A6C 55%, #5A6A8C 100%)",
    sidebarGradientDark:  "linear-gradient(180deg, #1A2236 0%, #222E4A 55%, #2E3A5C 100%)",
    patchSvgUrl: NORTHERN_TIER_PATCH,
    accentColor: "#C0C8D8",
    bgTexture: "aurora",
    textureSvgUrl: AURORA_SVG,
  },
  sea_base: {
    id: "sea_base",
    name: "Florida Sea Base",
    base: "Florida Sea Base",
    heroGradientLight:    "linear-gradient(175deg, #1A3A5C 0%, #1E5080 55%, #2A6FA0 100%)",
    heroGradientDark:     "linear-gradient(175deg, #0E2236 0%, #142E4A 55%, #1A3E60 100%)",
    sidebarGradientLight: "linear-gradient(180deg, #1A3A5C 0%, #1E5080 55%, #2A6FA0 100%)",
    sidebarGradientDark:  "linear-gradient(180deg, #0E2236 0%, #142E4A 55%, #1A3E60 100%)",
    patchSvgUrl: SEA_BASE_PATCH,
    accentColor: "#00B4A0",
    bgTexture: "waves",
    textureSvgUrl: WAVES_SVG,
  },
  summit: {
    id: "summit",
    name: "Summit Bechtel Reserve",
    base: "Summit Bechtel Reserve",
    heroGradientLight:    "linear-gradient(175deg, #2A2A2A 0%, #3A2A2A 55%, #4A3030 100%)",
    heroGradientDark:     "linear-gradient(175deg, #1A1A1A 0%, #261818 55%, #321E1E 100%)",
    sidebarGradientLight: "linear-gradient(180deg, #2A2A2A 0%, #3A2A2A 55%, #4A3030 100%)",
    sidebarGradientDark:  "linear-gradient(180deg, #1A1A1A 0%, #261818 55%, #321E1E 100%)",
    patchSvgUrl: SUMMIT_PATCH,
    accentColor: "#CC3333",
    bgTexture: "rock",
    textureSvgUrl: ROCK_SVG,
  },
};

// Fallback to Philmont for any unknown type
const DEFAULT_THEME = ADVENTURE_THEME_DEFS.philmont;

// ─── Context ──────────────────────────────────────────────────────────────────

const AdventureThemeContext = createContext<AdventureThemeContextValue | undefined>(undefined);

interface AdventureThemeProviderProps {
  adventureType: string | null | undefined;
  children: ReactNode;
}

export function AdventureThemeProvider({ adventureType, children }: AdventureThemeProviderProps) {
  const { mode } = useTheme();

  const value = useMemo<AdventureThemeContextValue>(() => {
    const def = (adventureType && ADVENTURE_THEME_DEFS[adventureType]) || DEFAULT_THEME;
    const heroGradient = mode === "dark" ? def.heroGradientDark : def.heroGradientLight;
    const sidebarGradient = mode === "dark" ? def.sidebarGradientDark : def.sidebarGradientLight;
    return { def, heroGradient, sidebarGradient };
  }, [adventureType, mode]);

  return (
    <AdventureThemeContext.Provider value={value}>
      {children}
    </AdventureThemeContext.Provider>
  );
}

export function useAdventureTheme(): AdventureThemeContextValue {
  const ctx = useContext(AdventureThemeContext);
  if (!ctx) throw new Error("useAdventureTheme must be inside AdventureThemeProvider");
  return ctx;
}
