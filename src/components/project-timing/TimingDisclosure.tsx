import type { ReactNode } from "react";

/** Shared collapsed detail composition from the Final delivery history. */
export function TimingDisclosure({ label, children, className = "", initiallyOpen = false }: {
  label: string;
  children: ReactNode;
  className?: string;
  initiallyOpen?: boolean;
}) {
  return <details className={`timing-disclosure ${className}`} open={initiallyOpen || undefined}>
    <summary className="label-s">{label}</summary>
    <div>{children}</div>
  </details>;
}
