import { useState } from "react";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";

export default function LoginPage({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const verified = params.get("verified");
  const authError = params.get("error");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await onSignup(name, email, password);
        setMessage(result.message || "Check your email to verify your account");
        setMode("login");
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #1a2420 0%, #0d1210 50%, #1a1f1c 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={72} />
          <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: "#d4c8a8", margin: 0, letterSpacing: "-0.5px" }}>
            TrailLog
          </h1>
          <p style={{ fontSize: 13, color: "#6a7a6a", marginTop: 6 }}>
            Coordinate your crew's high adventure training
          </p>
        </div>

        {/* Status messages */}
        {verified && (
          <div style={{ background: "#2a3d2e", border: "1px solid #3d5a45", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#7aba7a", textAlign: "center" }}>
            Email verified! You can now sign in.
          </div>
        )}
        {authError && (
          <div style={{ background: "#3a2020", border: "1px solid #5a3030", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#d08080", textAlign: "center" }}>
            Authentication failed. Please try again.
          </div>
        )}
        {message && (
          <div style={{ background: "#2a3d2e", border: "1px solid #3d5a45", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#7aba7a", textAlign: "center" }}>
            {message}
          </div>
        )}

        {/* Google Sign In */}
        <a href="/auth/google" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "12px 0", borderRadius: 8, background: "#fff", color: "#333",
          fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: fontBody,
          border: "none", cursor: "pointer", marginBottom: 16,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#2d3830" }} />
          <span style={{ fontSize: 11, color: "#5a6a5a" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#2d3830" }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              style={inputStyle} required />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
            style={inputStyle} required />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
            style={inputStyle} required minLength={6} />

          {error && (
            <div style={{ fontSize: 12, color: "#d08080", marginBottom: 8 }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: "#4a7a55", color: "#e8e4df", fontSize: 14, fontWeight: 600,
            cursor: loading ? "wait" : "pointer", fontFamily: fontBody, marginBottom: 12,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
            style={{ background: "none", border: "none", color: "#5a8a6a", fontSize: 12, cursor: "pointer", fontFamily: fontBody }}>
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #3d4a40",
  background: "#1a2420", color: "#e0dcd6", fontSize: 13, fontFamily: "'Instrument Sans',system-ui,sans-serif",
  outline: "none", marginBottom: 10, boxSizing: "border-box",
};
