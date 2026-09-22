"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { getRoleHome } from "@/components/navigation/navigationConfig";
import { DsIcon } from "@/components/video-review/DsIcon";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mockTeamPeople } from "@/data/active-videos/teamDefaults";
import { mediaCloudFiles, mediaStorageLocations, mediaStorageOptions, mediaStoragePlans, mediaTranscriptNotes, type MediaAssetView, type MediaCloudFile, type MediaCloudProvider, type MediaCollection, type MediaFolder, type MediaKind } from "@/data/media";
import { compareMediaAssets, getMediaCapabilities, getMediaProjectsForRole } from "@/lib/media";
import { MediaAssetDrawer, type MediaAssetDrawerTab, type MediaMentionOption } from "./MediaAssetDrawer";
import { MediaArchiveDialog, MediaDeleteDialog, MediaMoveDialog } from "./MediaActionDialogs";
import { MediaAssetGrid } from "./MediaAssetGrid";
import { MediaCloudPicker } from "./MediaCloudPicker";
import { MediaFilterBar, type MediaSort, type MediaTypeFilter, type MediaViewMode } from "./MediaFilterBar";
import { MediaFolderTree } from "./MediaFolderTree";
import { useMediaLibrary } from "./MediaLibraryContext";
import { MediaUploadMenu } from "./MediaUploadMenu";
import { MediaUploadDropZone } from "./MediaUploadDropZone";
import { MediaUploadProgress } from "./MediaUploadProgress";
import { StorageUsageMeter } from "./StorageUsageMeter";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

