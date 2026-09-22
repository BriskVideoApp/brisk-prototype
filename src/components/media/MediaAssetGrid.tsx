import { useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetView, MediaFolder } from "@/data/media";
import type { MediaCapabilities } from "@/lib/media";
import { MediaAssetCard } from "./MediaAssetCard";
import { MediaAssetRow } from "./MediaAssetRow";
import type { MediaViewMode } from "./MediaFilterBar";

type MediaAssetGridProps = {
  assets: MediaAssetView[];
  capabilities: MediaCapabilities;
  folders: MediaFolder[];
  folderPath: MediaFolder[];
  viewMode: MediaViewMode;
  selectedAssetIds: Set<string>;
  activeAssetId: string | null;
  onActivate: (asset: MediaAssetView, event: MouseEvent<HTMLElement>) => void;
  onComment: (asset: MediaAssetView) => void;
  onTranscript: (asset: MediaAssetView) => void;
  onShare: (asset: MediaAssetView) => void;
  onDownload: (asset: MediaAssetView) => void;
  onDelete: (asset: MediaAssetView) => void;
  onArchive: (asset: MediaAssetView) => void;
  onRestore: (asset: MediaAssetView) => void;
  onRetry: (asset: MediaAssetView) => void;
  onBatchDownload: () => void;
  onBatchMove: () => void;
  onBatchArchive: () => void;
  onBatchDelete: () => void;
  onDeselectAll: () => void;
  onToggleSelect: (asset: MediaAssetView) => void;
  onMoveAssetsToFolder: (assetIds: string[], folderId: string | null) => void;
  emptyUploadAction?: ReactNode;
  emptyKind: "project" | "folder" | "filtered";
  onClearControls: () => void;
  onFolderOpen: (folderId: string | null) => void;
};

