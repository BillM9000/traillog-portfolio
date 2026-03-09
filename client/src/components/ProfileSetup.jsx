import { useState } from "react";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";

export default function ProfileSetup({ user, onComplete }) {
  const [userType, setUserType] = useState(null);
  const [parentEmail, setParentEmail] = useState("");
  const [parentEmail2, setParentEmail2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!userType) return setError("Please select your role");
    if (userType === "scout" && !parentEmail.trim()) return setError("Scouts must provide a parent/guardian email");
    setLoading(true);
    try {
      await onComplete(userType, parentEmail, parentEmail2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px", textAlign: "center" }}>
        <Logo size={72} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 900, color: "#FDFAF5", margin: "12px 0 6px" }}>
          Welcome, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: "#D4E4B8", marginBottom: 28 }}>
          One quick question before we get started.
        </p>

        <p style={{ fontSize: 15, fontWeight: 600, color: "#B8CC9A", marginBottom: 14, fontFamily: fontDisplay }}>
          Are you an adult or a scout?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          {[
            { type: "adult", label: "Adult", icon: "\uD83E\uDDD1", desc: "Parent, adviser, or crew leader" },
            { type: "scout", label: "Scout", icon: "\uD83E\uDD7E", desc: "Youth trekking crew member" },
          ].map(opt => (
            <button key={opt.type} onClick={() => setUserType(opt.type)} style={{
              flex: 1, padding: "18px 14px", borderRadius: 14, cursor: "pointer", textAlign: "center",
              background: userType === opt.type ? "rgba(91,122,58,0.15)" : "rgba(26,36,18,0.4)",
              border: userType === opt.type ? "2px solid #5B7A3A" : "2px solid #3A4D2A",
              transition: "all .2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: userType === opt.type ? "#FDFAF5" : "#8B8478", fontFamily: fontDisplay }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "#7A9A5A", marginTop: 3 }}>{opt.desc}</div>
            </button>
          ))}
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

        <button onClick={handleSubmit} disabled={loading || !userType} style={{
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
