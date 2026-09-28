"use client";

import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canViewProject } from "@/data/prototype-access";
import { getProjectFixture } from "@/data/project-fixtures";
import { selectProject } from "@/data/prototype-state";
import { SharedCallSheetPage } from "./SharedCallSheetPage";

export function SharedCallSheetRouteContent({ projectId, printMode, previewMode, viewerId }: {
  projectId: string;
  printMode: boolean;
  previewMode: boolean;
  viewerId?: string;
}) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  if (!hasHydrated) return null;

  const fixture = getProjectFixture(projectId);
  const project = selectProject(state, projectId) ?? fixture;
  if (!project || (!fixture && !canViewProject(viewer, project, state))) {
    return <main className="client-not-found"><h1 className="headings-s-bold">Call Sheet unavailable</h1></main>;
  }

  return <SharedCallSheetPage project={project} isStudioInternal={false} printMode={printMode} previewMode={previewMode} viewerId={viewerId} />;
}
