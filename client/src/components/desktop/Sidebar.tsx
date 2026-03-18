import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar as CalendarIcon, ClipboardCheck, Map, Backpack, FileText, FolderOpen,
  Home, Settings, LogOut, ChevronLeft, ChevronRight, HelpCircle, User as UserIcon,
  Shield,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { fontBody, fontDisplay } from "../../utils/theme";
import Logo from "../Logo";
import type { User } from "../../types";

interface SidebarProps {
  user: User;
  view: string;
  setView: (v: string) => void;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  adventureName: string | null;
  troopName: string | null;
  onGoHome: () => void;
  onAdminClick: () => void;
  onViewProfile: () => void;
  onHelpClick: () => void;
  onLogout: () => void;
  onGlobalAdminClick?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  globalAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "calendar", label: "Training", icon: CalendarIcon },
  { key: "skills", label: "Readiness", icon: ClipboardCheck },
  { key: "itinerary", label: "Itinerary", icon: Map },
  { key: "gear", label: "Gear", icon: Backpack },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "docs", label: "Docs", icon: FolderOpen },
];

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;
const STORAGE_KEY = "sidebar-collapsed";

export default function Sidebar({
  user, view, setView, isAdmin, isGlobalAdmin, adventureName, troopName,
  onGoHome, onAdminClick, onViewProfile, onHelpClick, onLogout, onGlobalAdminClick,
}: SidebarProps) {
  const { theme, mode } = useTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // Sidebar always uses light-on-dark text (forest gradient background)
  const sidebarText = "#E8E0D4";
  const sidebarTextDim = "#B8CC9A";
  const sidebarTextMuted = "#7A9A5A";
  const sidebarBorder = "rgba(255,255,255,0.08)";

  // Forest gradient — matches header, runs top-to-bottom
  const gradientLight = "linear-gradient(180deg, #3A4D2A 0%, #4E6635 55%, #6B8847 100%)";
  const gradientDark = "linear-gradient(180deg, #1A2412 0%, #2A3620 55%, #3A4D2A 100%)";
  const gradient = mode === "light" ? gradientLight : gradientDark;

  // Active item background
  const activeBg = mode === "light" ? "rgba(255,255,255,0.15)" : "rgba(184,204,154,0.12)";
  const hoverBg = "rgba(255,255,255,0.08)";

  return (
    <div style={{
      width, minWidth: width, height: "100vh", position: "sticky", top: 0,
      background: gradient, display: "flex", flexDirection: "column",
      transition: "width 0.2s ease, min-width 0.2s ease",
      borderRight: `1px solid ${sidebarBorder}`,
      zIndex: 100, flexShrink: 0,
    }}>
      {/* Logo / Brand */}
      <div style={{
        padding: collapsed ? "16px 0" : "16px 16px",
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
        borderBottom: `1px solid ${sidebarBorder}`,
        minHeight: 56,
      }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          <Logo size={28} />
        </div>
        {!collapsed && (
          <span style={{
            fontFamily: fontDisplay, fontSize: 16, fontWeight: 700,
            color: sidebarText, letterSpacing: -0.3,
            whiteSpace: "nowrap", overflow: "hidden",
          }}>
            TrailLog
          </span>
        )}
      </div>

      {/* Adventure / Troop context */}
      {!collapsed && (troopName || adventureName) && (
        <div style={{
          padding: "12px 16px 8px",
          borderBottom: `1px solid ${sidebarBorder}`,
        }}>
          {troopName && (
            <div style={{
              fontSize: 11, fontWeight: 600, fontFamily: fontBody,
              color: sidebarTextMuted, textTransform: "uppercase", letterSpacing: 0.5,
              marginBottom: 2,
            }}>
              {troopName}
            </div>
          )}
          {adventureName && (
            <div style={{
              fontSize: 13, fontWeight: 700, fontFamily: fontDisplay,
              color: sidebarText,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {adventureName}
            </div>
          )}
        </div>
      )}

      {/* Home button */}
      <div style={{ padding: "8px 8px 4px" }}>
        <SidebarItem
          icon={Home} label="Home" active={false}
          collapsed={collapsed} onClick={onGoHome}
          textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
        />
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
        <div style={{
          fontSize: 10, fontWeight: 600, fontFamily: fontBody,
          color: sidebarTextMuted, textTransform: "uppercase", letterSpacing: 0.8,
          padding: collapsed ? "8px 0" : "8px 8px",
          textAlign: collapsed ? "center" : "left",
        }}>
          {!collapsed && "Views"}
        </div>
        {NAV_ITEMS.map(item => (
          <SidebarItem
            key={item.key}
            icon={item.icon} label={item.label}
            active={view === item.key}
            collapsed={collapsed}
            onClick={() => setView(item.key)}
            textColor={sidebarText} textDimColor={sidebarTextDim}
            hoverBg={hoverBg} activeBg={activeBg}
          />
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{
        padding: "8px 8px 12px",
        borderTop: `1px solid ${sidebarBorder}`,
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {isAdmin && (
          <SidebarItem
            icon={Settings} label="Admin Panel" active={false}
            collapsed={collapsed} onClick={onAdminClick}
            textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
          />
        )}
        {isGlobalAdmin && onGlobalAdminClick && (
          <SidebarItem
            icon={Shield} label="Global Admin" active={false}
            collapsed={collapsed} onClick={onGlobalAdminClick}
            textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
          />
        )}
        <SidebarItem
          icon={UserIcon} label="Profile" active={false}
          collapsed={collapsed} onClick={onViewProfile}
          textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
        />
        <SidebarItem
          icon={HelpCircle} label="Help" active={false}
          collapsed={collapsed} onClick={onHelpClick}
          textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
        />
        <SidebarItem
          icon={LogOut} label="Sign Out" active={false}
          collapsed={collapsed} onClick={onLogout}
          textColor={sidebarTextDim} hoverBg={hoverBg} activeBg={activeBg}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", height: 32, borderRadius: 8,
            border: "none", background: "transparent", cursor: "pointer",
            color: sidebarTextMuted, transition: "background 0.15s ease",
            marginTop: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar nav item ──
interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  textColor: string;
  textDimColor?: string;
  hoverBg: string;
  activeBg: string;
}

function SidebarItem({ icon: Icon, label, active, collapsed, onClick, textColor, hoverBg, activeBg }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", height: 36, padding: collapsed ? "0" : "0 8px",
        borderRadius: 8, border: "none", cursor: "pointer",
        background: active ? activeBg : "transparent",
        color: active ? "#fff" : textColor,
        fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: fontBody,
        transition: "background 0.15s ease",
        justifyContent: collapsed ? "center" : "flex-start",
        borderLeft: active ? "3px solid #B8CC9A" : "3px solid transparent",
        position: "relative",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
