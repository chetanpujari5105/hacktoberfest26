"use client";

import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone: ToastTone;
  title: string;
  description?: string;
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Show a short, politely-announced notification. Requires <ToastProvider>. */
export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside <ToastProvider>");
  return push;
}
