import { useState, useEffect, useRef, forwardRef } from "react";
import { api } from "../api";
import { fontBody, fontDisplay } from "../utils/theme";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";

// ── Custom SVG Feature Icons (48px, forest green palette) ──────────────

function CalendarIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="8" width="40" height="36" rx="6" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <line x1="4" y1="18" x2="44" y2="18" stroke="#5B7A3A" strokeWidth="2" />
      <line x1="16" y1="4" x2="16" y2="12" stroke="#5B7A3A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="4" x2="32" y2="12" stroke="#5B7A3A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="26" r="3" fill="#B8CC9A" />
      <circle cx="24" cy="26" r="3" fill="#5B7A3A" />
      <circle cx="34" cy="26" r="3" fill="#B8CC9A" />
      <circle cx="14" cy="36" r="3" fill="#5B7A3A" />
      <circle cx="24" cy="36" r="3" fill="#B8CC9A" />
      <rect x="30" y="33" width="8" height="6" rx="2" fill="#5B7A3A" opacity="0.4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M6 42 L6 10" stroke="#5B7A3A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 42 L42 42" stroke="#5B7A3A" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="12" y="28" width="6" height="14" rx="2" fill="#B8CC9A" />
      <rect x="21" y="20" width="6" height="22" rx="2" fill="#5B7A3A" />
      <rect x="30" y="12" width="6" height="30" rx="2" fill="#B8CC9A" />
      <circle cx="33" cy="8" r="4" fill="#5B7A3A" />
      <path d="M29 8 L15 24" stroke="#5B7A3A" strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon points="33,5 35,8 31,8" fill="#FDFAF5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M24 4 L40 12 L40 26 C40 36 32 43 24 46 C16 43 8 36 8 26 L8 12 Z" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <path d="M24 8 L36 14 L36 26 C36 34 30 40 24 42 C18 40 12 34 12 26 L12 14 Z" fill="#B8CC9A" opacity="0.2" />
      <path d="M17 24 L22 29 L32 18" stroke="#5B7A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 4 L24 8" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackpackIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="12" y="14" width="24" height="30" rx="6" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <path d="M18 14 C18 8 24 4 24 4 C24 4 30 8 30 14" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <rect x="18" y="20" width="12" height="10" rx="3" stroke="#B8CC9A" strokeWidth="2" fill="none" />
      <line x1="24" y1="20" x2="24" y2="30" stroke="#B8CC9A" strokeWidth="1.5" />
      <circle cx="38" cy="38" r="7" stroke="#5B7A3A" strokeWidth="2" fill="#FDFAF5" />
      <text x="38" y="42" textAnchor="middle" fontSize="9" fontWeight="700" fill="#5B7A3A" fontFamily="DM Sans">lb</text>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M4 10 L16 6 L32 12 L44 6 L44 38 L32 42 L16 36 L4 42 Z" stroke="#5B7A3A" strokeWidth="2" fill="none" />
      <line x1="16" y1="6" x2="16" y2="36" stroke="#5B7A3A" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="32" y1="12" x2="32" y2="42" stroke="#5B7A3A" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M10 18 Q18 22 24 20 Q30 18 38 24" stroke="#B8CC9A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="10" cy="18" r="3" fill="#5B7A3A" />
      <circle cx="38" cy="24" r="3" fill="#B8CC9A" />
      <path d="M24 14 L26 10 L28 14 Z" fill="#5B7A3A" opacity="0.5" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="4" width="28" height="40" rx="4" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <path d="M8 4 L8 8 C8 5.79 9.79 4 12 4" stroke="#5B7A3A" strokeWidth="2.5" />
      <line x1="14" y1="14" x2="30" y2="14" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="20" x2="26" y2="20" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="26" x2="28" y2="26" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="32" x2="22" y2="32" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <rect x="28" y="28" width="14" height="16" rx="3" fill="#5B7A3A" />
      <rect x="31" y="34" width="2" height="7" rx="1" fill="#FDFAF5" />
      <rect x="35" y="31" width="2" height="10" rx="1" fill="#B8CC9A" />
      <rect x="39" y="36" width="0" height="5" rx="0" fill="none" />
    </svg>
  );
}

// ── Responsive Hook ──────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Auth Form (extracted from old LoginPage — zero logic changes) ────

