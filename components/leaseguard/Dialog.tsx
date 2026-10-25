"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** When false (e.g. while a request is pending) Esc and backdrop clicks are ignored. */
  dismissible?: boolean;
  wide?: boolean;
}

/**
 * Accessible modal built on the native <dialog> + showModal():
 * the rest of the page becomes inert (focus is trapped), Esc closes,
 * it is labelled by its title, and focus returns to the trigger on close.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  wide = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Dialogs that unmount while open (e.g. conditionally rendered flows) still return focus.
  useEffect(() => {
    const focusTarget = returnFocus;
    return () => focusTarget.current?.focus();
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (dismissible) onClose();
    };
    const onCloseEvent = () => {
      returnFocus.current?.focus();
      returnFocus.current = null;
      if (open) onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onCloseEvent);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onCloseEvent);
    };
  }, [dismissible, onClose, open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="modal modal-bottom sm:modal-middle"
    >
      <div
        className={`modal-box panel w-full rounded-b-none p-0 sm:rounded-[14px] ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-base-content/10 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1 text-sm text-base-content/70">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            className="btn btn-ghost btn-sm btn-square -mt-1 -mr-2"
            aria-label="Close dialog"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-base-content/10 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="modal-backdrop cursor-default bg-black/60"
        onClick={dismissible ? onClose : undefined}
      />
    </dialog>
  );
}
