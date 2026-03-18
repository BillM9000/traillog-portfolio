import { useState } from "react";
import Logo from "./Logo";
import { Compass, Users, ShieldCheck, LucideIcon } from "lucide-react";
import clsx from "clsx";
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
    <div className="min-h-screen flex items-center justify-center font-body" style={{ background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)" }}>
      <div className="w-full max-w-[440px] px-5 text-center">
        <Logo size={72} />
        <h1 className="font-display text-2xl font-black text-[#FDFAF5] mt-3 mb-1.5">
          Welcome, {user.name}!
        </h1>
        <p className="text-sm text-[#D4E4B8] mb-2">
          Tell us about yourself to get started.
        </p>

        <div className="flex items-center justify-center gap-2 mb-5 text-[#7A9A5A] text-xs">
          <ShieldCheck size={16} />
          <span>Required for BSA High Adventure eligibility</span>
        </div>

        <div className="flex gap-3 justify-center mb-5">
          {roleCards.map(({ type, label, subtitle, desc, Icon }) => {
            const selected = choice === type;
            return (
              <button key={type} onClick={() => setChoice(type)} className={clsx(
                "flex-1 py-[22px] px-3.5 rounded-[14px] cursor-pointer text-center transition-all duration-200",
                selected
                  ? "bg-[rgba(91,122,58,0.15)] border-2 border-[#5B7A3A]"
                  : "bg-[rgba(26,36,18,0.4)] border-2 border-[#3A4D2A]"
              )}>
                <Icon
                  size={48}
                  strokeWidth={1.5}
                  className={clsx(
                    "mb-2.5 transition-colors duration-200",
                    selected ? "text-[#A3C47A]" : "text-[#5B7A3A]"
                  )}
                />
                <div className={clsx(
                  "text-[15px] font-bold font-display",
                  selected ? "text-[#FDFAF5]" : "text-[#8B8478]"
                )}>
                  {label}
                </div>
                <div className={clsx(
                  "text-[13px] mt-[3px] font-semibold",
                  selected ? "text-[#A3C47A]" : "text-[#7A9A5A]"
                )}>
                  {subtitle}
                </div>
                <div className="text-[11px] text-[#7A9A5A] mt-1">{desc}</div>
              </button>
            );
          })}
        </div>

        {showParentForm && (
          <div className="mb-4">
            <label className="text-xs text-[#B8CC9A] block text-left mb-1 font-body">
              Parent/Guardian Email (required)
            </label>
            <input value={parentEmail} onChange={e => setParentEmail(e.target.value)}
              placeholder="parent@email.com" type="email"
              className="w-full py-3 px-3.5 rounded-[10px] border-[1.5px] border-[#3A4D2A] bg-[rgba(26,36,18,0.6)] text-[#E8E0D4] text-[13px] font-body outline-none box-border" />
            <label className="text-xs text-[#B8CC9A] block text-left mb-1 mt-2.5 font-body">
              Second Parent/Guardian Email (optional)
            </label>
            <input value={parentEmail2} onChange={e => setParentEmail2(e.target.value)}
              placeholder="parent2@email.com" type="email"
              className="w-full py-3 px-3.5 rounded-[10px] border-[1.5px] border-[#3A4D2A] bg-[rgba(26,36,18,0.6)] text-[#E8E0D4] text-[13px] font-body outline-none box-border" />
          </div>
        )}

        <p className="text-[11px] text-[#666] mb-3.5 leading-relaxed">
          This cannot be changed later. BSA High Adventure requires participants to be at least 13 years old.
        </p>

        <label className="flex items-start gap-2 mb-3.5 text-[11px] text-[#B8CC9A] cursor-pointer leading-[1.4] text-left">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={e => setTosAccepted(e.target.checked)}
            className="mt-0.5 accent-[#5B7A3A] cursor-pointer shrink-0"
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-[#D4E4B8] underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" className="text-[#D4E4B8] underline">Privacy Policy</a>
          </span>
        </label>

        {error && <div className="text-xs text-[#d08080] mb-2.5">{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !choice || !tosAccepted} className={clsx(
          "w-full py-[13px] rounded-xl border-none text-[#FDFAF5] text-sm font-semibold font-body",
          choice && tosAccepted
            ? "bg-[#5B7A3A] shadow-[0_2px_8px_rgba(58,77,42,0.3)]"
            : "bg-[#3A4D2A] shadow-none",
          (!choice || !tosAccepted || loading) ? "opacity-60 cursor-default" : "cursor-pointer"
        )}>
          {loading ? "..." : "Confirm & Continue"}
        </button>
      </div>
    </div>
  );
}
