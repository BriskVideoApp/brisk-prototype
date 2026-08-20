import type { ScriptMediaItem } from "@/data/script";

export type DocumentExportKind = "script" | "transcript";

export type ScriptExportRow = {
  id: string;
  words: string;
  visuals: string;
  durationSeconds: number;
  media: ScriptMediaItem[];
};

export type ScriptExportPayload = {
  kind: "script";
  projectId: string;
  projectName: string;
  clientName: string;
  studioName: string;
  documentTitle: string;
  versionLabel: string;
  createdAt: string;
  rows: ScriptExportRow[];
};

export type TranscriptExportParagraph = {
  id: string;
  speakerName: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
  highlighted: boolean;
};

export type TranscriptExportClip = {
  id: string;
  title: string;
  language: string;
  createdAt: string;
  paragraphs: TranscriptExportParagraph[];
};

export type TranscriptExportPayload = {
  kind: "transcript";
  projectId: string;
  projectName: string;
  clientName: string;
  studioName: string;
  clips: TranscriptExportClip[];
};

export type DocumentExportPayload = ScriptExportPayload | TranscriptExportPayload;

export function documentExportStorageKey(kind: DocumentExportKind, projectId: string) {
  return `brisk-document-export-${kind}-${projectId}`;
}

export function saveDocumentExportPayload(payload: DocumentExportPayload) {
  try {
    window.localStorage.setItem(
      documentExportStorageKey(payload.kind, payload.projectId),
      JSON.stringify(payload),
    );
  } catch {
    // The print route still has typed mock-data fallbacks when storage is unavailable.
  }
}

export function readDocumentExportPayload(kind: DocumentExportKind, projectId: string) {
  try {
    const storedPayload = window.localStorage.getItem(documentExportStorageKey(kind, projectId));

    if (!storedPayload) {
      return null;
    }

    const parsedPayload = JSON.parse(storedPayload) as DocumentExportPayload;

    return parsedPayload.kind === kind && parsedPayload.projectId === projectId
      ? parsedPayload
      : null;
  } catch {
    return null;
  }
}

export function getDocumentExportHref(
  kind: DocumentExportKind,
  projectId: string,
  clipId?: string,
) {
  const search = clipId ? `?clip=${encodeURIComponent(clipId)}` : "";
  return `/print/${kind}/${encodeURIComponent(projectId)}${search}`;
}

export function openDocumentExportPreview(
  payload: DocumentExportPayload,
  clipId?: string,
) {
  saveDocumentExportPayload(payload);
  window.open(
    getDocumentExportHref(payload.kind, payload.projectId, clipId),
    "_blank",
    "noopener,noreferrer",
  );
}
