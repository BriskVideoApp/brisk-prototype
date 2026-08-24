import type { MediaAssetView } from "@/data/media";
import type { TranscriptClip } from "@/data/transcripts";

export function createPlainText(
  clips: Array<{ clip: TranscriptClip; asset: MediaAssetView }>,
) {
  return clips
    .map(({ clip, asset }) => [
      asset.name,
      "",
      ...clip.paragraphs.flatMap((paragraph) => [
        `${paragraph.speakerName} · @${formatReviewTime(paragraph.startTimeSeconds)}`,
        paragraph.text,
        "",
      ]),
    ].join("\n").trim())
    .join("\n\n\n");
}

export function formatReviewTime(totalSeconds: number) {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
