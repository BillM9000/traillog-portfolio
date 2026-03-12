import { useState } from "react";
import { api } from "../api";
import { fontBody, fontDisplay } from "../utils/theme";
import Logo from "./Logo";

export default function LoginPage({ onLogin, onSignup }) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset");

  const [mode, setMode] = useState(resetToken ? "reset" : "login"); // "login" | "signup" | "forgot" | "reset"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
        setName(""); setEmail(""); setPassword("");
        setMode("login");
      } else if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setMessage(result.message || "If that email exists, a reset link has been sent");
        setEmail("");
      } else if (mode === "reset") {
        if (password !== password2) { setError("Passwords don't match"); setLoading(false); return; }
        const result = await api.resetPassword(resetToken, password);
        setMessage(result.message || "Password updated. You can now sign in.");
        setPassword(""); setPassword2("");
        // Clear reset token from URL
        window.history.replaceState({}, "", "/");
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

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody,
    }}>
      {/* Texture overlay */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }} />

      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px", position: "relative", zIndex: 1 }}>
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Logo size={72} />
          <h1 style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 900, color: "#FDFAF5", margin: "12px 0 0 0", letterSpacing: "-0.5px" }}>
            Trail<span style={{ color: "#B8CC9A" }}>Log</span>
          </h1>
          <div style={{ fontSize: 9, color: "rgba(184,204,154,0.5)", fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 4, fontFamily: fontBody }}>
            by GraceZero.ai
          </div>
          <p style={{ fontSize: 14, color: "#D4E4B8", marginTop: 12, fontWeight: 500 }}>
            {mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Coordinate your crew's high adventure training"}
          </p>
        </div>

        {/* Status messages */}
        {verified && (
          <div style={{ background: "rgba(91,122,58,0.15)", border: "1px solid rgba(184,204,154,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#B8CC9A", textAlign: "center" }}>
            Email verified! You can now sign in.
          </div>
        )}
        {authError && (
          <div style={{ background: "rgba(192,96,64,0.15)", border: "1px solid rgba(192,96,64,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#d08080", textAlign: "center" }}>
            Authentication failed. Please try again.
          </div>
        )}
        {message && (
          <div style={{ background: "rgba(91,122,58,0.2)", border: "2px solid rgba(184,204,154,0.5)", borderRadius: 14, padding: "20px 18px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{mode === "forgot" ? "📧" : "✅"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#D4E4B8", marginBottom: 6, fontFamily: fontDisplay }}>
              {mode === "forgot" ? "Check your email" : mode === "login" && !verified ? "Password updated" : "Check your email"}
            </div>
            <div style={{ fontSize: 12, color: "#B8CC9A", lineHeight: 1.5 }}>
              {message}
            </div>
          </div>
        )}

        {/* Google Sign In — only on login/signup */}
        {(mode === "login" || mode === "signup") && (
          <>
            <a href="/auth/google" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "13px 0", borderRadius: 12, background: "#FDFAF5", color: "#2C2416",
              fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: fontBody,
              border: "none", cursor: "pointer", marginBottom: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(184,204,154,0.15)" }} />
              <span style={{ fontSize: 11, color: "#7A9A5A" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(184,204,154,0.15)" }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              style={inputStyle} required />
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
              style={inputStyle} required />
          )}

          {(mode === "login" || mode === "signup") && (
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
              style={inputStyle} required minLength={8} />
          )}

          {mode === "reset" && (
            <>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" type="password"
                style={inputStyle} required minLength={8} />
              <input value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Confirm new password" type="password"
                style={inputStyle} required minLength={8} />
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "#d08080", marginBottom: 8 }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#5B7A3A", color: "#FDFAF5", fontSize: 14, fontWeight: 600,
            cursor: loading ? "wait" : "pointer", fontFamily: fontBody, marginBottom: 12,
            opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(58,77,42,0.3)",
          }}>
            {loading ? "..." :
              mode === "signup" ? "Create Account" :
              mode === "forgot" ? "Send Reset Link" :
              mode === "reset" ? "Set New Password" :
              "Sign In"}
          </button>
        </form>

        {/* Navigation links */}
        <div style={{ textAlign: "center" }}>
          {mode === "login" && (
            <>
              <button onClick={() => switchMode("forgot")}
                style={{ background: "none", border: "none", color: "#7A9A5A", fontSize: 11, cursor: "pointer", fontFamily: fontBody, marginBottom: 8, display: "block", width: "100%" }}>
                Forgot password?
              </button>
              <button onClick={() => switchMode("signup")}
                style={{ background: "none", border: "none", color: "#B8CC9A", fontSize: 12, cursor: "pointer", fontFamily: fontBody }}>
                Don't have an account? Sign up
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => switchMode("login")}
              style={{ background: "none", border: "none", color: "#B8CC9A", fontSize: 12, cursor: "pointer", fontFamily: fontBody }}>
              Already have an account? Sign in
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => { switchMode("login"); window.history.replaceState({}, "", "/"); }}
              style={{ background: "none", border: "none", color: "#B8CC9A", fontSize: 12, cursor: "pointer", fontFamily: fontBody }}>
              Back to sign in
            </button>
          )}
        </div>

        {/* Legal links */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#5A6A4A" }}>
          <a href="/privacy" style={{ color: "#5A6A4A", textDecoration: "none" }}>Privacy Policy</a>
          <span style={{ margin: "0 8px" }}>·</span>
          <a href="/terms" style={{ color: "#5A6A4A", textDecoration: "none" }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #3A4D2A",
  background: "rgba(26,36,18,0.6)", color: "#E8E0D4", fontSize: 13, fontFamily: "'DM Sans',Helvetica,sans-serif",
  outline: "none", marginBottom: 10, boxSizing: "border-box",
  backdropFilter: "blur(4px)",
};
