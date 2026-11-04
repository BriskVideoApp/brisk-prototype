import type { ReactNode } from "react";

/** Shared summary/action row from the approved Studio setup composition. */
export function SettingsSummaryRow({ title, children, action, headingAs: Heading = "h3", className = "", actionPlacement = "side" }: {
  title: ReactNode;
  children: ReactNode;
  action: ReactNode;
  headingAs?: "h2" | "h3";
  className?: string;
  actionPlacement?: "side" | "heading";
}) {
  const heading = <Heading className="label-s">{title}</Heading>;
  return <div className={`studio-setup-settings-row ${actionPlacement === "heading" ? "has-heading-action" : ""} ${className}`}>
    <div className="studio-setup-settings-row-copy">
      {actionPlacement === "heading" ? <div className="settings-summary-heading">{heading}{action}</div> : heading}
      {children}
    </div>
    {actionPlacement === "side" ? action : null}
  </div>;
}
