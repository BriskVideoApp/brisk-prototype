"use client";

import { Suspense } from "react";
import { ScriptPage } from "@/components/script/ScriptPage";
import { clientNewScriptVersions, clientNewVideoScriptProject } from "@/data/prototype-scenarios";
import { getProjectFixture } from "@/data/project-fixtures";
import { getSingleValue, ProjectUnavailable, type RouteQuery, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalScriptRoute({ projectId, query }: { projectId: string; query: RouteQuery }) {
  const { project, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;

  const hasHarbourScriptFixture = project.id === "harbour-health-care-journey";
  const isClientNewVideo = project.id === clientNewVideoScriptProject.id;

  return (
    <Suspense fallback={null}>
      <ScriptPage
        key={project.id}
        project={project}
        initialSubtab={getSingleValue(query.subtab) === "transcripts" ? "transcripts" : "script"}
        initialTranscriptClipId={getSingleValue(query.clip) ?? null}
        initialVersionId={getSingleValue(query.version) ?? null}
        initiallyEmpty={(!hasHarbourScriptFixture && !isClientNewVideo) || getSingleValue(query.preview) === "empty"}
        isolateLegacyDraft={!hasHarbourScriptFixture && !isClientNewVideo && Boolean(getProjectFixture(project.id))}
        initialVersions={isClientNewVideo ? clientNewScriptVersions : undefined}
        initialToastMessage={getBriefApprovalToast(query.briefApproved, query.scriptWriter)}
      />
    </Suspense>
  );
}

function getBriefApprovalToast(briefApproved: string | string[] | undefined, scriptWriter: string | string[] | undefined) {
  if (getSingleValue(briefApproved) !== "1") return "";
  return `Brief approved. Script assigned to ${getSingleValue(scriptWriter)?.trim() || "Tom"}.`;
}
