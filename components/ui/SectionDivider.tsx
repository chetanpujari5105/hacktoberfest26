interface SectionDividerProps {
  label: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="divider text-base-content/30 text-xs">{label}</div>
  );
}
