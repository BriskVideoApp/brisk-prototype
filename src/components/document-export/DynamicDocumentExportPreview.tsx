"use client";

import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canViewProject } from "@/data/prototype-access";
import { selectProject } from "@/data/prototype-state";
import type { DocumentExportKind, DocumentExportPayload } from "@/lib/document-export";
import { DocumentExportPreview } from "./DocumentExportPreview";

export function DynamicDocumentExportPreview({ kind, projectId, clipId }: {
  kind: DocumentExportKind;
  projectId: string;
  clipId?: string;
}) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  if (!hasHydrated) return null;

  const project = selectProject(state, projectId);
  if (!project || !canViewProject(viewer, project, state)) {
    return <main className="client-not-found"><h1 className="headings-s-bold">Document unavailable</h1></main>;
  }

  const studioName = state.workspaces.find((workspace) => workspace.id === project.workspaceId)?.name ?? "Studio";
  const common = {
    projectId,
    projectName: project.name,
    clientName: project.clientName,
    studioName,
  };
  const initialPayload: DocumentExportPayload = kind === "transcript"
    ? { ...common, kind, clips: [] }
    : {
        ...common,
        kind,
        documentTitle: kind === "script" ? "Script V1" : "Storyboard V1",
        versionLabel: "V1",
        createdAt: project.latestUpdate.timestamp,
        rows: [],
      };

  return <DocumentExportPreview clipId={clipId} initialPayload={initialPayload} project={project} />;
}
