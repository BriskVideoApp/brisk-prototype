"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import { getRoleHome } from "@/components/navigation/navigationConfig";
import { DsIcon } from "@/components/video-review/DsIcon";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { appendSharedReviewActivity, sharedReviewActivityStorageKey } from "@/data/share-review-activity";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mockTeamPeople } from "@/data/active-videos/teamDefaults";
import { mediaCloudFiles, mediaStorageLocations, mediaStorageOptions, mediaStoragePlans, mediaTranscriptNotes, type MediaAssetView, type MediaCloudFile, type MediaCloudProvider, type MediaCollection, type MediaFolder, type MediaKind } from "@/data/media";
import { compareMediaAssets, getMediaCapabilities } from "@/lib/media";
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
import { MediaLocationNavigation, type MediaClientGroup } from "./MediaLocationNavigation";
import { StorageUsageMeter } from "./StorageUsageMeter";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

type GlobalTab = "media" | "masters" | "archived";
type MediaBrowserProps = { scope: "project" | "global"; project?: Project; initialProjectId?: string | null; initialFolderId?: string | null; initialAssetId?: string | null; initialAssetIds?: string[] };
export function MediaBrowser({ scope, project, initialProjectId = null, initialFolderId = null, initialAssetId = null, initialAssetIds = [] }: MediaBrowserProps) {
  const router = useRouter();
  const { selectedRole, allPages } = usePrototypeRole();
  const { state: prototypeState, hasHydrated: hasHydratedPrototypeState } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const studioName = useStudioCompanyName();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const library = useMediaLibrary();
  const isClientView = selectedRole === "Customer";
  const linkedAsset = library.assetViews.find((asset) => asset.id === initialAssetId && (!project || asset.projectId === project.id));
  const linkedBatchAssets = library.assetViews.filter((asset) => initialAssetIds.includes(asset.id) && !asset.archivedAt && asset.collection === "media" && (!project || asset.projectId === project.id));
  const scenarioProjects = useMemo(
    () => {
      if (scope === "global") return activeVideoProjects;
      if (!project) return activeScenario?.state === "new" ? [] : activeVideoProjects;
      if (activeVideoProjects.some((item) => item.id === project.id)) return activeVideoProjects;
      const belongsToActiveWorkspace = prototypeState.projects.some((item) => item.id === project.id && item.workspaceId === prototypeState.session.activeWorkspaceId);
      if (belongsToActiveWorkspace) return [project];
      if (activeScenario?.state === "new") return activeScenario.fixtureProjectIds?.includes(project.id) ? [project] : [];
      return activeVideoProjects;
    },
    [activeScenario, project, prototypeState.projects, prototypeState.session.activeWorkspaceId, scope],
  );
  // The active viewer's project membership is the source for every media location.
  const accessibleProjects = useMemo(
    () => scenarioProjects.flatMap((candidate) => {
      const scoped = prototypeState.projects.find((item) => item.id === candidate.id);
      return scoped && canViewProject(viewer, scoped, prototypeState) ? [scoped] : [];
    }),
    [prototypeState, scenarioProjects, viewer],
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(project?.id ?? linkedAsset?.projectId ?? initialProjectId);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(() => {
    const projectId = project?.id ?? linkedAsset?.projectId ?? initialProjectId;
    return project?.clientName ?? scenarioProjects.find((item) => item.id === projectId)?.clientName ?? null;
  });
  const activeProjectId = accessibleProjects.some((candidate) => candidate.id === (project?.id ?? selectedProjectId))
    ? project?.id ?? selectedProjectId : null;
  const activeClientName = accessibleProjects.some((candidate) => candidate.clientName === selectedClientName)
    ? selectedClientName : null;
  const hasStudioClientRail = scope === "global" && !isClientView;
  const hasProjectFolderRail = scope === "global" && Boolean(activeProjectId);
  const [tab, setTab] = useState<GlobalTab>(linkedAsset?.archivedAt ? "archived" : linkedAsset?.collection === "masters" ? "masters" : "media");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(linkedBatchAssets.length ? null : initialFolderId ?? (!linkedAsset?.archivedAt ? linkedAsset?.folderId ?? null : null));
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [viewMode, setViewMode] = useState<MediaViewMode>("card");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [query, setQuery] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set(linkedBatchAssets.map((asset) => asset.id)));
  const [sharePanelOpenSignal, setSharePanelOpenSignal] = useState(0);
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
  const clientGroups = useMemo<MediaClientGroup[]>(() => Array.from(
    accessibleProjects.reduce((groups, item) => {
      const projects = groups.get(item.clientName) ?? [];
      projects.push(item);
      groups.set(item.clientName, projects);
      return groups;
    }, new Map<string, Project[]>()),
  ).map(([name, projects]) => ({ name, projectCount: projects.length })).toSorted((left, right) => left.name.localeCompare(right.name)), [accessibleProjects]);
  const clientProjects = useMemo(() => activeClientName
    ? accessibleProjects.filter((item) => item.clientName === activeClientName)
    : accessibleProjects, [accessibleProjects, activeClientName]);
  const projectIds = useMemo(() => new Set(clientProjects.map((item) => item.id)), [clientProjects]);
  useEffect(() => {
    if (!hasLoadedScenario || !hasHydratedPrototypeState) return;
    if (scope === "project" && project && !projectIds.has(project.id)) router.replace(getRoleHome(selectedRole));
  }, [hasHydratedPrototypeState, hasLoadedScenario, project, projectIds, router, scope, selectedRole]);
  const mediaProject = accessibleProjects.find((candidate) => candidate.id === activeProjectId);
  const canMediaAction = (action: "upload" | "edit" | "comment" | "send", target: Project | undefined = mediaProject) =>
    Boolean(target && canActOnProject(viewer, target, prototypeState, action, "media"));
  const mediaCapabilitiesFor = (target: Project | undefined) => {
    const base = getMediaCapabilities(selectedRole, target?.id ?? null, accessibleProjects, allPages, viewer?.personId ?? undefined);
    return {
      ...base,
      canUpload: base.canUpload && canMediaAction("upload", target),
      canManageFolders: base.canManageFolders && canMediaAction("edit", target),
      canMoveAssets: base.canMoveAssets && canMediaAction("edit", target),
      canArchive: base.canArchive && canMediaAction("edit", target),
      canDelete: base.canDelete && canMediaAction("edit", target),
      canComment: base.canComment && canMediaAction("comment", target),
    };
  };
  const capabilities = mediaCapabilitiesFor(mediaProject);
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
    ...accessibleProjects.map((item) => ({ id: `project-${item.id}`, label: item.name, kind: "project" as const })),
  ], [accessibleProjects]);
  const selectedFolderName = folders.find((folder) => folder.id === selectedFolderId)?.name ?? "All media";
  const selectedSharingAssets = visibleAssets.filter((asset) => selectedAssetIds.has(asset.id));
  const singleSharingAsset = selectedSharingAssets.length === 1 ? selectedSharingAssets[0] : null;
  const shareProject = scenarioProjects.find((item) => item.id === (singleSharingAsset?.projectId ?? selectedSharingAssets[0]?.projectId ?? activeProjectId));
  const shareTitle = singleSharingAsset?.name ?? (selectedSharingAssets.length > 1
    ? `${selectedSharingAssets.length} files`
    : selectedFolderId ? selectedFolderName : "Media");
  const shareScopeType = selectedSharingAssets.length === 1
    ? "item"
    : selectedSharingAssets.length > 1 ? "selection" : "stage";
  const shareUrl = activeProjectId
    ? singleSharingAsset
      ? `/projects/${activeProjectId}/stages/media?asset=${encodeURIComponent(singleSharingAsset.id)}`
      : selectedSharingAssets.length > 1
        ? `/projects/${activeProjectId}/stages/media?assets=${encodeURIComponent(selectedSharingAssets.map((asset) => asset.id).join(","))}`
        : `/projects/${activeProjectId}/stages/media${selectedFolderId ? `?folder=${encodeURIComponent(selectedFolderId)}` : ""}`
    : singleSharingAsset
      ? `/media/${encodeURIComponent(singleSharingAsset.id)}`
      : `/media${selectedSharingAssets.length > 1 ? `?assets=${encodeURIComponent(selectedSharingAssets.map((asset) => asset.id).join(","))}` : ""}`;
  const sendCompanyName = selectedRole === "Studio Staff"
    ? shareProject?.clientName ?? "Client"
    : studioName;
  const canSendSelection = selectedSharingAssets.length > 0
    && selectedSharingAssets.every((asset) => canMediaAction("send", accessibleProjects.find((candidate) => candidate.id === asset.projectId))) && (
    selectedRole !== "Studio Staff"
    || new Set(selectedSharingAssets.map((asset) => scenarioProjects.find((item) => item.id === asset.projectId)?.clientName)).size === 1
  );
  const configuredStorage = mediaStorageOptions.find((option) => option.provider === library.workspaceStorage.provider) ?? mediaStorageOptions[2];
  const storagePlan = mediaStoragePlans.find((plan) => plan.id === library.workspaceStorage.planId) ?? mediaStoragePlans[1];
  const uploadProgressAssets = trackedUploadIds.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset));
  const moveDialogAssets = moveAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const archiveDialogAssets = archiveAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const deleteDialogAssets = deleteAssetIds?.map((id) => library.assetViews.find((asset) => asset.id === id)).filter((asset): asset is MediaAssetView => Boolean(asset)) ?? [];
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const selectProject = (id: string | null) => {
    setSelectedProjectId(id);
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
    if (!activeProjectId || !capabilities.canUpload || files.length === 0) return;
    const ids = library.addAssets(activeProjectId, selectedFolderId, files.map((file) => {
      const kind = inferKind(file);
      const localUrl = URL.createObjectURL(file);
      return { name: file.name, kind, sizeBytes: file.size || 306_600, playbackUrl: kind === "video" || kind === "audio" ? localUrl : undefined, thumbnailUrl: kind === "image" ? localUrl : undefined };
    }));
    setTrackedUploadIds(ids);
  };
  const importFiles = (files: MediaCloudFile[]) => {
    if (!activeProjectId || !capabilities.canUpload) return;
    const ids = library.addAssets(activeProjectId, selectedFolderId, files.map((file) => ({ name: file.name, kind: file.kind, sizeBytes: file.sizeBytes, durationSeconds: file.durationSeconds, thumbnailUrl: file.thumbnailUrl, playbackUrl: file.playbackUrl, storageLocationId: file.provider === "google-drive" ? "drive-main" : "dropbox-main", providerFileId: file.id, sourceLocationLabel: file.sourcePath, simulateFailure: file.simulateFailure })));
    setTrackedUploadIds(ids);
    setCloudProvider(null);
  };
  const commonAction = {
    onComment: (asset: MediaAssetView) => { setActiveAssetId(asset.id); setDrawerTab("comments"); },
    onTranscript: (asset: MediaAssetView) => asset.transcriptStatus === "ready" ? router.push(`/projects/${asset.projectId}/script?subtab=transcripts&clip=${encodeURIComponent(asset.id)}#transcript-${encodeURIComponent(asset.id)}`) : (setActiveAssetId(asset.id), setDrawerTab("transcript")),
    onShare: (asset: MediaAssetView) => {
      setSelectedAssetIds(new Set([asset.id]));
      setSharePanelOpenSignal((current) => current + 1);
    },
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
    <div className={`media-mobile-location is-${scope} ${hasStudioClientRail ? "has-client-picker" : ""}`} aria-label="Media location">
      {hasStudioClientRail ? <label><span className="label-xs-semibold">Client</span><select className="label-s" value={activeClientName ?? ""} onChange={(event) => selectClient(event.target.value || null)}><option value="">All clients</option>{clientGroups.map((client) => <option value={client.name} key={client.name}>{client.name}</option>)}</select></label> : null}
      {scope === "global" ? <label><span className="label-xs-semibold">Project</span><select className="label-s" value={activeProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)}><option value="">All projects</option>{clientProjects.map((item) => <option value={item.id} key={item.id}>{item.name} - {item.clientName}</option>)}</select></label> : null}
      {activeProjectId ? <label><span className="label-xs-semibold">Folder</span><select className="label-s" value={selectedFolderId ?? ""} onChange={(event) => setSelectedFolderId(event.target.value || null)}><option value="">All media</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.parentId ? `↳ ${folder.name}` : folder.name}</option>)}</select></label> : null}
    </div>
    <div className={`media-workspace ${hasStudioClientRail ? "has-client-rail" : ""} ${hasProjectFolderRail ? "has-project-folder-rail" : ""} ${railCollapsed ? "rail-collapsed" : ""} ${activeAsset ? "inspector-open" : ""}`}>
      {scope === "global" ? <MediaLocationNavigation
        clients={hasStudioClientRail ? clientGroups : undefined}
        projects={clientProjects}
        selectedClientName={activeClientName}
        selectedProjectId={activeProjectId}
        onSelectClient={selectClient}
        onSelectProject={selectProject}
      /> : <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={railCollapsed} canManage={capabilities.canManageFolders} canMoveAssets={capabilities.canMoveAssets} canCopyLink={capabilities.canCopyLink} storageUsage={capabilities.canViewStorage ? <StorageUsageMeter label={configuredStorage.label} helper={configuredStorage.helper} usedBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.exampleUsedBytes : undefined} limitBytes={configuredStorage.provider === "brisk-storage" ? storagePlan.includedBytes : undefined} /> : null} onSelect={setSelectedFolderId} onAdd={(parentId) => activeProjectId ? library.createFolder(activeProjectId, parentId) : null} onRename={library.renameFolder} onMove={library.moveFolder} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/projects/${activeProjectId}/stages/media?folder=${id}`); }} onToggleCollapsed={() => setRailCollapsed((current) => !current)} />}
      {hasProjectFolderRail ? <MediaFolderTree folders={folders} selectedFolderId={selectedFolderId} collapsed={false} canManage={capabilities.canManageFolders} canMoveAssets={capabilities.canMoveAssets} canCopyLink={capabilities.canCopyLink} canCollapse={false} onSelect={setSelectedFolderId} onAdd={(parentId) => activeProjectId ? library.createFolder(activeProjectId, parentId) : null} onRename={library.renameFolder} onMove={library.moveFolder} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} onDelete={(id) => { if (!library.deleteFolder(id)) notify("Only empty folders can be deleted."); }} onCopyLink={(id) => { void copyLink(`/media?project=${activeProjectId}&folder=${id}`); }} onToggleCollapsed={() => {}} /> : null}
      <section className="media-main-area">
        {scope === "global" ? <div className="media-library-tabs" role="tablist" aria-label="Media library sections">{(["media", "masters", "archived"] as const).map((id) => <button type="button" role="tab" key={id} className={`label-s-semibold ${tab === id ? "is-active" : ""}`} aria-selected={tab === id} onClick={() => { setTab(id); setSelectedFolderId(null); setActiveAssetId(null); }}>{id === "media" ? "Media" : id === "masters" ? "Masters" : "Archived"}</button>)}</div> : null}
        <div className="media-main-actions">
          <div className="media-action-buttons">
            {browserCapabilities.canUpload ? <MediaUploadMenu
              open={openUploadMenu === "toolbar"}
              onOpenChange={(open) => setOpenUploadMenu(open ? "toolbar" : null)}
              onComputerUpload={() => inputRef.current?.click()}
              onCloudImport={(providerName) => { setOpenUploadMenu(null); setCloudProvider(providerName); }}
            /> : null}
            {capabilities.canDownload ? <button
              className="media-tertiary-button label-s-semibold"
              type="button"
              onClick={() => notify(`Preparing ${visibleAssets.filter((asset) => asset.originalAvailable).length} files for download.`)}
            ><DsIcon name="download" size={16} />Download all</button> : null}
            <input ref={inputRef} className="sr-only" type="file" multiple onChange={(event) => { uploadFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
          </div>
        </div>
        <MediaFilterBar typeFilter={typeFilter} viewMode={viewMode} sort={sort} query={query} onTypeFilterChange={setTypeFilter} onViewModeChange={setViewMode} onSortChange={setSort} onQueryChange={setQuery} />
        <MediaAssetGrid assets={visibleAssets} folders={childFolders} folderPath={folderPath} viewMode={viewMode} selectedAssetIds={selectedAssetIds} activeAssetId={activeAssetId} capabilities={browserCapabilities} onActivate={activate} {...commonAction} onBatchDownload={() => notify(`Downloading ${visibleAssets.filter((asset) => selectedAssetIds.has(asset.id) && asset.originalAvailable).length} files.`)} onBatchMove={() => setMoveAssetIds([...selectedAssetIds])} onBatchArchive={() => setArchiveAssetIds([...selectedAssetIds])} onBatchDelete={() => setDeleteAssetIds([...selectedAssetIds])} onDeselectAll={() => { setSelectedAssetIds(new Set()); lastSelectedAssetIdRef.current = null; }} onToggleSelect={(asset) => { setSelectedAssetIds((current) => { const next = new Set(current); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); return next; }); lastSelectedAssetIdRef.current = asset.id; }} onMoveAssetsToFolder={(assetIds, folderId) => { library.moveAssets(assetIds, folderId); setSelectedAssetIds(new Set()); notify(`Files moved to ${folders.find((folder) => folder.id === folderId)?.name ?? "All media"}.`); }} emptyUploadAction={browserCapabilities.canUpload ? <MediaUploadMenu open={openUploadMenu === "empty"} onOpenChange={(open) => setOpenUploadMenu(open ? "empty" : null)} onComputerUpload={() => inputRef.current?.click()} onCloudImport={(providerName) => { setOpenUploadMenu(null); setCloudProvider(providerName); }} /> : null} emptyKind={(query || typeFilter !== "all") ? "filtered" : selectedFolderId ? "folder" : "project"} onClearControls={() => { setQuery(""); setTypeFilter("all"); }} onFolderOpen={setSelectedFolderId} />
        {selectedSharingAssets.length > 0 && browserCapabilities.canCopyLink ? <div className="media-stage-footer">
          <ShareActionRow
            context="media"
            userRole={selectedRole}
            density="compact"
            scopeType={shareScopeType}
            shareTitle={shareTitle}
            stageLabelOverride={shareTitle}
            projectName={shareProject?.name ?? "Media library"}
            studioName={studioName}
            customerName={shareProject?.clientName}
            sendCompanyName={sendCompanyName}
            sendLabel={`Send selected ${selectedSharingAssets.length === 1 ? "file" : "files"} to ${sendCompanyName}`}
            sendChangesProjectStatus={false}
            onSend={() => {
              if (!canSendSelection) return;
              const actor = viewer?.name ?? studioName;
              const occurredAt = new Date().toISOString();
              for (const selectedProjectId of new Set(selectedSharingAssets.map((asset) => asset.projectId))) {
                const files = selectedSharingAssets.filter((asset) => asset.projectId === selectedProjectId);
                const label = files.length === 1 ? files[0].name : `${files.length} Media files`;
                const id = `media-files-sent-${selectedProjectId}-${occurredAt}`;
                appendSharedReviewActivity(sharedReviewActivityStorageKey(prototypeState.session.activeWorkspaceId, selectedProjectId), {
                  id,
                  requestId: id,
                  action: "files-sent",
                  actor,
                  company: sendCompanyName,
                  recipients: [sendCompanyName],
                  occurredAt,
                  scopeKey: files.map((file) => file.id).join(","),
                  scopeLabel: label,
                  stage: "media",
                  href: `/projects/${selectedProjectId}/stages/media?assets=${encodeURIComponent(files.map((file) => file.id).join(","))}`,
                  message: "",
                });
              }
              notify(`${selectedSharingAssets.length} ${selectedSharingAssets.length === 1 ? "file" : "files"} sent to ${sendCompanyName}.`);
            }}
            openPanelSignal={sharePanelOpenSignal}
            showSend={canSendSelection}
            showApprove={false}
            copyLinkLabel="Copy link"
            shareUrl={shareUrl}
          />
        </div> : null}
      </section>
      {activeAsset && activeProject ? <MediaAssetDrawer asset={activeAsset} projectName={activeProject.name} folders={library.folders.filter((folder) => folder.projectId === activeAsset.projectId)} comments={library.comments} transcriptNotes={mediaTranscriptNotes} storageLocations={mediaStorageLocations} capabilities={mediaCapabilitiesFor(activeProject)} globalScope={scope === "global"} activeTab={drawerTab} mentionOptions={mentionOptions} onTabChange={setDrawerTab} onRename={library.renameAsset} onAddComment={(assetId, body) => { if (canMediaAction("comment", activeProject)) library.addComment(assetId, viewer?.name ?? "Filmmaker", selectedRole === "Customer" ? "external" : "internal", body); }} onClose={() => setActiveAssetId(null)} {...commonAction} /> : null}
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
