"use client";

import { type ReactNode } from "react";

interface ButtonPopoverProps {
  buttonText: string;
  children: ReactNode;
}

export default function ButtonPopover({
  buttonText,
  children,
}: ButtonPopoverProps) {
  return (
    <div className="dropdown dropdown-hover dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
        {buttonText}
      </div>
      <div
        tabIndex={0}
        className="dropdown-content card bg-base-100 shadow-xl w-64 z-1"
      >
        <div className="card-body card-sm">{children}</div>
      </div>
    </div>
  );
}
