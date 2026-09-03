import { notFound } from "next/navigation";
import { ScriptPage } from "@/components/script/ScriptPage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";
import {
  clientNewScriptVersions,
  clientNewVideoScriptProject,
} from "@/data/prototype-scenarios";

type ScriptRouteProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    subtab?: string | string[];
    clip?: string | string[];
    preview?: string | string[];
    briefApproved?: string | string[];
    scriptWriter?: string | string[];
  }>;
};

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function ScriptRoute({ params, searchParams }: ScriptRouteProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  const subtab = getSubtab(query.subtab);
  const clip = getSingleValue(query.clip);
  const isClientNewVideo = project.id === clientNewVideoScriptProject.id;

  return (
    <ScriptPage
      project={project}
      initialSubtab={subtab}
      initialTranscriptClipId={clip}
      initialVersions={isClientNewVideo ? clientNewScriptVersions : undefined}
      initiallyEmpty={isClientNewVideo || getSingleValue(query.preview) === "empty"}
      initialToastMessage={getBriefApprovalToast(query.briefApproved, query.scriptWriter)}
    />
  );
}

function getBriefApprovalToast(briefApproved: string | string[] | undefined, scriptWriter: string | string[] | undefined) {
  if (getSingleValue(briefApproved) !== "1") {
    return "";
  }

  const writer = getSingleValue(scriptWriter)?.trim() || "Tom";
  return `Brief approved. Script assigned to ${writer}.`;
}

function getSubtab(subtab: string | string[] | undefined) {
  const value = getSingleValue(subtab);
  return value === "transcripts" ? value : "script";
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}
