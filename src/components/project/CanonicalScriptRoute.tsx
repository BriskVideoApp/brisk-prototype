"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectTranscriptsHref } from "@/lib/transcript-navigation";
import { ScriptPage } from "@/components/script/ScriptPage";
import { clientNewScriptVersions, clientNewVideoScriptProject } from "@/data/prototype-scenarios";
import { getProjectFixture } from "@/data/project-fixtures";
import { getSingleValue, ProjectUnavailable, type RouteQuery, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalScriptRoute({ projectId, query, mediaTranscripts = false }: { projectId: string; query: RouteQuery; mediaTranscripts?: boolean }) {
  const router = useRouter();
  const isLegacyTranscriptLink = !mediaTranscripts && getSingleValue(query.subtab) === "transcripts";
  const { project, hasHydrated } = useCanonicalStageProject(projectId);

  useEffect(() => {
    if (!isLegacyTranscriptLink) return;
    const previous = new URL(window.location.href);
    const destination = new URL(getProjectTranscriptsHref(projectId), previous.origin);
    previous.searchParams.forEach((value, key) => {
      if (key !== "subtab" && key !== "view") destination.searchParams.set(key, value);
    });
    destination.hash = previous.hash;
    router.replace(`${destination.pathname}${destination.search}${destination.hash}`);
  }, [isLegacyTranscriptLink, projectId, router]);

  if (isLegacyTranscriptLink) return null;
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;

  const hasHarbourScriptFixture = project.id === "harbour-health-care-journey";
  const isClientNewVideo = project.id === clientNewVideoScriptProject.id;

  return (
    <Suspense fallback={null}>
      <ScriptPage
        key={project.id}
        project={project}
        initialSubtab={mediaTranscripts ? "transcripts" : "script"}
        returnToScript={mediaTranscripts && getSingleValue(query.from) === "script"}
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
