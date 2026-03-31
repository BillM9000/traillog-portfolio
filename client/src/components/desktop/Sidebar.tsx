import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar as CalendarIcon, ClipboardCheck, Map, Backpack, FileText, FolderOpen,
  Home, Settings, LogOut, ChevronLeft, ChevronRight, HelpCircle, User as UserIcon,
  Shield,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAdventureTheme } from "../../contexts/AdventureThemeContext";
import Logo from "../Logo";
import TroopLogo from "../TroopLogo";
import type { User } from "../../types";
import clsx from "clsx";

interface SidebarProps {
  user: User;
  view?: string | null;
  setView?: (v: string) => void;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  adventureName: string | null;
  troopName: string | null;
  troopId?: number | null;
  trekDates?: { depart: Date | null; arrive: Date | null; return: Date | null; home: Date | null } | null;
  memberCount?: number;
  trekkingCount?: number;
  onGoHome: () => void;
  onAdminClick?: () => void;
  onViewProfile: () => void;
  onHelpClick: () => void;
  onLogout: () => void;
  onGlobalAdminClick?: () => void;
  homeActive?: boolean;
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
  troopId, trekDates, memberCount, trekkingCount,
  onGoHome, onAdminClick, onViewProfile, onHelpClick, onLogout, onGlobalAdminClick,
  homeActive,
}: SidebarProps) {
  const { mode } = useTheme();
  const adventureTheme = useAdventureTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div
      className="h-screen sticky top-0 flex flex-col z-[100] shrink-0 border-r border-white/[0.08]"
      style={{
        width, minWidth: width, background: adventureTheme.sidebarGradient,
        transition: "width 0.2s ease, min-width 0.2s ease",
      }}
    >
      {/* Logo / Brand */}
      <div
        className={clsx(
          "flex items-center gap-2.5 border-b border-white/[0.08] min-h-[56px]",
          collapsed ? "justify-center py-4 px-0" : "justify-start py-4 px-5"
        )}
      >
        <div className="w-7 h-7 shrink-0">
          <Logo size={28} />
        </div>
        {!collapsed && (
          <span className="font-display text-base font-bold text-tl-text-on-dark tracking-tight whitespace-nowrap overflow-hidden">
            TrailLog
          </span>
        )}
      </div>

      {/* Adventure / Troop context */}
      {!collapsed && (troopName || adventureName) && (
        <div className="px-5 pt-3 pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 mb-1">
            {troopId && (
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/10">
                <TroopLogo troopId={troopId} size={40} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {troopName && (
                <div className="text-[10px] font-semibold font-body text-tl-text-on-dark-dim uppercase tracking-wide">
                  {troopName}
                </div>
              )}
              {adventureName && (
                <div className="text-[12px] font-bold font-display text-tl-text-on-dark overflow-hidden text-ellipsis whitespace-nowrap">
                  {adventureName}
                </div>
              )}
            </div>
          </div>
          {trekDates?.arrive && trekDates?.return && (
            <div className="text-[10px] font-body text-[#B8CC9A] mt-1">
              {trekDates.arrive.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {trekDates.return.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          {(memberCount !== undefined && memberCount > 0) && (
            <div className="text-[10px] font-body text-tl-text-on-dark-dim mt-0.5">
              {trekkingCount || memberCount} trekking{(memberCount - (trekkingCount || 0)) > 0 ? ` · ${memberCount - (trekkingCount || 0)} support` : ""}
            </div>
          )}
        </div>
      )}
      {collapsed && troopId && (
        <div className="flex justify-center py-2 border-b border-white/[0.08]">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10">
            <TroopLogo troopId={troopId} size={36} />
          </div>
        </div>
      )}

      {/* Home button */}
      <div className="px-4 pt-2 pb-1">
        <SidebarItem
          icon={Home} label="Home" active={!!homeActive}
          collapsed={collapsed} onClick={onGoHome}
        />
      </div>

      {/* Nav items — only when inside an adventure */}
      {view != null && setView ? (
        <nav className="flex-1 px-4 py-1 overflow-y-auto">
          <div
            className={clsx(
              "text-[10px] font-semibold font-body text-tl-text-on-dark-dim uppercase tracking-widest",
              collapsed ? "py-2 text-center" : "py-2 px-1"
            )}
          >
            {!collapsed && "Views"}
          </div>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.key}
              icon={item.icon} label={item.label}
              active={view === item.key}
              collapsed={collapsed}
              onClick={() => setView(item.key)}
            />
          ))}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom actions */}
      <div className="px-4 pt-2 pb-3 border-t border-white/[0.08] flex flex-col gap-0.5">
        {isAdmin && onAdminClick && (
          <SidebarItem
            icon={Settings} label="Admin Panel" active={false}
            collapsed={collapsed} onClick={onAdminClick}
          />
        )}
        {isGlobalAdmin && onGlobalAdminClick && (
          <SidebarItem
            icon={Shield} label="Global Admin" active={false}
            collapsed={collapsed} onClick={onGlobalAdminClick}
          />
        )}
        <SidebarItem
          icon={UserIcon} label="Profile" active={false}
          collapsed={collapsed} onClick={onViewProfile}
        />
        <SidebarItem
          icon={HelpCircle} label="Help" active={false}
          collapsed={collapsed} onClick={onHelpClick}
        />
        <SidebarItem
          icon={LogOut} label="Sign Out" active={false}
          collapsed={collapsed} onClick={onLogout}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-full h-8 rounded-btn border-none bg-transparent cursor-pointer text-tl-text-on-dark-dim transition-colors duration-150 mt-1 hover:bg-white/[0.08]"
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
}

function SidebarItem({ icon: Icon, label, active, collapsed, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={collapsed ? undefined : { paddingLeft: 20, paddingRight: 12 }}
      className={clsx(
        "tl-sidebar-item flex items-center gap-2.5 w-full h-9 rounded-btn border-none cursor-pointer font-body text-[13px] transition-colors duration-150 relative",
        collapsed ? "justify-center px-0" : "justify-start",
        active
          ? "bg-white/15 text-white font-bold border-l-[3px] border-l-[#B8CC9A]"
          : "bg-transparent text-tl-text-on-dark-sub border-l-[3px] border-l-transparent font-medium hover:bg-white/[0.08]",
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
