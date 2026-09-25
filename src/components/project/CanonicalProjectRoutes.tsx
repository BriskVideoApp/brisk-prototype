"use client";

import { Suspense } from "react";
import Link from "next/link";
import { BriefPage } from "@/components/brief/BriefPage";
import { MediaStagePage } from "@/components/media/MediaStagePage";
import { MastersPage } from "@/components/masters/MastersPage";
import { ShootStagePage } from "@/components/shoot/ShootStagePage";
import { ScriptPage } from "@/components/script/ScriptPage";
import { StoryboardPage } from "@/components/storyboard/StoryboardPage";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import type { StageKey } from "@/components/active-videos/types";
import { getProjectFixture } from "@/data/project-fixtures";
import { clientNewScriptVersions, clientNewVideoScriptProject } from "@/data/prototype-scenarios";
import { selectProject, selectProjectBrief } from "@/data/prototype-state";

type RouteQuery = Record<string, string | string[] | undefined>;

type ProjectStageRouteProps = {
  projectId: string;
  stage: Exclude<StageKey, "brief"> | "storyboard";
  query?: RouteQuery;
};

export function CanonicalProjectBriefRoute({ projectId }: { projectId: string }) {
  const { state, hasHydrated, updateProjectBrief } = usePrototypeState();
  const project = selectProject(state, projectId);
  const brief = selectProjectBrief(state, projectId);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId);
  if (!project || !brief) return hasHydrated ? <ProjectUnavailable /> : null;
  return (
    <BriefPage
      project={project}
      studioName={workspace?.name ?? "Studio"}
      initialFields={brief.fields}
      onFieldsChange={(fields) => updateProjectBrief(project.id, fields)}
    />
  );
}

export function CanonicalProjectStageRoute({ projectId, stage, query = {} }: ProjectStageRouteProps) {
  const { state, hasHydrated } = usePrototypeState();
  const project = selectProject(state, projectId) ?? getProjectFixture(projectId);
  const isNewProject = Boolean(project && !getProjectFixture(project.id));
  const projectBrief = selectProjectBrief(state, projectId);

  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;

  if (stage === "script") {
    const isClientNewVideo = project.id === clientNewVideoScriptProject.id;
    return (
      <Suspense fallback={null}>
        <ScriptPage
          key={project.id}
          project={project}
          initialSubtab={getSingleValue(query.subtab) === "transcripts" ? "transcripts" : "script"}
          initialTranscriptClipId={getSingleValue(query.clip) ?? null}
          initialVersionId={getSingleValue(query.version) ?? null}
          initiallyEmpty={isNewProject || isClientNewVideo || getSingleValue(query.preview) === "empty"}
          initialVersions={isClientNewVideo ? clientNewScriptVersions : undefined}
          initialToastMessage={getBriefApprovalToast(query.briefApproved, query.scriptWriter)}
        />
      </Suspense>
    );
  }

  if (stage === "shoot") return <Suspense fallback={null}><ShootStagePage project={project} /></Suspense>;
  if (stage === "storyboard") return <Suspense fallback={null}><StoryboardPage project={project} /></Suspense>;
  if (stage === "edit") return <Suspense fallback={null}><VideoReviewScreen initiallyEmpty={project.stages.edit.state === "not_started" || getSingleValue(query.preview) === "empty"} project={project} /></Suspense>;
  if (stage === "masters") return <Suspense fallback={null}><MastersPage key={project.id} initiallyEmpty={isNewProject || getSingleValue(query.preview) === "empty"} initialBriefFields={projectBrief?.fields} project={project} /></Suspense>;

  return (
    <Suspense fallback={null}>
      <MediaStagePage
        project={project}
        initialFolderId={getSingleValue(query.folder) ?? null}
        initialAssetId={getSingleValue(query.asset) ?? null}
        initialAssetIds={getSingleValue(query.assets)?.split(",") ?? []}
      />
    </Suspense>
  );
}

function ProjectUnavailable() {
  return (
    <main className="client-not-found">
      <h1 className="headings-s-bold">Project unavailable</h1>
      <p className="paragraph-s">This project is not part of the active Studio workspace.</p>
      <Link className="client-secondary-button label-s-semibold" href="/active-videos">Back to Videos</Link>
    </main>
  );
}

function getBriefApprovalToast(briefApproved: string | string[] | undefined, scriptWriter: string | string[] | undefined) {
  if (getSingleValue(briefApproved) !== "1") return "";
  return `Brief approved. Script assigned to ${getSingleValue(scriptWriter)?.trim() || "Tom"}.`;
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
