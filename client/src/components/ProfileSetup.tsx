import { useState } from "react";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";
import { Compass, Users, ShieldCheck, LucideIcon } from "lucide-react";
import type { User } from "../types";

interface ProfileSetupProps {
  user: User;
  onComplete: (data: {
    age_confirmed: "13+" | "18+";
    user_type: string;
    parent_email?: string;
    parent_email_2?: string | null;
  }) => Promise<void>;
}

type RoleChoice = "scout" | "adult";

interface RoleCard {
  type: RoleChoice;
  label: string;
  subtitle: string;
  desc: string;
  Icon: LucideIcon;
}

export default function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [choice, setChoice] = useState<RoleChoice | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [parentEmail2, setParentEmail2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  const showParentForm = choice === "scout";

  const handleSubmit = async () => {
    setError("");
    if (!choice) return setError("Please select your role to continue");
    if (!tosAccepted) return setError("You must agree to the Terms of Service and Privacy Policy");
    if (choice === "scout" && !parentEmail.trim()) return setError("Scouts must provide a parent/guardian email");

    setLoading(true);
    try {
      const age: "13+" | "18+" = choice === "scout" ? "13+" : "18+";
      await onComplete({
        age_confirmed: age,
        user_type: choice,
        parent_email: choice === "scout" ? parentEmail.trim() : undefined,
        parent_email_2: choice === "scout" ? (parentEmail2.trim() || null) : undefined,
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
  };

  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 440, padding: "0 20px", textAlign: "center" };

  const roleCards: RoleCard[] = [
    {
      type: "scout",
      label: "Youth / Scout",
      subtitle: "Ages 13\u201317",
      desc: "Youth trekking crew member",
      Icon: Compass,
    },
    {
      type: "adult",
      label: "Adult Leader",
      subtitle: "Ages 18+",
      desc: "Parent, adviser, or crew leader",
      Icon: Users,
    },
  ];

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Logo size={72} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 900, color: "#FDFAF5", margin: "12px 0 6px" }}>
          Welcome, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: "#D4E4B8", marginBottom: 8 }}>
          Tell us about yourself to get started.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, color: "#7A9A5A", fontSize: 12 }}>
          <ShieldCheck size={16} />
          <span>Required for BSA High Adventure eligibility</span>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          {roleCards.map(({ type, label, subtitle, desc, Icon }) => {
            const selected = choice === type;
            return (
              <button key={type} onClick={() => setChoice(type)} style={{
                flex: 1, padding: "22px 14px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                background: selected ? "rgba(91,122,58,0.15)" : "rgba(26,36,18,0.4)",
                border: selected ? "2px solid #5B7A3A" : "2px solid #3A4D2A",
                transition: "all .2s",
              }}>
                <Icon
                  size={48}
                  strokeWidth={1.5}
                  style={{
                    color: selected ? "#A3C47A" : "#5B7A3A",
                    marginBottom: 10,
                    transition: "color .2s",
                  }}
                />
                <div style={{ fontSize: 15, fontWeight: 700, color: selected ? "#FDFAF5" : "#8B8478", fontFamily: fontDisplay }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: selected ? "#A3C47A" : "#7A9A5A", marginTop: 3, fontWeight: 600 }}>
                  {subtitle}
                </div>
                <div style={{ fontSize: 11, color: "#7A9A5A", marginTop: 4 }}>{desc}</div>
              </button>
            );
          })}
        </div>

        {showParentForm && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#B8CC9A", display: "block", textAlign: "left", marginBottom: 4, fontFamily: fontBody }}>
              Parent/Guardian Email (required)
            </label>
            <input value={parentEmail} onChange={e => setParentEmail(e.target.value)}
              placeholder="parent@email.com" type="email"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #3A4D2A",
                background: "rgba(26,36,18,0.6)", color: "#E8E0D4", fontSize: 13, fontFamily: fontBody,
                outline: "none", boxSizing: "border-box",
              }} />
            <label style={{ fontSize: 12, color: "#B8CC9A", display: "block", textAlign: "left", marginBottom: 4, marginTop: 10, fontFamily: fontBody }}>
              Second Parent/Guardian Email (optional)
            </label>
            <input value={parentEmail2} onChange={e => setParentEmail2(e.target.value)}
              placeholder="parent2@email.com" type="email"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #3A4D2A",
                background: "rgba(26,36,18,0.6)", color: "#E8E0D4", fontSize: 13, fontFamily: fontBody,
                outline: "none", boxSizing: "border-box",
              }} />
          </div>
        )}

        <p style={{ fontSize: 11, color: "#666", marginBottom: 14, lineHeight: 1.5 }}>
          This cannot be changed later. BSA High Adventure requires participants to be at least 13 years old.
        </p>

        <label style={{
          display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14,
          fontSize: 11, color: "#B8CC9A", cursor: "pointer", lineHeight: 1.4, textAlign: "left",
        }}>
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={e => setTosAccepted(e.target.checked)}
            style={{ marginTop: 2, accentColor: "#5B7A3A", cursor: "pointer", flexShrink: 0 }}
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" style={{ color: "#D4E4B8", textDecoration: "underline" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" style={{ color: "#D4E4B8", textDecoration: "underline" }}>Privacy Policy</a>
          </span>
        </label>

        {error && <div style={{ fontSize: 12, color: "#d08080", marginBottom: 10 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !choice || !tosAccepted} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: (choice && tosAccepted) ? "#5B7A3A" : "#3A4D2A", color: "#FDFAF5",
          fontSize: 14, fontWeight: 600, cursor: (choice && tosAccepted && !loading) ? "pointer" : "default",
          fontFamily: fontBody, opacity: (!choice || !tosAccepted || loading) ? 0.6 : 1,
          boxShadow: (choice && tosAccepted) ? "0 2px 8px rgba(58,77,42,0.3)" : "none",
        }}>
          {loading ? "..." : "Confirm & Continue"}
        </button>
      </div>
    </div>
  );
}
