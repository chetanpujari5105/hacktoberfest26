export default function ButtonLead({ className }: { className?: string }) {
  return (
    <button
      className={`btn btn-wide btn-primary border-none py-6 ${className}`}
    >
      Get Started
    </button>
  );
}