type GlobalTab = "media" | "masters" | "archived";
type MediaBrowserProps = { scope: "project" | "global"; project?: Project; initialProjectId?: string | null; initialFolderId?: string | null; initialAssetId?: string | null };
export function MediaBrowser({ scope, project, initialProjectId = null, initialFolderId = null, initialAssetId = null }: MediaBrowserProps) {
  const router = useRouter();
  const { selectedRole, allPages } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const library = useMediaLibrary();
  const isClientView = selectedRole === "Customer";
  const linkedAsset = library.assetViews.find((asset) => asset.id === initialAssetId && (!project || asset.projectId === project.id));
  const scenarioProjects = useMemo(
    () => {
      if (scope === "global") return activeVideoProjects;
      if (activeScenario?.state !== "new") return activeVideoProjects;
      return project && activeScenario.fixtureProjectIds?.includes(project.id) ? [project] : [];
    },
    [activeScenario, project, scope],
  );
  // A Client's library is always limited to their own projects, even while
  // previewing prototype scenarios that otherwise expose every page.
  const accessibleProjects = useMemo(
    () => getMediaProjectsForRole(selectedRole, scenarioProjects, isClientView ? false : allPages),
    [allPages, isClientView, scenarioProjects, selectedRole],
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(project?.id ?? linkedAsset?.projectId ?? initialProjectId);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(project?.clientName ?? null);
  const activeProjectId = project?.id ?? selectedProjectId;
  const hasClientFolderRail = scope === "global" && isClientView && Boolean(activeProjectId);
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
  const [openUploadMenu, setOpenUploadMenu] = useState<"toolbar" | "empty" | null>(null);
  const [cloudProvider, setCloudProvider] = useState<MediaCloudProvider | null>(null);
  const [toast, setToast] = useState("");
  const [trackedUploadIds, setTrackedUploadIds] = useState<string[]>([]);
  const [moveAssetIds, setMoveAssetIds] = useState<string[] | null>(null);
  const [archiveAssetIds, setArchiveAssetIds] = useState<string[] | null>(null);
  const [deleteAssetIds, setDeleteAssetIds] = useState<string[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSelectedAssetIdRef = useRef<string | null>(null);
  const dragDepthRef = useRef(0);
  const clientGroups = useMemo(() => Array.from(
    accessibleProjects.reduce((groups, item) => {
      const projects = groups.get(item.clientName) ?? [];
      projects.push(item);
      groups.set(item.clientName, projects);
      return groups;
    }, new Map<string, Project[]>()),
  ).map(([name, projects]) => ({ name, projectCount: projects.length })).toSorted((left, right) => left.name.localeCompare(right.name)), [accessibleProjects]);
  const clientProjects = useMemo(() => selectedClientName
    ? accessibleProjects.filter((item) => item.clientName === selectedClientName)
    : accessibleProjects, [accessibleProjects, selectedClientName]);
  const projectIds = useMemo(() => new Set(clientProjects.map((item) => item.id)), [clientProjects]);
  useEffect(() => {
    if (scope === "project" && project && !projectIds.has(project.id)) router.replace(getRoleHome(selectedRole));
  }, [project, projectIds, router, scope, selectedRole]);
  const capabilities = getMediaCapabilities(selectedRole, activeProjectId, scenarioProjects, allPages);
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
        const projectName = scenarioProjects.find((item) => item.id === asset.projectId)?.name ?? "";
        const folderName = library.folders.find((folder) => folder.id === asset.folderId)?.name ?? "";
        return `${asset.name} ${projectName} ${folderName}`.toLowerCase().includes(needle);
      })
      .toSorted((left, right) => compareMediaAssets(left, right, sort));
  }, [activeProjectId, collection, library.assetViews, library.folders, projectIds, query, scenarioProjects, selectedFolderId, sort, tab, typeFilter]);
  const childFolders = tab === "archived" || scope === "global" && !activeProjectId ? [] : folders.filter((folder) => folder.parentId === selectedFolderId);
  const folderPath = getFolderPath(folders, selectedFolderId);
  const activeAsset = library.assetViews.find((asset) => asset.id === activeAssetId && projectIds.has(asset.projectId) && (!project || asset.projectId === project.id)) ?? null;
  const activeProject = scenarioProjects.find((item) => item.id === (activeAsset?.projectId ?? activeProjectId));
  const mentionOptions = useMemo<MediaMentionOption[]>(() => [
    ...mockTeamPeople.map((person) => ({ id: `person-${person.id}`, label: person.name, kind: "person" as const })),
    ...scenarioProjects.map((item) => ({ id: `project-${item.id}`, label: item.name, kind: "project" as const })),
  ], [scenarioProjects]);
  const selectedFolderName = folders.find((folder) => folder.id === selectedFolderId)?.name ?? "All media";
  const configuredStorage = mediaStorageOptions.find((option) => option.provider === library.workspaceStorage.provider) ?? mediaStorageOptions[2];
  const storagePlan = mediaStoragePlans.find((plan) => plan.id === library.workspaceStorage.planId) ?? mediaStoragePlans[1];
  const uploadProgressAssets = trackedUploadIds.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset));
  const moveDialogAssets = moveAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const archiveDialogAssets = archiveAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const deleteDialogAssets = deleteAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const selectProject = (id: string | null) => {
    setSelectedProjectId(id);
    setSelectedClientName(id ? scenarioProjects.find((item) => item.id === id)?.clientName ?? null : null);
    setSelectedFolderId(null);
    setActiveAssetId(null);
    setSelectedAssetIds(new Set());
  };
  const selectClient = (name: string | null) => {
    setSelectedClientName(name);
    setSelectedProjectId(null);
    setSelectedFolderId(null);
    setActiveAssetId(null);
    setSelectedAssetIds(new Set());
  };
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
    onArchive: (asset: MediaAssetView) => setArchiveAssetIds([asset.id]),
    onRestore: (asset: MediaAssetView) => { library.restoreAssets([asset.id]); setActiveAssetId(null); notify("File restored to its previous folder."); },
    onRetry: (asset: MediaAssetView) => { library.retryAssets([asset.id]); notify(`Retrying ${asset.name}.`); },
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => { if (!browserCapabilities.canUpload || !event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepthRef.current += 1; setDragActive(true); };
  const handleDragLeave = () => { dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (dragDepthRef.current === 0) setDragActive(false); };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { if (!browserCapabilities.canUpload) return; event.preventDefault(); dragDepthRef.current = 0; setDragActive(false); uploadFiles(Array.from(event.dataTransfer.files)); };

  return <div className={`media-browser ${scope === "global" ? "is-global" : "is-project"}`} onDragEnter={handleDragEnter} onDragOver={(event) => { if (browserCapabilities.canUpload) event.preventDefault(); }} onDragLeave={handleDragLeave} onDrop={handleDrop}>
    <div className={`media-mobile-location is-${scope}`} aria-label="Media location">
      {scope === "global" ? <label><span className="label-xs-semibold">Project</span><select className="label-s" value={selectedProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)}><option value="">All Projects</option>{accessibleProjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}
      {activeProjectId ? <label><span className="label-xs-semibold">Folder</span><select className="label-s" value={selectedFolderId ?? ""} onChange={(event) => setSelectedFolderId(event.target.value || null)}><option value="">All media</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.parentId ? `↳ ${folder.name}` : folder.name}</option>)}</select></label> : null}
    </div>
    <div className={`media-workspace ${hasClientFolderRail ? "has-client-folder-rail" : ""} ${railCollapsed ? "rail-collapsed" : ""} ${activeAsset ? "inspector-open" : ""}`}>
      {scope === "global" ? <aside className="media-project-rail" aria-label={isClientView ? "Project media libraries" : "Client media libraries"}>{isClientView ? <><div className="media-project-rail-heading"><span className="label-s-semibold">Projects</span></div><button type="button" className={`media-project-rail-item ${selectedProjectId === null ? "is-selected" : ""}`} onClick={() => selectProject(null)}><DsIcon name="grid-four" size={17} /><span className="label-s-semibold">All projects</span></button><div className="media-project-rail-list">{accessibleProjects.map((item) => <button type="button" className={`media-project-rail-item ${selectedProjectId === item.id ? "is-selected" : ""}`} key={item.id} onClick={() => selectProject(item.id)}><span className="media-project-rail-mark" aria-hidden="true">{item.name.slice(0, 1)}</span><span><strong className="label-s-semibold">{item.name}</strong><small className="label-xs">{item.clientName}</small></span></button>)}</div></> : <><div className="media-project-rail-heading"><span className="label-s-semibold">Clients</span></div><button type="button" className={`media-project-rail-item ${selectedClientName === null ? "is-selected" : ""}`} onClick={() => selectClient(null)}><DsIcon name="grid-four" size={17} /><span className="label-s-semibold">All clients</span></button><div className="media-project-rail-list">{clientGroups.map((client) => <button type="button" className={`media-project-rail-item ${selectedClientName === client.name ? "is-selected" : ""}`} key={client.name} onClick={() => selectClient(client.name)}><span className="media-project-rail-mark" aria-hidden="true">{client.name.slice(0, 1)}</span><span><strong className="label-s-semibold">{client.name}</strong><small className="label-xs">{client.projectCount} {client.projectCount === 1 ? "video" : "videos"}</small></span></button>)}</div></>}</aside> : <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={railCollapsed} canManage={capabilities.canManageFolders} canMoveAssets={capabilities.canMoveAssets} canCopyLink={capabilities.canCopyLink} storageUsage={capabilities.canViewStorage ? <StorageUsageMeter label={configuredStorage.label} helper={configuredStorage.helper} usedBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.exampleUsedBytes : undefined} limitBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.includedBytes : undefined} /> : null} onSelect={setSelectedFolderId} onAdd={(parentId) => activeProjectId ? library.createFolder(activeProjectId, parentId) : null} onRename={library.renameFolder} onMove={library.moveFolder} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/projects/${activeProjectId}/stages/media?folder=${id}`); }} onToggleCollapsed={() => setRailCollapsed((current) => !current)} />}
      {hasClientFolderRail ? <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={false} canManage={capabilities.canManageFolders} canMoveAssets={capabilities.canMoveAssets} canCopyLink={capabilities.canCopyLink} canCollapse={false} onSelect={setSelectedFolderId} onAdd={(parentId) => activeProjectId ? library.createFolder(activeProjectId, parentId) : null} onRename={library.renameFolder} onMove={library.moveFolder} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/media?project=${activeProjectId}&folder=${id}`); }} onToggleCollapsed={() => {}} /> : null}
      <section className="media-main-area">
        {scope === "global" ? <div className="media-library-tabs" role="tablist" aria-label="Media library sections">{(["media", "masters", "archived"] as const).map((id) => <button type="button" role="tab" key={id} className={`label-s-semibold ${tab === id ? "is-active" : ""}`} aria-selected={tab === id} onClick={() => { setTab(id); setSelectedFolderId(null); setActiveAssetId(null); }}>{id === "media" ? "Media" : id === "masters" ? "Masters" : "Archived"}</button>)}</div> : null}
        <div className="media-main-actions"><div className="media-action-buttons">{browserCapabilities.canUpload ? <MediaUploadMenu open={openUploadMenu === "toolbar"} onOpenChange={(open) => setOpenUploadMenu(open ? "toolbar" : null)} onComputerUpload={() => inputRef.current?.click()} onCloudImport={(providerName) => { setOpenUploadMenu(null); setCloudProvider(providerName); }} /> : null}{capabilities.canDownload ? <button className="media-tertiary-button label-s-semibold" type="button" onClick={() => notify(`Preparing ${visibleAssets.filter((asset) => asset.originalAvailable).length} files for download.`)}><DsIcon name="download" size={16} />Download all</button> : null}{browserCapabilities.canCopyLink ? <ShareActionRow context="media" userRole={selectedRole} density="compact" showReview={false} showApprove={false} copyLinkLabel={selectedFolderId ? `Share ${selectedFolderName}` : "Share media"} stageLabelOverride={selectedFolderId ? selectedFolderName : "All media"} shareUrl={activeProjectId ? `/projects/${activeProjectId}/stages/media${selectedFolderId ? `?folder=${encodeURIComponent(selectedFolderId)}` : ""}` : "/media"} /> : null}<input ref={inputRef} className="sr-only" type="file" multiple onChange={(event) => { uploadFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /></div></div>
        <MediaFilterBar typeFilter={typeFilter} viewMode={viewMode} sort={sort} query={query} onTypeFilterChange={setTypeFilter} onViewModeChange={setViewMode} onSortChange={setSort} onQueryChange={setQuery} />
        <MediaAssetGrid assets={visibleAssets} folders={childFolders} folderPath={folderPath} viewMode={viewMode} selectedAssetIds={selectedAssetIds} activeAssetId={activeAssetId} capabilities={browserCapabilities} onActivate={activate} {...commonAction} onBatchDownload={() => notify(`Downloading ${visibleAssets.filter((asset) => selectedAssetIds.has(asset.id) && asset.originalAvailable).length} files.`)} onBatchMove={() => setMoveAssetIds([...selectedAssetIds])} onBatchArchive={() => setArchiveAssetIds([...selectedAssetIds])} onBatchDelete={() => setDeleteAssetIds([...selectedAssetIds])} onDeselectAll={() => { setSelectedAssetIds(new Set()); lastSelectedAssetIdRef.current = null; }} onToggleSelect={(asset) => { setSelectedAssetIds((current) => { const next = new Set(current); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); return next; }); lastSelectedAssetIdRef.current = asset.id; }} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} emptyUploadAction={browserCapabilities.canUpload ? <MediaUploadMenu open={openUploadMenu === "empty"} onOpenChange={(open) => setOpenUploadMenu(open ? "empty" : null)} onComputerUpload={() => inputRef.current?.click()} onCloudImport={(providerName) => { setOpenUploadMenu(null); setCloudProvider(providerName); }} /> : null} emptyKind={(query || typeFilter !== "all") ? "filtered" : selectedFolderId ? "folder" : "project"} onClearControls={() => { setQuery(""); setTypeFilter("all"); }} onFolderOpen={setSelectedFolderId} />
      </section>
      {activeAsset && activeProject ? <MediaAssetDrawer asset={activeAsset} projectName={activeProject.name} folders={library.folders.filter((folder) => folder.projectId === activeAsset.projectId)} comments={library.comments} transcriptNotes={mediaTranscriptNotes} storageLocations={mediaStorageLocations} capabilities={getMediaCapabilities(selectedRole, activeAsset.projectId, scenarioProjects, allPages)} globalScope={scope === "global"} activeTab={drawerTab} mentionOptions={mentionOptions} onTabChange={setDrawerTab} onRename={library.renameAsset} onAddComment={(assetId, body) => library.addComment(assetId, selectedRole === "Customer" ? "Avery Taylor" : selectedRole === "Studio Freelancer" ? "Jordan Lee" : "Tom Evans", selectedRole === "Customer" ? "external" : "internal", body)} onClose={() => setActiveAssetId(null)} {...commonAction} /> : null}
    </div>
    <MediaUploadDropZone active={dragActive} folderName={selectedFolderName} />
    <MediaCloudPicker provider={cloudProvider} files={mediaCloudFiles} folderName={selectedFolderName} onClose={() => setCloudProvider(null)} onImport={importFiles} />
    <MediaUploadProgress assets={uploadProgressAssets} destinationLabel={selectedFolderName} projectName={scenarioProjects.find((item) => item.id === activeProjectId)?.name ?? "Project"} onClose={() => setTrackedUploadIds([])} onRetry={(assetId) => library.retryAssets([assetId])} />
    {moveAssetIds && moveDialogAssets.length ? <MediaMoveDialog assets={moveDialogAssets} folders={folders} onClose={() => setMoveAssetIds(null)} onMove={(folderId) => { library.moveAssets(moveAssetIds, folderId); setMoveAssetIds(null); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} /> : null}
    {archiveAssetIds && archiveDialogAssets.length ? <MediaArchiveDialog assets={archiveDialogAssets} onClose={() => setArchiveAssetIds(null)} onConfirm={() => { library.archiveAssets(archiveAssetIds); setArchiveAssetIds(null); setSelectedAssetIds(new Set()); setActiveAssetId(null); notify("Files moved to Archived. You can restore them at any time."); }} /> : null}
    {deleteAssetIds && deleteDialogAssets.length ? <MediaDeleteDialog assets={deleteDialogAssets} storageLocations={mediaStorageLocations} onClose={() => setDeleteAssetIds(null)} onConfirm={() => { library.deleteAssets(deleteAssetIds); setDeleteAssetIds(null); setSelectedAssetIds(new Set()); setActiveAssetId(null); notify("Files deleted from Brisk."); }} /> : null}
    {toast ? <div className="media-toast label-s-semibold" role="status">{toast}</div> : null}
  </div>;
}

function getFolderPath(folders: MediaFolder[], selectedId: string | null) { const path: MediaFolder[] = []; let id = selectedId; while (id) { const folder = folders.find((item) => item.id === id); if (!folder) break; path.unshift(folder); id = folder.parentId; } return path; }
function inferKind(file: File): MediaKind { if (file.type.startsWith("video/")) return "video"; if (file.type.startsWith("audio/")) return "audio"; if (file.type.startsWith("image/")) return "image"; if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text")) return "document"; return "other"; }
