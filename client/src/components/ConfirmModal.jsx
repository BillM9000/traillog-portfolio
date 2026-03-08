import { fontBody, fontDisplay } from "../utils/theme";

export default function ConfirmModal({ memberName, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#2a2020", borderRadius: 12, padding: 24, border: "1px solid #5a3030", width: 300, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#d4aa6a", fontFamily: fontDisplay, marginBottom: 6 }}>
          Remove {memberName}?
        </div>
        <div style={{ fontSize: 12, color: "#a09080", marginBottom: 16 }}>
          This deletes all their availability and skill data permanently.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onCancel}
            style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #3d4a40", background: "#252e28", color: "#a0b0a0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#7a3030", color: "#e8e4df", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
