"use client";

import { useEffect, useState } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canViewProject } from "@/data/prototype-access";
import { getProjectFixture } from "@/data/project-fixtures";
import { selectProject } from "@/data/prototype-state";
import { SharedCallSheetPage } from "./SharedCallSheetPage";
import { parseShootWorkflowSetup, shootWorkflowSetupStorageKey, SharedShootRunOfDay } from "./ShootStagePage";

export function SharedCallSheetRouteContent({ projectId, printMode, previewMode, viewerId }: {
  projectId: string;
  printMode: boolean;
  previewMode: boolean;
  viewerId?: string;
}) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const [workflow, setWorkflow] = useState<{ projectId: string; interview?: boolean }>();
  useEffect(() => {
    const key = shootWorkflowSetupStorageKey(projectId);
    const read = () => {
      const setup = parseShootWorkflowSetup(window.localStorage.getItem(key));
      setWorkflow({ projectId, interview: setup ? setup.mode === "planned" && setup.modules.includes("interview-questions") : undefined });
    };
    const sync = (event: StorageEvent) => { if (!event.key || event.key === key) read(); };
    read();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [projectId]);
  if (!hasHydrated || workflow?.projectId !== projectId) return null;

  const fixture = getProjectFixture(projectId);
  const project = selectProject(state, projectId) ?? fixture;
  if (!project || (!fixture && !canViewProject(viewer, project, state))) {
    return <main className="client-not-found"><h1 className="headings-s-bold">Call Sheet unavailable</h1></main>;
  }

  return <SharedCallSheetPage includeInterviewQuestions={workflow.interview} SharedSchedule={SharedShootRunOfDay} project={project} isStudioInternal={false} printMode={printMode} previewMode={previewMode} viewerId={viewerId} />;
}
