"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { getRoleHome } from "@/components/navigation/navigationConfig";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mediaCloudFiles, mediaStorageLocations, mediaStorageOptions, mediaStoragePlans, mediaTranscriptNotes, type MediaAssetView, type MediaCloudFile, type MediaCloudProvider, type MediaCollection, type MediaFolder, type MediaKind } from "@/data/media";
import { compareMediaAssets, getMediaCapabilities, getMediaProjectsForRole } from "@/lib/media";
import { MediaAssetDrawer, type MediaAssetDrawerTab } from "./MediaAssetDrawer";
import { MediaDeleteDialog, MediaMoveDialog } from "./MediaActionDialogs";
import { MediaAssetGrid } from "./MediaAssetGrid";
import { MediaCloudPicker } from "./MediaCloudPicker";
import { MediaFilterBar, type MediaSort, type MediaTypeFilter, type MediaViewMode } from "./MediaFilterBar";
import { MediaFolderTree } from "./MediaFolderTree";
import { useMediaLibrary } from "./MediaLibraryContext";
import { MediaUploadMenu } from "./MediaUploadMenu";
import { MediaUploadDropZone } from "./MediaUploadDropZone";
import { MediaUploadProgress } from "./MediaUploadProgress";
import { StorageUsageMeter } from "./StorageUsageMeter";

