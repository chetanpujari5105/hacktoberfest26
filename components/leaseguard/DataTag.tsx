export type DataProvenance = "live" | "demo" | "estimated" | "unavailable" | "stale" | "preview" | "simulated";

const TAGS: Record<DataProvenance, { label: string; className: string; title: string }> = {
  live: {
    label: "Live",
    className: "text-accent ring-accent/30",
    title: "Fetched from the LeaseGuard backend just now.",
  },
  demo: {
    label: "Demo",
    className: "text-warning ring-warning/35",
    title: "Sample data from the demo store. Nothing real is affected.",
  },
  estimated: {
    label: "Estimated",
    className: "text-info ring-info/30",
    title: "An estimate, not a billed amount.",
  },
  unavailable: {
    label: "Unavailable",
    className: "text-quiet ring-quiet/30",
    title: "The backend didn't provide this value.",
  },
  stale: {
    label: "Data may be stale",
    className: "text-warning ring-warning/35",
    title: "The last successful update is older than expected.",
  },
  preview: {
    label: "Preview",
    className: "text-quiet ring-quiet/30",
    title: "A static illustration, not a real message.",
  },
  simulated: {
    label: "Simulated",
    className: "text-warning ring-warning/35",
    title: "Demo-only simulation. No real account is linked.",
  },
};

/** Small provenance label for any value whose source isn't obviously live. */
export default function DataTag({ kind }: { kind: DataProvenance }) {
  const tag = TAGS[kind];
  return (
    <span
      title={tag.title}
      className={`inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] leading-none font-semibold tracking-wide uppercase ring-1 ring-inset ${tag.className}`}
    >
      {tag.label}
    </span>
  );
}
