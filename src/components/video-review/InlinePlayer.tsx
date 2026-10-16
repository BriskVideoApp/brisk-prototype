"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import type {
  DrawingPath,
  DrawingPoint,
  FramePin,
  ReviewComment,
  ReviewVersion,
  ReviewVersionStatus,
  Video,
} from "./types";
import type { RecutBrief } from "@/data/masters";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { DsIcon } from "./DsIcon";
import { formatTime, formatVersionStatus, hasTimecode } from "@/components/video-review/review-utils";

const playbackSpeeds = [0.5, 1, 1.5, 2] as const;

export function InlinePlayer({
  video,
  comments,
  currentTimeSeconds,
  isPlaying,
  isCompareMode,
  comparisonVersions = [],
  versionStatus,
  selectedCommentId,
  activeDrawingPath,
  activeFramePin,
  composerBody,
  drawingPaths,
  selectedDrawingPaths,
  isDrawingMode,
  isEditingDrawing,
  pendingFramePin,
  recutBrief,
  onComposerBodyChange,
  onCancelFramePin,
  onPlaceFramePin,
  onStartDrawing,
  onUpdateDrawing,
  onEndDrawing,
  onEditSelectedDrawing = () => undefined,
  onSubmitComposer,
  onSeek,
  onTimeChange,
  onDurationChange,
  onSelectComment,
  onSkipNextComment,
  onSkipPreviousComment,
  onSetPlaying,
  onTogglePlay,
}: {
  video: Video;
  comments: ReviewComment[];
  currentTimeSeconds: number;
  isPlaying: boolean;
  isCompareMode: boolean;
  comparisonVersions?: ReviewVersion[];
  versionStatus: ReviewVersionStatus;
  selectedCommentId: string | null;
  activeDrawingPath: DrawingPath | null;
  activeFramePin: FramePin | null;
  composerBody: string;
  drawingPaths: DrawingPath[];
  selectedDrawingPaths: DrawingPath[];
  isDrawingMode: boolean;
  isEditingDrawing: boolean;
  pendingFramePin: FramePin | null;
  recutBrief?: RecutBrief;
  onComposerBodyChange: (body: string) => void;
  onCancelFramePin: () => void;
  onPlaceFramePin: (framePin: FramePin) => void;
  onStartDrawing: (point: DrawingPoint) => void;
  onUpdateDrawing: (point: DrawingPoint) => void;
  onEndDrawing: () => void;
  onClearDrawing?: () => void;
  onDoneDrawing?: () => void;
  onEditSelectedDrawing?: () => void;
  onSubmitComposer: () => void;
  onSeek: (seconds: number) => void;
  onTimeChange: (seconds: number) => void;
  onDurationChange: (seconds: number) => void;
  onSelectComment: (comment: ReviewComment) => void;
  onSkipNextComment: () => void;
  onSkipPreviousComment: () => void;
  onSetPlaying: (isPlaying: boolean) => void;
  onTogglePlay: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [dismissedDrawingPromptPathId, setDismissedDrawingPromptPathId] = useState<string | null>(null);
  const columnRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameNoteInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackSpeed = playbackSpeeds[speedIndex];
  const latestDrawingPath = drawingPaths[drawingPaths.length - 1];
  const latestDrawingPoint = latestDrawingPath?.points[latestDrawingPath.points.length - 1];
  const isDrawingCommentPromptVisible = Boolean(
    isDrawingMode
      && !isEditingDrawing
      && !activeDrawingPath
      && latestDrawingPath
      && latestDrawingPoint
      && dismissedDrawingPromptPathId !== latestDrawingPath.id,
  );
  const composerPopoverAnchor = pendingFramePin ?? (latestDrawingPoint
    ? {
        x: latestDrawingPoint.x / 10,
        y: latestDrawingPoint.y / 5.625,
      }
    : null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !video.sourceUrl) {
      return;
    }

    if (Math.abs(videoElement.currentTime - currentTimeSeconds) > 0.4) {
      videoElement.currentTime = currentTimeSeconds;
    }
  }, [currentTimeSeconds, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !video.sourceUrl) {
      return;
    }

    if (isPlaying) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  }, [isPlaying, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.playbackRate = playbackSpeed;
  }, [playbackSpeed, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = isMuted;
  }, [isMuted, video.sourceUrl]);

  useEffect(() => {
    if (!pendingFramePin && !isDrawingCommentPromptVisible) {
      return;
    }

    requestAnimationFrame(() => {
      frameNoteInputRef.current?.focus();
    });
  }, [isDrawingCommentPromptVisible, latestDrawingPath?.id, pendingFramePin]);

  const seekTo = (seconds: number) => {
    const nextSeconds = Math.min(Math.max(seconds, 0), video.durationSeconds);
    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.currentTime = nextSeconds;
    }

    onSeek(nextSeconds);
  };

  const stepPlayback = (seconds: number) => {
    onSetPlaying(false);
    seekTo(currentTimeSeconds + seconds);
  };

  const cyclePlaybackSpeed = () => {
    setSpeedIndex((current) => (current + 1) % playbackSpeeds.length);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void columnRef.current?.requestFullscreen();
  };

  const getDrawingPoint = (event: PointerEvent<SVGSVGElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 562.5,
    };
  };

  const placePinFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (isDrawingMode) {
      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest("button, input, textarea, .frame-note-popover, .drawing-stroke.editable")) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    onPlaceFramePin({
      x: Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10,
      y: Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10,
    });
  };

  return (
    <section className={`video-column ${isCompareMode ? "is-comparing" : ""}`} ref={columnRef} aria-label={`${video.fileName} video player`}>
      <div className="review-player-statusbar">
        {isCompareMode ? (
          <span className="review-version-status is-comparing label-s-semibold">
            {comparisonVersions.map((version) => `V${version.number}`).join(" + ")} · Comparison
          </span>
        ) : recutBrief ? (
          <span className="review-recut-banner label-s-semibold">Recut brief · {recutBrief.marks.length} {recutBrief.marks.length === 1 ? "mark" : "marks"} · target {recutBrief.targetDurationSec}s</span>
        ) : (
          <span className={`review-version-status label-s-semibold is-${versionStatus}`}>
            {video.versionLabel.toUpperCase()} · {formatVersionStatus(versionStatus)}
          </span>
        )}
      </div>
      <div
        className={`video-frame ${isDrawingMode ? "drawing-active" : ""} ${isCompareMode ? "is-comparing" : ""}`}
        ref={frameRef}
        onPointerDown={placePinFromPointer}
      >
        {isCompareMode ? (
          <div
            className="review-compare-view"
            aria-label={`Side-by-side comparison of ${comparisonVersions.map((version) => `V${version.number}`).join(" and ")}`}
          >
            {comparisonVersions.map((version) => (
              <CompareFrame key={version.label} version={version} />
            ))}
          </div>
        ) : video.sourceUrl ? (
          <video
            className="review-video"
            ref={videoRef}
            src={video.sourceUrl}
            playsInline
            onLoadedMetadata={(event) => {
              onDurationChange(Math.max(1, Math.round(event.currentTarget.duration)));
            }}
            onTimeUpdate={(event) => {
              onTimeChange(Math.round(event.currentTarget.currentTime));
            }}
            onEnded={() => {
              onTimeChange(video.durationSeconds);
              onSetPlaying(false);
            }}
          />
        ) : (
          <div className="video-art" aria-hidden="true">
            <div className="soft-orb" />
          </div>
        )}
        {!isCompareMode ? <svg
          className={`drawing-layer ${selectedDrawingPaths.length > 0 ? "has-editable-drawing" : ""}`}
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          aria-label={isDrawingMode ? "Drawing layer active" : "Drawing layer"}
          onPointerDown={(event) => {
            if (!isDrawingMode) {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onStartDrawing(getDrawingPoint(event));
          }}
          onPointerMove={(event) => {
            if (!isDrawingMode || !activeDrawingPath) {
              return;
            }

            event.preventDefault();
            onUpdateDrawing(getDrawingPoint(event));
          }}
          onPointerUp={(event) => {
            if (!isDrawingMode) {
              return;
            }

            event.preventDefault();
            onEndDrawing();
          }}
          onPointerCancel={onEndDrawing}
          onPointerLeave={() => {
            if (isDrawingMode && activeDrawingPath) {
              onEndDrawing();
            }
          }}
        >
          {selectedDrawingPaths.map((path) => (
            <path
              className="drawing-stroke editable"
              d={formatDrawingPath(path.points)}
              key={path.id}
              role="button"
              tabIndex={0}
              aria-label="Edit drawing feedback"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onEditSelectedDrawing}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }

                event.preventDefault();
                onEditSelectedDrawing();
              }}
            />
          ))}
          {[...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])].map((path) => (
            <path className="drawing-stroke" d={formatDrawingPath(path.points)} key={path.id} />
          ))}
        </svg> : null}
        {!isCompareMode && !isDrawingMode && !activeFramePin ? (
          <div className="frame-comment-prompt label-s-semibold">Click to add a comment</div>
        ) : null}
        {!isCompareMode && activeFramePin ? (
          <button
            className={`frame-comment-dot ${pendingFramePin ? "pending" : ""}`}
            type="button"
            aria-label={pendingFramePin ? "Pending pinned comment" : "Selected pinned comment"}
            style={{
              left: `${activeFramePin.x}%`,
              top: `${activeFramePin.y}%`,
            }}
          />
        ) : null}
        {!isCompareMode && composerPopoverAnchor && (pendingFramePin || isDrawingCommentPromptVisible) ? (
          <div
            className="frame-note-popover"
            style={{
              "--frame-note-x": `${composerPopoverAnchor.x}%`,
              "--frame-note-y": `${composerPopoverAnchor.y}%`,
            } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="frame-note-main">
              <span className="frame-note-time label-s-semibold">{formatTime(currentTimeSeconds)}</span>
              <input
                className="frame-note-input label-s"
                ref={frameNoteInputRef}
                placeholder="Comment"
                value={composerBody}
                onChange={(event) => onComposerBodyChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    if (pendingFramePin) {
                      onCancelFramePin();
                    } else if (latestDrawingPath) {
                      setDismissedDrawingPromptPathId(latestDrawingPath.id);
                    }
                    return;
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSubmitComposer();
                  }
                }}
              />
              <Button size="S" variant="primary"
                className="frame-note-post"
                type="button"
                disabled={composerBody.trim().length === 0}
                onClick={onSubmitComposer}
              >
                Post
              </Button>
              <button
                className="frame-note-close"
                type="button"
                aria-label={pendingFramePin ? "Close pinned comment" : "Close drawing comment"}
                onClick={() => {
                  if (pendingFramePin) {
                    onCancelFramePin();
                  } else if (latestDrawingPath) {
                    setDismissedDrawingPromptPathId(latestDrawingPath.id);
                  }
                }}
              >
                <DsIcon name="x-close-cross" size={12} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {!isCompareMode ? <div className="player-controls">
        <ScrubBar
          video={video}
          comments={comments}
          currentTimeSeconds={currentTimeSeconds}
          selectedCommentId={selectedCommentId}
          recutBrief={recutBrief}
          onSeek={onSeek}
          onSelectComment={onSelectComment}
        />
        <div className="control-row">
          <div className="control-cluster">
            <button
              className="ghost-control"
              type="button"
              aria-label="Step back five seconds"
              onClick={() => stepPlayback(-5)}
            >
              <DsIcon name="arrow-counter-clockwise" size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Step forward five seconds"
              onClick={() => stepPlayback(5)}
            >
              <DsIcon name="arrow-clockwise" size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Previous comment"
              onClick={() => {
                onSetPlaying(false);
                onSkipPreviousComment();
              }}
            >
              <DsIcon name="caret-left" size={18} />
            </button>
            <button
              className="play-control"
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={onTogglePlay}
            >
              <DsIcon name={isPlaying ? "pause" : "play"} size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Next comment"
              onClick={() => {
                onSetPlaying(false);
                onSkipNextComment();
              }}
            >
              <DsIcon name="caret-right" size={18} />
            </button>
          </div>

          <div className="control-cluster right-controls">
            <button
              className="speed-button label-xs-semibold"
              type="button"
              aria-label={`Playback speed ${playbackSpeed}x`}
              onClick={cyclePlaybackSpeed}
            >
              {playbackSpeed}x <DsIcon name="caret-down" size={12} />
            </button>
            <button
              className={`ghost-control ${isMuted ? "muted" : ""}`}
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
              onClick={() => setIsMuted((current) => !current)}
            >
              <DsIcon name="speaker-high" size={18} />
            </button>
            <button className="ghost-control" type="button" aria-label="Fullscreen" onClick={toggleFullscreen}>
              <DsIcon name="frame-corners" size={18} />
            </button>
          </div>
        </div>
      </div> : null}
    </section>
  );
}

