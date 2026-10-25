"use client";

import { useRef, type ReactNode } from "react";

interface ModalProps {
  id: string;
  children: ReactNode;
  title?: string;
}

export default function Modal({ id, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <dialog id={id} ref={dialogRef} className="modal">
      <div className="modal-box">
        {title && <h3 className="text-lg font-bold">{title}</h3>}
        <div className="py-4">{children}</div>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}

/** Call this to open a Modal by id */
export function openModal(id: string) {
  const dialog = document.getElementById(id) as HTMLDialogElement | null;
  dialog?.showModal();
}
