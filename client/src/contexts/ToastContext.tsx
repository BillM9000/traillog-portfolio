import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import clsx from "clsx";
import type { Toast, ToastType } from "../types";

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => number;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
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

  const colorMap: Record<string, string> = {
    success: "bg-[#2d5a3d] border-[#4a7a55]",
    error: "bg-[#7a3030] border-[#a04040]",
    info: "bg-[#2d4a5a] border-[#4a7a8a]",
    celebration: "bg-[#5a4a2d] border-[#d4a843]",
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto text-white py-2.5 px-4 rounded-btn text-[13px] font-body font-medium border-2 shadow-lg cursor-pointer max-w-[320px] animate-[toastSlideIn_0.3s_ease]",
              colorMap[t.type] || colorMap.success
            )}
            onClick={() => removeToast(t.id)}
          >
            {t.type === "celebration" && <span className="mr-1.5">{"\uD83C\uDF89"}</span>}
            {t.type === "error" && <span className="mr-1.5">{"\u26A0\uFE0F"}</span>}
            {t.message}
          </div>
        ))}
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
