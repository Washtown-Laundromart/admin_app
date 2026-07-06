"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
};

const ToastContext = createContext<{ showToast: (toast: Omit<Toast, "id">) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }].slice(-3));
    window.setTimeout(() => removeToast(id), toast.type === "error" ? 7000 : 4500);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3 sm:right-6 sm:top-6 sm:w-full" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    error: "border-rose-200 bg-rose-50 text-rose-950",
    info: "border-cyan-200 bg-cyan-50 text-cyan-950"
  }[toast.type];
  const iconStyles = {
    success: "text-emerald-600",
    error: "text-rose-600",
    info: "text-cyan-700"
  }[toast.type];

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg shadow-slate-900/10 ${styles}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyles}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5">{toast.title}</p>
        {toast.message && <p className="mt-1 text-sm leading-5 opacity-85">{toast.message}</p>}
      </div>
      <button aria-label="Close notification" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-black/5" onClick={onClose}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
