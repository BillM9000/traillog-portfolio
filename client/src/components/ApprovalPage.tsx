import { useState, useEffect } from "react";
import clsx from "clsx";
import { api } from "../api";
import { useToast } from "../contexts/ToastContext";
import { Check, X, UserCheck, Clock } from "lucide-react";
import Logo from "./Logo";

interface ApprovalInfo {
  troop_name: string;
  user_name: string;
  user_type: string;
  user_email: string;
  parent_email: string | null;
  participation: string;
  status: string;
  created_at: string;
}

export default function ApprovalPage({ token }: { token: string }) {
  const { addToast } = useToast();
  const [info, setInfo] = useState<ApprovalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{ action: string; userName: string } | null>(null);

  useEffect(() => {
    api.getApprovalInfo(token)
      .then(setInfo)
      .catch((e: Error) => setError(e.message || "Invalid approval link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (action: "approve" | "deny") => {
    setActing(true);
    try {
      const res = await api.actOnApproval(token, action);
      setResult({ action: res.action, userName: res.userName });
      addToast(action === "approve" ? "Member approved!" : "Request denied", action === "approve" ? "success" : "info");
    } catch (e: any) {
      addToast(e.message || "Action failed", "error");
    } finally {
      setActing(false);
    }
  };

  const goHome = () => {
    window.history.replaceState({}, "", "/");
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-body px-5"
      style={{ background: "linear-gradient(175deg, #1A2412 0%, #2A3620 40%, #1A1F16 100%)" }}
    >
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-5">
          <Logo size={56} />
        </div>

        <div className="bg-[rgba(26,36,18,0.6)] rounded-[16px] border border-[#3A4D2A] p-6 backdrop-blur-sm">
          {loading && (
            <div className="text-center py-8 text-[#B8CC9A] text-sm">Loading request...</div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-[#d08080] text-sm font-bold mb-2">Unable to load request</div>
              <div className="text-[#8B8478] text-xs mb-4">{error}</div>
              <button onClick={goHome} className="py-2.5 px-6 rounded-[10px] bg-[#5B7A3A] text-white text-sm font-semibold border-none cursor-pointer font-body">
                Open TrailLog
              </button>
            </div>
          )}

          {result && (
            <div className="text-center py-6">
              <div className={clsx(
                "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                result.action === "approved" ? "bg-[#5B7A3A]/20" : "bg-[#d08080]/20"
              )}>
                {result.action === "approved"
                  ? <UserCheck size={32} className="text-[#A3C47A]" />
                  : <X size={32} className="text-[#d08080]" />
                }
              </div>
              <div className="text-[#FDFAF5] text-lg font-bold font-display mb-1">
                {result.action === "approved" ? "Approved!" : "Denied"}
              </div>
              <div className="text-[#B8CC9A] text-sm mb-5">
                {result.action === "approved"
                  ? `${result.userName} has been added to the crew and will be notified.`
                  : `${result.userName} has been notified that their request was denied.`
                }
              </div>
              <button onClick={goHome} className="py-2.5 px-6 rounded-[10px] bg-[#5B7A3A] text-white text-sm font-semibold border-none cursor-pointer font-body">
                Open TrailLog
              </button>
            </div>
          )}

          {info && !result && (
            <>
              <div className="text-center mb-5">
                <h2 className="text-[#FDFAF5] text-lg font-bold font-display m-0">Member Request</h2>
                <p className="text-[#7A9A5A] text-xs mt-1">Review and respond to this join request</p>
              </div>

              {/* Request details */}
              <div className="bg-[rgba(26,36,18,0.5)] rounded-[10px] border border-[#3A4D2A] p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase text-[#7A9A5A] font-bold tracking-wide">Requesting to join</span>
                  {info.status === "pending" ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-500">
                      <Clock size={10} /> Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#7A9A5A] capitalize">{info.status}</span>
                  )}
                </div>

                <div className="text-[#FDFAF5] text-base font-bold font-display">{info.user_name}</div>
                <div className="text-[#B8CC9A] text-xs mt-0.5">{info.user_email}</div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <div className="text-[9px] uppercase text-[#7A9A5A] font-bold mb-0.5">Troop</div>
                    <div className="text-[#D4E4B8] text-xs font-semibold">{info.troop_name}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-[#7A9A5A] font-bold mb-0.5">Type</div>
                    <div className="text-[#D4E4B8] text-xs font-semibold capitalize">{info.user_type || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-[#7A9A5A] font-bold mb-0.5">Role</div>
                    <div className="text-[#D4E4B8] text-xs font-semibold">
                      {info.participation === "support" ? "Support crew" : "Trekker"}
                    </div>
                  </div>
                  {info.parent_email && (
                    <div>
                      <div className="text-[9px] uppercase text-[#7A9A5A] font-bold mb-0.5">Parent Email</div>
                      <div className="text-[#D4E4B8] text-xs font-semibold">{info.parent_email}</div>
                    </div>
                  )}
                </div>
              </div>

              {info.status === "pending" ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={acting}
                    className="flex-1 py-3 rounded-[10px] bg-[#5B7A3A] text-white text-sm font-bold border-none cursor-pointer font-body flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check size={16} />
                    {acting ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction("deny")}
                    disabled={acting}
                    className="flex-1 py-3 rounded-[10px] bg-transparent text-[#d08080] text-sm font-bold border-2 border-[#d08080]/40 cursor-pointer font-body flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X size={16} />
                    {acting ? "..." : "Deny"}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-[#B8CC9A] text-sm mb-3">
                    This request has already been <strong className="capitalize">{info.status}</strong>.
                  </div>
                  <button onClick={goHome} className="py-2.5 px-6 rounded-[10px] bg-[#5B7A3A] text-white text-sm font-semibold border-none cursor-pointer font-body">
                    Open TrailLog
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
