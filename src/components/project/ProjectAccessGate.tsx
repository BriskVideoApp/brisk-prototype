"use client";

import type { ReactNode } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canViewProject } from "@/data/prototype-access";

export function ProjectAccessGate({ children, projectId }: { children: ReactNode; projectId: string }) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const project = state.projects.find((candidate) => candidate.id === projectId && candidate.workspaceId === state.session.activeWorkspaceId);
  if (!hasHydrated) return null;
  if (!project || !canViewProject(viewer, project, state)) {
    return <main className="client-not-found"><h1 className="headings-s-bold">Project unavailable</h1><p className="paragraph-s">You do not have access to this project.</p></main>;
  }
  return children;
}
