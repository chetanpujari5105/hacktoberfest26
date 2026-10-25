import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  footnote?: ReactNode;
  tag?: ReactNode;
  emphasis?: boolean;
}

/** One cell of the metric strip. Value is mono + tabular. */
export default function MetricCard({ label, icon: Icon, value, footnote, tag, emphasis }: MetricCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-base-content/75">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className={`num text-2xl font-semibold sm:text-[28px] ${emphasis ? "text-primary" : ""}`}>{value}</p>
        {tag}
      </div>
      {footnote && <p className="text-xs text-base-content/70">{footnote}</p>}
    </div>
  );
}
