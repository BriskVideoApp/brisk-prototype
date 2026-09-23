import { useRef, useState, type DragEvent, type MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetView } from "@/data/media";
import type { MediaCapabilities } from "@/lib/media";
import { formatMediaBytes, formatMediaDuration } from "@/lib/media";

type MediaAssetCardProps = {
  asset: MediaAssetView;
  isActive: boolean;
  isSelected: boolean;
  capabilities: MediaCapabilities;
  onActivate: (asset: MediaAssetView, event: MouseEvent<HTMLElement>) => void;
  onComment: (asset: MediaAssetView) => void;
  onTranscript: (asset: MediaAssetView) => void;
  onShare: (asset: MediaAssetView) => void;
  onDownload: (asset: MediaAssetView) => void;
  onDelete: (asset: MediaAssetView) => void;
  onArchive: (asset: MediaAssetView) => void;
  onRestore: (asset: MediaAssetView) => void;
  onRetry: (asset: MediaAssetView) => void;
  onToggleSelect: (asset: MediaAssetView) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export function MediaAssetCard({
  asset,
  isActive,
  isSelected,
  onActivate,
  onComment,
  onTranscript,
  onShare,
  onDownload,
  onDelete,
  onArchive,
  onRestore,
  onRetry,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  capabilities,
}: MediaAssetCardProps) {
  return (
    <article
      className={`media-asset-card ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}`}
      tabIndex={0}
      aria-label={`${asset.name}, ${asset.kind}`}
      draggable={capabilities.canMoveAssets}
      onClick={(event) => onActivate(asset, event)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(asset, event as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      <MediaThumbnail asset={asset} />
      {capabilities.canCopyLink ? <button className={`media-asset-select ${isSelected ? "is-selected" : ""}`} type="button" aria-label={`${isSelected ? "Deselect" : "Select"} ${asset.name}`} aria-pressed={isSelected} onClick={(event) => { event.stopPropagation(); onToggleSelect(asset); }}><DsIcon name="check" size={14} /></button> : null}
      <div className="media-card-copy">
        <p className="media-card-meta label-xs">{formatAssetMeta(asset)}</p>
        <p className="media-card-name label-s-semibold" title={asset.name}>{asset.name}</p>
      </div>
      <MediaAssetActions
        asset={asset}
        compact
        showPersistentIndicators
        onComment={onComment}
        onTranscript={onTranscript}
        onShare={onShare}
        onDownload={onDownload}
        onDelete={onDelete}
        onArchive={onArchive}
        onRestore={onRestore}
        onRetry={onRetry}
        capabilities={capabilities}
      />
    </article>
  );
}

type MediaAssetActionsProps = {
  asset: MediaAssetView;
  compact?: boolean;
  showPersistentIndicators?: boolean;
  capabilities: MediaCapabilities;
  onComment: (asset: MediaAssetView) => void;
  onTranscript: (asset: MediaAssetView) => void;
  onShare: (asset: MediaAssetView) => void;
  onDownload: (asset: MediaAssetView) => void;
  onDelete: (asset: MediaAssetView) => void;
  onArchive: (asset: MediaAssetView) => void;
  onRestore: (asset: MediaAssetView) => void;
  onRetry: (asset: MediaAssetView) => void;
};

export function MediaAssetActions({ asset, compact = false, showPersistentIndicators = false, capabilities, onComment, onTranscript, onShare, onDownload, onDelete, onArchive, onRestore, onRetry }: MediaAssetActionsProps) {
  const canTranscribe = asset.kind === "video" || asset.kind === "audio";
  const actions = [
    ...(asset.status === "failed" ? [{ label: "Retry", icon: "arrows-clockwise" as const, action: onRetry, disabled: false }] : []),
    ...(capabilities.canComment ? [{ label: "Comment", icon: "chat-circle" as const, action: onComment, disabled: false }] : []),
    { label: "Transcript", icon: "file-text" as const, action: onTranscript, disabled: !canTranscribe },
    ...(capabilities.canCopyLink ? [{ label: "Copy link", icon: "link" as const, action: onShare, disabled: false }] : []),
    ...(capabilities.canDownload ? [{ label: asset.originalAvailable ? "Download" : "Original unavailable", icon: "download" as const, action: onDownload, disabled: !asset.originalAvailable }] : []),
    ...(asset.archivedAt && capabilities.canArchive ? [{ label: "Restore", icon: "arrow-counter-clockwise" as const, action: onRestore, disabled: false }] : []),
    ...(!asset.archivedAt && capabilities.canArchive ? [{ label: "Archive", icon: "folder" as const, action: onArchive, disabled: false }] : []),
    ...(capabilities.canDelete ? [{ label: "Delete", icon: "trash" as const, action: onDelete, disabled: false }] : []),
  ];

  return (
    <div className={`media-asset-actions ${compact ? "is-compact" : ""} ${showPersistentIndicators && (asset.commentCount > 0 || asset.transcriptStatus === "ready") ? "has-persistent-indicators" : ""}`} aria-label={`Actions for ${asset.name}`}>
      {actions.map((item) => {
        const isPersistent = showPersistentIndicators && (
          (item.label === "Comment" && asset.commentCount > 0) ||
          (item.label === "Transcript" && asset.transcriptStatus === "ready")
        );

        return (
          <button
            className={`media-icon-button ${isPersistent ? "is-persistent" : ""}`}
            type="button"
            key={item.label}
            aria-label={item.label === "Comment" && asset.commentCount > 0 ? `${asset.commentCount} comment${asset.commentCount === 1 ? "" : "s"} for ${asset.name}` : `${item.label} ${asset.name}`}
            data-tooltip={item.label}
            disabled={item.disabled}
            onClick={(event) => {
              event.stopPropagation();
              item.action(asset);
            }}
          >
            <DsIcon name={item.icon} size={16} />
            {isPersistent && item.label === "Comment" ? <span className="media-comment-count label-xs-semibold">{asset.commentCount}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

type MediaAssetIndicatorsProps = {
  asset: MediaAssetView;
  showComments?: boolean;
  showTranscript?: boolean;
};

export function MediaAssetIndicators({ asset, showComments = true, showTranscript = true }: MediaAssetIndicatorsProps) {
  const hasComments = showComments && asset.commentCount > 0;
  const hasTranscript = showTranscript && asset.transcriptStatus === "ready";

  if (!hasComments && !hasTranscript) return null;

  return (
    <div className="media-asset-indicators" aria-label="File activity">
      {hasComments ? (
        <span className="media-asset-indicator label-xs-semibold" data-tooltip={`${asset.commentCount} comment${asset.commentCount === 1 ? "" : "s"}`}>
          <DsIcon name="chat-circle" size={14} />
          <span>{asset.commentCount}</span>
        </span>
      ) : null}
      {hasTranscript ? (
        <span className="media-asset-indicator" data-tooltip="Transcript available" aria-label="Transcript available">
          <DsIcon name="file-text" size={14} />
        </span>
      ) : null}
    </div>
  );
}

export function MediaThumbnail({ asset, small = false }: { asset: MediaAssetView; small?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const thumbnailStyle = asset.thumbnailUrl ? { backgroundImage: `url("${asset.thumbnailUrl}")` } : undefined;
  const iconName = asset.kind === "audio" ? "file-audio" : asset.kind === "video" ? "file-video" : asset.kind === "image" ? "image-square" : "file-text";
  const canScrub = !small && asset.kind === "video" && asset.status === "ready" && Boolean(asset.playbackUrl);

  const beginScrub = () => {
    if (!canScrub) return;
    setScrubbing(true);
    const video = videoRef.current;
    if (video) void video.play().catch(() => undefined);
  };

  const scrub = (event: MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!canScrub || !video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    video.currentTime = position * video.duration;
  };

  const endScrub = () => {
    setScrubbing(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <div className={`media-thumbnail media-thumbnail-${asset.kind} ${small ? "is-small" : ""} ${scrubbing ? "is-scrubbing" : ""}`} style={thumbnailStyle} onMouseEnter={beginScrub} onMouseMove={scrub} onMouseLeave={endScrub}>
      {canScrub ? <video ref={videoRef} className="media-thumbnail-scrub-video" src={asset.playbackUrl} poster={asset.thumbnailUrl} muted playsInline preload="metadata" aria-hidden="true" /> : null}
      {!asset.thumbnailUrl ? (
        asset.kind === "audio" ? <AudioWaveform /> : <DsIcon name={iconName} size={small ? 20 : 32} />
      ) : null}
      {asset.kind === "video" ? (
        <span className="media-thumbnail-play" aria-hidden="true"><DsIcon name="play" size={small ? 12 : 18} /></span>
      ) : null}
      {asset.status !== "ready" ? <span className={`media-processing-chip is-${asset.status} label-xs-semibold`}>{thumbnailStatus(asset)}</span> : null}
      {!asset.originalAvailable ? <span className="media-original-missing-chip label-xs-semibold">Original unavailable</span> : null}
      {asset.status !== "ready" ? <span className="media-thumbnail-progress"><span style={{ width: `${asset.processingProgress ?? 0}%` }} /></span> : null}
    </div>
  );
}

function thumbnailStatus(asset: MediaAssetView) {
  if (asset.status === "uploading") return `Uploading ${asset.processingProgress ?? 0}%`;
  if (asset.status === "stored") return "Stored";
  if (asset.status === "preparing") return `Preparing ${asset.processingProgress ?? 0}%`;
  return "Failed - retry";
}

function AudioWaveform() {
  return (
    <span className="media-waveform" aria-hidden="true">
      {[2, 4, 7, 5, 9, 12, 7, 4, 8, 11, 6, 3, 7, 10, 5, 2].map((height, index) => (
        <span key={`${height}-${index}`} style={{ height: `${height * 2}px` }} />
      ))}
    </span>
  );
}

export function formatAssetMeta(asset: MediaAssetView) {
  const date = new Intl.DateTimeFormat("en-AU", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(asset.uploadedAt));
  return [date, formatMediaBytes(asset.sizeBytes), formatMediaDuration(asset.durationSeconds)].filter(Boolean).join(" · ");
}
