import type { ReactNode } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";

export function ProjectTitleRow({ title, actions, label }: {
  title: ReactNode;
  actions: ReactNode;
  label: string;
}) {
  return (
    <div className="project-title-row">
      {title}
      <div className="project-quick-actions" aria-label={label}>{actions}</div>
    </div>
  );
}

// The play command starts production; the queue icon remains portal navigation.
export function StartProductionAction({ projectName, onStart, inProduction = false }: {
  projectName: string; onStart: () => void; inProduction?: boolean;
}) {
  return <button className="project-quick-action" type="button"
    disabled={inProduction}
    aria-label={inProduction ? `${projectName} is already in production` : `Move ${projectName} to In production`}
    data-tooltip={inProduction ? "Already in production" : "Move to In production"}
    onClick={(event) => { event.stopPropagation(); onStart(); }}>
    <DsIcon name="play" size={20} />
  </button>;
}
