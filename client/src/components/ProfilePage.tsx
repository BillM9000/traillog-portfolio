import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import clsx from "clsx";
import { ArrowLeft, Shield, Mail, User, Calendar, FileCheck, Lock, LogOut, Users, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import TroopLogo from "./TroopLogo";
import type { Membership } from "../types";

interface ProfilePageProps {
  memberships: Membership[];
  onBack: () => void;
  onEnterTroop: (troopId: number) => void;
  onLogout: () => void;
}

export default function ProfilePage({ memberships, onBack, onEnterTroop, onLogout }: ProfilePageProps) {
  const { user, refresh } = useAuth();
  const { theme } = useTheme();
  const { addToast } = useToast();

  const [editName, setEditName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [leavingTroop, setLeavingTroop] = useState<number | null>(null);

  if (!user) return null;

  const isGoogle = !!(user as any).google_id;
  const hasPassword = !!user.has_password;
  const approvedTroops = (memberships || []).filter(m => m.status === "approved");
  const pendingTroops = (memberships || []).filter(m => m.status === "pending");

  const saveName = async () => {
    if (!editName.trim() || editName.trim() === user.name) return;
    setSavingName(true);
    try {
      await api.updateProfile({ name: editName.trim() });
      await refresh();
      addToast("Name updated", "success");
    } catch (e: any) { addToast(e.message, "error"); }
    setSavingName(false);
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) return addToast("Fill in all password fields", "error");
    if (newPw.length < 8) return addToast("New password must be 8+ characters", "error");
    if (newPw !== confirmPw) return addToast("Passwords don't match", "error");
    setSavingPw(true);
    try {
      await api.changePassword(currentPw, newPw);
      addToast("Password changed successfully", "success");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) { addToast(e.message, "error"); }
    setSavingPw(false);
  };

  const handleLeave = async (troopId: number, troopName: string) => {
    if (!confirm(`Leave ${troopName}? You'll need to request to rejoin.`)) return;
    setLeavingTroop(troopId);
    try {
      await api.leaveTroop(troopId);
      await refresh();
      addToast(`Left ${troopName}`, "success");
    } catch (e: any) { addToast(e.message, "error"); }
    setLeavingTroop(null);
  };

  const handleWithdraw = async (troopId: number, troopName: string) => {
    setLeavingTroop(troopId);
    try {
      await api.leaveTroop(troopId);
      await refresh();
      addToast(`Withdrew request from ${troopName}`, "success");
    } catch (e: any) { addToast(e.message, "error"); }
    setLeavingTroop(null);
  };

  const fmtDate = (d: string | null | undefined): string => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "\u2014";

  interface InfoRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    badge?: string;
  }

  const InfoRow = ({ icon: Icon, label, value, badge }: InfoRowProps) => (
    <div className="flex items-center gap-2.5 py-2 border-b border-tl-border-light">
      <Icon size={16} className="text-tl-text-dim shrink-0" strokeWidth={2} />
      <div className="flex-1">
        <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mb-1 font-body">{label}</div>
        <div className="text-sm text-tl-text font-body flex items-center gap-2">
          {value}
          {badge && (
            <span className={clsx(
              "text-[9px] font-bold py-0.5 px-2 rounded-[10px] uppercase tracking-[0.8px]",
              badge === "Google" ? "bg-[#4285F420] text-[#4285F4]" : "bg-tl-bg-alt text-tl-text-dim"
            )}>{badge}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[560px] mx-auto px-4 pt-4 pb-10">
      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 bg-transparent border-none text-tl-accent text-[13px] font-semibold cursor-pointer font-body py-2 mb-3">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-[22px] font-extrabold text-tl-text font-display mb-5">
        My Profile
      </h2>

      {/* Account Info */}
      <div className="tl-card">
        <div className="tl-card-title">Account</div>
        <InfoRow icon={Mail} label="Email" value={user.email} badge={isGoogle ? "Google" : "Email"} />
        <div className="py-2.5 border-b border-tl-border-light">
          <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mb-1 font-body flex items-center gap-1.5">
            <User size={14} className="text-tl-text-dim" strokeWidth={2} /> Name
          </div>
          <div className="flex gap-2 mt-1">
            <input value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && saveName()}
              className="tl-input flex-1 border-tl-border-light" style={{ borderWidth: "1.5px" }} />
            {editName.trim() !== user.name && (
              <button onClick={saveName} disabled={savingName}
                className="py-2.5 px-5 rounded-btn border-none bg-tl-forest-deep text-sm font-semibold cursor-pointer font-body"
                style={{ color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5" }}>
                {savingName ? "..." : "Save"}
              </button>
            )}
          </div>
        </div>
        <InfoRow icon={Shield} label="Role" value={user.user_type === "adult" ? "Adult Leader" : user.user_type === "scout" ? "Scout" : "Not set"} />
        <InfoRow icon={User} label="Age Category" value={user.age_confirmed || "Not confirmed"} />
        <InfoRow icon={FileCheck} label="Terms Accepted" value={fmtDate(user.tos_accepted_at)} />
        <InfoRow icon={Calendar} label="Account Created" value={fmtDate(user.created_at)} />
        {user.is_admin && (
          <InfoRow icon={Crown} label="Platform Role" value="Global Administrator" />
        )}
      </div>

      {/* Parent/Guardian (scouts only) */}
      {user.user_type === "scout" && (user.parent_email || user.parent_email_2) && (
        <div className="tl-card mt-4">
          <div className="tl-card-title">Parent / Guardian</div>
          {user.parent_email && <InfoRow icon={Mail} label="Parent Email" value={user.parent_email} />}
          {user.parent_email_2 && <InfoRow icon={Mail} label="Parent Email 2" value={user.parent_email_2} />}
          <div className="text-[10px] text-tl-text-dimmest mt-1.5 font-body">
            Parent emails are set during signup and cannot be changed here.
          </div>
        </div>
      )}

      {/* Troop Memberships */}
      <div className="tl-card mt-4">
        <div className="tl-card-title">My Troops</div>
        {approvedTroops.length === 0 && pendingTroops.length === 0 && (
          <div className="text-[13px] text-tl-text-dim font-body py-2">
            You're not a member of any troops yet.
          </div>
        )}
        {approvedTroops.map(m => (
          <div key={m.troop_id} className="flex items-center gap-3 py-2.5 border-b border-tl-border-light">
            <TroopLogo troopId={m.troop_id} name={m.troop_name} size={40} theme={theme} />
            <div className="flex-1">
              <div className="text-sm font-bold text-tl-text font-body">{m.troop_name}</div>
              <div className="text-[11px] text-tl-text-dim font-body">
                {(m as any).troop_council}{(m as any).troop_location ? ` · ${(m as any).troop_location}` : ""}
                {m.role === "admin" && <span className="text-tl-accent font-bold"> · Admin</span>}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => onEnterTroop(m.troop_id)}
                className="py-2.5 px-5 rounded-btn border-none bg-tl-forest-deep text-[13px] font-semibold cursor-pointer font-body"
                style={{ color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5" }}>Enter</button>
              <button onClick={() => handleLeave(m.troop_id, m.troop_name!)}
                disabled={leavingTroop === m.troop_id}
                className="py-2 px-4 rounded-btn bg-tl-bg-alt text-xs font-semibold cursor-pointer font-body text-tl-danger"
                style={{ border: `1.5px solid ${theme.danger}40` }}>
                {leavingTroop === m.troop_id ? "..." : "Leave"}
              </button>
            </div>
          </div>
        ))}
        {pendingTroops.map(m => (
          <div key={m.troop_id} className="flex items-center gap-3 py-2.5 border-b border-tl-border-light opacity-70">
            <TroopLogo troopId={m.troop_id} name={m.troop_name} size={40} theme={theme} />
            <div className="flex-1">
              <div className="text-sm font-bold text-tl-text font-body">{m.troop_name}</div>
              <div className="text-[11px] text-tl-text-dim font-body">
                Pending approval
              </div>
            </div>
            <button onClick={() => handleWithdraw(m.troop_id, m.troop_name!)}
              disabled={leavingTroop === m.troop_id}
              className="py-2 px-4 rounded-btn border-[1.5px] border-tl-border-light bg-tl-bg-alt text-tl-text text-xs font-semibold cursor-pointer font-body">
              {leavingTroop === m.troop_id ? "..." : "Withdraw"}
            </button>
          </div>
        ))}
      </div>

      {/* Change Password (email/password users only) */}
      {hasPassword && (
        <div className="tl-card mt-4">
          <div className="tl-card-title">
            <Lock size={14} className="mr-1.5 align-middle inline" />
            Change Password
          </div>
          <div className="flex flex-col gap-2.5 mt-2">
            <div>
              <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mb-1 font-body">Current Password</div>
              <input type="password" value={currentPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPw(e.target.value)}
                className="tl-input border-tl-border-light" style={{ borderWidth: "1.5px" }} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mb-1 font-body">New Password</div>
              <input type="password" value={newPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPw(e.target.value)}
                placeholder="8+ characters" className="tl-input border-tl-border-light" style={{ borderWidth: "1.5px" }} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-tl-text-dim uppercase tracking-[1.2px] mb-1 font-body">Confirm New Password</div>
              <input type="password" value={confirmPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPw(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && changePassword()}
                className="tl-input border-tl-border-light" style={{ borderWidth: "1.5px" }} />
            </div>
            <button onClick={changePassword} disabled={savingPw}
              className="w-full mt-1 py-2.5 px-5 rounded-btn border-none bg-tl-forest-deep text-[13px] font-semibold cursor-pointer font-body"
              style={{ color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5" }}>
              {savingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div className="mt-5">
        <button onClick={onLogout}
          className="w-full py-3 rounded-[10px] bg-tl-bg-alt text-tl-danger text-sm font-bold cursor-pointer font-body"
          style={{ border: `1.5px solid ${theme.danger}40` }}>
          <LogOut size={14} className="mr-1.5 align-middle inline" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
