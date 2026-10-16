import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
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
    <> <EditingDialog title={<>Choose a Brisk folder</>} onCancel={onClose} size="standard" actions={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button> <Button size="S" variant="primary" onClick={() => onMove(destinationId === "__root__" ? null : destinationId)}>Move</Button></>}>  <div className="media-move-fields">
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
        </div>  </EditingDialog> </>
  );
}

export function MediaArchiveDialog({ assets, onClose, onConfirm }: { assets: MediaAssetView[]; onClose: () => void; onConfirm: () => void }) {
  return <ConfirmationDialog title={`Archive ${assets.length === 1 ? "this file" : `${assets.length} files`}?`} description={`Moves ${assets.length === 1 ? "it" : "them"} to Archived and removes ${assets.length === 1 ? "it" : "them"} from this project.`} confirmLabel="Archive" onCancel={onClose} onConfirm={onConfirm}>
    <p>{assets.length === 1 ? "Original stays" : "Originals stay"} untouched. You can restore {assets.length === 1 ? "it" : "them"} at any time.</p>
  </ConfirmationDialog>;
}

export function MediaDeleteDialog({ assets, storageLocations, onClose, onConfirm }: { assets: MediaAssetView[]; storageLocations: MediaStorageLocation[]; onClose: () => void; onConfirm: () => void }) {
  const locationById = new Map(storageLocations.map((location) => [location.id, location]));
  const providers = new Set(assets.map((asset) => locationById.get(asset.storageLocationId)?.provider ?? "brisk-storage"));
  const deletesOriginal = providers.has("brisk-storage");
  const leavesConnectedOriginal = providers.has("google-drive") || providers.has("dropbox") || providers.has("remote-studio");
  return <ConfirmationDialog title={`Delete ${assets.length === 1 ? "this file" : `${assets.length} files`}?`} description={`This permanently deletes ${assets.length === 1 ? "the file" : "these files"} from Brisk.`} tone="danger" confirmLabel={`Delete ${assets.length === 1 ? "file" : "files"}`} onCancel={onClose} onConfirm={onConfirm}>
    {deletesOriginal ? <p><strong>Brisk Storage:</strong> the original is also deleted.</p> : null}
    {leavesConnectedOriginal ? <p><strong>Connected storage:</strong> the original stays there.</p> : null}
  </ConfirmationDialog>;
}
