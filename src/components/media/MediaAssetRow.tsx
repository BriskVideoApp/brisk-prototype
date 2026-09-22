import type { DragEvent, MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetView } from "@/data/media";
import type { MediaCapabilities } from "@/lib/media";
import { formatMediaBytes, formatMediaDuration } from "@/lib/media";
import { MediaAssetActions, MediaAssetIndicators, MediaThumbnail } from "./MediaAssetCard";

type MediaAssetRowProps = {
  asset: MediaAssetView;
  capabilities: MediaCapabilities;
  isActive: boolean;
  isSelected: boolean;
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

export function MediaAssetRow(props: MediaAssetRowProps) {
  const { asset, isActive, isSelected, onActivate } = props;
  const uploaded = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(asset.uploadedAt));

  return (
    <tr
      className={`${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}`}
      tabIndex={0}
      draggable={props.capabilities.canMoveAssets}
      onClick={(event) => onActivate(asset, event)}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(asset, event as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      <td>{props.capabilities.canMoveAssets ? <button className={`media-row-select ${isSelected ? "is-selected" : ""}`} type="button" aria-label={`${isSelected ? "Deselect" : "Select"} ${asset.name}`} aria-pressed={isSelected} onClick={(event) => { event.stopPropagation(); props.onToggleSelect(asset); }}><DsIcon name="check" size={14} /></button> : null}</td>
      <td><MediaThumbnail asset={asset} small /></td>
      <td><span className="media-list-name label-s-semibold" title={asset.name}>{asset.name}</span></td>
      <td className="label-s">{asset.kind}</td>
      <td className="label-s">{uploaded}</td>
      <td className="label-s">{formatMediaBytes(asset.sizeBytes)}</td>
      <td className="label-s">{formatMediaDuration(asset.durationSeconds) || "-"}</td>
      <td className="label-s">{asset.uploadedByName}</td>
      <td><MediaAssetIndicators asset={asset} showComments={false} /></td>
      <td><MediaAssetIndicators asset={asset} showTranscript={false} /></td>
      <td>
        <MediaAssetActions
          asset={asset}
          compact
          onComment={props.onComment}
          onTranscript={props.onTranscript}
          onShare={props.onShare}
          onDownload={props.onDownload}
          onDelete={props.onDelete}
          onArchive={props.onArchive}
          onRestore={props.onRestore}
          onRetry={props.onRetry}
          capabilities={props.capabilities}
        />
      </td>
    </tr>
  );
}
