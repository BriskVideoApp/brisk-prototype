import { useState, type DragEvent, type MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaFolder } from "@/data/media";

type MediaFolderTreeProps = {
  folders: MediaFolder[];
  selectedFolderId: string | null;
  collapsed: boolean;
  onSelect: (folderId: string | null) => void;
  onAdd: (parentId: string | null) => MediaFolder;
  onRename: (folderId: string, name: string) => void;
  onMove: (folderId: string, parentId: string | null) => void;
  onDelete: (folderId: string) => void;
  onDownload: (folderId: string) => void;
  onToggleCollapsed: () => void;
};

type FolderMenu = { folderId: string; x: number; y: number };

export function MediaFolderTree(props: MediaFolderTreeProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [menu, setMenu] = useState<FolderMenu | null>(null);

  const addFolder = () => {
    const folder = props.onAdd(props.selectedFolderId);
    setEditingFolderId(folder.id);
  };

  const showMenu = (event: MouseEvent, folderId: string) => {
    event.preventDefault();
    setMenu({ folderId, x: event.clientX, y: event.clientY });
  };

  const dropFolder = (event: DragEvent, parentId: string | null) => {
    event.preventDefault();
    if (draggingFolderId && draggingFolderId !== parentId) {
      props.onMove(draggingFolderId, parentId);
    }
    setDraggingFolderId(null);
  };

  if (props.collapsed) {
    return (
      <aside className="media-folder-rail is-collapsed" aria-label="Media folders">
        <button className="media-rail-collapse" type="button" aria-label="Expand folders" data-tooltip="Expand folders" onClick={props.onToggleCollapsed}>
          <DsIcon name="caret-right" size={18} />
        </button>
        <button className="media-all-collapsed is-selected" type="button" aria-label="All media" data-tooltip="All media" onClick={() => props.onSelect(null)}>
          <DsIcon name="folder-open" size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="media-folder-rail" aria-label="Media folders" onClick={() => setMenu(null)}>
      <div className="media-folder-heading">
        <span className="label-s-semibold">Folders</span>
        <div>
          <button className="media-icon-button" type="button" aria-label="Add folder" data-tooltip="Add folder" onClick={addFolder}>
            <DsIcon name="folder-plus" size={18} />
          </button>
          <button className="media-icon-button" type="button" aria-label="Collapse folders" data-tooltip="Collapse folders" onClick={props.onToggleCollapsed}>
            <DsIcon name="caret-left" size={18} />
          </button>
        </div>
      </div>
      <div className="media-folder-list" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropFolder(event, null)}>
        <button className={`media-folder-item ${props.selectedFolderId === null ? "is-selected" : ""}`} type="button" onClick={() => props.onSelect(null)}>
          <DsIcon name="folder-open" size={18} />
          <span className="label-s-semibold">All media</span>
        </button>
        {props.folders.length === 0 ? (
          <div className="media-folder-empty">
            <p className="label-s">Create a folder to organise your media, or just start uploading.</p>
            <button className="media-text-button label-s-semibold" type="button" onClick={addFolder}>
              <DsIcon name="folder-plus" size={16} />
              Add folder
            </button>
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
          />
        )}
      </div>
      {menu ? (
        <div className="media-folder-menu" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" role="menuitem" onClick={() => { setEditingFolderId(menu.folderId); setMenu(null); }}>Rename</button>
          <button type="button" role="menuitem" onClick={() => { props.onMove(menu.folderId, null); setMenu(null); }}>Move to top level</button>
          <button type="button" role="menuitem" onClick={() => { props.onDownload(menu.folderId); setMenu(null); }}>Download</button>
          <button type="button" role="menuitem" onClick={() => { props.onDelete(menu.folderId); setMenu(null); }}>Delete</button>
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
        <button
          className={`media-folder-item ${props.selectedFolderId === folder.id ? "is-selected" : ""}`}
          type="button"
          draggable
          style={{ paddingLeft: `calc(var(--brisk-space-m) + (var(--brisk-space-l) * ${depth}))` }}
          onClick={() => props.onSelect(folder.id)}
          onContextMenu={(event) => props.onContextMenu(event, folder.id)}
          onDragStart={() => props.onDragStart(folder.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.stopPropagation(); props.onDrop(event, folder.id); }}
        >
          <DsIcon name={props.selectedFolderId === folder.id ? "folder-open" : "folder"} size={18} />
          <span className="label-s">{folder.name}</span>
        </button>
      )}
      <FolderBranch {...props} parentId={folder.id} depth={depth + 1} />
    </div>
  ));
}
