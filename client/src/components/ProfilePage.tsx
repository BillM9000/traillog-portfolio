import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";
import { ArrowLeft, Shield, Mail, User, Calendar, FileCheck, Lock, LogOut, Users, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import TroopLogo from "./TroopLogo";
import type { Membership, ThemeColors } from "../types";

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

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: `1.5px solid ${theme.borderLight}`, background: theme.bgInput,
    color: theme.text, fontSize: 14, fontFamily: fontBody, outline: "none", boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: theme.forestDeep, color: theme.name === "dark" ? "#1A1F16" : "#FDFAF5",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
  };

  const btnOutline: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${theme.borderLight}`,
    background: theme.bgAlt, color: theme.text, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: fontBody,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: theme.textDim, textTransform: "uppercase",
    letterSpacing: 1.2, marginBottom: 4, fontFamily: fontBody,
  };

  const valueStyle: React.CSSProperties = { fontSize: 14, color: theme.text, fontFamily: fontBody };

  const fmtDate = (d: string | null | undefined): string => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "\u2014";

  interface InfoRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    badge?: string;
  }

  const InfoRow = ({ icon: Icon, label, value, badge }: InfoRowProps) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.borderLight}` }}>
      <Icon size={16} color={theme.textDim} strokeWidth={2} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ ...valueStyle, display: "flex", alignItems: "center", gap: 8 }}>
          {value}
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
              background: badge === "Google" ? "#4285F420" : theme.bgAlt,
              color: badge === "Google" ? "#4285F4" : theme.textDim,
              textTransform: "uppercase", letterSpacing: 0.8,
            }}>{badge}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 40px" }}>
      {/* Back button */}
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        color: theme.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody,
        padding: "8px 0", marginBottom: 12,
      }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: theme.text, fontFamily: fontDisplay, margin: "0 0 20px" }}>
        My Profile
      </h2>

      {/* Account Info */}
      <div style={card(theme)}>
        <div style={cardTitle(theme)}>Account</div>
        <InfoRow icon={Mail} label="Email" value={user.email} badge={isGoogle ? "Google" : "Email"} />
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderLight}` }}>
          <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <User size={14} color={theme.textDim} strokeWidth={2} /> Name
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && saveName()}
              style={{ ...inputStyle, flex: 1 }} />
            {editName.trim() !== user.name && (
              <button onClick={saveName} disabled={savingName} style={btnPrimary}>
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
        <div style={{ ...card(theme), marginTop: 16 }}>
          <div style={cardTitle(theme)}>Parent / Guardian</div>
          {user.parent_email && <InfoRow icon={Mail} label="Parent Email" value={user.parent_email} />}
          {user.parent_email_2 && <InfoRow icon={Mail} label="Parent Email 2" value={user.parent_email_2} />}
          <div style={{ fontSize: 10, color: theme.textDimmest, marginTop: 6, fontFamily: fontBody }}>
            Parent emails are set during signup and cannot be changed here.
          </div>
        </div>
      )}

      {/* Troop Memberships */}
      <div style={{ ...card(theme), marginTop: 16 }}>
        <div style={cardTitle(theme)}>My Troops</div>
        {approvedTroops.length === 0 && pendingTroops.length === 0 && (
          <div style={{ fontSize: 13, color: theme.textDim, fontFamily: fontBody, padding: "8px 0" }}>
            You're not a member of any troops yet.
          </div>
        )}
        {approvedTroops.map(m => (
          <div key={m.troop_id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: `1px solid ${theme.borderLight}`,
          }}>
            <TroopLogo troopId={m.troop_id} name={m.troop_name} size={40} theme={theme} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: fontBody }}>{m.troop_name}</div>
              <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>
                {(m as any).troop_council}{(m as any).troop_location ? ` · ${(m as any).troop_location}` : ""}
                {m.role === "admin" && <span style={{ color: theme.accent, fontWeight: 700 }}> · Admin</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onEnterTroop(m.troop_id)} style={btnPrimary}>Enter</button>
              <button onClick={() => handleLeave(m.troop_id, m.troop_name!)}
                disabled={leavingTroop === m.troop_id}
                style={{ ...btnOutline, color: theme.danger, borderColor: theme.danger + "40" }}>
                {leavingTroop === m.troop_id ? "..." : "Leave"}
              </button>
            </div>
          </div>
        ))}
        {pendingTroops.map(m => (
          <div key={m.troop_id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: `1px solid ${theme.borderLight}`, opacity: 0.7,
          }}>
            <TroopLogo troopId={m.troop_id} name={m.troop_name} size={40} theme={theme} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: fontBody }}>{m.troop_name}</div>
              <div style={{ fontSize: 11, color: theme.textDim, fontFamily: fontBody }}>
                Pending approval
              </div>
            </div>
            <button onClick={() => handleWithdraw(m.troop_id, m.troop_name!)}
              disabled={leavingTroop === m.troop_id}
              style={btnOutline}>
              {leavingTroop === m.troop_id ? "..." : "Withdraw"}
            </button>
          </div>
        ))}
      </div>

      {/* Change Password (email/password users only) */}
      {hasPassword && (
        <div style={{ ...card(theme), marginTop: 16 }}>
          <div style={cardTitle(theme)}>
            <Lock size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Change Password
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <div>
              <div style={labelStyle}>Current Password</div>
              <input type="password" value={currentPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPw(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>New Password</div>
              <input type="password" value={newPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPw(e.target.value)}
                placeholder="8+ characters" style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Confirm New Password</div>
              <input type="password" value={confirmPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPw(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && changePassword()} style={inputStyle} />
            </div>
            <button onClick={changePassword} disabled={savingPw} style={{ ...btnPrimary, width: "100%", marginTop: 4 }}>
              {savingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div style={{ marginTop: 20 }}>
        <button onClick={onLogout} style={{
          width: "100%", padding: "12px 0", borderRadius: 10,
          border: `1.5px solid ${theme.danger}40`, background: theme.bgAlt,
          color: theme.danger, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: fontBody,
        }}>
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