type GlobalTab = "media" | "masters" | "archived";
type MediaBrowserProps = { scope: "project" | "global"; project?: Project; initialProjectId?: string | null; initialFolderId?: string | null; initialAssetId?: string | null };
export function MediaBrowser({ scope, project, initialProjectId = null, initialFolderId = null, initialAssetId = null }: MediaBrowserProps) {
  const router = useRouter();
  const { selectedRole, allPages } = usePrototypeRole();
  const library = useMediaLibrary();
  const linkedAsset = library.assetViews.find((asset) => asset.id === initialAssetId && (!project || asset.projectId === project.id));
  const accessibleProjects = useMemo(() => getMediaProjectsForRole(selectedRole, activeVideoProjects, allPages), [allPages, selectedRole]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(project?.id ?? linkedAsset?.projectId ?? initialProjectId);
  const activeProjectId = project?.id ?? selectedProjectId;
  const [tab, setTab] = useState<GlobalTab>(linkedAsset?.archivedAt ? "archived" : linkedAsset?.collection === "masters" ? "masters" : "media");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId ?? (!linkedAsset?.archivedAt ? linkedAsset?.folderId ?? null : null));
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [viewMode, setViewMode] = useState<MediaViewMode>("card");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [query, setQuery] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [activeAssetId, setActiveAssetId] = useState<string | null>(linkedAsset?.id ?? null);
  const [drawerTab, setDrawerTab] = useState<MediaAssetDrawerTab>("details");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<MediaCloudProvider | null>(null);
  const [toast, setToast] = useState("");
  const [trackedUploadIds, setTrackedUploadIds] = useState<string[]>([]);
  const [moveAssetIds, setMoveAssetIds] = useState<string[] | null>(null);
  const [deleteAssetIds, setDeleteAssetIds] = useState<string[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSelectedAssetIdRef = useRef<string | null>(null);
  const dragDepthRef = useRef(0);
  const projectIds = useMemo(() => new Set(accessibleProjects.map((item) => item.id)), [accessibleProjects]);
  useEffect(() => {
    if (scope === "project" && project && !projectIds.has(project.id)) router.replace(getRoleHome(selectedRole));
  }, [project, projectIds, router, scope, selectedRole]);
  const capabilities = getMediaCapabilities(selectedRole, activeProjectId, activeVideoProjects, allPages);
  const browserCapabilities = { ...capabilities, canUpload: scope === "project" && capabilities.canUpload };
  const folders = library.folders.filter((folder) => folder.projectId === activeProjectId);
  const collection: MediaCollection = tab === "masters" ? "masters" : "media";
  const visibleAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return library.assetViews
      .filter((asset) => projectIds.has(asset.projectId))
      .filter((asset) => !activeProjectId || asset.projectId === activeProjectId)
      .filter((asset) => tab === "archived" ? Boolean(asset.archivedAt) : !asset.archivedAt && asset.collection === collection)
      .filter((asset) => !selectedFolderId || asset.folderId === selectedFolderId)
      .filter((asset) => typeFilter === "all" || asset.kind === typeFilter)
      .filter((asset) => {
        if (!needle) return true;
        const projectName = activeVideoProjects.find((item) => item.id === asset.projectId)?.name ?? "";
        const folderName = library.folders.find((folder) => folder.id === asset.folderId)?.name ?? "";
        return `${asset.name} ${projectName} ${folderName}`.toLowerCase().includes(needle);
      })
      .toSorted((left, right) => compareMediaAssets(left, right, sort));
  }, [activeProjectId, collection, library.assetViews, library.folders, projectIds, query, selectedFolderId, sort, tab, typeFilter]);
  const childFolders = tab === "archived" || scope === "global" && !activeProjectId ? [] : folders.filter((folder) => folder.parentId === selectedFolderId);
  const folderPath = getFolderPath(folders, selectedFolderId);
  const activeAsset = library.assetViews.find((asset) => asset.id === activeAssetId && projectIds.has(asset.projectId) && (!project || asset.projectId === project.id)) ?? null;
  const activeProject = activeVideoProjects.find((item) => item.id === (activeAsset?.projectId ?? activeProjectId));
  const selectedFolderName = folders.find((folder) => folder.id === selectedFolderId)?.name ?? "All media";
  const configuredStorage = mediaStorageOptions.find((option) => option.provider === library.workspaceStorage.provider) ?? mediaStorageOptions[2];
  const configuredLocation = mediaStorageLocations.find((location) => location.id === configuredStorage.locationId) ?? mediaStorageLocations[0];
  const storagePlan = mediaStoragePlans.find((plan) => plan.id === library.workspaceStorage.planId) ?? mediaStoragePlans[1];
  const uploadProgressAssets = trackedUploadIds.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset));
  const moveDialogAssets = moveAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const deleteDialogAssets = deleteAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const selectProject = (id: string | null) => { setSelectedProjectId(id); setSelectedFolderId(null); setActiveAssetId(null); setSelectedAssetIds(new Set()); };
  const activate = (asset: MediaAssetView, event: MouseEvent<HTMLElement>) => {
    if (event.shiftKey && lastSelectedAssetIdRef.current) {
      const assetIds = visibleAssets.map((candidate) => candidate.id);
      const start = assetIds.indexOf(lastSelectedAssetIdRef.current);
      const end = assetIds.indexOf(asset.id);
      if (start >= 0 && end >= 0) setSelectedAssetIds((current) => new Set([...current, ...assetIds.slice(Math.min(start, end), Math.max(start, end) + 1)]));
      lastSelectedAssetIdRef.current = asset.id;
      return;
    }
    if (event.metaKey || event.ctrlKey) { setSelectedAssetIds((current) => { const next = new Set(current); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); return next; }); lastSelectedAssetIdRef.current = asset.id; return; }
    lastSelectedAssetIdRef.current = asset.id;
    setActiveAssetId(asset.id); setDrawerTab("details");
  };
  const copyLink = async (path: string) => { try { await navigator.clipboard?.writeText(new URL(path, window.location.origin).toString()); } catch { /* Clipboard may be blocked in the prototype. */ } notify("Link copied. Anyone with project access can view it."); };
  const uploadFiles = (files: File[]) => {
    if (!activeProjectId || files.length === 0) return;
    const ids = library.addAssets(activeProjectId, selectedFolderId, files.map((file) => {
      const kind = inferKind(file);
      const localUrl = URL.createObjectURL(file);
      return { name: file.name, kind, sizeBytes: file.size || 306_600, playbackUrl: kind === "video" || kind === "audio" ? localUrl : undefined, thumbnailUrl: kind === "image" ? localUrl : undefined };
    }));
    setTrackedUploadIds(ids);
  };
  const importFiles = (files: MediaCloudFile[]) => {
    if (!activeProjectId) return;
    const ids = library.addAssets(activeProjectId, selectedFolderId, files.map((file) => ({ name: file.name, kind: file.kind, sizeBytes: file.sizeBytes, durationSeconds: file.durationSeconds, thumbnailUrl: file.thumbnailUrl, playbackUrl: file.playbackUrl, storageLocationId: file.provider === "google-drive" ? "drive-main" : "dropbox-main", providerFileId: file.id, sourceLocationLabel: file.sourcePath, simulateFailure: file.simulateFailure })));
    setTrackedUploadIds(ids);
    setCloudProvider(null);
  };
  const commonAction = {
    onComment: (asset: MediaAssetView) => { setActiveAssetId(asset.id); setDrawerTab("comments"); },
    onTranscript: (asset: MediaAssetView) => asset.transcriptStatus === "ready" ? router.push(`/projects/${asset.projectId}/script?subtab=transcripts&clip=${encodeURIComponent(asset.id)}#transcript-${encodeURIComponent(asset.id)}`) : (setActiveAssetId(asset.id), setDrawerTab("transcript")),
    onShare: (asset: MediaAssetView) => { void copyLink(`/media/${asset.id}`); },
    onDownload: (asset: MediaAssetView) => asset.originalAvailable ? notify(`Downloading ${asset.name}.`) : notify("The original file is unavailable. Playback is still available."),
    onDelete: (asset: MediaAssetView) => setDeleteAssetIds([asset.id]),
    onArchive: (asset: MediaAssetView) => { library.archiveAssets([asset.id]); setActiveAssetId(null); notify("File archived."); },
    onRestore: (asset: MediaAssetView) => { library.restoreAssets([asset.id]); setActiveAssetId(null); notify("File restored to its previous folder."); },
    onRetry: (asset: MediaAssetView) => { library.retryAssets([asset.id]); notify(`Retrying ${asset.name}.`); },
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => { if (!browserCapabilities.canUpload || !event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepthRef.current += 1; setDragActive(true); };
  const handleDragLeave = () => { dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (dragDepthRef.current === 0) setDragActive(false); };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { if (!browserCapabilities.canUpload) return; event.preventDefault(); dragDepthRef.current = 0; setDragActive(false); uploadFiles(Array.from(event.dataTransfer.files)); };

  return <div className={`media-browser ${scope === "global" ? "is-global" : "is-project"}`} onDragEnter={handleDragEnter} onDragOver={(event) => { if (browserCapabilities.canUpload) event.preventDefault(); }} onDragLeave={handleDragLeave} onDrop={handleDrop}>
    {scope === "global" ? <div className="media-library-tabs" role="tablist" aria-label="Media library sections">{(["media", "masters", "archived"] as const).map((id) => <button type="button" role="tab" key={id} className={`label-s-semibold ${tab === id ? "is-active" : ""}`} aria-selected={tab === id} onClick={() => { setTab(id); setSelectedFolderId(null); setActiveAssetId(null); }}>{id === "media" ? "Media" : id === "masters" ? "Masters" : "Archived"}</button>)}</div> : null}
    <div className={`media-mobile-location is-${scope}`} aria-label="Media location">
      {scope === "global" ? <label><span className="label-xs-semibold">Project</span><select className="label-s" value={selectedProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)}><option value="">All Projects</option>{accessibleProjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}
      {activeProjectId ? <label><span className="label-xs-semibold">Folder</span><select className="label-s" value={selectedFolderId ?? ""} onChange={(event) => setSelectedFolderId(event.target.value || null)}><option value="">All media</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.parentId ? `↳ ${folder.name}` : folder.name}</option>)}</select></label> : null}
    </div>
    <div className={`media-workspace ${railCollapsed ? "rail-collapsed" : ""} ${activeAsset ? "inspector-open" : ""}`}>
      {scope === "global" ? <aside className="media-project-rail" aria-label="Media projects"><div className="media-project-rail-heading"><span className="label-s-semibold">Projects</span></div><button type="button" className={`media-project-rail-item ${selectedProjectId === null ? "is-selected" : ""}`} onClick={() => selectProject(null)}><DsIcon name="grid-four" size={17} /><span className="label-s-semibold">All Projects</span></button><div className="media-project-rail-list">{accessibleProjects.map((item) => <button type="button" className={`media-project-rail-item ${selectedProjectId === item.id ? "is-selected" : ""}`} key={item.id} onClick={() => selectProject(item.id)}><span className="media-project-rail-mark" aria-hidden="true">{item.name.slice(0, 1)}</span><span><strong className="label-s-semibold">{item.name}</strong><small className="label-xs">{item.clientName}</small></span></button>)}</div>{activeProjectId ? <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={false} canManage={capabilities.canManageFolders} canCopyLink={capabilities.canCopyLink} canCollapse={false} onSelect={setSelectedFolderId} onAdd={(parentId) => library.createFolder(activeProjectId, parentId)} onRename={library.renameFolder} onMove={library.moveFolder} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/media?project=${activeProjectId}&folder=${id}`); }} onToggleCollapsed={() => {}} /> : null}</aside> : <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={railCollapsed} canManage={capabilities.canManageFolders} canCopyLink={capabilities.canCopyLink} onSelect={setSelectedFolderId} onAdd={(parentId) => activeProjectId ? library.createFolder(activeProjectId, parentId) : null} onRename={library.renameFolder} onMove={library.moveFolder} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/projects/${activeProjectId}/stages/media?folder=${id}`); }} onToggleCollapsed={() => setRailCollapsed((current) => !current)} />}
      <section className="media-main-area">
        <div className="media-main-actions"><div className="media-action-buttons">{browserCapabilities.canUpload ? <MediaUploadMenu open={uploadOpen} onOpenChange={setUploadOpen} onComputerUpload={() => inputRef.current?.click()} onCloudImport={(providerName) => { setUploadOpen(false); setCloudProvider(providerName); }} /> : null}{capabilities.canManageFolders && activeProjectId ? <button className="media-secondary-button label-s-semibold" type="button" onClick={() => library.createFolder(activeProjectId, selectedFolderId)}><DsIcon name="folder-plus" size={16} />New folder</button> : null}{capabilities.canDownload ? <button className="media-tertiary-button label-s-semibold" type="button" onClick={() => notify(`Preparing ${visibleAssets.filter((asset) => asset.originalAvailable).length} files for download.`)}><DsIcon name="download" size={16} />Download all</button> : null}<input ref={inputRef} className="sr-only" type="file" multiple onChange={(event) => { uploadFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /></div>{capabilities.canViewStorage ? <StorageUsageMeter label={configuredStorage.label} helper={configuredStorage.helper} usedBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.exampleUsedBytes : undefined} limitBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.includedBytes : undefined} /> : null}</div>
        <MediaFilterBar typeFilter={typeFilter} viewMode={viewMode} sort={sort} query={query} onTypeFilterChange={setTypeFilter} onViewModeChange={setViewMode} onSortChange={setSort} onQueryChange={setQuery} />
        <MediaAssetGrid assets={visibleAssets} folders={childFolders} folderPath={folderPath} viewMode={viewMode} selectedAssetIds={selectedAssetIds} activeAssetId={activeAssetId} capabilities={browserCapabilities} onActivate={activate} {...commonAction} onBatchDownload={() => notify(`Downloading ${visibleAssets.filter((asset) => selectedAssetIds.has(asset.id) && asset.originalAvailable).length} files.`)} onBatchMove={() => setMoveAssetIds([...selectedAssetIds])} onBatchArchive={() => { library.archiveAssets([...selectedAssetIds]); setSelectedAssetIds(new Set()); notify("Files archived."); }} onBatchDelete={() => setDeleteAssetIds([...selectedAssetIds])} onDeselectAll={() => { setSelectedAssetIds(new Set()); lastSelectedAssetIdRef.current = null; }} onUpload={() => inputRef.current?.click()} emptyKind={(query || typeFilter !== "all") ? "filtered" : selectedFolderId ? "folder" : "project"} onClearControls={() => { setQuery(""); setTypeFilter("all"); }} onFolderOpen={setSelectedFolderId} />
      </section>
      {activeAsset && activeProject ? <MediaAssetDrawer asset={activeAsset} projectName={activeProject.name} folders={library.folders.filter((folder) => folder.projectId === activeAsset.projectId)} versions={library.versions} comments={library.comments} transcriptNotes={mediaTranscriptNotes} storageLocations={mediaStorageLocations} capabilities={getMediaCapabilities(selectedRole, activeAsset.projectId, activeVideoProjects, allPages)} globalScope={scope === "global"} activeTab={drawerTab} onTabChange={setDrawerTab} onRename={library.renameAsset} onAddComment={(assetId, body) => library.addComment(assetId, selectedRole === "Customer" ? "Avery Taylor" : selectedRole === "Studio Freelancer" ? "Jordan Lee" : "Tom Evans", selectedRole === "Customer" ? "external" : "internal", body)} onClose={() => setActiveAssetId(null)} {...commonAction} /> : null}
    </div>
    <MediaUploadDropZone active={dragActive} folderName={selectedFolderName} />
    <MediaCloudPicker provider={cloudProvider} files={mediaCloudFiles} folderName={selectedFolderName} onClose={() => setCloudProvider(null)} onImport={importFiles} />
    <MediaUploadProgress assets={uploadProgressAssets} destinationLabel={selectedFolderName} projectName={activeVideoProjects.find((item) => item.id === activeProjectId)?.name ?? "Project"} storageHelper={configuredLocation.helper} onClose={() => setTrackedUploadIds([])} onRetry={(assetId) => library.retryAssets([assetId])} />
    {moveAssetIds && moveDialogAssets.length ? <MediaMoveDialog assets={moveDialogAssets} folders={folders} onClose={() => setMoveAssetIds(null)} onMove={(folderId) => { library.moveAssets(moveAssetIds, folderId); setMoveAssetIds(null); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} /> : null}
    {deleteAssetIds && deleteDialogAssets.length ? <MediaDeleteDialog assets={deleteDialogAssets} storageLocations={mediaStorageLocations} onClose={() => setDeleteAssetIds(null)} onConfirm={() => { library.deleteAssets(deleteAssetIds); setDeleteAssetIds(null); setSelectedAssetIds(new Set()); setActiveAssetId(null); notify("Files deleted from Brisk."); }} /> : null}
    {toast ? <div className="media-toast label-s-semibold" role="status">{toast}</div> : null}
  </div>;
}

function getFolderPath(folders: MediaFolder[], selectedId: string | null) { const path: MediaFolder[] = []; let id = selectedId; while (id) { const folder = folders.find((item) => item.id === id); if (!folder) break; path.unshift(folder); id = folder.parentId; } return path; }
function inferKind(file: File): MediaKind { if (file.type.startsWith("video/")) return "video"; if (file.type.startsWith("audio/")) return "audio"; if (file.type.startsWith("image/")) return "image"; if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text")) return "document"; return "other"; }
