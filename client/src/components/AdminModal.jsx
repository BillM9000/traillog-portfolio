import { useState } from "react";
import { api } from "../api";
import { fontBody, fontDisplay } from "../utils/theme";

export default function AdminModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const tryLogin = async () => {
    try {
      const { valid } = await api.verifyPin(pin);
      if (valid) { onSuccess(pin); setPin(""); setError(false); }
      else setError(true);
    } catch { setError(true); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={() => { onClose(); setPin(""); setError(false); }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#232e27", borderRadius: 12, padding: 24, border: "1px solid #3d4a40", width: 280, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#d4c8a8", fontFamily: fontDisplay, marginBottom: 4 }}>Admin Login</div>
        <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 14 }}>Enter crew PIN to manage members & skills</div>
        <input
          type="password" value={pin}
          onChange={e => { setPin(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          placeholder="Enter PIN" autoFocus
          style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: error ? "1.5px solid #8a4040" : "1.5px solid #3d4a40", background: "#1a2420", color: "#e0dcd6", fontSize: 14, fontFamily: fontBody, outline: "none", textAlign: "center", letterSpacing: 4, boxSizing: "border-box" }}
        />
        {error && <div style={{ fontSize: 11, color: "#c06060", marginTop: 6 }}>Wrong PIN. Try again.</div>}
        <button onClick={tryLogin} style={{ marginTop: 12, padding: "8px 24px", borderRadius: 7, border: "none", background: "#4a7a55", color: "#e8e4df", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody, width: "100%" }}>
          Unlock
        </button>
      </div>
    </div>
  );
}