function CompareFrame({ version }: { version: ReviewVersion }) {
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackSpeed = playbackSpeeds[speedIndex];

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !version.sourceUrl) {
      return;
    }

    videoElement.playbackRate = playbackSpeed;
    videoElement.muted = isMuted;

    if (isPlaying) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  }, [isMuted, isPlaying, playbackSpeed, version.sourceUrl]);

  useEffect(() => {
    if (version.sourceUrl || !isPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTimeSeconds((current) => Math.min(current + playbackSpeed, version.durationSeconds));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, version.durationSeconds, version.sourceUrl]);

  useEffect(() => {
    if (isPlaying && currentTimeSeconds >= version.durationSeconds) {
      setIsPlaying(false);
    }
  }, [currentTimeSeconds, isPlaying, version.durationSeconds]);

  const seekTo = (seconds: number) => {
    const nextSeconds = Math.min(Math.max(seconds, 0), version.durationSeconds);

    if (videoRef.current) {
      videoRef.current.currentTime = nextSeconds;
    }

    setCurrentTimeSeconds(nextSeconds);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void frameRef.current?.requestFullscreen();
  };

  return (
    <div className="review-compare-frame" ref={frameRef}>
      <span className="review-compare-label label-xs-semibold">V{version.number}</span>
      {version.sourceUrl ? (
        <video
          className="review-compare-video"
          ref={videoRef}
          src={version.sourceUrl}
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = Math.min(currentTimeSeconds, event.currentTarget.duration);
          }}
          onTimeUpdate={(event) => setCurrentTimeSeconds(event.currentTarget.currentTime)}
          onEnded={() => {
            setCurrentTimeSeconds(version.durationSeconds);
            setIsPlaying(false);
          }}
        />
      ) : (
        <div className="review-compare-orb" aria-hidden="true">MY</div>
      )}
      <div className="review-compare-playback" aria-label={`V${version.number} playback controls`}>
        <div className="review-compare-scrub-row">
          <span className="label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
          <input
            type="range"
            min={0}
            max={version.durationSeconds}
            step={0.1}
            value={Math.min(currentTimeSeconds, version.durationSeconds)}
            aria-label={`V${version.number} timeline`}
            onChange={(event) => seekTo(Number(event.target.value))}
          />
          <span className="label-xs">{formatTime(version.durationSeconds)}</span>
        </div>
        <div className="review-compare-control-row">
          <button
            className="play-control"
            type="button"
            aria-label={`${isPlaying ? "Pause" : "Play"} V${version.number}`}
            onClick={() => setIsPlaying((current) => !current)}
          >
            <DsIcon name={isPlaying ? "pause" : "play"} size={16} />
          </button>
          <div className="review-compare-control-actions">
            <button
              className="speed-button label-xs-semibold"
              type="button"
              aria-label={`V${version.number} playback speed ${playbackSpeed}x`}
              onClick={() => setSpeedIndex((current) => (current + 1) % playbackSpeeds.length)}
            >
              {playbackSpeed}x <DsIcon name="caret-down" size={12} />
            </button>
            <button
              className={`ghost-control ${isMuted ? "muted" : ""}`}
              type="button"
              aria-label={`${isMuted ? "Unmute" : "Mute"} V${version.number}`}
              aria-pressed={isMuted}
              onClick={() => setIsMuted((current) => !current)}
            >
              <DsIcon name="speaker-high" size={17} />
            </button>
            <button className="ghost-control" type="button" aria-label={`Fullscreen V${version.number}`} onClick={toggleFullscreen}>
              <DsIcon name="frame-corners" size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrubBar({
  video,
  comments,
  currentTimeSeconds,
  selectedCommentId,
  recutBrief,
  onSeek,
  onSelectComment,
}: {
  video: Video;
  comments: ReviewComment[];
  currentTimeSeconds: number;
  selectedCommentId: string | null;
  recutBrief?: RecutBrief;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: ReviewComment) => void;
}) {
  const progress = (currentTimeSeconds / video.durationSeconds) * 100;
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    onSeek(Math.round(ratio * video.durationSeconds));
  };

  return (
    <div className="scrub-wrap">
      <span className="time-label label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
      <div className="scrub-bar" aria-label="Video timeline" role="slider" onPointerDown={seekFromPointer}>
        <div className="scrub-progress" style={{ width: `${progress}%` }} />
        <div className="playhead" style={{ left: `${progress}%` }} />
        {recutBrief?.marks.map((mark) => (
          <button
            className={`review-recut-mark mark-${mark.verb}`}
            type="button"
            key={mark.id}
            aria-label={`${mark.verb} from ${formatTime(mark.inSec)} to ${formatTime(mark.outSec)}`}
            style={{
              left: `${(mark.inSec / video.durationSeconds) * 100}%`,
              width: `${Math.max(0.8, ((mark.outSec - mark.inSec) / video.durationSeconds) * 100)}%`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSeek(mark.inSec);
            }}
          />
        ))}
        {comments.filter(hasTimecode).map((comment) => (
          <button
            className={`comment-pin ${comment.visibility} ${selectedCommentId === comment.id ? "selected" : ""}`}
            key={comment.id}
            type="button"
            style={{
              left: `${(comment.timecodeSeconds / video.durationSeconds) * 100}%`,
            }}
            data-tooltip={`${formatTime(comment.timecodeSeconds)} ${comment.visibility}`}
            aria-label={`Go to comment at ${formatTime(comment.timecodeSeconds)}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectComment(comment);
            }}
          />
        ))}
      </div>
      <span className="time-label duration label-xs">{formatTime(video.durationSeconds)}</span>
    </div>
  );
}

function formatDrawingPath(points: DrawingPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}
