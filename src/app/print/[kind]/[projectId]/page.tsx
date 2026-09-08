import { notFound } from "next/navigation";
import { DocumentExportPreview } from "@/components/document-export/DocumentExportPreview";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mediaAssets } from "@/data/media";
import { clientNewVideoScriptProject } from "@/data/prototype-scenarios";
import { scriptBrief, scriptVersions } from "@/data/script";
import { createStoryboardRecord, initialStoryboardRecords } from "@/data/storyboard";
import { transcriptClips } from "@/data/transcripts";
import type {
  DocumentExportKind,
  DocumentExportPayload,
} from "@/lib/document-export";

type DocumentExportRouteProps = {
  params: Promise<{ kind: string; projectId: string }>;
  searchParams: Promise<{ clip?: string | string[] }>;
};

const documentExportProjects = activeVideoProjects.some((project) => project.id === clientNewVideoScriptProject.id)
  ? activeVideoProjects
  : [...activeVideoProjects, clientNewVideoScriptProject];

export function generateStaticParams() {
  return documentExportProjects.flatMap((project) => [
    { kind: "script", projectId: project.id },
    { kind: "storyboard", projectId: project.id },
    { kind: "transcript", projectId: project.id },
  ]);
}

export default async function DocumentExportRoute({ params, searchParams }: DocumentExportRouteProps) {
  const { kind: rawKind, projectId } = await params;
  const query = await searchParams;
  const kind = getDocumentExportKind(rawKind);
  const project = documentExportProjects.find((candidate) => candidate.id === projectId);

  if (!kind || !project) notFound();

  const initialPayload = createInitialPayload(kind, projectId);
  const clipId = Array.isArray(query.clip) ? query.clip[0] : query.clip;

  return (
    <DocumentExportPreview
      clipId={clipId}
      initialPayload={initialPayload}
      project={project}
    />
  );
}

function getDocumentExportKind(value: string): DocumentExportKind | null {
  return value === "script" || value === "storyboard" || value === "transcript" ? value : null;
}

function createInitialPayload(kind: DocumentExportKind, projectId: string): DocumentExportPayload {
  const project = documentExportProjects.find((candidate) => candidate.id === projectId);

  if (!project) notFound();

  if (kind === "script") {
    const latestVersion = scriptVersions[scriptVersions.length - 1];

    return {
      kind,
      projectId,
      projectName: project.name,
      clientName: project.clientName,
      studioName: scriptBrief.studioName,
      documentTitle: latestVersion.snapshotName,
      versionLabel: latestVersion.label,
      createdAt: latestVersion.createdAt,
      rows: latestVersion.rows.map((row) => ({
        id: row.id,
        words: row.words,
        visuals: row.visuals,
        durationSeconds: row.durationSeconds,
        media: row.media.map((item) => ({ ...item })),
      })),
    };
  }

  if (kind === "storyboard") {
    const record = initialStoryboardRecords[projectId] ?? createStoryboardRecord(projectId, "Studio");
    const version = record.versions.find((item) => item.id === record.currentVersionId) ?? record.versions[0];

    return {
      kind,
      projectId,
      projectName: project.name,
      clientName: project.clientName,
      studioName: scriptBrief.studioName,
      documentTitle: version.snapshotName,
      versionLabel: version.label,
      createdAt: version.createdAt,
      rows: version.frames.map((frame, index) => ({
        id: frame.id,
        words: frame.words,
        visuals: frame.visuals,
        durationSeconds: frame.durationSeconds,
        media: frame.image ? [{
          id: frame.image.id,
          type: frame.image.source,
          label: frame.image.label,
          meta: "Storyboard image",
          tone: (["cyan", "lime", "purple", "pink", "yellow"] as const)[index % 5],
        }] : [],
      })),
    };
  }

  const assetsById = new Map(mediaAssets.map((asset) => [asset.id, asset]));

  return {
    kind,
    projectId,
    projectName: project.name,
    clientName: project.clientName,
    studioName: scriptBrief.studioName,
    clips: transcriptClips
      .filter((clip) => clip.projectId === projectId)
      .flatMap((clip) => {
        const asset = assetsById.get(clip.mediaAssetId);

        return asset
          ? [{
              id: clip.id,
              title: asset.name,
              language: clip.language,
              createdAt: clip.createdAt,
              paragraphs: clip.paragraphs.map((paragraph) => ({
                ...paragraph,
                highlighted: false,
              })),
            }]
          : [];
      }),
  };
}
