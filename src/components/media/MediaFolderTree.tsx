import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect, type BriskActionContext, type BriskSelectOption } from "../../../Brisk DS/src/app/components/Select";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
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

type FolderMenu = BriskActionContext & { folderId: string };
type FolderAction = "rename" | "move" | "copy" | "delete";

export function MediaFolderTree(props: MediaFolderTreeProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [assetDropTargetId, setAssetDropTargetId] = useState<string | null>(null);
  const [menu, setMenu] = useState<FolderMenu | null>(null);
  const allMediaRef = useRef<HTMLButtonElement>(null);
  const menuOptions: BriskSelectOption<FolderAction>[] = [
    ...(props.canManage ? [{ value: "rename" as const, label: "Rename" }, { value: "move" as const, label: "Move to top level" }] : []),
    ...(props.canCopyLink ? [{ value: "copy" as const, label: "Copy folder link" }] : []),
    ...(props.canManage ? [{ value: "delete" as const, label: "Delete", tone: "danger" as const, dividerAbove: true }] : []),
  ];

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

  const showMenu = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, folderId: string) => {
    if (!props.canManage && !props.canCopyLink) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = event.currentTarget;
    const keyboard = "key" in event || (event.type === "click" && event.detail === 0);
    const rect = anchor.getBoundingClientRect();
    const point = "clientX" in event && !keyboard ? { x: event.clientX, y: event.clientY } : { x: rect.left, y: rect.bottom };
    setMenu({ folderId, anchor, fallbackFocus: allMediaRef.current, keyboard, ...point });
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
          <button ref={allMediaRef} className={`media-folder-item ${props.selectedFolderId === null ? "is-selected" : ""} ${assetDropTargetId === "__root__" ? "is-drop-target" : ""}`} type="button" onClick={() => props.onSelect(null)} onDragEnter={(event) => showAssetDropTarget(event, "__root__")} onDragOver={(event) => { if (props.canMoveAssets) event.preventDefault(); }} onDragLeave={(event) => clearAssetDropTarget(event, "__root__")} onDrop={(event) => dropFolder(event, null)}>
            <DsIcon name="folder-open" size={18} />
            <span className="label-s-semibold">All media</span>
          </button>
        </div>
        {props.folders.length === 0 ? (
          <div className="media-folder-empty">
            <p className="label-s">Create a folder to organise your media, or just start uploading.</p>
            {props.canManage ? <Button size="S" variant="ghost" className="media-text-button" type="button" onClick={addFolder}>
              <DsIcon name="folder-plus" size={16} />
              Add folder
            </Button> : null}
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
            openMenuFolderId={menu?.folderId ?? null}
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
      {menu && menuOptions.length > 0 ? <BriskSelect<FolderAction>
        mode="action"
        ariaLabel="Folder actions"
        placeholder="Folder actions"
        value=""
        clearable={false}
        open
        actionContext={menu}
        options={menuOptions}
        onOpenChange={(open) => { if (!open) setMenu(null); }}
        onChange={(action) => {
          if (action === "rename" && props.canManage) setEditingFolderId(menu.folderId);
          else if (action === "move" && props.canManage) props.onMove(menu.folderId, null);
          else if (action === "copy" && props.canCopyLink) props.onCopyLink(menu.folderId);
          else if (action === "delete" && props.canManage) props.onDelete(menu.folderId);
        }}
      /> : null}
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
  onContextMenu: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, folderId: string) => void;
  openMenuFolderId: string | null;
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
            onKeyDown={(event) => {
              if (props.canOpenMenu && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) props.onContextMenu(event, folder.id);
            }}
            onDragStart={() => props.canManage && props.onDragStart(folder.id)}
            onDragEnter={(event) => props.onAssetDragEnter(event, folder.id)}
            onDragOver={(event) => { if (props.canManage || props.canMoveAssets) event.preventDefault(); }}
            onDragLeave={(event) => props.onAssetDragLeave(event, folder.id)}
            onDrop={(event) => { if (props.canManage || props.canMoveAssets) { event.stopPropagation(); props.onDrop(event, folder.id); } }}
          >
            <DsIcon name={props.selectedFolderId === folder.id ? "folder-open" : "folder"} size={18} />
            <span className="label-s">{folder.name}</span>
          </button>
          {props.canOpenMenu ? <button className="media-folder-more" type="button" aria-label={`More options for ${folder.name}`} aria-haspopup="menu" aria-expanded={props.openMenuFolderId === folder.id} data-tooltip="Folder options" onClick={(event) => props.onContextMenu(event, folder.id)} onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "ContextMenu"].includes(event.key) || (event.shiftKey && event.key === "F10")) props.onContextMenu(event, folder.id);
          }}><DsIcon name="dots-three" size={16} /></button> : null}
        </div>
      )}
      <FolderBranch {...props} parentId={folder.id} depth={depth + 1} />
    </div>
  ));
}
