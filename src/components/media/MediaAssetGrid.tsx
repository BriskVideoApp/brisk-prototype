import type { MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset, MediaFolder } from "@/data/media";
import { MediaAssetCard } from "./MediaAssetCard";
import { MediaAssetRow } from "./MediaAssetRow";
import type { MediaViewMode } from "./MediaFilterBar";

type MediaAssetGridProps = {
  assets: MediaAsset[];
  folders: MediaFolder[];
  folderPath: MediaFolder[];
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
  onFolderOpen: (folderId: string | null) => void;
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
      {props.folderPath.length > 0 ? (
        <nav className="media-folder-breadcrumb" aria-label="Current media folder">
          <button className="label-s-semibold" type="button" onClick={() => props.onFolderOpen(null)}>All media</button>
          {props.folderPath.map((folder, index) => (
            <span key={folder.id}>
              <DsIcon name="caret-right" size={16} />
              {index === props.folderPath.length - 1 ? (
                <strong className="label-s-semibold" aria-current="page">{folder.name}</strong>
              ) : (
                <button className="label-s-semibold" type="button" onClick={() => props.onFolderOpen(folder.id)}>{folder.name}</button>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      {props.assets.length === 0 && props.folders.length === 0 ? (
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
          {props.folders.map((folder) => (
            <button className="media-folder-card" type="button" key={folder.id} onClick={() => props.onFolderOpen(folder.id)}>
              <span className="media-folder-card-icon"><DsIcon name="folder-open" size={28} /></span>
              <span className="media-folder-card-copy">
                <strong className="label-s-semibold">{folder.name}</strong>
                <span className="label-xs">Folder</span>
              </span>
              <DsIcon name="caret-right" size={18} />
            </button>
          ))}
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
              {props.folders.map((folder) => (
                <tr
                  className="media-list-folder-row"
                  key={folder.id}
                  tabIndex={0}
                  onClick={() => props.onFolderOpen(folder.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      props.onFolderOpen(folder.id);
                    }
                  }}
                >
                  <td><span className="media-list-folder-icon"><DsIcon name="folder-open" size={20} /></span></td>
                  <td><span className="media-list-name label-s-semibold">{folder.name}</span></td>
                  <td className="label-s">Folder</td>
                  <td className="label-s">-</td>
                  <td className="label-s">-</td>
                  <td className="label-s">-</td>
                  <td className="label-s">-</td>
                  <td className="label-s">-</td>
                  <td><DsIcon name="caret-right" size={18} /></td>
                </tr>
              ))}
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
