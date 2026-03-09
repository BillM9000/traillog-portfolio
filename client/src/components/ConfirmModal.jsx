import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay } from "../utils/theme";

export default function ConfirmModal({ memberName, onConfirm, onCancel }) {
  const { theme } = useTheme();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.bgCard, borderRadius: 12, padding: 24, border: `1px solid ${theme.danger}40`, width: 300, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.gold, fontFamily: fontDisplay, marginBottom: 6 }}>
          Remove {memberName}?
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
          This deletes all their availability and skill data permanently.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onCancel}
            style={{ padding: "8px 18px", borderRadius: 7, border: `1px solid ${theme.borderLight}`, background: theme.bgAlt, color: theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#7a3030", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
