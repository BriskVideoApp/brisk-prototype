import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetView, MediaFolder, MediaStorageLocation } from "@/data/media";

export function MediaMoveDialog({ assets, folders, onClose, onMove }: { assets: MediaAssetView[]; folders: MediaFolder[]; onClose: () => void; onMove: (folderId: string | null) => void }) {
  const [firstAsset] = assets;
  const currentFolderId = assets.every((asset) => asset.folderId === firstAsset?.folderId) ? firstAsset?.folderId ?? "__root__" : "__root__";
  const [destinationId, setDestinationId] = useState(currentFolderId);

  return (
    <div className="media-modal-backdrop" role="presentation">
      <section className="media-action-dialog" role="dialog" aria-modal="true" aria-labelledby="media-move-dialog-title">
        <header className="media-action-dialog-header">
          <div><span className="label-xs-semibold">Move media</span><h2 className="headings-xs-bold" id="media-move-dialog-title">Choose a Brisk folder</h2></div>
          <button className="media-icon-button" type="button" aria-label="Close move dialog" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button>
        </header>
        <div className="media-action-dialog-body">
          <p className="paragraph-s">Moving {assets.length} {assets.length === 1 ? "file" : "files"} changes only Brisk organisation. The original source location will not change.</p>
          <label className="media-action-dialog-field">
            <span className="label-xs-semibold">Destination</span>
            <BriskSelect
              ariaLabel="Choose destination folder"
              clearable={false}
              options={[{ value: "__root__", label: "All media", icon: "folder-open" }, ...folders.map((folder) => ({ value: folder.id, label: folder.name, icon: "folder" as const }))]}
              placeholder="Choose folder"
              searchable={false}
              value={destinationId}
              onChange={(value) => { if (value) setDestinationId(value); }}
            />
          </label>
        </div>
        <footer className="media-action-dialog-footer"><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><Button size="M" variant="primary" onClick={() => onMove(destinationId === "__root__" ? null : destinationId)}>Move</Button></footer>
      </section>
    </div>
  );
}

export function MediaDeleteDialog({ assets, storageLocations, onClose, onConfirm }: { assets: MediaAssetView[]; storageLocations: MediaStorageLocation[]; onClose: () => void; onConfirm: () => void }) {
  const locationById = new Map(storageLocations.map((location) => [location.id, location]));
  const providers = new Set(assets.map((asset) => locationById.get(asset.storageLocationId)?.provider ?? "brisk-storage"));
  const deletesOriginal = providers.has("brisk-storage");
  const leavesConnectedOriginal = providers.has("google-drive") || providers.has("dropbox") || providers.has("remote-studio");

  return (
    <div className="media-modal-backdrop" role="presentation">
      <section className="media-action-dialog" role="alertdialog" aria-modal="true" aria-labelledby="media-delete-dialog-title" aria-describedby="media-delete-dialog-copy">
        <header className="media-action-dialog-header">
          <div><span className="label-xs-semibold">Permanent deletion</span><h2 className="headings-xs-bold" id="media-delete-dialog-title">Remove {assets.length === 1 ? "this file" : `${assets.length} files`} from Brisk?</h2></div>
          <button className="media-icon-button" type="button" aria-label="Close delete confirmation" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button>
        </header>
        <div className="media-action-dialog-body" id="media-delete-dialog-copy">
          <p className="paragraph-s">The Brisk media record and playback asset will be permanently deleted.</p>
          {deletesOriginal ? <p className="media-delete-impact label-s"><DsIcon name="alert-triangle" size={16} /><span><strong>Brisk Storage:</strong> the original in Brisk-managed storage will also be permanently deleted.</span></p> : null}
          {leavesConnectedOriginal ? <p className="media-delete-impact label-s"><DsIcon name="info" size={16} /><span><strong>Connected storage or Remote Studio:</strong> the original will remain untouched.</span></p> : null}
        </div>
        <footer className="media-action-dialog-footer"><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><button className="media-danger-button label-m-semibold" type="button" onClick={onConfirm}>Delete permanently</button></footer>
      </section>
    </div>
  );
}
