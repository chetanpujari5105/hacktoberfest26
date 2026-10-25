/** Placeholder block. Wrap groups in an element with aria-busy + a label. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`lg-skeleton block ${className}`} />;
}