const AuthForm = forwardRef(function AuthForm({ onLogin, onSignup }, ref) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset");

  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  const verified = params.get("verified");
  const authError = params.get("error");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await onSignup(name, email, password, tosAccepted);
        setMessage(result.message || "Check your email to verify your account");
        setName(""); setEmail(""); setPassword(""); setTosAccepted(false);
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

  const switchMode = (newMode) => { setMode(newMode); setError(""); setMessage(""); };

  return (
    <div ref={ref} style={{
      background: "rgba(26,36,18,0.5)", backdropFilter: "blur(12px)",
      borderRadius: 18, padding: "28px 24px", border: "1px solid rgba(184,204,154,0.15)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: "#FDFAF5", margin: "0 0 4px 0", textAlign: "center" }}>
        {mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : mode === "reset" ? "New Password" : "Welcome Back"}
      </h2>
      <p style={{ fontSize: 12, color: "#B8CC9A", textAlign: "center", margin: "0 0 20px 0" }}>
        {mode === "forgot" ? "We'll send you a reset link" : mode === "reset" ? "Choose a new password" : mode === "signup" ? "Join your crew in seconds" : "Sign in to your crew"}
      </p>

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
        <div style={{ background: "rgba(91,122,58,0.2)", border: "2px solid rgba(184,204,154,0.5)", borderRadius: 14, padding: "16px 14px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{mode === "forgot" ? "📧" : "✅"}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#D4E4B8", marginBottom: 4, fontFamily: fontDisplay }}>
            {mode === "forgot" ? "Check your email" : mode === "login" && !verified ? "Password updated" : "Check your email"}
          </div>
          <div style={{ fontSize: 12, color: "#B8CC9A", lineHeight: 1.5 }}>{message}</div>
        </div>
      )}

      {/* Google Sign In */}
      {(mode === "login" || mode === "signup") && (
        <>
          <a href="/auth/google" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "12px 0", borderRadius: 12, background: "#FDFAF5", color: "#2C2416",
            fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: fontBody,
            border: "none", cursor: "pointer", marginBottom: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)", boxSizing: "border-box",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
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
        {mode === "signup" && (
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12,
            fontSize: 11, color: "#B8CC9A", cursor: "pointer", lineHeight: 1.4,
          }}>
            <input type="checkbox" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)}
              style={{ marginTop: 2, accentColor: "#5B7A3A", cursor: "pointer" }} />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" style={{ color: "#D4E4B8", textDecoration: "underline" }}>Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" style={{ color: "#D4E4B8", textDecoration: "underline" }}>Privacy Policy</a>
            </span>
          </label>
        )}
        {error && <div style={{ fontSize: 12, color: "#d08080", marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading || (mode === "signup" && !tosAccepted)} style={{
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
              style={linkBtnStyle}>Forgot password?</button>
            <button onClick={() => switchMode("signup")}
              style={{ ...linkBtnStyle, color: "#B8CC9A", fontSize: 12, marginTop: 4 }}>
              Don't have an account? <strong>Sign up</strong>
            </button>
          </>
        )}
        {mode === "signup" && (
          <button onClick={() => switchMode("login")}
            style={{ ...linkBtnStyle, color: "#B8CC9A", fontSize: 12 }}>
            Already have an account? <strong>Sign in</strong>
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button onClick={() => { switchMode("login"); window.history.replaceState({}, "", "/"); }}
            style={{ ...linkBtnStyle, color: "#B8CC9A", fontSize: 12 }}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
});

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #3A4D2A",
  background: "rgba(26,36,18,0.6)", color: "#E8E0D4", fontSize: 13, fontFamily: "'DM Sans',Helvetica,sans-serif",
  outline: "none", marginBottom: 10, boxSizing: "border-box", backdropFilter: "blur(4px)",
};

const linkBtnStyle = {
  background: "none", border: "none", color: "#7A9A5A", fontSize: 11,
  cursor: "pointer", fontFamily: "'DM Sans',Helvetica,sans-serif", display: "block", width: "100%",
};

// ── Feature data ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: CalendarIcon, title: "Training Calendar", desc: "Crew members mark availability with AM/PM granularity. Drag to select ranges. See the whole crew at a glance." },
  { icon: ChartIcon, title: "Best Windows", desc: "An algorithm finds optimal training dates from crew availability. Schedule events and track RSVPs in real time." },
  { icon: ShieldIcon, title: "Readiness Dashboard", desc: "Track gear, medical, admin, and training progress. Earn Trail Badges and advance from Trailhead to Summit." },
  { icon: BackpackIcon, title: "Gear Management", desc: "76-item catalog with personal, crew, and buddy sharing types. Pack weight calculator factors in food and water." },
  { icon: MapIcon, title: "Itinerary Viewer", desc: "48 Philmont routes loaded with day-by-day camps, mileage, and elevation. Printable cheat sheets for the trail." },
  { icon: ReportIcon, title: "Reports & Exports", desc: "Crew rosters, gear readiness matrices, pack weight summaries, and training RSVPs. CSV export or print." },
];