export function MediaAssetGrid(props: MediaAssetGridProps) {
  const [draggedAssetCount, setDraggedAssetCount] = useState(0);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const selectedAssets = props.assets.filter((asset) => props.selectedAssetIds.has(asset.id));
  const hasDownloadableSelection = selectedAssets.some((asset) => asset.originalAvailable);
  const assetProps = (asset: MediaAssetView) => ({
    asset,
    isActive: props.activeAssetId === asset.id,
    isSelected: props.selectedAssetIds.has(asset.id),
    onActivate: props.onActivate,
    onComment: props.onComment,
    onTranscript: props.onTranscript,
    onShare: props.onShare,
    onDownload: props.onDownload,
    onDelete: props.onDelete,
    onArchive: props.onArchive,
    onRestore: props.onRestore,
    onRetry: props.onRetry,
    capabilities: props.capabilities,
    onToggleSelect: props.onToggleSelect,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      if (!props.capabilities.canMoveAssets) return;
      const assetIds = props.selectedAssetIds.has(asset.id) ? [...props.selectedAssetIds] : [asset.id];
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-brisk-media-asset-ids", JSON.stringify(assetIds));
      event.dataTransfer.setData("text/plain", assetIds.join(","));
      setMediaDragPreview(event, asset.name, assetIds.length);
      setDraggedAssetCount(assetIds.length);
    },
    onDragEnd: () => { setDraggedAssetCount(0); setDropTargetFolderId(null); },
  });

  const moveDroppedAssets = (event: DragEvent<HTMLElement>, folderId: string | null) => {
    const value = event.dataTransfer.getData("application/x-brisk-media-asset-ids");
    if (!value) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      const assetIds: unknown = JSON.parse(value);
      if (Array.isArray(assetIds) && assetIds.every((id) => typeof id === "string")) props.onMoveAssetsToFolder(assetIds, folderId);
    } catch {
      // Ignore malformed drag data in the prototype.
    }
    setDraggedAssetCount(0);
    setDropTargetFolderId(null);
  };

  const clearDropTarget = (event: DragEvent<HTMLElement>, folderId: string) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropTargetFolderId === folderId) setDropTargetFolderId(null);
  };

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
      {props.selectedAssetIds.size > 0 ? (
        <div className="media-selection-toolbar" aria-label={`${props.selectedAssetIds.size} files selected`}>
          <div className="media-selection-summary">
            <span className="label-s-semibold">{props.selectedAssetIds.size} selected</span>
            <button className="media-selection-clear" type="button" aria-label="Clear selection" data-tooltip="Clear selection" onClick={props.onDeselectAll}><DsIcon name="x-close-cross" size={16} /></button>
          </div>
          <div className="media-selection-actions">
            {props.capabilities.canMoveAssets ? <button className="is-primary" type="button" onClick={props.onBatchMove}><DsIcon name="folder" size={16} />Move to folder</button> : null}
            {props.capabilities.canDownload ? <button type="button" disabled={!hasDownloadableSelection} onClick={props.onBatchDownload}><DsIcon name="download" size={16} />Download</button> : null}
            {props.capabilities.canArchive ? <button type="button" onClick={props.onBatchArchive}><DsIcon name="folder" size={16} />Archive</button> : null}
            {props.capabilities.canDelete ? <button className="is-danger" type="button" onClick={props.onBatchDelete}><DsIcon name="trash" size={16} />Delete</button> : null}
          </div>
        </div>
      ) : null}
      {props.assets.length === 0 && props.folders.length === 0 ? (
        <div className="media-grid-empty">
          <span className="media-grid-empty-icon" aria-hidden="true"><DsIcon name={props.emptyKind === "filtered" ? "search" : "upload-simple"} size={28} /></span>
          <h2 className="headings-xs-bold">
            {props.emptyKind === "filtered" ? "No media matches these controls" : props.emptyKind === "folder" ? "This folder is empty" : "No media yet"}
          </h2>
          <p className="paragraph-s">
            {props.emptyKind === "filtered"
              ? "Try another filename or clear the media filters."
              : props.emptyKind === "folder"
                ? "Upload files here or move existing media into this folder."
                : "Upload files from your computer or import them from connected storage."}
          </p>
          {props.emptyKind === "filtered" ? (
            <button className="media-secondary-button label-s-semibold" type="button" onClick={props.onClearControls}>Clear controls</button>
          ) : props.capabilities.canUpload ? props.emptyUploadAction : null}
        </div>
      ) : props.viewMode === "card" ? (
        <div className="media-card-grid">
          {props.folders.map((folder) => (
            <button className={`media-folder-card ${dropTargetFolderId === folder.id ? "is-drop-target" : ""}`} type="button" key={folder.id} onClick={() => props.onFolderOpen(folder.id)} onDragEnter={() => { if (props.capabilities.canMoveAssets && draggedAssetCount) setDropTargetFolderId(folder.id); }} onDragOver={(event) => { if (props.capabilities.canMoveAssets) event.preventDefault(); }} onDragLeave={(event) => clearDropTarget(event, folder.id)} onDrop={(event) => moveDroppedAssets(event, folder.id)}>
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
                <th aria-label="Select" />
                <th aria-label="Thumbnail" />
                <th>Filename</th>
                <th>Kind</th>
                <th>Uploaded</th>
                <th>Size</th>
                <th>Duration</th>
                <th>Owner</th>
                <th>Transcript</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.folders.map((folder) => (
                <tr
                  className={`media-list-folder-row ${dropTargetFolderId === folder.id ? "is-drop-target" : ""}`}
                  key={folder.id}
                  tabIndex={0}
                  onClick={() => props.onFolderOpen(folder.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      props.onFolderOpen(folder.id);
                    }
                  }}
                  onDragEnter={() => { if (props.capabilities.canMoveAssets && draggedAssetCount) setDropTargetFolderId(folder.id); }}
                  onDragOver={(event) => { if (props.capabilities.canMoveAssets) event.preventDefault(); }}
                  onDragLeave={(event) => clearDropTarget(event, folder.id)}
                  onDrop={(event) => moveDroppedAssets(event, folder.id)}
                >
                  <td />
                  <td><span className="media-list-folder-icon"><DsIcon name="folder-open" size={20} /></span></td>
                  <td><span className="media-list-name label-s-semibold">{folder.name}</span></td>
                  <td className="label-s">Folder</td>
                  <td className="label-s">-</td>
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
    </section>
  );
}

function setMediaDragPreview(event: DragEvent<HTMLElement>, assetName: string, count: number) {
  const preview = document.createElement("div");
  preview.className = "media-drag-preview";

  const label = document.createElement("span");
  label.className = "media-drag-preview-label label-s-semibold";
  label.textContent = count === 1 ? assetName : `${count} files`;

  const badge = document.createElement("span");
  badge.className = "media-drag-preview-count label-xs-semibold";
  badge.textContent = String(count);

  preview.append(label, badge);
  document.body.append(preview);
  event.dataTransfer.setDragImage(preview, 20, 20);
  window.requestAnimationFrame(() => preview.remove());
}
