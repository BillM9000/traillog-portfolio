import { useState } from "react";
import { api } from "../api";
import clsx from "clsx";
import Logo from "./Logo";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string, tosAccepted: boolean) => Promise<{ message?: string }>;
}

type LoginMode = "login" | "signup" | "forgot" | "reset";

export default function LoginPage({ onLogin, onSignup }: LoginPageProps) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset");

  const [mode, setMode] = useState<LoginMode>(resetToken ? "reset" : "login");
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        const result = await api.forgotPassword(email) as { message?: string };
        setMessage(result.message || "If that email exists, a reset link has been sent");
        setEmail("");
      } else if (mode === "reset") {
        if (password !== password2) { setError("Passwords don't match"); setLoading(false); return; }
        const result = await api.resetPassword(resetToken!, password) as { message?: string };
        setMessage(result.message || "Password updated. You can now sign in.");
        setPassword(""); setPassword2("");
        // Clear reset token from URL
        window.history.replaceState({}, "", "/");
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

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-body"
      style={{ background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)" }}
    >
      {/* Texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="w-full max-w-[380px] px-5 relative z-[1]">
        {/* Branding */}
        <div className="text-center mb-9">
          <Logo size={72} />
          <h1 className="font-display text-[32px] font-black text-[#FDFAF5] mt-3 tracking-[-0.5px]">
            Trail<span className="text-[#B8CC9A]">Log</span>
          </h1>
          <div className="text-[9px] text-[rgba(184,204,154,0.5)] font-semibold tracking-[2.5px] uppercase mt-1 font-body">
            by GraceZero.ai
          </div>
          <p className="text-sm text-[#D4E4B8] mt-3 font-medium">
            {mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Coordinate your crew's high adventure training"}
          </p>
        </div>

        {/* Status messages */}
        {verified && (
          <div className="rounded-xl py-2.5 px-3.5 mb-3 text-xs text-[#B8CC9A] text-center"
            style={{ background: "rgba(91,122,58,0.15)", border: "1px solid rgba(184,204,154,0.3)" }}>
            Email verified! You can now sign in.
          </div>
        )}
        {authError && (
          <div className="rounded-xl py-2.5 px-3.5 mb-3 text-xs text-[#d08080] text-center"
            style={{ background: "rgba(192,96,64,0.15)", border: "1px solid rgba(192,96,64,0.3)" }}>
            Authentication failed. Please try again.
          </div>
        )}
        {message && (
          <div className="rounded-[14px] py-5 px-[18px] mb-4 text-center"
            style={{ background: "rgba(91,122,58,0.2)", border: "2px solid rgba(184,204,154,0.5)" }}>
            <div className="text-[32px] mb-2">{mode === "forgot" ? "\u{1F4E7}" : "\u2705"}</div>
            <div className="text-[15px] font-bold text-[#D4E4B8] mb-1.5 font-display">
              {mode === "forgot" ? "Check your email" : mode === "login" && !verified ? "Password updated" : "Check your email"}
            </div>
            <div className="text-xs text-[#B8CC9A] leading-normal">
              {message}
            </div>
          </div>
        )}

        {/* Google Sign In — only on login/signup */}
        {(mode === "login" || mode === "signup") && (
          <>
            <a href="/auth/google"
              className="flex items-center justify-center gap-2.5 w-full py-[13px] rounded-xl bg-[#FDFAF5] text-[#2C2416] text-sm font-semibold no-underline font-body mb-4 cursor-pointer"
              style={{ border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </a>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: "rgba(184,204,154,0.15)" }} />
              <span className="text-[11px] text-[#7A9A5A]">or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(184,204,154,0.15)" }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Your name"
              className="login-input" required />
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <input value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Email address" type="email"
              className="login-input" required />
          )}

          {(mode === "login" || mode === "signup") && (
            <input value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="Password" type="password"
              className="login-input" required minLength={8} />
          )}

          {mode === "reset" && (
            <>
              <input value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="New password" type="password"
                className="login-input" required minLength={8} />
              <input value={password2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword2(e.target.value)} placeholder="Confirm new password" type="password"
                className="login-input" required minLength={8} />
            </>
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-2 mb-3 text-[11px] text-[#B8CC9A] cursor-pointer leading-[1.4]">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTosAccepted(e.target.checked)}
                className="mt-0.5 cursor-pointer"
                style={{ accentColor: "#5B7A3A" }}
              />
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-[#D4E4B8] underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" className="text-[#D4E4B8] underline">Privacy Policy</a>
              </span>
            </label>
          )}

          {error && (
            <div className="text-xs text-[#d08080] mb-2">{error}</div>
          )}

          <button type="submit" disabled={loading || (mode === "signup" && !tosAccepted)}
            className={clsx(
              "w-full py-3 rounded-xl border-none bg-[#5B7A3A] text-[#FDFAF5] text-sm font-semibold font-body mb-3",
              loading ? "cursor-wait opacity-70" : "cursor-pointer opacity-100"
            )}
            style={{ boxShadow: "0 2px 8px rgba(58,77,42,0.3)" }}>
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
                className="bg-transparent border-none text-[#7A9A5A] text-[11px] cursor-pointer font-body mb-2 block w-full">
                Forgot password?
              </button>
              <button onClick={() => switchMode("signup")}
                className="bg-transparent border-none text-[#B8CC9A] text-xs cursor-pointer font-body">
                Don't have an account? Sign up
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => switchMode("login")}
              className="bg-transparent border-none text-[#B8CC9A] text-xs cursor-pointer font-body">
              Already have an account? Sign in
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => { switchMode("login"); window.history.replaceState({}, "", "/"); }}
              className="bg-transparent border-none text-[#B8CC9A] text-xs cursor-pointer font-body">
              Back to sign in
            </button>
          )}
        </div>

        {/* Legal links */}
        <div className="text-center mt-6 text-[11px] text-[#5A6A4A]">
          <a href="/privacy" className="text-[#5A6A4A] no-underline">Privacy Policy</a>
          <span className="mx-2">&middot;</span>
          <a href="/terms" className="text-[#5A6A4A] no-underline">Terms of Service</a>
        </div>
      </div>

      {/* Scoped styles for login input */}
      <style>{`
        .login-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid #3A4D2A;
          background: rgba(26,36,18,0.6);
          color: #E8E0D4;
          font-size: 13px;
          font-family: 'DM Sans',Helvetica,sans-serif;
          outline: none;
          margin-bottom: 10px;
          box-sizing: border-box;
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
}
