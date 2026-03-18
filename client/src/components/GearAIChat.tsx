import React, { useState, useRef, useEffect } from "react";
import { api } from "../api";
import clsx from "clsx";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ChatError = "premium" | "not_configured" | null;

interface Props {
  adventureId: number;
  onClose: () => void;
}

export default function GearAIChat({ adventureId, onClose }: Props): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your gear advisor. Ask me anything about Philmont gear — pack weight optimization, product comparisons, what to bring, or compliance questions. \u{1F3D5}\uFE0F" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatError>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (): Promise<void> => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    setError(null);

    try {
      const result = await api.aiGearChat(userMsg, adventureId) as { response: string };
      setMessages(prev => [...prev, { role: "assistant", content: result.response }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Premium")) {
        setError("premium");
      } else if (msg.includes("not configured")) {
        setError("not_configured");
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble processing that. Please try again." }]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-5 right-5 w-[340px] h-[450px] bg-tl-card rounded-[16px] border border-tl-border shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-[900] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-tl-border-light flex justify-between items-center bg-tl-forest-deep">
        <span className="text-[13px] font-bold text-white font-display">
          🤖 Gear Advisor
        </span>
        <button onClick={onClose} className="bg-transparent border-none text-white text-[16px] cursor-pointer p-0">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <div key={i} className={clsx("mb-2.5 flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={clsx(
              "max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed font-body",
              msg.role === "user"
                ? "bg-tl-accent text-white rounded-br-[4px]"
                : "bg-tl-bg-alt text-tl-text rounded-bl-[4px]"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-2.5">
            <div className="px-3 py-2 rounded-xl bg-tl-bg-alt text-tl-text-dimmer text-xs">
              Thinking...
            </div>
          </div>
        )}
        {error === "premium" && (
          <div className="p-3 bg-[#FEF3C7] rounded-lg mb-2.5 text-[11px] text-[#92400E]">
            ⭐ AI gear advice is a premium feature. Upgrade your troop to unlock personalized gear recommendations, weight optimization, and more!
          </div>
        )}
        {error === "not_configured" && (
          <div className="p-3 bg-tl-bg-alt rounded-lg mb-2.5 text-[11px] text-tl-text-muted">
            AI features are being set up by the platform admin. Check back soon!
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-tl-border-light flex gap-1.5">
        <input
          value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && send()}
          placeholder="Ask about gear..."
          className="flex-1 px-2.5 py-2 rounded-lg border border-tl-border-light bg-tl-input text-tl-text text-xs font-body outline-none"
        />
        <button onClick={send} disabled={loading || !input.trim()} className={clsx(
          "px-3.5 py-2 rounded-lg border-none text-white text-xs font-semibold font-body",
          loading ? "bg-tl-text-dimmer cursor-default" : "bg-tl-accent cursor-pointer"
        )}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
