import { useState } from "react";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";
import { ShieldCheck } from "lucide-react";

export default function ProfileSetup({ user, onComplete }) {
  // Step 1: age confirmation (if not yet confirmed)
  // Step 2: role selection (if age confirmed but no user_type)
  const needsAge = !user.age_confirmed;
  const [step, setStep] = useState(needsAge ? "age" : "role");
  const [ageChoice, setAgeChoice] = useState(null);
  const [userType, setUserType] = useState(null);
  const [parentEmail, setParentEmail] = useState("");
  const [parentEmail2, setParentEmail2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  const handleAgeConfirm = async () => {
    setError("");
    if (!ageChoice) return setError("Please confirm your age to continue");
    if (!tosAccepted) return setError("You must agree to the Terms of Service and Privacy Policy");
    setLoading(true);
    try {
      await onComplete({ age_confirmed: ageChoice });
      setStep("role");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    setError("");
    if (!userType) return setError("Please select your role");
    if (userType === "scout" && !parentEmail.trim()) return setError("Scouts must provide a parent/guardian email");
    // Block 13+ from picking adult (client-side, server also enforces)
    const confirmedAge = user.age_confirmed || ageChoice;
    if (userType === "adult" && confirmedAge === "13+") {
      return setError("You must be 18 or older to register as an adult leader. Please select Scout.");
    }
    setLoading(true);
    try {
      await onComplete(userType, parentEmail, parentEmail2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: "100vh",
    background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
  };

  const cardStyle = { width: "100%", maxWidth: 400, padding: "0 20px", textAlign: "center" };

  // ── Step 1: Age Confirmation ──
  if (step === "age") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <Logo size={72} />
          <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 900, color: "#FDFAF5", margin: "12px 0 6px" }}>
            Welcome, {user.name}!
          </h1>
          <p style={{ fontSize: 14, color: "#D4E4B8", marginBottom: 24 }}>
            Before we get started, please confirm your age.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, color: "#7A9A5A", fontSize: 12 }}>
            <ShieldCheck size={16} />
            <span>Required for BSA High Adventure eligibility</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {[
              { value: "13+", label: "I am 13 or older", desc: "Youth / Scout participant" },
              { value: "18+", label: "I am 18 or older", desc: "Adult leader or adviser" },
            ].map(opt => (
              <button key={opt.value} onClick={() => setAgeChoice(opt.value)} style={{
                padding: "16px 18px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                background: ageChoice === opt.value ? "rgba(91,122,58,0.15)" : "rgba(26,36,18,0.4)",
                border: ageChoice === opt.value ? "2px solid #5B7A3A" : "2px solid #3A4D2A",
                transition: "all .2s", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: ageChoice === opt.value ? "2px solid #5B7A3A" : "2px solid #555",
                  background: ageChoice === opt.value ? "#5B7A3A" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ageChoice === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ageChoice === opt.value ? "#FDFAF5" : "#8B8478", fontFamily: fontDisplay }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#7A9A5A", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

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

          <button onClick={handleAgeConfirm} disabled={loading || !ageChoice || !tosAccepted} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: (ageChoice && tosAccepted) ? "#5B7A3A" : "#3A4D2A", color: "#FDFAF5",
            fontSize: 14, fontWeight: 600, cursor: (ageChoice && tosAccepted && !loading) ? "pointer" : "default",
            fontFamily: fontBody, opacity: (!ageChoice || !tosAccepted || loading) ? 0.6 : 1,
            boxShadow: (ageChoice && tosAccepted) ? "0 2px 8px rgba(58,77,42,0.3)" : "none",
          }}>
            {loading ? "..." : "Confirm & Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Role Selection ──
  const confirmedAge = user.age_confirmed || ageChoice;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Logo size={72} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 900, color: "#FDFAF5", margin: "12px 0 6px" }}>
          {user.name}, one more step!
        </h1>
        <p style={{ fontSize: 14, color: "#D4E4B8", marginBottom: 28 }}>
          Are you an adult or a scout?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          {[
            { type: "adult", label: "Adult", img: "/icons/scoutguy280good.png", desc: "Parent, adviser, or crew leader", needs18: true },
            { type: "scout", label: "Scout", img: "/icons/scoutrope280good.png", desc: "Youth trekking crew member", needs18: false },
          ].map(opt => {
            const disabled = opt.needs18 && confirmedAge === "13+";
            return (
              <button key={opt.type} onClick={() => !disabled && setUserType(opt.type)} style={{
                flex: 1, padding: "18px 14px", borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer", textAlign: "center",
                background: userType === opt.type ? "rgba(91,122,58,0.15)" : disabled ? "rgba(26,36,18,0.2)" : "rgba(26,36,18,0.4)",
                border: userType === opt.type ? "2px solid #5B7A3A" : "2px solid #3A4D2A",
                transition: "all .2s", opacity: disabled ? 0.4 : 1,
              }}>
                <img src={opt.img} alt={opt.label} style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 6, opacity: userType === opt.type ? 1 : 0.6, filter: userType === opt.type ? "brightness(1.4)" : "brightness(1.2)" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: userType === opt.type ? "#FDFAF5" : "#8B8478", fontFamily: fontDisplay }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#7A9A5A", marginTop: 3 }}>{opt.desc}</div>
                {disabled && <div style={{ fontSize: 10, color: "#d08080", marginTop: 4 }}>Must be 18+</div>}
              </button>
            );
          })}
        </div>

        {userType === "scout" && (
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

        {error && <div style={{ fontSize: 12, color: "#d08080", marginBottom: 10 }}>{error}</div>}

        <button onClick={handleRoleSubmit} disabled={loading || !userType} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: userType ? "#5B7A3A" : "#3A4D2A", color: "#FDFAF5",
          fontSize: 14, fontWeight: 600, cursor: userType && !loading ? "pointer" : "default",
          fontFamily: fontBody, opacity: !userType || loading ? 0.6 : 1,
          boxShadow: userType ? "0 2px 8px rgba(58,77,42,0.3)" : "none",
        }}>
          {loading ? "..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
