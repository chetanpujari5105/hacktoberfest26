"use client";

import type { ReactNode } from "react";
import Dialog from "@/components/leaseguard/Dialog";
import InlineError from "@/components/leaseguard/InlineError";
import type { ApiError } from "@/libs/leaseguard/types";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Plain-language consequence of confirming. */
  consequence: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  tone?: "primary" | "neutral";
  pending: boolean;
  error?: ApiError;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel,
  pendingLabel,
  tone = "primary",
  pending,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      dismissible={!pending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${tone === "primary" ? "btn-primary" : "btn-neutral"}`}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
            {pending ? pendingLabel : error ? `Retry: ${confirmLabel}` : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm leading-relaxed text-base-content/85">{consequence}</div>
        {children}
        {error && <InlineError error={error} />}
      </div>
    </Dialog>
  );
}
