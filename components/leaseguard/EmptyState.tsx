import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** Successful-but-empty state that explains what to do next. */
export default function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-base-300 text-base-content/80">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="text-sm leading-relaxed text-base-content/70">{children}</div>
      </div>
      {action}
    </div>
  );
}
