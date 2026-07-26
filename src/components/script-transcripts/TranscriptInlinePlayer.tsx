"use client";

import type { CSSProperties } from "react";
import { InlinePlayer } from "@/components/video-review/VideoReviewScreen";
import type { MediaAsset } from "@/data/media";
import type { TranscriptClip } from "@/data/transcripts";

export function TranscriptInlinePlayer({
  asset,
  clip,
  currentTimeSeconds,
  isPlaying,
  onPlayingChange,
  onTimeChange,
}: {
  asset: MediaAsset;
  clip: TranscriptClip;
  currentTimeSeconds: number;
  isPlaying: boolean;
  onPlayingChange: (isPlaying: boolean) => void;
  onTimeChange: (seconds: number) => void;
}) {
  const durationSeconds = parseDurationLabel(asset.durationLabel)
    ?? Math.max(...clip.paragraphs.map((paragraph) => paragraph.endTimeSeconds), 1);
  const thumbnailStyle = asset.thumbnailUrl
    ? ({ "--transcript-thumbnail": `url("${asset.thumbnailUrl}")` } as CSSProperties)
    : undefined;

  return (
    <div className={`transcript-inline-player is-${asset.kind}`} style={thumbnailStyle}>
      <InlinePlayer
        video={{
          id: asset.id,
          fileName: asset.name,
          versionLabel: "Transcript",
          versions: ["Transcript"],
          durationSeconds,
          currentTimeSeconds,
          stage: "Edit",
          comments: [],
        }}
        comments={[]}
        currentTimeSeconds={currentTimeSeconds}
        isPlaying={isPlaying}
        isCompareMode={false}
        versionStatus="in_review"
        selectedCommentId={null}
        activeDrawingPath={null}
        activeFramePin={null}
        composerBody=""
        drawingPaths={[]}
        selectedDrawingPaths={[]}
        isDrawingMode={false}
        pendingFramePin={null}
        onComposerBodyChange={() => undefined}
        onCancelFramePin={() => undefined}
        onPlaceFramePin={() => undefined}
        onStartDrawing={() => undefined}
        onUpdateDrawing={() => undefined}
        onEndDrawing={() => undefined}
        onClearDrawing={() => undefined}
        onDoneDrawing={() => undefined}
        onSubmitComposer={() => undefined}
        onUndoDrawing={() => undefined}
        onSeek={onTimeChange}
        onTimeChange={onTimeChange}
        onDurationChange={() => undefined}
        onSelectComment={() => undefined}
        onSkipNextComment={() => undefined}
        onSkipPreviousComment={() => undefined}
        onSetPlaying={onPlayingChange}
        onTogglePlay={() => onPlayingChange(!isPlaying)}
      />
    </div>
  );
}

function parseDurationLabel(durationLabel: string | undefined) {
  if (!durationLabel) {
    return null;
  }

  const parts = durationLabel.split(":").map(Number);

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}
