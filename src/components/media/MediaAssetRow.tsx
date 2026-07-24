import type { MouseEvent } from "react";
import type { MediaAsset } from "@/data/media";
import { MediaAssetActions, MediaThumbnail } from "./MediaAssetCard";

type MediaAssetRowProps = {
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

export function MediaAssetRow(props: MediaAssetRowProps) {
  const { asset, isActive, isSelected, onActivate } = props;
  const uploaded = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(asset.uploadedAt));

  return (
    <tr
      className={`${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}`}
      tabIndex={0}
      onClick={(event) => onActivate(asset, event)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(asset, event as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      <td><MediaThumbnail asset={asset} small /></td>
      <td><span className="media-list-name label-s-semibold" title={asset.name}>{asset.name}</span></td>
      <td className="label-s">{asset.kind}</td>
      <td className="label-s">{uploaded}</td>
      <td className="label-s">{asset.sizeLabel}</td>
      <td className="label-s">{asset.durationLabel ?? "-"}</td>
      <td className="label-s">{asset.ownerName}</td>
      <td className="label-s">{asset.commentCount}</td>
      <td>
        <MediaAssetActions
          asset={asset}
          compact
          onComment={props.onComment}
          onTranscript={props.onTranscript}
          onShare={props.onShare}
          onDownload={props.onDownload}
          onDelete={props.onDelete}
        />
      </td>
    </tr>
  );
}
