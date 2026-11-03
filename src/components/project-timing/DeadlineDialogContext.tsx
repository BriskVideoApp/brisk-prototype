"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { deliveryHref } from "@/data/project-delivery";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { ProjectDeadlineDialog } from "./ProjectDeadlineDialog";

export type DeadlineDialogOptions = { stage?: ProductionFlowStageKey; date?: string };
const Context = createContext<((projectId: string, options?: DeadlineDialogOptions) => void) | null>(null);

export function DeadlineDialogProvider({ children }: { children: ReactNode }) {
  const viewer = usePrototypeViewer();
  const [request, setRequest] = useState<({ projectId: string } & DeadlineDialogOptions) | null>(null);
  const openDeadline = useCallback((projectId: string, options?: DeadlineDialogOptions) => setRequest({ projectId, ...options }), []);
  return <Context.Provider value={openDeadline}>
    {children}
    {request ? <ProjectDeadlineDialog key={`${request.projectId}:${request.stage ?? "final"}:${request.date ?? ""}:${viewer?.id}:${viewer?.role}`}
      projectId={request.projectId} initialStage={request.stage} initialDate={request.date} onClose={() => setRequest(null)} /> : null}
  </Context.Provider>;
}

export function useDeadlineDialog() {
  const open = useContext(Context);
  if (!open) throw new Error("useDeadlineDialog must be used within DeadlineDialogProvider");
  return open;
}

/** Preserve a usable URL for copied links and new tabs while opening in context. */
export function ProjectDeadlineLink({ projectId, className, children, ariaLabel }: {
  projectId: string; className: string; children: ReactNode; ariaLabel?: string;
}) {
  const openDeadline = useDeadlineDialog();
  return <Link href={deliveryHref(projectId)} className={className} aria-label={ariaLabel} onClick={(event) => {
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); openDeadline(projectId);
  }}>{children}</Link>;
}
