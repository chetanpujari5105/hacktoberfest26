"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { ToastContext, type ToastInput, type ToastTone } from "@/hooks/useToast";

interface Toast extends ToastInput {
  id: number;
}

const TONE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: "text-accent" },
  error: { icon: CircleAlert, className: "text-primary" },
  info: { icon: Info, className: "text-info" },
};

const DISMISS_MS = 6_000;
let nextId = 1;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { icon: Icon, className } = TONE[toast.tone];
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="lg-toast-in panel flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]">
      <Icon aria-hidden="true" className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${className}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-base-content/70">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="btn btn-ghost btn-xs btn-square -mt-0.5 -mr-1"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((toast: ToastInput) => {
    setToasts((list) => [...list.slice(-2), { ...toast, id: nextId++ }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2 [&>*]:pointer-events-auto"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
