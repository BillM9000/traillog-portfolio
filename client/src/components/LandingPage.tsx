import type React from "react";
import { useState, useEffect, useRef, forwardRef } from "react";
import clsx from "clsx";
import { api } from "../api";
import { ADVENTURE_TYPES } from "../utils/constants";
import Logo from "./Logo";

// ── Custom SVG Feature Icons (48px, forest green palette) ──────────────

function CalendarIcon(): React.ReactElement {
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

function ChartIcon(): React.ReactElement {
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

function ShieldIcon(): React.ReactElement {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M24 4 L40 12 L40 26 C40 36 32 43 24 46 C16 43 8 36 8 26 L8 12 Z" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      <path d="M24 8 L36 14 L36 26 C36 34 30 40 24 42 C18 40 12 34 12 26 L12 14 Z" fill="#B8CC9A" opacity="0.2" />
      <path d="M17 24 L22 29 L32 18" stroke="#5B7A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 4 L24 8" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackpackIcon(): React.ReactElement {
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

function MapIcon(): React.ReactElement {
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

function ReportIcon(): React.ReactElement {
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

function AIReadinessIcon(): React.ReactElement {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Brain outline */}
      <path d="M24 6 C16 6 10 12 10 20 C10 26 14 31 18 34 L18 40 C18 42 20 44 22 44 L26 44 C28 44 30 42 30 40 L30 34 C34 31 38 26 38 20 C38 12 32 6 24 6 Z" stroke="#5B7A3A" strokeWidth="2.5" fill="none" />
      {/* Neural network nodes */}
      <circle cx="20" cy="18" r="2.5" fill="#5B7A3A" />
      <circle cx="28" cy="18" r="2.5" fill="#5B7A3A" />
      <circle cx="24" cy="24" r="2.5" fill="#B8CC9A" />
      <circle cx="18" cy="28" r="2" fill="#B8CC9A" />
      <circle cx="30" cy="28" r="2" fill="#B8CC9A" />
      {/* Neural connections */}
      <line x1="20" y1="18" x2="24" y2="24" stroke="#5B7A3A" strokeWidth="1.5" opacity="0.6" />
      <line x1="28" y1="18" x2="24" y2="24" stroke="#5B7A3A" strokeWidth="1.5" opacity="0.6" />
      <line x1="24" y1="24" x2="18" y2="28" stroke="#B8CC9A" strokeWidth="1.5" opacity="0.5" />
      <line x1="24" y1="24" x2="30" y2="28" stroke="#B8CC9A" strokeWidth="1.5" opacity="0.5" />
      {/* Spark/glow */}
      <circle cx="24" cy="14" r="1.5" fill="#5B7A3A" opacity="0.4" />
      <path d="M20 40 L28 40" stroke="#5B7A3A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 43 L27 43" stroke="#B8CC9A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Responsive Hook ──────────────────────────────────────────────────

function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Auth Form (extracted from old LoginPage — zero logic changes) ────

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string, tosAccepted: boolean) => Promise<{ message?: string }>;
  registrationEnabled?: boolean;
}

const AuthForm = forwardRef<HTMLDivElement, AuthFormProps>(function AuthForm({ onLogin, onSignup, registrationEnabled = true }, ref) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset");

  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(resetToken ? "reset" : "login");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [password2, setPassword2] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [tosAccepted, setTosAccepted] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const verified = params.get("verified");
  const authError = params.get("error");

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await onSignup(name, email, password, tosAccepted);
        setMessage(result.message || "Check your email to verify your account");
        setName(""); setEmail(""); setPassword(""); setTosAccepted(false);
        setLastAction("signup");
        setMode("login");
      } else if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setMessage((result as { message?: string }).message || "If that email exists, a reset link has been sent");
        setEmail("");
      } else if (mode === "reset") {
        if (password !== password2) { setError("Passwords don't match"); setLoading(false); return; }
        const result = await api.resetPassword(resetToken as string, password);
        setMessage((result as { message?: string }).message || "Password updated. You can now sign in.");
        setPassword(""); setPassword2("");
        window.history.replaceState({}, "", "/");
        setLastAction("reset");
        setMode("login");
      } else {
        await onLogin(email, password);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "signup" | "forgot" | "reset"): void => { setMode(newMode); setError(""); setMessage(""); };

  return (
    <div ref={ref} className="rounded-[18px] px-6 py-7" style={{
      background: "rgba(26,36,18,0.5)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(184,204,154,0.15)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      <h2 className="font-display text-[20px] font-bold text-brand-cream text-center m-0 mb-1">
        {mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : mode === "reset" ? "New Password" : "Welcome Back"}
      </h2>
      <p className="text-[12px] text-brand-sage text-center m-0 mb-5">
        {mode === "forgot" ? "We'll send you a reset link" : mode === "reset" ? "Choose a new password" : mode === "signup" ? "Join your crew in seconds" : "Sign in to your crew"}
      </p>

      {/* Status messages */}
      {verified && (
        <div className="rounded-[12px] px-3.5 py-2.5 mb-3 text-[12px] text-center" style={{ background: "rgba(91,122,58,0.15)", border: "1px solid rgba(184,204,154,0.3)", color: "#B8CC9A" }}>
          Email verified! You can now sign in.
        </div>
      )}
      {authError && (
        <div className="rounded-[12px] px-3.5 py-2.5 mb-3 text-[12px] text-center" style={{ background: "rgba(192,96,64,0.15)", border: "1px solid rgba(192,96,64,0.3)", color: "#d08080" }}>
          Authentication failed. Please try again.
        </div>
      )}
      {message && (
        <div className="rounded-[14px] px-3.5 py-4 mb-4 text-center" style={{ background: "rgba(91,122,58,0.2)", border: "2px solid rgba(184,204,154,0.5)" }}>
          <div className="text-[28px] mb-1.5">{mode === "forgot" ? "\uD83D\uDCE7" : "\u2705"}</div>
          <div className="text-[14px] font-bold mb-1 font-display" style={{ color: "#D4E4B8" }}>
            {lastAction === "reset" ? "Password updated" : "Check your email"}
          </div>
          <div className="text-[12px] leading-[1.5]" style={{ color: "#B8CC9A" }}>{message}</div>
        </div>
      )}

      {/* Google Sign In */}
      {(mode === "login" || mode === "signup") && (
        <>
          <a href="/auth/google" className="flex items-center justify-center gap-2.5 w-full py-3 rounded-[12px] text-[14px] font-semibold no-underline font-body cursor-pointer mb-3.5 box-border lp-focus-ring" style={{
            background: "#FDFAF5", color: "#2C2416", border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </a>
          <div className="flex items-center gap-3 mb-3.5">
            <div className="flex-1 h-px" style={{ background: "rgba(184,204,154,0.15)" }} />
            <span className="text-[11px]" style={{ color: "#7A9A5A" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(184,204,154,0.15)" }} />
          </div>
        </>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Your name"
            id="lp-name" name="name" autoComplete="name" aria-label="Your name"
            className="lp-input" required />
        )}
        {(mode === "login" || mode === "signup" || mode === "forgot") && (
          <input value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Email address" type="email"
            id="lp-email" name="email" autoComplete="email" aria-label="Email address"
            className="lp-input" required />
        )}
        {(mode === "login" || mode === "signup") && (
          <input value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="Password" type="password"
            id="lp-password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} aria-label="Password"
            className="lp-input" required minLength={8} />
        )}
        {mode === "reset" && (
          <>
            <input value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="New password" type="password"
              id="lp-new-password" name="new-password" autoComplete="new-password" aria-label="New password"
              className="lp-input" required minLength={8} />
            <input value={password2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword2(e.target.value)} placeholder="Confirm new password" type="password"
              id="lp-confirm-password" name="confirm-password" autoComplete="new-password" aria-label="Confirm new password"
              className="lp-input" required minLength={8} />
          </>
        )}
        {mode === "signup" && (
          <label className="flex items-start gap-2 mb-3 text-[11px] cursor-pointer leading-[1.4]" style={{ color: "#B8CC9A" }}>
            <input type="checkbox" checked={tosAccepted} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTosAccepted(e.target.checked)}
              className="mt-0.5 cursor-pointer" style={{ accentColor: "#5B7A3A" }} />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" className="underline" style={{ color: "#D4E4B8" }}>Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="underline" style={{ color: "#D4E4B8" }}>Privacy Policy</a>
            </span>
          </label>
        )}
        {error && <div className="text-[12px] mb-2" style={{ color: "#d08080" }}>{error}</div>}
        <button type="submit" disabled={loading || (mode === "signup" && !tosAccepted)} className={clsx(
          "w-full py-3 rounded-[12px] border-none text-[14px] font-semibold font-body mb-3 lp-focus-ring",
          loading ? "cursor-wait opacity-70" : "cursor-pointer opacity-100"
        )} style={{
          background: "#5B7A3A", color: "#FDFAF5",
          boxShadow: "0 2px 8px rgba(58,77,42,0.3)",
        }}>
          {loading ? "..." :
            mode === "signup" ? "Create Account" :
            mode === "forgot" ? "Send Reset Link" :
            mode === "reset" ? "Set New Password" :
            "Sign In"}
        </button>
      </form>

      {/* Navigation links */}
      <div className="text-center">
        {mode === "login" && (
          <>
            <button onClick={() => switchMode("forgot")}
              className="lp-link-btn">Forgot password?</button>
            {registrationEnabled ? (
              <button onClick={() => switchMode("signup")}
                className="lp-link-btn text-[17px] mt-2.5 tracking-[0.3px]" style={{ color: "#B8CC9A" }}>
                Don't have an account? <strong style={{ color: "#FDFAF5", fontSize: 18 }}>Sign up</strong>
              </button>
            ) : (
              <div className="text-[13px] mt-2.5 italic opacity-70" style={{ color: "#B8CC9A" }}>
                Registration is currently closed
              </div>
            )}
          </>
        )}
        {mode === "signup" && (
          <button onClick={() => switchMode("login")}
            className="lp-link-btn text-[15px] mt-2" style={{ color: "#B8CC9A" }}>
            Already have an account? <strong>Sign in</strong>
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button onClick={() => { switchMode("login"); window.history.replaceState({}, "", "/"); }}
            className="lp-link-btn text-[12px]" style={{ color: "#B8CC9A" }}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
});

// ── FAQ Accordion Item ───────────────────────────────────────────────

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className="rounded-[12px] overflow-hidden" style={{
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,204,154,0.15)",
    }}>
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 bg-transparent border-none cursor-pointer flex items-center justify-between gap-3 text-left lp-focus-ring">
        <span className="text-[14px] font-semibold font-body leading-[1.4]" style={{ color: "#FDFAF5" }}>
          {question}
        </span>
        <span className="text-[18px] shrink-0 transition-transform duration-200" style={{
          color: "#B8CC9A",
          transform: open ? "rotate(45deg)" : "none",
        }}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-[13px] leading-[1.6] m-0" style={{ color: "#B0A898" }}>{answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Feature data ──────────────────────────────────────────────────────

interface FeatureItem {
  icon: () => React.ReactElement;
  title: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  { icon: CalendarIcon, title: "Training Calendar", desc: "Crew members mark availability with a simple tap. Heat map shows overlap at a glance. Drag to select ranges." },
  { icon: ChartIcon, title: "Smart Scheduling", desc: "Propose and schedule training events from the best overlap dates. Track RSVPs, attendance, and earn readiness milestones." },
  { icon: AIReadinessIcon, title: "AI Training Plans", desc: "Powered by Claude AI. Take a self-assessment, get a personalized training plan, priority coaching, and milestone tracking tailored to your trek. For general guidance \u2014 not medical advice." },
  { icon: BackpackIcon, title: "Gear Management", desc: "76-item catalog with personal, crew, and buddy sharing types. Pack weight calculator factors in food and water." },
  { icon: MapIcon, title: "Itinerary Viewer", desc: "48 Philmont routes loaded with day-by-day camps, mileage, and elevation. Printable cheat sheets for the trail." },
  { icon: ReportIcon, title: "Reports & Exports", desc: "Crew rosters, gear readiness matrices, pack weight summaries, and training RSVPs. Excel export or print." },
];

interface StepItem {
  num: string;
  title: string;
  desc: string;
}

const STEPS: StepItem[] = [
  { num: "1", title: "Create Your Troop", desc: "Sign in with Google or email. Set up your troop with your council and location in under a minute." },
  { num: "2", title: "Add Your Adventure", desc: "Pick your adventure base, select your itinerary, and enter your trek dates. AI builds your training plan." },
  { num: "3", title: "Coordinate Together", desc: "Invite members. Everyone marks availability, checks off gear, and gets AI-personalized readiness coaching." },
];

// ── Main Landing Page ─────────────────────────────────────────────────

interface LandingPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string, tosAccepted: boolean) => Promise<{ message?: string }>;
  registrationEnabled?: boolean;
}

export default function LandingPage({ onLogin, onSignup, registrationEnabled = true }: LandingPageProps): React.ReactElement {
  const isMobile = useIsMobile();
  const authRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  const scrollToAuth = (): void => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="font-body overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center flex-col" style={{
        background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px 40px" : "60px 40px 48px",
      }}>
        {/* Texture overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />

        <div className="max-w-[1100px] w-full relative z-[1] flex" style={{
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 32 : 60,
          padding: isMobile ? 0 : "60px 0",
        }}>
          {/* Left — Branding */}
          <div style={{ flex: isMobile ? "unset" : "1 1 55%", textAlign: isMobile ? "center" : "left" }}>
            <Logo size={isMobile ? 72 : 96} />
            <h1 className="font-display font-black m-0 mt-4 tracking-[-1px] leading-[1.1]" style={{
              fontSize: isMobile ? 36 : 48, color: "#FDFAF5",
            }}>
              Trail<span style={{ color: "#B8CC9A" }}>Log</span>
            </h1>
            <p className="font-medium leading-[1.5]" style={{
              fontSize: isMobile ? 16 : 20, color: "#D4E4B8", marginTop: 12,
              maxWidth: 480,
              marginLeft: isMobile ? "auto" : 0, marginRight: isMobile ? "auto" : 0,
            }}>
              The AI-powered readiness coordinator for Scouting America high adventure crews. Track training, gear, and admin prep from first meeting to summit day.
            </p>
            <p className="italic" style={{
              fontSize: 12, color: "#8A9A7A", marginTop: 6, lineHeight: 1.4, maxWidth: 480,
              marginLeft: isMobile ? "auto" : 0, marginRight: isMobile ? "auto" : 0,
            }}>
              An independent tool by GraceZero.ai &mdash; not affiliated with or endorsed by Scouting America or any national scouting organization.
            </p>
            <div className="flex flex-wrap mt-4" style={{
              gap: 20,
              justifyContent: isMobile ? "center" : "flex-start",
            }}>
              {["AI-Powered", "Mobile Friendly", "Built for Crews"].map((label: string) => (
                <span key={label} className="text-[11px] font-semibold tracking-[1px] uppercase flex items-center gap-1.5" style={{ color: "#B8CC9A" }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#B8CC9A" }} />
                  {label}
                </span>
              ))}
            </div>
            {!isMobile && (
              <div className="mt-8">
                <button onClick={scrollToAuth} className="hidden" />
              </div>
            )}
          </div>

          {/* Right — Auth Form */}
          <div style={{ flex: isMobile ? "unset" : "0 0 360px", maxWidth: 400, width: "100%", margin: isMobile ? "0 auto" : 0 }}>
            <AuthForm ref={authRef} onLogin={onLogin} onSignup={onSignup} registrationEnabled={registrationEnabled} />
          </div>
        </div>

        {/* Scroll indicator */}
        {!isMobile && (
          <div
            onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="text-center mt-8 relative z-[1] cursor-pointer"
          >
            <div className="text-[11px] tracking-[1.5px] uppercase mb-2 font-body" style={{ color: "#7A9A5A" }}>
              See what's inside
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-60" style={{ animation: "bounce 2s infinite" }}>
              <path d="M6 9 L12 15 L18 9" stroke="#B8CC9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }`}</style>
          </div>
        )}
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section ref={featuresRef} style={{ background: "#FDFAF5", padding: isMobile ? "48px 20px" : "80px 40px" }}>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="font-display font-extrabold text-center m-0 mb-2" style={{
            fontSize: isMobile ? 24 : 32, color: "#2C2416",
          }}>
            Everything Your Crew Needs
          </h2>
          <p className="text-[14px] text-center m-0 mb-10 max-w-[520px] mx-auto" style={{ color: "#6B5D4D" }}>
            Six integrated tools that replace spreadsheets, group texts, and guesswork.
          </p>
          <div className="grid" style={{
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 16 : 24,
          }}>
            {FEATURES.map((f: FeatureItem) => (
              <div key={f.title} className="rounded-[16px] cursor-default transition-transform duration-200" style={{
                background: "#F3F0E8", border: "1px solid #DDD6C8",
                padding: isMobile ? "20px 18px" : "28px 24px",
              }}>
                <div className="mb-3"><f.icon /></div>
                <h3 className="font-display text-[16px] font-bold m-0 mb-1.5" style={{ color: "#2C2416" }}>
                  {f.title}
                </h3>
                <p className="text-[13px] leading-[1.5] m-0" style={{ color: "#6B5D4D" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section className="relative" style={{
        background: "linear-gradient(175deg, #252B1F 0%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px" : "80px 40px",
      }}>
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-display font-extrabold text-center m-0 mb-2" style={{
            fontSize: isMobile ? 24 : 32, color: "#FDFAF5",
          }}>
            Up and Running in Minutes
          </h2>
          <p className="text-[14px] text-center m-0 mb-11" style={{ color: "#B0A898" }}>
            No downloads. No setup fees. Just sign in and go.
          </p>
          <div className="flex relative" style={{
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 28 : 0,
            alignItems: "flex-start", justifyContent: "space-between",
          }}>
            {/* Connector line (desktop only) */}
            {!isMobile && (
              <div className="absolute h-0.5" style={{
                top: 28, left: "18%", right: "18%",
                background: "rgba(184,204,154,0.2)",
              }} />
            )}
            {STEPS.map((s: StepItem, i: number) => (
              <div key={s.num} className="relative flex" style={{
                flex: isMobile ? "unset" : 1,
                textAlign: isMobile ? "left" : "center",
                flexDirection: isMobile ? "row" : "column",
                alignItems: isMobile ? "flex-start" : "center",
                gap: isMobile ? 16 : 0,
              }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 relative z-[1] font-display text-[24px] font-black" style={{
                  background: "rgba(184,204,154,0.12)", border: "2px solid #B8CC9A", color: "#B8CC9A",
                }}>
                  {s.num}
                </div>
                <div style={{ marginTop: isMobile ? 0 : 16 }}>
                  <h3 className="font-display text-[16px] font-bold m-0 mb-1.5" style={{ color: "#FDFAF5" }}>
                    {s.title}
                  </h3>
                  <p className="text-[13px] leading-[1.5] m-0 max-w-[240px]" style={{
                    color: "#B0A898",
                    marginLeft: isMobile ? 0 : "auto", marginRight: isMobile ? 0 : "auto",
                  }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section style={{ background: "#FDFAF5", padding: isMobile ? "48px 20px" : "80px 40px" }}>
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-display font-extrabold text-center m-0 mb-2" style={{
            fontSize: isMobile ? 24 : 32, color: "#2C2416",
          }}>
            Start Free. Adventure Ready.
          </h2>
          <p className="text-[14px] text-center m-0 mb-2 max-w-[560px] mx-auto leading-[1.6]" style={{ color: "#6B5D4D" }}>
            No subscription. No monthly fees. Pay per adventure &mdash; your whole crew is covered.
          </p>
          <p className="text-[12px] text-center m-0 mb-10 italic" style={{ color: "#8A7A6A" }}>
            One price covers your entire crew &mdash; unlimited members, one flat cost.
          </p>

          {/* ── Pricing Comparison Matrix ── */}
          <div className="max-w-[720px] mx-auto rounded-[16px] overflow-hidden" style={{ border: "2px solid #DDD6C8" }}>
            {/* Column headers */}
            <div className="grid" style={{
              gridTemplateColumns: "1fr 120px 120px",
              background: "#F3F0E8", borderBottom: "2px solid #DDD6C8",
            }}>
              <div style={{ padding: isMobile ? "16px 12px" : "20px 24px" }}>
                <div className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: "#8A7A6A" }}>Features</div>
              </div>
              <div className="text-center" style={{ padding: isMobile ? "12px 8px" : "16px 12px", borderLeft: "1px solid #DDD6C8" }}>
                <div className="text-[11px] font-bold uppercase tracking-[1px] mb-1" style={{ color: "#5B7A3A" }}>Free</div>
                <div className="font-display font-black" style={{ fontSize: isMobile ? 20 : 24, color: "#2C2416" }}>$0</div>
                <div className="text-[10px]" style={{ color: "#8A7A6A" }}>1st adventure</div>
              </div>
              <div className="text-center" style={{
                padding: isMobile ? "12px 8px" : "16px 12px",
                borderLeft: "1px solid #DDD6C8",
                background: "linear-gradient(175deg, #2A3620 0%, #1A2412 100%)",
              }}>
                <div className="text-[11px] font-bold uppercase tracking-[1px] mb-1" style={{ color: "#B8CC9A" }}>Pro</div>
                <div className="font-display font-black" style={{ fontSize: isMobile ? 20 : 24, color: "#FDFAF5" }}>$29</div>
                <div className="text-[10px]" style={{ color: "#B0A898" }}>per adventure</div>
              </div>
            </div>

            {/* Feature rows */}
            {[
              { feature: "Unlimited crew members", free: true, pro: true },
              { feature: "Training calendar & scheduling", free: true, pro: true },
              { feature: "Smart scheduling & heat map", free: true, pro: true },
              { feature: "Training event RSVPs", free: true, pro: true },
              { feature: "Gear tracking (76-item catalog)", free: true, pro: true },
              { feature: "Pack weight calculator", free: true, pro: true },
              { feature: "Itinerary viewer & day-by-day", free: true, pro: true },
              { feature: "Printable cheat sheets", free: true, pro: true },
              { feature: "Reports & exports", free: true, pro: true },
              { feature: "AI-powered training plans", free: true, pro: true },
              { feature: "AI gear recommendations", free: true, pro: true },
              { feature: "Readiness scoring & badges", free: true, pro: true },
              { feature: "Email notifications & invites", free: true, pro: true },
              { feature: "Google & email sign-in", free: true, pro: true },
              { feature: "Multiple concurrent adventures", free: false, pro: true },
              { feature: "Sister crews & split itineraries", free: false, pro: true },
              { feature: "All future feature updates", free: true, pro: true },
            ].map((row: { feature: string; free: boolean; pro: boolean }, i: number) => (
              <div key={row.feature} className="grid" style={{
                gridTemplateColumns: "1fr 120px 120px",
                background: i % 2 === 0 ? "#FDFAF5" : "#F8F5ED",
                borderBottom: "1px solid #E8E2D6",
              }}>
                <div className="flex items-center text-[13px]" style={{ padding: isMobile ? "10px 12px" : "12px 24px", color: "#4A3A2A" }}>
                  {row.feature}
                </div>
                <div className="flex items-center justify-center text-center" style={{ padding: "10px 12px", borderLeft: "1px solid #E8E2D6" }}>
                  {row.free ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="8" fill="#E8F5E0" />
                      <path d="M5 9 L7.5 11.5 L13 6" stroke="#5B7A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-[16px]" style={{ color: "#C8C0B4" }}>&mdash;</span>
                  )}
                </div>
                <div className="flex items-center justify-center text-center" style={{ padding: "10px 12px", borderLeft: "1px solid #E8E2D6" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" fill="#E8F5E0" />
                    <path d="M5 9 L7.5 11.5 L13 6" stroke="#5B7A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}

            {/* CTA row */}
            <div className="grid" style={{
              gridTemplateColumns: "1fr 120px 120px",
              background: "#F3F0E8", borderTop: "2px solid #DDD6C8",
            }}>
              <div />
              <div className="text-center" style={{ padding: "16px 8px", borderLeft: "1px solid #DDD6C8" }}>
                <button onClick={scrollToAuth} className="w-full py-2 rounded-[8px] text-[12px] font-bold cursor-pointer font-body lp-focus-ring" style={{
                  border: "2px solid #5B7A3A", background: "transparent", color: "#5B7A3A",
                }}>
                  Start Free
                </button>
              </div>
              <div className="text-center" style={{ padding: "16px 8px", borderLeft: "1px solid #DDD6C8" }}>
                <button onClick={scrollToAuth} className="w-full py-2 rounded-[8px] border-none text-[12px] font-bold cursor-pointer font-body lp-focus-ring" style={{
                  background: "#5B7A3A", color: "#FDFAF5",
                }}>
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Per-adventure explainer */}
          <div className="mt-10 max-w-[720px] mx-auto rounded-[16px]" style={{
            background: "#F3F0E8", border: "1px solid #DDD6C8",
            padding: isMobile ? "24px 18px" : "32px 28px",
          }}>
            <h3 className="font-display font-extrabold text-center m-0 mb-1.5" style={{
              fontSize: isMobile ? 16 : 18, color: "#2C2416",
            }}>
              What counts as an &ldquo;adventure&rdquo;?
            </h3>
            <p className="text-[13px] text-center m-0 mb-5 leading-[1.5] max-w-[480px] mx-auto" style={{ color: "#6B5D4D" }}>
              An adventure is one trip to one base &mdash; like Philmont 2026. Everyone going on that trip shares one adventure. You never pay per person.
            </p>
            <div className="grid" style={{
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 14,
            }}>
              {[
                { title: "One crew, one trek", desc: "12 people heading to Philmont together? That's one adventure. $0 the first time, $29 after that. All 12 members included." },
                { title: "Sister crews, same trip", desc: "Your troop sends two crews to Philmont the same summer? Each crew is its own adventure with its own itinerary and gear lists." },
                { title: "Different bases, different trips", desc: "Philmont this year and Northern Tier next year? Two separate adventures. The first is always free." },
                { title: "Same base, new year", desc: "Going back to Philmont in 2027? That's a new adventure with fresh dates, new crew members, and a new training plan." },
              ].map((s: { title: string; desc: string }) => (
                <div key={s.title} className="rounded-[12px] px-3.5 py-4" style={{
                  background: "#FDFAF5", border: "1px solid #E8E2D6",
                }}>
                  <div className="font-display text-[13px] font-bold mb-1" style={{ color: "#2C2416" }}>
                    {s.title}
                  </div>
                  <p className="text-[12px] m-0 leading-[1.5]" style={{ color: "#6B5D4D" }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ADVENTURE BASES ─────────────────────────────── */}
      <section style={{ background: "#F3F0E8", padding: isMobile ? "48px 20px" : "80px 40px" }}>
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-display font-extrabold text-center m-0 mb-2" style={{
            fontSize: isMobile ? 22 : 28, color: "#2C2416",
          }}>
            Built for High Adventure
          </h2>
          <p className="text-[14px] text-center m-0 mb-9" style={{ color: "#6B5D4D" }}>
            Philmont is fully loaded. More adventure bases on the way.
          </p>
          <div className="grid" style={{
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
          }}>
            {ADVENTURE_TYPES.map((a: any) => (
              <div key={a.id} className="rounded-[14px] text-center relative" style={{
                background: a.enabled ? "#F3F0E8" : "#F8F6F1",
                border: a.enabled ? "2px solid #5B7A3A" : "1px solid #DDD6C8",
                padding: "20px 14px", opacity: a.enabled ? 1 : 0.65,
              }}>
                <div className="text-[36px] mb-2">{a.icon}</div>
                <h3 className="font-display text-[14px] font-bold m-0 mb-1" style={{ color: "#2C2416" }}>
                  {a.name}
                </h3>
                <p className="text-[11px] m-0" style={{ color: "#8A7A6A" }}>{a.location}</p>
                <div className="mt-2.5 text-[10px] font-bold tracking-[1px] uppercase font-body rounded-[8px] px-2.5 py-1 inline-block" style={{
                  color: a.enabled ? "#5B7A3A" : "#8A7A6A",
                  background: a.enabled ? "rgba(91,122,58,0.1)" : "rgba(0,0,0,0.04)",
                }}>
                  {a.enabled ? "Available Now" : "Coming Soon"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(175deg, #252B1F 0%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px" : "80px 40px",
      }}>
        <div className="max-w-[720px] mx-auto">
          <h2 className="font-display font-extrabold text-center m-0 mb-2" style={{
            fontSize: isMobile ? 24 : 32, color: "#FDFAF5",
          }}>
            Frequently Asked Questions
          </h2>
          <p className="text-[14px] text-center m-0 mb-9" style={{ color: "#B0A898" }}>
            Everything you need to know before getting started.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { q: "Is TrailLog affiliated with the BSA or Philmont?", a: "No. TrailLog is an independent tool built by GraceZero.ai. It is not affiliated with, endorsed by, or sponsored by Scouting America, Philmont Scout Ranch, or any national scouting organization." },
              { q: "What does 'first adventure free' mean?", a: "Your first adventure is completely free \u2014 all features, unlimited members, no credit card required. If your troop adds a second concurrent adventure (like sister crews on the same trip), only the additional adventures cost $29 each." },
              { q: "Do I pay per person?", a: "No. You pay per adventure, and each adventure covers your entire crew \u2014 whether that's 8 people or 20. Every member gets full access." },
              { q: "What adventure bases are supported?", a: "Philmont Scout Ranch is fully loaded with 48 itineraries, gear catalogs, and AI training. Northern Tier, Sea Base, and Summit Bechtel are coming soon." },
              { q: "Is my data secure?", a: "Yes. We use HTTPS encryption, session-based authentication, and follow security best practices including CSRF protection, rate limiting, input validation, and Content Security Policy headers. Your data is never sold or shared." },
              { q: "Can scouts under 18 use this?", a: "Yes. Users 13 and older can create accounts. Users under 18 are identified as scouts with appropriate role restrictions. A parent notification email is sent when a minor creates an account." },
              { q: "How does the AI training plan work?", a: "You take a quick self-assessment (fitness level, hiking experience, altitude exposure). Claude AI generates a personalized multi-phase training plan tailored to your specific trek difficulty and timeline. It's general guidance \u2014 not medical advice." },
              { q: "Can I use this on my phone?", a: "Absolutely. TrailLog is a mobile-first web app \u2014 no download needed. It works in any modern browser on phones, tablets, and desktops." },
            ].map((faq: { q: string; a: string }, i: number) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ────────────────────────────────────────── */}
      <section style={{ background: "#FDFAF5", padding: isMobile ? "48px 20px" : "64px 40px" }}>
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="font-display font-extrabold m-0 mb-2" style={{
            fontSize: isMobile ? 22 : 28, color: "#2C2416",
          }}>
            Questions? Feedback?
          </h2>
          <p className="text-[14px] m-0 mb-7 leading-[1.6]" style={{ color: "#6B5D4D" }}>
            We'd love to hear from you. Whether you have a feature request, found a bug, or just want to say hi.
          </p>
          <div className="flex justify-center items-stretch" style={{
            flexDirection: isMobile ? "column" : "row",
            gap: 16,
          }}>
            <a href="mailto:bill.mccoy@gracezero.ai" className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-[14px] no-underline text-[14px] font-semibold font-body" style={{
              background: "#F3F0E8", border: "1px solid #DDD6C8",
              color: "#2C2416",
              flex: isMobile ? "unset" : 1, maxWidth: 280,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B7A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7 L12 13 L2 7" />
              </svg>
              bill.mccoy@gracezero.ai
            </a>
          </div>
          <p className="text-[11px] mt-4" style={{ color: "#8A7A6A" }}>
            We typically respond within 24 hours.
          </p>
        </div>
      </section>

      {/* ── BOTTOM CTA + FOOTER ─────────────────────────── */}
      <section className="text-center relative" style={{
        background: "linear-gradient(175deg, #1A2412 0%, #2A3620 60%, #1A1F16 100%)",
        padding: isMobile ? "48px 20px 32px" : "80px 40px 40px",
      }}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />
        <div className="relative z-[1]">
          <Logo size={48} />
          <h2 className="font-display font-extrabold mt-4 mb-2" style={{
            fontSize: isMobile ? 24 : 32, color: "#FDFAF5",
          }}>
            Ready to Get Your Crew Organized?
          </h2>
          <p className="text-[14px] mb-7 max-w-[400px] mx-auto" style={{ color: "#B0A898" }}>
            Your crew's adventure starts here.
          </p>
          <button onClick={scrollToAuth} className="px-10 py-3.5 rounded-[12px] border-none text-[16px] font-bold cursor-pointer font-body lp-focus-ring" style={{
            background: "#5B7A3A", color: "#FDFAF5",
            boxShadow: "0 4px 16px rgba(58,77,42,0.4)",
          }}>
            Get Started
          </button>

          {/* Footer */}
          <div className="mt-12 pt-6" style={{ borderTop: "1px solid rgba(184,204,154,0.1)" }}>
            <div className="text-[9px] font-semibold tracking-[2.5px] uppercase mb-3 font-body" style={{ color: "rgba(184,204,154,0.4)" }}>
              by GraceZero.ai
            </div>
            <div className="text-[11px]" style={{ color: "#5A6A4A" }}>
              <a href="/privacy" className="no-underline" style={{ color: "#5A6A4A" }}>Privacy Policy</a>
              <span className="mx-2">&middot;</span>
              <a href="/terms" className="no-underline" style={{ color: "#5A6A4A" }}>Terms of Service</a>
              <span className="mx-2">&middot;</span>
              <a href="mailto:bill.mccoy@gracezero.ai" className="no-underline" style={{ color: "#5A6A4A" }}>Contact</a>
            </div>
            <p className="text-[10px] mt-2.5" style={{ color: "#4A5A3A" }}>
              Not affiliated with or endorsed by any national scouting organization.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
