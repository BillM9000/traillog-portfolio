import { useState } from "react";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";

export default function ProfileSetup({ user, onComplete }) {
  const [userType, setUserType] = useState(null);
  const [parentEmail, setParentEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!userType) return setError("Please select your role");
    if (userType === "scout" && !parentEmail.trim()) return setError("Scouts must provide a parent/guardian email");
    setLoading(true);
    try {
      await onComplete(userType, parentEmail);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #1a2420 0%, #0d1210 50%, #1a1f1c 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px", textAlign: "center" }}>
        <Logo size={72} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: "#d4c8a8", margin: "0 0 6px" }}>
          Welcome, {user.name}!
        </h1>
        <p style={{ fontSize: 13, color: "#6a7a6a", marginBottom: 28 }}>
          One quick question before we get started.
        </p>

        <p style={{ fontSize: 14, fontWeight: 600, color: "#a0b0a0", marginBottom: 14 }}>
          Are you an adult or a scout?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          {[
            { type: "adult", label: "Adult", icon: "\uD83E\uDDD1", desc: "Parent, adviser, or crew leader" },
            { type: "scout", label: "Scout", icon: "\uD83E\uDD7E", desc: "Youth trekking crew member" },
          ].map(opt => (
            <button key={opt.type} onClick={() => setUserType(opt.type)} style={{
              flex: 1, padding: "18px 14px", borderRadius: 12, cursor: "pointer", textAlign: "center",
              background: userType === opt.type ? "#2a3d2e" : "#1a2420",
              border: userType === opt.type ? "2px solid #4a7a55" : "2px solid #2d3830",
              transition: "all .2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: userType === opt.type ? "#d4c8a8" : "#8a9a8a" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "#5a6a5a", marginTop: 3 }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        {userType === "scout" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#8a9a8a", display: "block", textAlign: "left", marginBottom: 4 }}>
              Parent/Guardian Email (required)
            </label>
            <input value={parentEmail} onChange={e => setParentEmail(e.target.value)}
              placeholder="parent@email.com" type="email"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #3d4a40",
                background: "#1a2420", color: "#e0dcd6", fontSize: 13, fontFamily: fontBody,
                outline: "none", boxSizing: "border-box",
              }} />
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: "#d08080", marginBottom: 10 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !userType} style={{
          width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
          background: userType ? "#4a7a55" : "#2d3830", color: "#e8e4df",
          fontSize: 14, fontWeight: 600, cursor: userType && !loading ? "pointer" : "default",
          fontFamily: fontBody, opacity: !userType || loading ? 0.6 : 1,
        }}>
          {loading ? "..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
