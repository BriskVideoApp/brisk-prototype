import type { MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset } from "@/data/media";
import { MediaAssetCard } from "./MediaAssetCard";
import { MediaAssetRow } from "./MediaAssetRow";
import type { MediaViewMode } from "./MediaFilterBar";

type MediaAssetGridProps = {
  assets: MediaAsset[];
  viewMode: MediaViewMode;
  selectedAssetIds: Set<string>;
  activeAssetId: string | null;
  onActivate: (asset: MediaAsset, event: MouseEvent<HTMLElement>) => void;
  onComment: (asset: MediaAsset) => void;
  onTranscript: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDownload: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
  onBatchDownload: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onDeselectAll: () => void;
  onUpload: () => void;
};

export function MediaAssetGrid(props: MediaAssetGridProps) {
  const assetProps = (asset: MediaAsset) => ({
    asset,
    isActive: props.activeAssetId === asset.id,
    isSelected: props.selectedAssetIds.has(asset.id),
    onActivate: props.onActivate,
    onComment: props.onComment,
    onTranscript: props.onTranscript,
    onShare: props.onShare,
    onDownload: props.onDownload,
    onDelete: props.onDelete,
  });

  return (
    <section className="media-assets-region" aria-label="Project media">
      {props.assets.length === 0 ? (
        <div className="media-grid-empty">
          <DsIcon name="upload-simple" size={32} />
          <p className="label-s-semibold">Drop files here to start, or click Upload.</p>
          <button className="media-primary-button label-s-semibold" type="button" onClick={props.onUpload}>
            <DsIcon name="plus" size={16} />
            Upload
          </button>
        </div>
      ) : props.viewMode === "card" ? (
        <div className="media-card-grid">
          {props.assets.map((asset) => <MediaAssetCard key={asset.id} {...assetProps(asset)} />)}
        </div>
      ) : (
        <div className="media-list-scroll">
          <table className="media-list-table">
            <thead>
              <tr>
                <th aria-label="Thumbnail" />
                <th>Filename</th>
                <th>Kind</th>
                <th>Uploaded</th>
                <th>Size</th>
                <th>Duration</th>
                <th>Owner</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.assets.map((asset) => <MediaAssetRow key={asset.id} {...assetProps(asset)} />)}
            </tbody>
          </table>
        </div>
      )}
      {props.selectedAssetIds.size > 0 ? (
        <div className="media-selection-bar" aria-label={`${props.selectedAssetIds.size} files selected`}>
          <span className="label-s-semibold">{props.selectedAssetIds.size} selected</span>
          <button type="button" onClick={props.onBatchDownload}><DsIcon name="download" size={16} />Download</button>
          <button type="button" onClick={props.onBatchMove}><DsIcon name="folder" size={16} />Move to folder</button>
          <button type="button" onClick={props.onBatchDelete}><DsIcon name="trash" size={16} />Delete</button>
          <button type="button" onClick={props.onDeselectAll}>Deselect all</button>
        </div>
      ) : null}
    </section>
  );
}
