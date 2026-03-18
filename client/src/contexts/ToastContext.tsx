import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { useTheme } from "./ThemeContext";
import { fontBody } from "../utils/theme";
import type { Toast, ToastType } from "../types";

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => number;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme } = useTheme();
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    const duration = type === "celebration" ? 5000 : 4000;
    timersRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const colors: Record<string, { bg: string; border: string }> = {
    success: { bg: "#2d5a3d", border: "#4a7a55" },
    error: { bg: "#7a3030", border: "#a04040" },
    info: { bg: "#2d4a5a", border: "#4a7a8a" },
    celebration: { bg: "#5a4a2d", border: "#d4a843" },
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column-reverse", gap: 8,
        pointerEvents: "none",
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.success;
          return (
            <div key={t.id} style={{
              pointerEvents: "auto",
              background: c.bg, color: "#fff", padding: "10px 16px",
              borderRadius: 8, fontSize: 13, fontFamily: fontBody, fontWeight: 500,
              border: `2px solid ${c.border}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              cursor: "pointer", maxWidth: 320,
              animation: "toastSlideIn 0.3s ease",
            }} onClick={() => removeToast(t.id)}>
              {t.type === "celebration" && <span style={{ marginRight: 6 }}>🎉</span>}
              {t.type === "error" && <span style={{ marginRight: 6 }}>⚠️</span>}
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toastSlideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
