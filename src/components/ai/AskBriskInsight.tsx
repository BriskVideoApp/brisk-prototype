import type { ReactNode } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";

// Shared Ask Brisk insight composition, including the dashboard briefing variant.
export function AskBriskInsight({ children, eyebrow, title, dashboard = false }: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  dashboard?: boolean;
}) {
  return <article className={`ask-brisk-insight${dashboard ? " is-dashboard-briefing" : ""}`} aria-label={dashboard ? eyebrow : undefined}>
    {dashboard ? <DsIcon name="star-four" size={16} /> : <>
      {eyebrow ? <span className="label-xs">{eyebrow}</span> : null}
      <h3 className="label-s-semibold">{title}</h3>
    </>}
    {children}
  </article>;
}
