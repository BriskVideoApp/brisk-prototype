import { useEffect, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaFolder } from "@/data/media";

type MediaFolderTreeProps = {
  folders: MediaFolder[];
  selectedFolderId: string | null;
  collapsed: boolean;
  canManage: boolean;
  canMoveAssets: boolean;
  canCopyLink: boolean;
  canCollapse?: boolean;
  storageUsage?: ReactNode;
  onSelect: (folderId: string | null) => void;
  onAdd: (parentId: string | null) => MediaFolder | null;
  onRename: (folderId: string, name: string) => void;
  onMove: (folderId: string, parentId: string | null) => void;
  onDelete: (folderId: string) => void;
  onCopyLink: (folderId: string) => void;
  onMoveAssetsToFolder: (assetIds: string[], folderId: string | null) => void;
  onToggleCollapsed: () => void;
};

type FolderMenu = { folderId: string; x: number; y: number };

export function MediaFolderTree(props: MediaFolderTreeProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [assetDropTargetId, setAssetDropTargetId] = useState<string | null>(null);
  const [menu, setMenu] = useState<FolderMenu | null>(null);

  const addFolder = () => {
    const folder = props.onAdd(props.selectedFolderId);
    if (folder) setEditingFolderId(folder.id);
  };

  useEffect(() => {
    const clearAssetDropTarget = () => setAssetDropTargetId(null);
    window.addEventListener("dragend", clearAssetDropTarget);
    window.addEventListener("drop", clearAssetDropTarget);
    return () => {
      window.removeEventListener("dragend", clearAssetDropTarget);
      window.removeEventListener("drop", clearAssetDropTarget);
    };
  }, []);

  const showMenu = (event: MouseEvent, folderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ folderId, x: event.clientX, y: event.clientY });
  };

  const dropFolder = (event: DragEvent, parentId: string | null) => {
    event.preventDefault();
    const assetData = event.dataTransfer.getData("application/x-brisk-media-asset-ids");
    if (assetData && props.canMoveAssets) {
      try {
        const assetIds: unknown = JSON.parse(assetData);
        if (Array.isArray(assetIds) && assetIds.every((id) => typeof id === "string")) props.onMoveAssetsToFolder(assetIds, parentId);
      } catch {
        // Ignore malformed drag data in the prototype.
      }
      setDraggingFolderId(null);
      setAssetDropTargetId(null);
      return;
    }
    if (draggingFolderId && draggingFolderId !== parentId) {
      props.onMove(draggingFolderId, parentId);
    }
    setDraggingFolderId(null);
    setAssetDropTargetId(null);
  };

  const showAssetDropTarget = (event: DragEvent, folderId: string) => {
    if (props.canMoveAssets && event.dataTransfer.types.includes("application/x-brisk-media-asset-ids")) setAssetDropTargetId(folderId);
  };

  const clearAssetDropTarget = (event: DragEvent<HTMLElement>, folderId: string) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && assetDropTargetId === folderId) setAssetDropTargetId(null);
  };
  if (props.collapsed) {
    return (
      <aside className="media-folder-rail is-collapsed" aria-label="Media folders">
        <button className="media-rail-collapse" type="button" aria-label="Expand folders" aria-describedby="media-expand-folders-tooltip" onClick={props.onToggleCollapsed}>
          <DsIcon name="caret-right" size={18} />
          <span className="media-rail-tooltip" id="media-expand-folders-tooltip" role="tooltip">Expand folders</span>
        </button>
        <button className="media-all-collapsed is-selected" type="button" aria-label="All media" aria-describedby="media-all-tooltip" onClick={() => props.onSelect(null)}>
          <DsIcon name="folder-open" size={20} />
          <span className="media-rail-tooltip" id="media-all-tooltip" role="tooltip">All media</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="media-folder-rail" aria-label="Media folders" onClick={() => setMenu(null)}>
      <div className="media-folder-heading">
        <span className="label-s-semibold">Folders</span>
        <div>
          {props.canManage ? <button className="media-icon-button" type="button" aria-label="Add folder" data-tooltip="Add folder" onClick={addFolder}>
            <DsIcon name="folder-plus" size={18} />
          </button> : null}
          {props.canCollapse !== false ? <button className="media-icon-button" type="button" aria-label="Collapse folders" data-tooltip="Collapse folders" onClick={props.onToggleCollapsed}>
            <DsIcon name="caret-left" size={18} />
          </button> : null}
        </div>
      </div>
      <div className="media-folder-list">
        <div className="media-all-folder-section">
          <button className={`media-folder-item ${props.selectedFolderId === null ? "is-selected" : ""} ${assetDropTargetId === "__root__" ? "is-drop-target" : ""}`} type="button" onClick={() => props.onSelect(null)} onDragEnter={(event) => showAssetDropTarget(event, "__root__")} onDragOver={(event) => { if (props.canMoveAssets) event.preventDefault(); }} onDragLeave={(event) => clearAssetDropTarget(event, "__root__")} onDrop={(event) => dropFolder(event, null)}>
            <DsIcon name="folder-open" size={18} />
            <span className="label-s-semibold">All media</span>
          </button>
        </div>
        {props.folders.length === 0 ? (
          <div className="media-folder-empty">
            <p className="label-s">Create a folder to organise your media, or just start uploading.</p>
            {props.canManage ? <button className="media-text-button label-s-semibold" type="button" onClick={addFolder}>
              <DsIcon name="folder-plus" size={16} />
              Add folder
            </button> : null}
          </div>
        ) : (
          <FolderBranch
            folders={props.folders}
            parentId={null}
            selectedFolderId={props.selectedFolderId}
            editingFolderId={editingFolderId}
            onSelect={props.onSelect}
            onRename={(folderId, name) => { props.onRename(folderId, name); setEditingFolderId(null); }}
            onContextMenu={showMenu}
            onDragStart={setDraggingFolderId}
            onDrop={dropFolder}
            assetDropTargetId={assetDropTargetId}
            onAssetDragEnter={showAssetDropTarget}
            onAssetDragLeave={clearAssetDropTarget}
            canManage={props.canManage}
            canMoveAssets={props.canMoveAssets}
            canOpenMenu={props.canManage || props.canCopyLink}
          />
        )}
      </div>
      {props.storageUsage ? <div className="media-folder-storage">{props.storageUsage}</div> : null}
      {menu && (props.canManage || props.canCopyLink) ? (
        <div className="media-folder-menu" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
          {props.canManage ? <button type="button" role="menuitem" onClick={() => { setEditingFolderId(menu.folderId); setMenu(null); }}>Rename</button> : null}
          {props.canManage ? <button type="button" role="menuitem" onClick={() => { props.onMove(menu.folderId, null); setMenu(null); }}>Move to top level</button> : null}
          {props.canCopyLink ? <button type="button" role="menuitem" onClick={() => { props.onCopyLink(menu.folderId); setMenu(null); }}>Copy folder link</button> : null}
          {props.canManage ? <button type="button" role="menuitem" onClick={() => { props.onDelete(menu.folderId); setMenu(null); }}>Delete</button> : null}
        </div>
      ) : null}
    </aside>
  );
}

