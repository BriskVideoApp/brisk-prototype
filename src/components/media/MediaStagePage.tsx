"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import type { Project } from "@/components/active-videos/types";
import { DsIcon } from "@/components/video-review/DsIcon";
import { mediaAssets, mediaFolders, mediaTranscriptNotes, type MediaAsset, type MediaFolder } from "@/data/media";
import { MediaAssetGrid } from "./MediaAssetGrid";
import { MediaFilterBar, type MediaSort, type MediaTypeFilter, type MediaViewMode } from "./MediaFilterBar";
import { MediaFolderTree } from "./MediaFolderTree";
import { MediaInspector, type MediaInspectorTab } from "./MediaInspector";
import { MediaUploadDropZone } from "./MediaUploadDropZone";

export function MediaStagePage({ project }: { project: Project }) {
  const [assets, setAssets] = useState(() => mediaAssets.filter((asset) => asset.projectId === project.id));
  const [folders, setFolders] = useState(() => mediaFolders.filter((folder) => folder.projectId === project.id));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [viewMode, setViewMode] = useState<MediaViewMode>("card");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [query, setQuery] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [lastSelectedAssetId, setLastSelectedAssetId] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<MediaInspectorTab>("details");
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteAssetIds, setDeleteAssetIds] = useState<string[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  const descendantFolderIds = useMemo(() => getDescendantFolderIds(folders, selectedFolderId), [folders, selectedFolderId]);
  const visibleAssets = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return [...assets]
      .filter((asset) => selectedFolderId === null || descendantFolderIds.has(asset.folderId ?? ""))
      .filter((asset) => typeFilter === "all" || asset.kind === typeFilter)
      .filter((asset) => !normalisedQuery || asset.name.toLowerCase().includes(normalisedQuery))
      .sort((left, right) => compareAssets(left, right, sort));
  }, [assets, descendantFolderIds, query, selectedFolderId, sort, typeFilter]);
  const activeAsset = assets.find((asset) => asset.id === activeAssetId) ?? null;
  const selectedFolderName = folders.find((folder) => folder.id === selectedFolderId)?.name ?? "All media";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeAssetId) return;
      if (event.key === "Escape") {
        setActiveAssetId(null);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const activeIndex = visibleAssets.findIndex((asset) => asset.id === activeAssetId);
      if (activeIndex < 0) return;
      const offset = event.key === "ArrowLeft" ? -1 : 1;
      const nextAsset = visibleAssets[activeIndex + offset];
      if (nextAsset) setActiveAssetId(nextAsset.id);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAssetId, visibleAssets]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
  }, []);

  const showToast = (message: string, duration = 2600) => {
    setToast(message);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), duration);
  };

  const addFolder = (parentId: string | null) => {
    const folder: MediaFolder = {
      id: `folder-${Date.now()}`,
      projectId: project.id,
      parentId,
      name: `New folder ${folders.length + 1}`,
    };
    setFolders((current) => [...current, folder]);
    setSelectedFolderId(folder.id);
    return folder;
  };

  const moveFolder = (folderId: string, parentId: string | null) => {
    const descendants = getDescendantFolderIds(folders, folderId);
    if (parentId && descendants.has(parentId)) return;
    setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, parentId } : folder));
  };

  const deleteFolder = (folderId: string) => {
    const folderIds = getDescendantFolderIds(folders, folderId);
    setFolders((current) => current.filter((folder) => !folderIds.has(folder.id)));
    setAssets((current) => current.map((asset) => asset.folderId && folderIds.has(asset.folderId) ? { ...asset, folderId: null } : asset));
    if (selectedFolderId && folderIds.has(selectedFolderId)) setSelectedFolderId(null);
  };

  const activateAsset = (asset: MediaAsset, event: MouseEvent<HTMLElement>) => {
    const isRangeSelection = event.shiftKey && lastSelectedAssetId;
    const isToggleSelection = event.metaKey || event.ctrlKey;
    if (isRangeSelection) {
      const start = visibleAssets.findIndex((item) => item.id === lastSelectedAssetId);
      const end = visibleAssets.findIndex((item) => item.id === asset.id);
      const rangeIds = visibleAssets.slice(Math.min(start, end), Math.max(start, end) + 1).map((item) => item.id);
      setSelectedAssetIds(new Set(rangeIds));
      return;
    }
    if (isToggleSelection) {
      setSelectedAssetIds((current) => {
        const next = new Set(current);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      });
      setLastSelectedAssetId(asset.id);
      return;
    }
    setActiveAssetId(asset.id);
    setInspectorTab("details");
    setLastSelectedAssetId(asset.id);
  };

  const openInspectorTab = (asset: MediaAsset, tab: MediaInspectorTab) => {
    setActiveAssetId(asset.id);
    setInspectorTab(tab);
  };

  const shareAsset = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard?.writeText(`https://share.brisk.prototype/media/${asset.id}`);
    } catch {
      // Keep prototype feedback available when clipboard access is blocked.
    }
    showToast("Link copied. Anyone with project access can view this file.");
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const startedAt = Date.now();
    const uploadingAssets: MediaAsset[] = files.map((file, index) => ({
      id: `upload-${startedAt}-${index}`,
      projectId: project.id,
      folderId: selectedFolderId,
      name: file.name || `Uploaded-file-${index + 1}.mov`,
      kind: inferKind(file),
      status: "uploading",
      uploadedAt: new Date().toISOString(),
      sizeLabel: file.size ? formatFileSize(file.size) : "306.6 KB",
      durationLabel: file.type.startsWith("video/") || file.type.startsWith("audio/") ? "00:42" : undefined,
      ownerName: "Tom Evans",
      transcriptStatus: "none",
      commentCount: 0,
    }));
    setAssets((current) => [...uploadingAssets, ...current]);
    showToast("Uploading 3 of 12 · keep working, we'll finish in the background.", 4200);
    window.setTimeout(() => {
      const uploadedIds = new Set(uploadingAssets.map((asset) => asset.id));
      setAssets((current) => current.map((asset) => uploadedIds.has(asset.id) ? { ...asset, status: "ready" } : asset));
    }, 1500);
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDropZoneActive(true);
  };
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDropZoneActive(false);
    }
  };
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDropZoneActive(false);
    handleFiles(Array.from(event.dataTransfer.files));
  };

  const confirmDelete = () => {
    const deleting = new Set(deleteAssetIds);
    setAssets((current) => current.filter((asset) => !deleting.has(asset.id)));
    setSelectedAssetIds((current) => new Set([...current].filter((id) => !deleting.has(id))));
    if (activeAssetId && deleting.has(activeAssetId)) setActiveAssetId(null);
    setDeleteAssetIds([]);
    showToast("Moved to Trash. You can recover it for 30 days.");
  };

  return (
    <main className="media-stage-shell" onDragEnter={handleDragEnter} onDragOver={(event) => event.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <ProjectStageHeader project={project} activeStage="media" />
      <div className={`media-workspace ${isRailCollapsed ? "rail-collapsed" : ""} ${activeAsset ? "inspector-open" : ""}`}>
        <MediaFolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          collapsed={isRailCollapsed}
          onSelect={setSelectedFolderId}
          onAdd={addFolder}
          onRename={(folderId, name) => setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, name: name.trim() || folder.name } : folder))}
          onMove={moveFolder}
          onDelete={deleteFolder}
          onDownload={(folderId) => showToast(`Downloading ${folders.find((folder) => folder.id === folderId)?.name ?? "folder"}.`)}
          onToggleCollapsed={() => setIsRailCollapsed((current) => !current)}
        />
        <section className="media-main-area">
          <div className="media-main-actions">
            <div className="media-action-buttons">
              <button className="media-primary-button label-s-semibold" type="button" onClick={() => uploadInputRef.current?.click()}><DsIcon name="plus" size={16} />Upload</button>
              <button className="media-secondary-button label-s-semibold" type="button" onClick={() => addFolder(selectedFolderId)}><DsIcon name="folder-plus" size={16} />New folder</button>
              <button className="media-tertiary-button label-s-semibold" type="button" onClick={() => showToast("Preparing all media for download.")}><DsIcon name="download" size={16} />Download all</button>
              <input ref={uploadInputRef} className="sr-only" type="file" multiple onChange={(event) => handleFiles(Array.from(event.target.files ?? []))} />
            </div>
            <div className="media-storage-meter" aria-label="12.4 GB of 100 GB used">
              <div><span /></div>
              <span className="label-xs-semibold">12.4 GB of 100 GB</span>
            </div>
          </div>
          <MediaFilterBar
            typeFilter={typeFilter}
            viewMode={viewMode}
            sort={sort}
            query={query}
            onTypeFilterChange={setTypeFilter}
            onViewModeChange={setViewMode}
            onSortChange={setSort}
            onQueryChange={setQuery}
          />
          <MediaAssetGrid
            assets={visibleAssets}
            viewMode={viewMode}
            selectedAssetIds={selectedAssetIds}
            activeAssetId={activeAssetId}
            onActivate={activateAsset}
            onComment={(asset) => openInspectorTab(asset, "comments")}
            onTranscript={(asset) => openInspectorTab(asset, "transcript")}
            onShare={(asset) => void shareAsset(asset)}
            onDownload={(asset) => showToast(`Downloading ${asset.name}.`)}
            onDelete={(asset) => setDeleteAssetIds([asset.id])}
            onBatchDownload={() => showToast(`Downloading ${selectedAssetIds.size} files.`)}
            onBatchMove={() => {
              setAssets((current) => current.map((asset) => selectedAssetIds.has(asset.id) ? { ...asset, folderId: selectedFolderId } : asset));
              showToast(`Moved ${selectedAssetIds.size} files to ${selectedFolderName}.`);
            }}
            onBatchDelete={() => setDeleteAssetIds([...selectedAssetIds])}
            onDeselectAll={() => setSelectedAssetIds(new Set())}
            onUpload={() => uploadInputRef.current?.click()}
          />
        </section>
        {activeAsset ? (
          <MediaInspector
            asset={activeAsset}
            folders={folders}
            transcriptNotes={mediaTranscriptNotes.filter((note) => note.assetId === activeAsset.id)}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            onRename={(assetId, name) => setAssets((current) => current.map((asset) => asset.id === assetId ? { ...asset, name: name.trim() || asset.name } : asset))}
            onClose={() => setActiveAssetId(null)}
            onComment={(asset) => openInspectorTab(asset, "comments")}
            onTranscript={(asset) => openInspectorTab(asset, "transcript")}
            onShare={(asset) => void shareAsset(asset)}
            onDownload={(asset) => showToast(`Downloading ${asset.name}.`)}
            onDelete={(asset) => setDeleteAssetIds([asset.id])}
          />
        ) : null}
      </div>
      <footer className="media-stage-footer">
        <ShareActionRow context="media" userRole="Studio Staff" projectName={project.name} studioName="Brisk Studios" customerName="Avery Taylor" density="compact" />
      </footer>
      <MediaUploadDropZone active={isDropZoneActive} folderName={selectedFolderName} />
      {toast ? <div className="media-toast label-s-semibold" role="status">{toast}</div> : null}
      {deleteAssetIds.length > 0 ? (
        <div className="media-modal-backdrop" role="presentation">
          <div className="media-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="media-delete-title">
            <h2 id="media-delete-title">Delete this file?</h2>
            <p className="label-s">It&apos;ll sit in Trash for 30 days.</p>
            <div>
              <button className="media-secondary-button label-s-semibold" type="button" onClick={() => setDeleteAssetIds([])}>Cancel</button>
              <button className="media-danger-button label-s-semibold" type="button" onClick={confirmDelete}><DsIcon name="trash" size={16} />Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getDescendantFolderIds(folders: MediaFolder[], rootId: string | null) {
  const ids = new Set<string>();
  if (rootId === null) return ids;
  ids.add(rootId);
  let foundChild = true;
  while (foundChild) {
    foundChild = false;
    folders.forEach((folder) => {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        foundChild = true;
      }
    });
  }
  return ids;
}

function compareAssets(left: MediaAsset, right: MediaAsset, sort: MediaSort) {
  if (sort === "oldest") return left.uploadedAt.localeCompare(right.uploadedAt);
  if (sort === "name") return left.name.localeCompare(right.name);
  if (sort === "size") return parseFileSize(right.sizeLabel) - parseFileSize(left.sizeLabel);
  if (sort === "duration") return parseDuration(right.durationLabel) - parseDuration(left.durationLabel);
  return right.uploadedAt.localeCompare(left.uploadedAt);
}

function parseFileSize(label: string) {
  const value = Number.parseFloat(label);
  if (label.includes("GB")) return value * 1_000_000;
  if (label.includes("MB")) return value * 1_000;
  return value;
}

function parseDuration(label?: string) {
  if (!label) return 0;
  return label.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

function inferKind(file: File): MediaAsset["kind"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text")) return "document";
  return "other";
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(1)} KB`;
}
