import { type ReactNode } from "react";

interface ButtonGradientProps {
  children: ReactNode;
  href?: string;
  className?: string;
}

export default function ButtonGradient({
  children,
  href = "#",
  className = "",
}: ButtonGradientProps) {
  return (
    <a
      href={href}
      className={`btn border-0 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 ${className}`}
    >
      {children}
    </a>
  );
}