const STEPS = [
  { num: "1", title: "Create Your Troop", desc: "Sign in with Google or email. Set up your troop with your council and location in under a minute." },
  { num: "2", title: "Add Your Adventure", desc: "Pick Philmont (more bases coming soon), select your itinerary, and enter your trek dates." },
  { num: "3", title: "Coordinate Together", desc: "Invite members. Everyone marks availability, checks off gear, and tracks readiness — all in one place." },
];

// ── Main Landing Page ─────────────────────────────────────────────────

export default function LandingPage({ onLogin, onSignup }) {
  const isMobile = useIsMobile();
  const authRef = useRef(null);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ fontFamily: fontBody, overflowX: "hidden" }}>

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{
        minHeight: isMobile ? "auto" : "100vh",
        background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
        position: "relative", padding: isMobile ? "48px 20px 40px" : "0 40px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Texture overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />

        <div style={{
          maxWidth: 1100, width: "100%", position: "relative", zIndex: 1,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 32 : 60,
          padding: isMobile ? 0 : "60px 0",
        }}>
          {/* Left — Branding */}
          <div style={{ flex: isMobile ? "unset" : "1 1 55%", textAlign: isMobile ? "center" : "left" }}>
            <Logo size={isMobile ? 72 : 96} />
            <h1 style={{
              fontFamily: fontDisplay, fontSize: isMobile ? 36 : 48, fontWeight: 900,
              color: "#FDFAF5", margin: "16px 0 0 0", letterSpacing: "-1px", lineHeight: 1.1,
            }}>
              Trail<span style={{ color: "#B8CC9A" }}>Log</span>
            </h1>
            <p style={{
              fontSize: isMobile ? 16 : 20, color: "#D4E4B8", marginTop: 12,
              fontWeight: 500, lineHeight: 1.5, maxWidth: 480,
              marginLeft: isMobile ? "auto" : 0, marginRight: isMobile ? "auto" : 0,
            }}>
              The training coordinator for Scouting America high adventure crews.
              From first meeting to summit — get your crew organized.
            </p>
            <div style={{
              display: "flex", gap: 20, marginTop: 20,
              justifyContent: isMobile ? "center" : "flex-start",
              flexWrap: "wrap",
            }}>
              {["Easy Setup", "Mobile Friendly", "Built for Scouts"].map(label => (
                <span key={label} style={{
                  fontSize: 11, color: "#B8CC9A", fontWeight: 600, letterSpacing: 1,
                  textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8CC9A", display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
            {!isMobile && (
              <div style={{ marginTop: 32 }}>
                <button onClick={scrollToAuth} style={{
                  display: "none", // Auth form is right there on desktop — no need for extra button
                }} />
              </div>
            )}
          </div>

          {/* Right — Auth Form */}
          <div style={{ flex: isMobile ? "unset" : "0 0 360px", maxWidth: 400, width: "100%", margin: isMobile ? "0 auto" : 0 }}>
            <AuthForm ref={authRef} onLogin={onLogin} onSignup={onSignup} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section style={{ background: "#FDFAF5", padding: isMobile ? "48px 20px" : "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: fontDisplay, fontSize: isMobile ? 24 : 32, fontWeight: 800,
            color: "#2C2416", textAlign: "center", margin: "0 0 8px 0",
          }}>
            Everything Your Crew Needs
          </h2>
          <p style={{ fontSize: 14, color: "#6B5D4D", textAlign: "center", margin: "0 0 40px 0", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Six integrated tools that replace spreadsheets, group texts, and guesswork.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 16 : 24,
          }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: "#F3F0E8", border: "1px solid #DDD6C8", borderRadius: 16,
                padding: isMobile ? "20px 18px" : "28px 24px",
                transition: "transform 0.2s", cursor: "default",
              }}>
                <div style={{ marginBottom: 12 }}><f.icon /></div>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: "#2C2416", margin: "0 0 6px 0" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: "#6B5D4D", lineHeight: 1.5, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(175deg, #252B1F 0%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px" : "80px 40px",
        position: "relative",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: fontDisplay, fontSize: isMobile ? 24 : 32, fontWeight: 800,
            color: "#FDFAF5", textAlign: "center", margin: "0 0 8px 0",
          }}>
            Up and Running in Minutes
          </h2>
          <p style={{ fontSize: 14, color: "#B0A898", textAlign: "center", margin: "0 0 44px 0" }}>
            No downloads. No setup fees. Just sign in and go.
          </p>
          <div style={{
            display: "flex", flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 28 : 0, alignItems: isMobile ? "flex-start" : "flex-start",
            justifyContent: "space-between", position: "relative",
          }}>
            {/* Connector line (desktop only) */}
            {!isMobile && (
              <div style={{
                position: "absolute", top: 28, left: "18%", right: "18%",
                height: 2, background: "rgba(184,204,154,0.2)",
              }} />
            )}
            {STEPS.map((s, i) => (
              <div key={s.num} style={{
                flex: isMobile ? "unset" : 1, textAlign: isMobile ? "left" : "center",
                position: "relative", display: "flex", flexDirection: isMobile ? "row" : "column",
                alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 16 : 0,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(184,204,154,0.12)", border: "2px solid #B8CC9A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: fontDisplay, fontSize: 24, fontWeight: 900, color: "#B8CC9A",
                  flexShrink: 0, position: "relative", zIndex: 1,
                }}>
                  {s.num}
                </div>
                <div style={{ marginTop: isMobile ? 0 : 16 }}>
                  <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: "#FDFAF5", margin: "0 0 6px 0" }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#B0A898", lineHeight: 1.5, margin: 0, maxWidth: 240, marginLeft: isMobile ? 0 : "auto", marginRight: isMobile ? 0 : "auto" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADVENTURE BASES ─────────────────────────────── */}
      <section style={{ background: "#FDFAF5", padding: isMobile ? "48px 20px" : "80px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: fontDisplay, fontSize: isMobile ? 22 : 28, fontWeight: 800,
            color: "#2C2416", textAlign: "center", margin: "0 0 8px 0",
          }}>
            Built for Scouting America High Adventure
          </h2>
          <p style={{ fontSize: 14, color: "#6B5D4D", textAlign: "center", margin: "0 0 36px 0" }}>
            Philmont is live. More bases are on the way.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
          }}>
            {ADVENTURE_TYPES.map(a => (
              <div key={a.id} style={{
                background: a.enabled ? "#F3F0E8" : "#F8F6F1",
                border: a.enabled ? "2px solid #5B7A3A" : "1px solid #DDD6C8",
                borderRadius: 14, padding: "20px 14px", textAlign: "center",
                opacity: a.enabled ? 1 : 0.65, position: "relative",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{a.icon}</div>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, color: "#2C2416", margin: "0 0 4px 0" }}>
                  {a.name}
                </h3>
                <p style={{ fontSize: 11, color: "#8A7A6A", margin: 0 }}>{a.location}</p>
                <div style={{
                  marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase", fontFamily: fontBody,
                  color: a.enabled ? "#5B7A3A" : "#8A7A6A",
                  background: a.enabled ? "rgba(91,122,58,0.1)" : "rgba(0,0,0,0.04)",
                  borderRadius: 8, padding: "4px 10px", display: "inline-block",
                }}>
                  {a.enabled ? "Available Now" : "Coming Soon"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA + FOOTER ─────────────────────────── */}
      <section style={{
        background: "linear-gradient(175deg, #1A2412 0%, #2A3620 60%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px 32px" : "80px 40px 40px",
        textAlign: "center", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Logo size={48} />
          <h2 style={{
            fontFamily: fontDisplay, fontSize: isMobile ? 24 : 32, fontWeight: 800,
            color: "#FDFAF5", margin: "16px 0 8px 0",
          }}>
            Ready to Get Your Crew Organized?
          </h2>
          <p style={{ fontSize: 14, color: "#B0A898", marginBottom: 28, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Your crew's adventure starts here.
          </p>
          <button onClick={scrollToAuth} style={{
            padding: "14px 40px", borderRadius: 12, border: "none",
            background: "#5B7A3A", color: "#FDFAF5", fontSize: 16, fontWeight: 700,
            cursor: "pointer", fontFamily: fontBody,
            boxShadow: "0 4px 16px rgba(58,77,42,0.4)",
          }}>
            Get Started
          </button>

          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(184,204,154,0.1)" }}>
            <div style={{ fontSize: 9, color: "rgba(184,204,154,0.4)", fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12, fontFamily: fontBody }}>
              by GraceZero.ai
            </div>
            <div style={{ fontSize: 11, color: "#5A6A4A" }}>
              <a href="/privacy" style={{ color: "#5A6A4A", textDecoration: "none" }}>Privacy Policy</a>
              <span style={{ margin: "0 8px" }}>·</span>
              <a href="/terms" style={{ color: "#5A6A4A", textDecoration: "none" }}>Terms of Service</a>
            </div>
            <p style={{ fontSize: 10, color: "#4A5A3A", marginTop: 10 }}>
              Not affiliated with Scouting America or the Boy Scouts of America.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
