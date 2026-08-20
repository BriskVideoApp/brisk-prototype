import { notFound } from "next/navigation";
import { DocumentExportPreview } from "@/components/document-export/DocumentExportPreview";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mediaAssets } from "@/data/media";
import { scriptBrief, scriptVersions } from "@/data/script";
import { transcriptClips } from "@/data/transcripts";
import type {
  DocumentExportKind,
  DocumentExportPayload,
} from "@/lib/document-export";

type DocumentExportRouteProps = {
  params: Promise<{ kind: string; projectId: string }>;
  searchParams: Promise<{ clip?: string | string[] }>;
};

export function generateStaticParams() {
  return activeVideoProjects.flatMap((project) => [
    { kind: "script", projectId: project.id },
    { kind: "transcript", projectId: project.id },
  ]);
}

export default async function DocumentExportRoute({ params, searchParams }: DocumentExportRouteProps) {
  const { kind: rawKind, projectId } = await params;
  const query = await searchParams;
  const kind = getDocumentExportKind(rawKind);
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);

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
  return value === "script" || value === "transcript" ? value : null;
}

function createInitialPayload(kind: DocumentExportKind, projectId: string): DocumentExportPayload {
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);

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
