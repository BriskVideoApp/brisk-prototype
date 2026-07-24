import type { MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset } from "@/data/media";

type MediaAssetCardProps = {
  asset: MediaAsset;
  isActive: boolean;
  isSelected: boolean;
  onActivate: (asset: MediaAsset, event: MouseEvent<HTMLElement>) => void;
  onComment: (asset: MediaAsset) => void;
  onTranscript: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDownload: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
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
}: MediaAssetCardProps) {
  return (
    <article
      className={`media-asset-card ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}`}
      tabIndex={0}
      aria-label={`${asset.name}, ${asset.kind}`}
      onClick={(event) => onActivate(asset, event)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(asset, event as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      <MediaThumbnail asset={asset} />
      <div className="media-card-copy">
        <p className="media-card-meta label-xs">{formatAssetMeta(asset)}</p>
        <p className="media-card-name label-s-semibold" title={asset.name}>{asset.name}</p>
      </div>
      <MediaAssetActions
        asset={asset}
        compact
        onComment={onComment}
        onTranscript={onTranscript}
        onShare={onShare}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    </article>
  );
}

type MediaAssetActionsProps = {
  asset: MediaAsset;
  compact?: boolean;
  onComment: (asset: MediaAsset) => void;
  onTranscript: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDownload: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
};

export function MediaAssetActions({ asset, compact = false, onComment, onTranscript, onShare, onDownload, onDelete }: MediaAssetActionsProps) {
  const canTranscribe = asset.kind === "video" || asset.kind === "audio";
  const actions = [
    { label: "Comment", icon: "message-circle" as const, action: onComment, disabled: false },
    { label: "Transcript", icon: "file-text" as const, action: onTranscript, disabled: !canTranscribe },
    { label: "Share", icon: "link" as const, action: onShare, disabled: false },
    { label: "Download", icon: "download" as const, action: onDownload, disabled: false },
    { label: "Delete", icon: "trash" as const, action: onDelete, disabled: false },
  ];

  return (
    <div className={`media-asset-actions ${compact ? "is-compact" : ""}`} aria-label={`Actions for ${asset.name}`}>
      {actions.map((item) => (
        <button
          className="media-icon-button"
          type="button"
          key={item.label}
          aria-label={`${item.label} ${asset.name}`}
          data-tooltip={item.label}
          disabled={item.disabled}
          onClick={(event) => {
            event.stopPropagation();
            item.action(asset);
          }}
        >
          <DsIcon name={item.icon} size={16} />
          {item.label === "Comment" && asset.commentCount > 0 ? (
            <span className="media-comment-count label-xs-semibold">{asset.commentCount}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function MediaThumbnail({ asset, small = false }: { asset: MediaAsset; small?: boolean }) {
  const thumbnailStyle = asset.thumbnailUrl ? { backgroundImage: `url("${asset.thumbnailUrl}")` } : undefined;
  const iconName = asset.kind === "audio" ? "file-audio" : asset.kind === "video" ? "file-video" : asset.kind === "image" ? "image-square" : "file-text";

  return (
    <div className={`media-thumbnail media-thumbnail-${asset.kind} ${small ? "is-small" : ""}`} style={thumbnailStyle}>
      {!asset.thumbnailUrl ? (
        asset.kind === "audio" ? <AudioWaveform /> : <DsIcon name={iconName} size={small ? 20 : 32} />
      ) : null}
      {asset.kind === "video" ? (
        <span className="media-thumbnail-play" aria-hidden="true"><DsIcon name="play" size={small ? 12 : 18} /></span>
      ) : null}
      {asset.status === "uploading" ? (
        <span className="media-uploading-chip label-xs-semibold">Uploading</span>
      ) : null}
    </div>
  );
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

export function formatAssetMeta(asset: MediaAsset) {
  const date = new Intl.DateTimeFormat("en-AU", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(asset.uploadedAt));
  return [date, asset.sizeLabel, asset.durationLabel].filter(Boolean).join(" · ");
}
