/** LeaseGuard mark: a shield with a probe trace that flattens out. */
export default function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 2.75 4.5 5.6v5.9c0 4.6 3.1 8.3 7.5 9.75 4.4-1.45 7.5-5.15 7.5-9.75V5.6L12 2.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 12.4h2l1.3-3.2 2 5.6 1.3-2.4h2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
