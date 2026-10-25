"use client";

import { Search } from "lucide-react";

export type RunFilter = "all" | "attention" | "running" | "paused";

const FILTERS: { value: RunFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
];

interface RunFiltersProps {
  filter: RunFilter;
  onFilter: (f: RunFilter) => void;
  counts: Record<RunFilter, number>;
  query: string;
  onQuery: (q: string) => void;
}

/**
 * Filter pills styled like the shared TogglePills, but with aria-pressed and a
 * visible count so the selected state isn't conveyed by color alone.
 */
export default function RunFilters({ filter, onFilter, counts, query, onQuery }: RunFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div role="group" aria-label="Filter runs" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(f.value)}
              className={`btn btn-sm gap-1.5 ${
                active ? "btn-primary" : "btn-ghost border border-base-content/10 font-normal"
              }`}
            >
              {f.label}
              <span className={`num text-xs ${active ? "opacity-80" : "text-base-content/70"}`}>{counts[f.value]}</span>
            </button>
          );
        })}
      </div>
      <label className="input input-sm w-full gap-2 border-base-content/30 bg-base-200 sm:w-48">
        <Search aria-hidden="true" className="h-3.5 w-3.5 text-base-content/70" />
        <span className="sr-only">Search runs by name or GPU</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name or GPU"
          className="placeholder:text-base-content/60"
        />
      </label>
    </div>
  );
}
