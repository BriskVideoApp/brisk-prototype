/** One project transcript collection, reached from Media, Script or a source file. */
export function getProjectTranscriptsHref(projectId: string, clipId?: string) {
  const path = `/projects/${encodeURIComponent(projectId)}/stages/media?view=transcripts`;
  return clipId
    ? `${path}&clip=${encodeURIComponent(clipId)}#transcript-${encodeURIComponent(clipId)}`
    : path;
}