type FolderBranchProps = {
  folders: MediaFolder[];
  parentId: string | null;
  selectedFolderId: string | null;
  editingFolderId: string | null;
  depth?: number;
  onSelect: (folderId: string) => void;
  onRename: (folderId: string, name: string) => void;
  onContextMenu: (event: MouseEvent, folderId: string) => void;
  onDragStart: (folderId: string) => void;
  onDrop: (event: DragEvent, parentId: string) => void;
  assetDropTargetId: string | null;
  onAssetDragEnter: (event: DragEvent, folderId: string) => void;
  onAssetDragLeave: (event: DragEvent<HTMLElement>, folderId: string) => void;
  canManage: boolean;
  canMoveAssets: boolean;
  canOpenMenu: boolean;
};

function FolderBranch(props: FolderBranchProps) {
  const depth = props.depth ?? 0;
  return props.folders.filter((folder) => folder.parentId === props.parentId).map((folder) => (
    <div key={folder.id} className="media-folder-branch">
      {props.editingFolderId === folder.id ? (
        <input
          className="media-folder-rename label-s"
          autoFocus
          defaultValue={folder.name}
          style={{ marginLeft: `calc(var(--brisk-space-l) * ${depth})` }}
          onBlur={(event) => props.onRename(folder.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      ) : (
        <div className={`media-folder-item-row ${props.selectedFolderId === folder.id ? "is-selected" : ""} ${props.assetDropTargetId === folder.id ? "is-drop-target" : ""}`}>
          <button
            className={`media-folder-item ${props.selectedFolderId === folder.id ? "is-selected" : ""}`}
            type="button"
            draggable={props.canManage}
            style={{ paddingLeft: `calc(var(--brisk-space-m) + (var(--brisk-space-l) * ${depth}))` }}
            onClick={() => props.onSelect(folder.id)}
            onContextMenu={(event) => props.canOpenMenu && props.onContextMenu(event, folder.id)}
            onDragStart={() => props.canManage && props.onDragStart(folder.id)}
            onDragEnter={(event) => props.onAssetDragEnter(event, folder.id)}
            onDragOver={(event) => { if (props.canManage || props.canMoveAssets) event.preventDefault(); }}
            onDragLeave={(event) => props.onAssetDragLeave(event, folder.id)}
            onDrop={(event) => { if (props.canManage || props.canMoveAssets) { event.stopPropagation(); props.onDrop(event, folder.id); } }}
          >
            <DsIcon name={props.selectedFolderId === folder.id ? "folder-open" : "folder"} size={18} />
            <span className="label-s">{folder.name}</span>
          </button>
          {props.canOpenMenu ? <button className="media-folder-more" type="button" aria-label={`More options for ${folder.name}`} data-tooltip="Folder options" onClick={(event) => props.onContextMenu(event, folder.id)}><DsIcon name="dots-three" size={16} /></button> : null}
        </div>
      )}
      <FolderBranch {...props} parentId={folder.id} depth={depth + 1} />
    </div>
  ));
}
