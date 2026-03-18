export type ToastType = "success" | "error" | "info" | "celebration";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ThemeColors {
  name: string;
  bg: string;
  bgAlt: string;
  bgCard: string;
  bgInput: string;
  bgHeader: string;
  bgCountdown: string;
  bgTab: string;
  bgTabActive: string;
  bgHover: string;
  border: string;
  borderLight: string;
  borderAccent: string;
  borderAmber: string;
  text: string;
  textMuted: string;
  textDim: string;
  textDimmer: string;
  textDimmest: string;
  textOnDark: string;
  textOnDarkSub: string;
  textOnDarkDim: string;
  heading: string;
  accent: string;
  accentLight: string;
  accentPale: string;
  accentBg: string;
  warn: string;
  warnBg: string;
  danger: string;
  gold: string;
  goldDim: string;
  urgency: string;
  urgencyBg: string;
  urgencyBgEnd: string;
  forestDeep: string;
  forestMid: string;
  forestLight: string;
  pillActiveBg: string;
  pillActiveText: string;
  pillInactiveBg: string;
  pillInactiveText: string;
  statBg: string;
  heatLow: string;
  heatMed: string;
  heatHigh: string;
  heatFull: string;
  weekendBg: string;
  selectedBg: string;
  selectedText: string;
  progressBg: string;
  memberDot: string;
  shadow: string;
}

export type ThemeMode = "light" | "dark";

export interface CountdownResult {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  weeks?: number;
  remDays?: number;
  gone?: boolean;
  phase?: "pre" | "travel_there" | "on_trek" | "travel_back" | "complete";
  label?: string;
  onTrek?: boolean;
}

export interface MonthRange {
  year: number;
  month: number;
}

export interface DateEntry {
  date: string;
  period: "all";
}

export interface AnnouncementSettings {
  maintenance_mode?: string;
  maintenance_message?: string;
  registration_open?: string;
  announcement_text?: string;
  announcement_type?: string;
  max_troops_per_user?: string;
}

export interface TrailBadgeDef {
  icon: string;
  title: string;
}

export interface JourneyWaypoint {
  pct: number;
  name: string;
  message: string;
}

export interface DashboardData {
  troops: DashboardTroop[];
  pending_requests: number;
  public_troops: DashboardTroop[];
}

export interface DashboardTroop {
  id: number;
  name: string;
  council: string | null;
  location: string | null;
  logo: string | null;
  member_count: number;
  adventure_count: number;
  crew_readiness: number | null;
  next_training: string | null;
}
