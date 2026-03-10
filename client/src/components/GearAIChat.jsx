import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay, card, cardTitle } from "../utils/theme";

export default function GearAIChat({ adventureId, onClose }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your gear advisor. Ask me anything about Philmont gear — pack weight optimization, product comparisons, what to bring, or compliance questions. 🏕️" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEnd = useRef(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    setError(null);

    try {
      const result = await api.aiGearChat(userMsg, adventureId);
      setMessages(prev => [...prev, { role: "assistant", content: result.response }]);
    } catch (e) {
      if (e.message.includes("Premium")) {
        setError("premium");
      } else if (e.message.includes("not configured")) {
        setError("not_configured");
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble processing that. Please try again." }]);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, width: 340, height: 450,
      background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 900,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${theme.borderLight}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: theme.forestDeep || theme.accent,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: fontDisplay }}>
          🤖 Gear Advisor
        </span>
        <button onClick={onClose} style={{
          background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: 0,
        }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 10, display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 12,
              background: msg.role === "user" ? theme.accent : theme.bgAlt,
              color: msg.role === "user" ? "#fff" : theme.text,
              fontSize: 12, lineHeight: 1.5, fontFamily: fontBody,
              borderBottomRightRadius: msg.role === "user" ? 4 : 12,
              borderBottomLeftRadius: msg.role === "user" ? 12 : 4,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div style={{ padding: "8px 12px", borderRadius: 12, background: theme.bgAlt, color: theme.textDimmer, fontSize: 12 }}>
              Thinking...
            </div>
          </div>
        )}
        {error === "premium" && (
          <div style={{ padding: 12, background: "#FEF3C7", borderRadius: 8, marginBottom: 10, fontSize: 11, color: "#92400E" }}>
            ⭐ AI gear advice is a premium feature. Upgrade your troop to unlock personalized gear recommendations, weight optimization, and more!
          </div>
        )}
        {error === "not_configured" && (
          <div style={{ padding: 12, background: theme.bgAlt, borderRadius: 8, marginBottom: 10, fontSize: 11, color: theme.textMuted }}>
            AI features are being set up by the platform admin. Check back soon!
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${theme.borderLight}`, display: "flex", gap: 6 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about gear..."
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bgInput, color: theme.text, fontSize: 12, fontFamily: fontBody, outline: "none",
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          padding: "8px 14px", borderRadius: 8, border: "none",
          background: loading ? theme.textDimmer : theme.accent,
          color: "#fff", fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: fontBody,
        }}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
