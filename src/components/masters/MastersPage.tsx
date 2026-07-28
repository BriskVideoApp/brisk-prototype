"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Project } from "@/components/active-videos/types";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  useProjectCompletion,
  type DeliverableApprovalSnapshot,
} from "@/components/project/ProjectCompletionContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { ReviewCommentComposer } from "@/components/video-review/ReviewCommentComposer";
import {
  ReviewCommentThread,
  toggleReviewReactionInList,
} from "@/components/video-review/VideoReviewScreen";
import type {
  CommentVisibility,
  DrawingPath,
  DrawingPoint,
  ReactionEmoji,
  ReviewComment,
  User,
} from "@/components/video-review/types";
import { reviewUsers } from "@/data/video-review";
import {
  createMockSrt,
  createMockThumbnail,
  initialMastersDeliverables,
  mastersGraphicsKit,
  mastersDurationOptions,
  mastersFormatOptions,
  mastersThumbnailVariantUrls,
  type DeliverableStatus,
  type MastersComment,
  type MastersDeliverable,
  type MastersRole,
  type RecutMark,
  type RecutMarkVerb,
  type MastersSrtLine,
  type MastersThumbnailAttachment,
  type MastersVersion,
  type ThumbnailPlatform,
} from "@/data/masters";

type CommentFilter = "all" | "unresolved" | "internal" | "external";
type RequestTab = "cutdown" | "reformat" | "script";
type AssetInspector = { deliverableId: string; type: "captions" | "thumbnail" | "versions" };
type RecutDraftRange = { inSec: number; outSec: number };

const mastersStudioName = "North Star Films";

const commentFilters: Array<{ value: CommentFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Unresolved" },
  { value: "internal", label: "Team" },
  { value: "external", label: "Client" },
];

const thumbnailPlatformOptions: ThumbnailPlatform[] = [
  "YouTube",
  "LinkedIn",
  "Instagram (feed)",
  "Instagram (reel)",
  "TikTok",
  "Custom",
];

export function MastersPage({ project }: { project: Project }) {
  const { selectedRole: role } = usePrototypeRole();
  const { completionRecords, completeProject, undoProjectCompletion } = useProjectCompletion();
  const [deliverables, setDeliverables] = useState<MastersDeliverable[]>(() =>
    structuredClone(initialMastersDeliverables),
  );
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(
    initialMastersDeliverables.find((deliverable) => deliverable.name === "Main Video")?.id
      ?? initialMastersDeliverables[0]?.id
      ?? null,
  );
  const [commentsDeliverableId, setCommentsDeliverableId] = useState<string | null>(null);
  const [assetInspector, setAssetInspector] = useState<AssetInspector | null>(null);
  const [selectedVersionByDeliverable, setSelectedVersionByDeliverable] = useState<Record<string, string>>({});
  const [commentFilter, setCommentFilter] = useState<CommentFilter>("all");
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState<{ message: string; canUndo?: boolean } | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [openVersionMenuId, setOpenVersionMenuId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkApproveStep, setBulkApproveStep] = useState<"confirm" | "success" | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isConfettiVisible, setIsConfettiVisible] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [requestSourceId, setRequestSourceId] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<RequestTab>("cutdown");
  const [requestName, setRequestName] = useState("");
  const [requestFormat, setRequestFormat] = useState("9:16");
  const [requestDuration, setRequestDuration] = useState("30 secs");
  const [requestNotes, setRequestNotes] = useState("");
  const [thumbnailGenerator, setThumbnailGenerator] = useState<{ deliverableId: string; focusCopy: boolean } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<CommentVisibility>(
    role === "Customer" ? "external" : "internal",
  );
  const [isPostingMenuOpen, setIsPostingMenuOpen] = useState(false);
  const [hasCommentAnchor, setHasCommentAnchor] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [activeDrawingPath, setActiveDrawingPath] = useState<DrawingPath | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [markUpDeliverableId, setMarkUpDeliverableId] = useState<string | null>(null);
  const [recutPanelDeliverableId, setRecutPanelDeliverableId] = useState<string | null>(null);
  const [recutMarks, setRecutMarks] = useState<RecutMark[]>([]);
  const [recutMarkHistory, setRecutMarkHistory] = useState<RecutMark[][]>([]);
  const [recutMarkFuture, setRecutMarkFuture] = useState<RecutMark[][]>([]);
  const [draftRecutRange, setDraftRecutRange] = useState<RecutDraftRange | null>(null);
  const [selectedRecutMarkId, setSelectedRecutMarkId] = useState<string | null>(null);
  const [recutTargetDuration, setRecutTargetDuration] = useState(30);
  const [recutTargetAspect, setRecutTargetAspect] = useState("16:9");
  const [recutName, setRecutName] = useState("");
  const [recutNotes, setRecutNotes] = useState("");
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(() => new Set());
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetIdRef = useRef<string | null>(null);
  const uploadModeRef = useRef<"new-version" | "replace">("new-version");
  const thumbnailUploadInputRef = useRef<HTMLInputElement>(null);
  const thumbnailUploadTargetIdRef = useRef<string | null>(null);
  const pendingExpandedScrollIdRef = useRef<string | null>(null);

  const isFilmmaker = role !== "Customer";
  const isClient = role === "Customer";
  const completionRecord = completionRecords[project.id];
  const allDeliverablesApproved = areAllDeliveredFilesApproved(deliverables);
  const isProjectDelivered = Boolean(completionRecord)
    || (allDeliverablesApproved && project.status === "Completed");
  const undoSeconds = completionRecord
    ? Math.max(0, Math.ceil((new Date(completionRecord.undoExpiresAt).getTime() - clock) / 1000))
    : 0;
  const expandedDeliverable = deliverables.find((deliverable) => deliverable.id === expandedDeliverableId);
  const commentsDeliverable = deliverables.find((deliverable) => deliverable.id === commentsDeliverableId);
  const assetDeliverable = deliverables.find((deliverable) => deliverable.id === assetInspector?.deliverableId);
  const markUpDeliverable = deliverables.find((deliverable) => deliverable.id === markUpDeliverableId);
  const recutPanelDeliverable = deliverables.find((deliverable) => deliverable.id === recutPanelDeliverableId);
  const orderedDeliverables = useMemo(() => orderDeliverables(deliverables, collapsedParentIds), [collapsedParentIds, deliverables]);
  const readyDeliverables = deliverables.filter(
    (deliverable) => deliverable.status === "waiting_for_customer" && deliverable.versions.length > 0,
  );
  const canDownloadAll = isProjectDelivered;
  const hasDrawingAttachment = drawingPaths.length > 0 || activeDrawingPath !== null;
  const pendingDrawingPaths = [...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])];

  useEffect(() => {
    if (!completionRecord) return;
    setDeliverables((current) => applyCompletedDeliverables(current, completionRecord.approvedDeliverableIds));
  }, [completionRecord]);

  useEffect(() => {
    if (!completionRecord || undoSeconds <= 0) return;
    const intervalId = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [completionRecord, undoSeconds]);

  useEffect(() => {
    setCommentVisibility(role === "Customer" ? "external" : "internal");
  }, [role]);

  useEffect(() => {
    const deliverableId = pendingExpandedScrollIdRef.current;
    if (!deliverableId || expandedDeliverableId !== deliverableId) return;
    pendingExpandedScrollIdRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      const panel = document.getElementById(`masters-expanded-${deliverableId}`);
      const scrollTarget = panel?.querySelector<HTMLElement>(
        ".masters-expanded-actions, .masters-recut-awaiting-upload",
      ) ?? panel;
      if (!scrollTarget) return;

      scrollTarget.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedDeliverableId]);

  const showToast = (message: string, canUndo = false) => {
    setToast({ message, canUndo });
    window.setTimeout(() => setToast(null), 2600);
  };

  const startConfetti = () => {
    setIsConfettiVisible(true);
    window.setTimeout(() => setIsConfettiVisible(false), 2000);
  };

  const finaliseProject = (
    nextDeliverables: MastersDeliverable[],
    approvedDeliverableIds: string[],
    snapshot: Record<string, DeliverableApprovalSnapshot>,
    toastMessage?: string,
  ) => {
    const deliveredAt = new Date().toISOString();
    setDeliverables(nextDeliverables);
    completeProject(project.id, {
      deliveredAt,
      deliveredBy: isClient ? "client-jess-taylor" : "studio-tom-evans",
      undoExpiresAt: new Date(Date.now() + 30_000).toISOString(),
      approvedDeliverableIds,
      deliverableSnapshots: snapshot,
    });
    setClock(Date.now());
    setIsBannerDismissed(false);
    startConfetti();
    if (toastMessage) showToast(toastMessage, true);
  };

  const undoApproval = () => {
    if (!completionRecord || undoSeconds <= 0) return;
    setDeliverables((current) => restoreDeliverableSnapshots(current, completionRecord.deliverableSnapshots));
    undoProjectCompletion(project.id);
    setIsBannerDismissed(false);
    setToast(null);
    showToast("Approval undone.");
  };

  const closeMenus = () => {
    setOpenRowMenuId(null);
    setOpenVersionMenuId(null);
  };

  const expandDeliverable = (deliverableId: string) => {
    if (expandedDeliverableId === deliverableId) {
      setExpandedDeliverableId(null);
      setCommentsDeliverableId(null);
      setAssetInspector(null);
      setRecutPanelDeliverableId(null);
      closeMenus();
      return;
    }

    const deliverable = deliverables.find((item) => item.id === deliverableId);
    const version = deliverable ? getPresentedVersion(deliverable, selectedVersionByDeliverable) : undefined;
    pendingExpandedScrollIdRef.current = deliverableId;
    setExpandedDeliverableId(deliverableId);
    setCommentsDeliverableId(null);
    setAssetInspector(null);
    setRecutPanelDeliverableId(deliverable?.recutBrief ? deliverable.id : null);
    setMarkUpDeliverableId(null);
    setCommentFilter("all");
    setCurrentTimeSeconds(version ? Math.min(12, version.durationSeconds) : 0);
    setIsPlaying(false);
    closeMenus();
  };

  const toggleParentChildren = (deliverableId: string) => {
    setCollapsedParentIds((current) => {
      const next = new Set(current);
      if (next.has(deliverableId)) next.delete(deliverableId);
      else next.add(deliverableId);
      return next;
    });
  };

  const toggleDeliverableComments = (deliverableId: string) => {
    if (commentsDeliverableId === deliverableId) {
      setCommentsDeliverableId(null);
      setDrawingPaths([]);
      setActiveDrawingPath(null);
      setIsDrawingMode(false);
      setSelectedCommentId(null);
      return;
    }

    const deliverable = deliverables.find((item) => item.id === deliverableId);
    const version = deliverable ? getPresentedVersion(deliverable, selectedVersionByDeliverable) : undefined;
    setExpandedDeliverableId(deliverableId);
    setCommentsDeliverableId(deliverableId);
    setAssetInspector(null);
    setRecutPanelDeliverableId(null);
    setMarkUpDeliverableId(null);
    setCommentFilter("all");
    setHasCommentAnchor(true);
    setDrawingPaths([]);
    setActiveDrawingPath(null);
    setIsDrawingMode(false);
    setSelectedCommentId(null);
    setCurrentTimeSeconds(version ? Math.min(12, version.durationSeconds) : 0);
    setIsPlaying(false);
    closeMenus();
  };

  const openAssetInspector = (deliverableId: string, type: AssetInspector["type"]) => {
    setExpandedDeliverableId(deliverableId);
    setCommentsDeliverableId(null);
    setRecutPanelDeliverableId(null);
    setMarkUpDeliverableId(null);
    setAssetInspector({ deliverableId, type });
    setCommentFilter("all");
    setIsPlaying(false);
    closeMenus();
  };

  const moveRowFocus = (deliverableId: string, direction: -1 | 1) => {
    const currentIndex = deliverables.findIndex((deliverable) => deliverable.id === deliverableId);
    const next = deliverables[currentIndex + direction];
    if (!next) return;
    document.getElementById(`masters-row-${next.id}`)?.focus();
  };

  const selectVersion = (deliverableId: string, versionId: string) => {
    setSelectedVersionByDeliverable((current) => ({ ...current, [deliverableId]: versionId }));
    setExpandedDeliverableId(deliverableId);
    setOpenVersionMenuId(null);
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
  };

  const setCurrentVersion = (deliverableId: string, versionId: string) => {
    selectVersion(deliverableId, versionId);
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === deliverableId ? { ...deliverable, currentVersionId: versionId } : deliverable,
    ));
    showToast("Current version updated.");
  };

  const approveDeliverable = (deliverableId: string, versionId?: string) => {
    const nextDeliverables = deliverables.map((deliverable) => {
      if (deliverable.id !== deliverableId) return deliverable;
      const version = deliverable.versions.find((item) => item.id === versionId)
        ?? getPresentedVersion(deliverable, selectedVersionByDeliverable)
        ?? deliverable.versions[deliverable.versions.length - 1];
      if (!version) return deliverable;
      return {
        ...deliverable,
        approvedVersionId: version.id,
        currentVersionId: version.id,
        status: "approved" as const,
        versions: deliverable.versions.map((item) => ({ ...item, approved: item.id === version.id })),
      };
    });
    setDeliverables(nextDeliverables);
    showToast("Version approved.");
  };

  const unapproveDeliverable = (deliverableId: string, versionId: string) => {
    setDeliverables((current) => current.map((deliverable) => {
      if (deliverable.id !== deliverableId) return deliverable;
      return {
        ...deliverable,
        approvedVersionId: undefined,
        status: "waiting_for_customer" as const,
        versions: deliverable.versions.map((version) => (
          version.id === versionId ? { ...version, approved: false } : version
        )),
      };
    }));
    if (completionRecord) undoProjectCompletion(project.id);
    setBulkApproveStep(null);
    setIsBannerDismissed(false);
    showToast("Approval removed. This version is ready for review again.");
  };

  const approveAllReady = (selectedIds: string[]) => {
    const snapshot = createDeliverableSnapshots(deliverables);
    const selectedReadyIds = new Set(selectedIds);
    const downloadableIds = new Set(deliverables
      .filter((deliverable) => deliverable.versions.length > 0 && (
        selectedReadyIds.has(deliverable.id)
        || deliverable.status === "approved"
        || deliverable.status === "delivered"
      ))
      .map((deliverable) => deliverable.id));
    const nextDeliverables = deliverables.map((deliverable) => {
      if (!downloadableIds.has(deliverable.id)) return deliverable;
      const approvedVersion = deliverable.versions.find((version) => version.id === deliverable.approvedVersionId)
        ?? deliverable.versions.find((version) => version.id === deliverable.currentVersionId)
        ?? deliverable.versions[deliverable.versions.length - 1];
      if (!approvedVersion) return deliverable;
      return {
        ...deliverable,
        approvedVersionId: approvedVersion.id,
        currentVersionId: approvedVersion.id,
        status: "delivered" as const,
        versions: deliverable.versions.map((version) => ({ ...version, approved: version.id === approvedVersion.id })),
      };
    });
    finaliseProject(
      nextDeliverables,
      [...downloadableIds],
      snapshot,
      `${selectedIds.length} deliverable${selectedIds.length === 1 ? "" : "s"} approved. Download all is ready.`,
    );
    setBulkApproveStep("success");
  };

  const openUpload = (deliverableId: string, mode: "new-version" | "replace" = "new-version") => {
    if (!isFilmmaker) return;
    uploadTargetIdRef.current = deliverableId;
    uploadModeRef.current = mode;
    setExpandedDeliverableId(deliverableId);
    window.setTimeout(() => uploadInputRef.current?.click(), 0);
  };

  const uploadVersion = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isFilmmaker) return;
    const file = event.target.files?.[0];
    const target = deliverables.find((deliverable) => deliverable.id === uploadTargetIdRef.current);
    if (!file || !target) return;

    const nextNumber = Math.max(0, ...target.versions.map((version) => version.number)) + 1;
    const previousVersion = target.versions.find((version) => version.id === target.currentVersionId)
      ?? getPresentedVersion(target, selectedVersionByDeliverable);
    const isReplacingCurrent = uploadModeRef.current === "replace" && Boolean(previousVersion);
    const nextVersion: MastersVersion = {
      id: isReplacingCurrent && previousVersion ? previousVersion.id : `${target.id}-v${nextNumber}-${Date.now()}`,
      number: isReplacingCurrent && previousVersion ? previousVersion.number : nextNumber,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "Tom Evans",
      codec: target.kind === "captions" ? "UTF-8 subtitles" : "H.264 High",
      resolution: target.kind === "captions" ? "Timed text" : target.format === "9:16" ? "1080 × 1920" : "3840 × 2160",
      fileSize: formatFileSize(file.size),
      durationSeconds: previousVersion?.durationSeconds ?? durationLabelToSeconds(target.duration),
      shadePath: `Shade/${project.name}/Masters/${target.name}/V${nextNumber}`,
      approved: false,
    };

    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === target.id
        ? {
            ...deliverable,
            versions: isReplacingCurrent
              ? deliverable.versions.map((version) => version.id === nextVersion.id ? nextVersion : version)
              : [...deliverable.versions, nextVersion],
            currentVersionId: nextVersion.id,
            approvedVersionId: undefined,
            status: "waiting_for_customer",
            srt: deliverable.kind === "video"
              ? deliverable.srt ?? createMockSrt(`${deliverable.id}-caption`, `${file.name.replace(/\.[^.]+$/, "")}_en-AU.srt`, nextVersion.durationSeconds)
              : deliverable.srt,
            thumbnail: deliverable.kind === "video"
              ? deliverable.thumbnail ?? createMockThumbnail(deliverable.platform, currentTimeSeconds)
              : deliverable.thumbnail,
          }
        : deliverable,
    ));
    setSelectedVersionByDeliverable((current) => ({ ...current, [target.id]: nextVersion.id }));
    if (target.recutBrief) setRecutPanelDeliverableId(null);
    setCurrentTimeSeconds(0);
    event.target.value = "";
    uploadModeRef.current = "new-version";
    showToast(
      isReplacingCurrent
        ? `V${nextVersion.number} replaced. This deliverable is now in review.`
        : `V${nextNumber} uploaded. This deliverable is now in review.`,
    );
  };

  const saveCaptions = (deliverableId: string, lines: MastersSrtLine[]) => {
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === deliverableId && deliverable.srt
        ? { ...deliverable, srt: { ...deliverable.srt, lines } }
        : deliverable,
    ));
    showToast("Captions saved and re-attached.");
  };

  const downloadSrt = (deliverable: MastersDeliverable) => {
    if (!deliverable.srt) return;
    downloadTextFile(deliverable.srt.filename, formatSrtFile(deliverable.srt.lines), "application/x-subrip", showToast);
  };

  const openThumbnailGenerator = (deliverableId: string, focusCopy = false) => {
    setThumbnailGenerator({ deliverableId, focusCopy });
  };

  const openThumbnailUpload = (deliverableId: string) => {
    thumbnailUploadTargetIdRef.current = deliverableId;
    window.setTimeout(() => thumbnailUploadInputRef.current?.click(), 0);
  };

  const replaceThumbnail = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const deliverableId = thumbnailUploadTargetIdRef.current;
    if (!file || !deliverableId) return;
    const imageUrl = URL.createObjectURL(file);
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === deliverableId && deliverable.thumbnail
        ? { ...deliverable, thumbnail: { ...deliverable.thumbnail, imageUrl, source: "uploaded" } }
        : deliverable,
    ));
    event.target.value = "";
    setThumbnailGenerator(null);
    openAssetInspector(deliverableId, "thumbnail");
    showToast("Thumbnail replaced with your upload.");
  };

  const useGeneratedThumbnail = (deliverableId: string, thumbnail: MastersThumbnailAttachment) => {
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === deliverableId ? { ...deliverable, thumbnail } : deliverable,
    ));
    setThumbnailGenerator(null);
    openAssetInspector(deliverableId, "thumbnail");
    showToast("Generated thumbnail attached.");
  };

  const deleteVersion = (deliverableId: string, versionId: string) => {
    setDeliverables((current) => current.map((deliverable) => {
      if (deliverable.id !== deliverableId) return deliverable;
      const versions = deliverable.versions.filter((version) => version.id !== versionId);
      const approvedVersionId = deliverable.approvedVersionId === versionId ? undefined : deliverable.approvedVersionId;
      const currentVersionId = deliverable.currentVersionId === versionId
        ? versions[versions.length - 1]?.id
        : deliverable.currentVersionId;
      return {
        ...deliverable,
        versions,
        approvedVersionId,
        currentVersionId,
        status: versions.length ? deliverable.status : "not_started",
      };
    }));
    setSelectedVersionByDeliverable((current) => {
      const next = { ...current };
      delete next[deliverableId];
      return next;
    });
    showToast("Version removed from this prototype.");
  };

  const deleteDeliverable = (deliverableId: string) => {
    const remaining = deliverables.filter((deliverable) => deliverable.id !== deliverableId);
    setDeliverables(remaining);
    if (expandedDeliverableId === deliverableId) setExpandedDeliverableId(remaining[0]?.id ?? null);
    if (commentsDeliverableId === deliverableId) setCommentsDeliverableId(null);
    if (assetInspector?.deliverableId === deliverableId) setAssetInspector(null);
    setDeleteConfirmId(null);
    closeMenus();
    showToast("Deliverable removed from this prototype.");
  };

  const addDeliverable = () => {
    if (!isFilmmaker) return;
    const id = `masters-deliverable-${Date.now()}`;
    const deliverable: MastersDeliverable = {
      id,
      briefDeliverableId: id,
      name: "New deliverable",
      platform: "Other",
      format: "16:9",
      duration: "60 secs",
      captions: ["None"],
      status: "not_started",
      versions: [],
      comments: [],
      unreadCommentCount: 0,
      addedBy: "filmmaker",
      kind: "video",
    };
    setDeliverables((current) => [...current, deliverable]);
    setExpandedDeliverableId(id);
    setEditingNameId(id);
  };

  const openRequest = (deliverable: MastersDeliverable) => {
    setRequestSourceId(deliverable.id);
    setRequestTab("cutdown");
    setRequestName(`30s cut from ${deliverable.name}`);
    setRequestFormat(deliverable.format);
    setRequestDuration("30 secs");
    setRequestNotes("");
  };

  const submitRequest = () => {
    const source = deliverables.find((deliverable) => deliverable.id === requestSourceId);
    if (!source || !requestName.trim()) return;
    const id = `requested-${Date.now()}`;
    const requested: MastersDeliverable = {
      id,
      briefDeliverableId: `client-request-${id}`,
      name: requestName.trim(),
      platform: source.platform,
      format: requestTab === "reformat" ? requestFormat : source.format,
      duration: requestTab === "cutdown" ? requestDuration : source.duration,
      captions: source.captions,
      status: "waiting_for_studio",
      versions: [],
      comments: requestNotes.trim()
        ? [{
            id: `request-note-${Date.now()}`,
            author: "Jess Taylor",
            initials: "JT",
            visibility: "external",
            body: requestNotes.trim(),
            createdAgo: "Just now",
            resolved: false,
          }]
        : [],
      unreadCommentCount: 0,
      isRequested: true,
      addedBy: "client-request",
      kind: "video",
    };
    setDeliverables((current) => [...current, requested]);
    setExpandedDeliverableId(id);
    setCommentsDeliverableId(null);
    setAssetInspector(null);
    setRequestSourceId(null);
    showToast("Request added to the delivery register.");
  };

  const finishDrawing = () => {
    if (activeDrawingPath && activeDrawingPath.points.length >= 2) {
      setDrawingPaths((current) => [...current, activeDrawingPath]);
    }

    setActiveDrawingPath(null);
  };

  const clearDrawingAttachment = () => {
    setDrawingPaths([]);
    setActiveDrawingPath(null);
    setIsDrawingMode(false);
  };

  const undoLastDrawingStroke = () => {
    setActiveDrawingPath(null);
    setDrawingPaths((current) => current.slice(0, -1));
  };

  const finishDrawingMode = () => {
    finishDrawing();
    setIsDrawingMode(false);
  };

  const postComment = () => {
    const trimmedDraft = commentDraft.trim();
    if (!commentsDeliverable || (!trimmedDraft && !hasDrawingAttachment)) return;
    const comment: MastersComment = {
      id: `masters-comment-${Date.now()}`,
      author: role === "Customer" ? "Jess Taylor" : "Tom Evans",
      initials: role === "Customer" ? "JT" : "TE",
      visibility: commentVisibility,
      ...(hasCommentAnchor ? { timecodeSeconds: currentTimeSeconds } : {}),
      body: trimmedDraft || "Drawing note",
      createdAgo: "Just now",
      resolved: false,
      drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
    };
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === commentsDeliverable.id
        ? {
            ...deliverable,
            comments: [...deliverable.comments, comment],
            unreadCommentCount: deliverable.unreadCommentCount + 1,
          }
        : deliverable,
    ));
    setCommentDraft("");
    setSelectedCommentId(comment.id);
    setHasCommentAnchor(true);
    clearDrawingAttachment();
  };

  const startRecutMarkup = (deliverable: MastersDeliverable) => {
    const source = getRecutSource(deliverable, deliverables);
    const duration = getDeliverableDurationSeconds(source);
    setExpandedDeliverableId(source.id);
    setMarkUpDeliverableId(source.id);
    setRecutPanelDeliverableId(null);
    setCommentsDeliverableId(null);
    setAssetInspector(null);
    setRecutMarks([]);
    setRecutMarkHistory([]);
    setRecutMarkFuture([]);
    setDraftRecutRange(null);
    setSelectedRecutMarkId(null);
    setRecutTargetDuration(duration);
    setRecutTargetAspect(source.format);
    setRecutName(getAutoRecutName(duration, source.format, source.name));
    setRecutNotes("");
    setIsPlaying(false);
    closeMenus();
  };

  const cancelRecutMarkup = () => {
    if (recutMarks.length > 0 && !window.confirm("Discard this recut mark-up draft?")) return;
    setMarkUpDeliverableId(null);
    setDraftRecutRange(null);
    setSelectedRecutMarkId(null);
    setRecutMarks([]);
    setRecutMarkHistory([]);
    setRecutMarkFuture([]);
  };

  const rememberRecutMarks = () => {
    setRecutMarkHistory((current) => [...current.slice(-19), structuredClone(recutMarks)]);
    setRecutMarkFuture([]);
  };

  const undoLastRecutChange = () => {
    const previousMarks = recutMarkHistory.at(-1);
    if (!previousMarks) return;
    setRecutMarkFuture((current) => [...current.slice(-19), structuredClone(recutMarks)]);
    setRecutMarks(previousMarks);
    setRecutMarkHistory((current) => current.slice(0, -1));
    setDraftRecutRange(null);
    setSelectedRecutMarkId((current) => (
      current && previousMarks.some((mark) => mark.id === current) ? current : null
    ));
    showToast("Last recut change undone.");
  };

  const redoLastRecutChange = () => {
    const nextMarks = recutMarkFuture.at(-1);
    if (!nextMarks) return;
    setRecutMarkHistory((current) => [...current.slice(-19), structuredClone(recutMarks)]);
    setRecutMarks(nextMarks);
    setRecutMarkFuture((current) => current.slice(0, -1));
    setDraftRecutRange(null);
    setSelectedRecutMarkId((current) => (
      current && nextMarks.some((mark) => mark.id === current) ? current : null
    ));
    showToast("Recut change restored.");
  };

  const addRecutMark = (verb: RecutMarkVerb) => {
    if (!draftRecutRange) return;
    const sourceDuration = markUpDeliverable ? getDeliverableDurationSeconds(markUpDeliverable) : Number.POSITIVE_INFINITY;
    const inSec = Math.min(Math.min(draftRecutRange.inSec, draftRecutRange.outSec), Math.max(0, sourceDuration - 1));
    const outSec = Math.min(sourceDuration, Math.max(draftRecutRange.inSec, draftRecutRange.outSec));
    const now = new Date().toISOString();
    const mark: RecutMark = {
      id: `recut-mark-${Date.now()}`,
      inSec,
      outSec: Math.max(inSec + 1, outSec),
      verb,
      createdBy: role === "Customer" ? "client-jess-taylor" : "studio-tom-evans",
      createdAt: now,
    };
    rememberRecutMarks();
    setRecutMarks((current) => [...current, mark].sort((left, right) => left.inSec - right.inSec));
    setSelectedRecutMarkId(mark.id);
    setDraftRecutRange(null);
  };

  const updateRecutMark = (markId: string, updates: Partial<Pick<RecutMark, "inSec" | "outSec" | "verb" | "note">>) => {
    setRecutMarks((current) => current
      .map((mark) => {
        if (mark.id !== markId) return mark;
        const next = { ...mark, ...updates };
        const inSec = Math.max(0, next.inSec);
        return { ...next, inSec, outSec: Math.max(inSec + 0.04, next.outSec) };
      })
      .sort((left, right) => left.inSec - right.inSec));
  };

  const changeRecutMarkVerb = (markId: string, verb: RecutMarkVerb) => {
    const mark = recutMarks.find((item) => item.id === markId);
    if (!mark || mark.verb === verb) return;
    rememberRecutMarks();
    updateRecutMark(markId, { verb });
  };

  const deleteRecutMark = (markId: string) => {
    rememberRecutMarks();
    setRecutMarks((current) => current.filter((mark) => mark.id !== markId));
    setSelectedRecutMarkId((current) => current === markId ? null : current);
  };

  const submitRecut = () => {
    if (!markUpDeliverable || recutMarks.length === 0) return;
    if (recutMarks.some((mark) => mark.verb === "trim" && !mark.note?.trim())) {
      showToast("Describe the change before sending it to the editor.");
      return;
    }
    const createdAt = new Date().toISOString();
    const childId = `recut-${Date.now()}`;
    const sortedMarks = [...recutMarks].sort((left, right) => left.inSec - right.inSec);
    const child: MastersDeliverable = {
      id: childId,
      briefDeliverableId: `recut-brief-${childId}`,
      parentDeliverableId: markUpDeliverable.id,
      name: recutName.trim() || getAutoRecutName(recutTargetDuration, recutTargetAspect, markUpDeliverable.name),
      platform: markUpDeliverable.platform,
      format: recutTargetAspect,
      duration: formatRecutDuration(recutTargetDuration),
      captions: ["None"],
      status: "waiting_for_studio",
      versions: [],
      comments: [],
      unreadCommentCount: 0,
      addedBy: role === "Customer" ? "client-request" : "filmmaker",
      kind: "video",
      thumbnail: markUpDeliverable.thumbnail ? { ...markUpDeliverable.thumbnail } : undefined,
      createdAt,
      recutBrief: {
        parentDeliverableId: markUpDeliverable.id,
        targetDurationSec: recutTargetDuration,
        targetAspect: recutTargetAspect,
        marks: sortedMarks,
        notes: recutNotes.trim() || undefined,
        source: "timeline",
        createdBy: role === "Customer" ? "client-jess-taylor" : "studio-tom-evans",
        createdAt,
      },
    };
    setDeliverables((current) => insertRecutChild(current, child));
    setCollapsedParentIds((current) => {
      const next = new Set(current);
      next.delete(markUpDeliverable.id);
      return next;
    });
    setExpandedDeliverableId(child.id);
    setRecutPanelDeliverableId(child.id);
    setMarkUpDeliverableId(null);
    setDraftRecutRange(null);
    setSelectedRecutMarkId(null);
    setRecutMarks([]);
    setRecutMarkHistory([]);
    setRecutMarkFuture([]);
    window.sessionStorage.setItem("brisk-studio-notification", JSON.stringify({
      message: `New recut brief from ${project.clientName} on ${markUpDeliverable.name} - ${sortedMarks.length} ${sortedMarks.length === 1 ? "mark" : "marks"}, target ${recutTargetDuration}s`,
      createdAt,
      deliverableId: child.id,
    }));
    showToast(`Recut sent to editor - ${sortedMarks.length} ${sortedMarks.length === 1 ? "mark" : "marks"}`);
  };

  const openRecutInEdit = (deliverable: MastersDeliverable) => {
    if (!deliverable.recutBrief) return;
    window.sessionStorage.setItem("brisk-recut-brief", JSON.stringify({
      childDeliverableId: deliverable.id,
      childName: deliverable.name,
      brief: deliverable.recutBrief,
    }));
    window.location.assign(`/review?recut=${encodeURIComponent(deliverable.id)}`);
  };

  useEffect(() => {
    if (!markUpDeliverableId) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const key = event.key.toLowerCase();
      const verbByKey: Partial<Record<string, RecutMarkVerb>> = { k: "keep", x: "cut", t: "trim" };
      if (draftRecutRange && verbByKey[key]) {
        event.preventDefault();
        addRecutMark(verbByKey[key]);
      }
      if (event.key === "Delete" && selectedRecutMarkId) {
        event.preventDefault();
        deleteRecutMark(selectedRecutMarkId);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRecutMarkup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main className="masters-shell">
      <ProjectStageHeader
        project={project}
        activeStage="masters"
        actions={isFilmmaker && isProjectDelivered && undoSeconds === 0 ? (
          <div className="masters-project-menu-wrap">
            <button
              className="masters-project-menu-button"
              type="button"
              aria-label="Masters project actions"
              aria-expanded={isProjectMenuOpen}
              onClick={() => setIsProjectMenuOpen((current) => !current)}
            >
              <DsIcon name="dots-three" size={18} />
            </button>
            {isProjectMenuOpen ? (
              <div className="masters-project-menu">
                <button type="button" className="label-xs-semibold" onClick={() => { setIsProjectMenuOpen(false); setIsReopenDialogOpen(true); }}>
                  Reopen project
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      />

      {isProjectDelivered && completionRecord && !isBannerDismissed ? (
        <div className="masters-delivered-banner" role="status">
          <span>{isClient ? "🎉 Project delivered. Thanks for your work with North Star Films." : `🎉 Project delivered to ${project.clientName}.`}</span>
          <button type="button" aria-label="Dismiss delivered message" onClick={() => setIsBannerDismissed(true)}>
            <DsIcon name="x-close-cross" size={16} />
          </button>
        </div>
      ) : null}

      {isConfettiVisible ? <ConfettiBurst /> : null}

      <section className={`masters-register-workspace ${commentsDeliverable || assetDeliverable || markUpDeliverable || recutPanelDeliverable ? "has-comments-rail" : ""}`}>
        <section className="masters-register">
          <section className="masters-delivery-register" aria-label="Deliverables register" role="table">
            <div className="masters-register-column-header" role="row">
              <span role="columnheader">Deliverable</span>
              <span role="columnheader">Details</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Action</span>
            </div>
            {deliverables.length ? (
              <div className="masters-deliverable-list" role="rowgroup">
                {orderedDeliverables.map((deliverable) => {
                  const selectedVersion = getPresentedVersion(deliverable, selectedVersionByDeliverable);
                  const sourceDeliverable = deliverable.recutBrief && !selectedVersion
                    ? getRecutSource(deliverable, deliverables)
                    : deliverable;
                  const playbackVersion = selectedVersion
                    ?? getPresentedVersion(sourceDeliverable, selectedVersionByDeliverable);
                  const childCount = deliverables.filter((item) => item.parentDeliverableId === deliverable.id).length;
                  const childrenExpanded = !collapsedParentIds.has(deliverable.id);
                  const expanded = deliverable.id === expandedDeliverableId;
                  return (
                    <div className={`masters-deliverable-item ${expanded ? "expanded" : ""}`} key={deliverable.id}>
                      <DeliverableRow
                        deliverable={deliverable}
                        expanded={expanded}
                        hasChildren={childCount > 0}
                        childrenExpanded={childCount > 0 && childrenExpanded}
                        selectedVersion={selectedVersion}
                        commentCount={deliverable.comments.filter((comment) => role !== "Customer" || comment.visibility === "external").length}
                        unreadCommentCount={deliverable.unreadCommentCount}
                        isFilmmaker={isFilmmaker}
                        customerName={project.clientName}
                        studioName={mastersStudioName}
                        editingName={editingNameId === deliverable.id}
                        commentsOpen={commentsDeliverableId === deliverable.id}
                        versionsOpen={openVersionMenuId === deliverable.id}
                        rowMenuOpen={openRowMenuId === deliverable.id}
                        onChangeName={(name) => setDeliverables((current) => current.map((item) =>
                          item.id === deliverable.id ? { ...item, name } : item,
                        ))}
                        onApprove={() => selectedVersion && approveDeliverable(deliverable.id, selectedVersion.id)}
                        onDelete={() => {
                          setDeleteConfirmId(deliverable.id);
                          closeMenus();
                        }}
                        onDownload={() => {
                          if (selectedVersion) downloadPrototypeFile(selectedVersion.filename, showToast);
                          closeMenus();
                        }}
                        onEditName={() => {
                          setEditingNameId(editingNameId === deliverable.id ? null : deliverable.id);
                          closeMenus();
                        }}
                        onMoveFocus={(direction) => moveRowFocus(deliverable.id, direction)}
                        onOpenCaptions={() => openAssetInspector(deliverable.id, "captions")}
                        onOpenThumbnail={() => openAssetInspector(deliverable.id, "thumbnail")}
                        canMarkUpRecut={Boolean(selectedVersion)
                          && !deliverable.parentDeliverableId
                          && (isFilmmaker || deliverable.status === "approved" || deliverable.status === "delivered")
                          && markUpDeliverableId !== sourceDeliverable.id}
                        onMarkUpRecut={() => {
                          closeMenus();
                          startRecutMarkup(deliverable);
                        }}
                        onReplace={() => {
                          closeMenus();
                          openUpload(deliverable.id, "replace");
                        }}
                        onSelect={() => expandDeliverable(deliverable.id)}
                        onToggleChildren={() => toggleParentChildren(deliverable.id)}
                        onSelectVersion={(versionId) => selectVersion(deliverable.id, versionId)}
                        onShare={() => {
                          void copyShareLink(deliverable.id, showToast);
                          closeMenus();
                        }}
                        onToggleComments={() => toggleDeliverableComments(deliverable.id)}
                        onToggleVersions={() => {
                          setOpenVersionMenuId(openVersionMenuId === deliverable.id ? null : deliverable.id);
                          setOpenRowMenuId(null);
                        }}
                        onUpload={() => {
                          closeMenus();
                          openUpload(deliverable.id);
                        }}
                        onToggleRowMenu={() => {
                          setOpenRowMenuId(openRowMenuId === deliverable.id ? null : deliverable.id);
                          setOpenVersionMenuId(null);
                        }}
                      />
                      {expanded ? (
                        <ExpandedDeliverable
                          deliverable={deliverable}
                          sourceDeliverable={sourceDeliverable}
                          version={playbackVersion}
                          role={role}
                          isFilmmaker={isFilmmaker}
                          currentTimeSeconds={currentTimeSeconds}
                          isPlaying={isPlaying}
                          isMuted={isMuted}
                          isDrawingMode={isDrawingMode && commentsDeliverableId === deliverable.id}
                          drawingPaths={commentsDeliverableId === deliverable.id ? drawingPaths : []}
                          activeDrawingPath={commentsDeliverableId === deliverable.id ? activeDrawingPath : null}
                          selectedDrawingPaths={
                            deliverable.comments.find((comment) => comment.id === selectedCommentId)?.drawingPaths ?? []
                          }
                          isMarkUpMode={markUpDeliverableId === sourceDeliverable.id}
                          recutMarks={markUpDeliverableId === sourceDeliverable.id
                            ? recutMarks
                            : deliverable.recutBrief && deliverable.versions.length === 0
                              ? deliverable.recutBrief.marks
                              : []}
                          draftRecutRange={draftRecutRange}
                          selectedRecutMarkId={selectedRecutMarkId}
                          canUndoRecut={recutMarkHistory.length > 0}
                          canRedoRecut={recutMarkFuture.length > 0}
                          onApprove={() => approveDeliverable(deliverable.id)}
                          onUnapprove={() => {
                            if (playbackVersion) unapproveDeliverable(deliverable.id, playbackVersion.id);
                          }}
                          onDownload={(versionToDownload) => downloadPrototypeFile(versionToDownload.filename, showToast)}
                          onCancelRecutMarkup={cancelRecutMarkup}
                          onSubmitRecut={submitRecut}
                          onBeginRecutInstruction={() => {
                            setDraftRecutRange(null);
                            setSelectedRecutMarkId(null);
                          }}
                          onChangeDraftRecutRange={(range) => {
                            setDraftRecutRange(range);
                            if (range) setSelectedRecutMarkId(null);
                          }}
                          onChooseRecutVerb={addRecutMark}
                          onChangeRecutVerb={changeRecutMarkVerb}
                          onPrepareRecutEdit={rememberRecutMarks}
                          onUndoRecut={undoLastRecutChange}
                          onRedoRecut={redoLastRecutChange}
                          onUpdateRecutMark={updateRecutMark}
                          onSelectRecutMark={(mark) => {
                            setDraftRecutRange(null);
                            setSelectedRecutMarkId(mark.id);
                            setCurrentTimeSeconds(mark.inSec);
                          }}
                          onSeek={setCurrentTimeSeconds}
                          onSelectComment={(comment) => {
                            setCommentsDeliverableId(deliverable.id);
                            setAssetInspector(null);
                            setRecutPanelDeliverableId(null);
                            setMarkUpDeliverableId(null);
                            setCommentFilter("all");
                            setSelectedCommentId(comment.id);
                            if (typeof comment.timecodeSeconds === "number") {
                              setHasCommentAnchor(true);
                              setCurrentTimeSeconds(comment.timecodeSeconds);
                            }
                          }}
                          onStartDrawing={(point) => {
                            setIsPlaying(false);
                            setSelectedCommentId(null);
                            setActiveDrawingPath({ id: `masters-drawing-${Date.now()}`, points: [point] });
                          }}
                          onUpdateDrawing={(point) => {
                            setActiveDrawingPath((currentPath) => currentPath
                              ? { ...currentPath, points: [...currentPath.points, point] }
                              : currentPath);
                          }}
                          onEndDrawing={finishDrawing}
                          onClearDrawing={() => {
                            setDrawingPaths([]);
                            setActiveDrawingPath(null);
                          }}
                          onDoneDrawing={finishDrawingMode}
                          onUndoDrawing={undoLastDrawingStroke}
                          onToggleMuted={() => setIsMuted((current) => !current)}
                          onTogglePlaying={() => setIsPlaying((current) => !current)}
                          onUpload={() => openUpload(deliverable.id)}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="masters-page-empty">
                <DsIcon name="film-strip" size={28} />
                <h2>No deliverables yet</h2>
                <p className="label-s">Add the first output for this project.</p>
                {isFilmmaker ? (
                  <button className="masters-primary-button label-s-semibold" type="button" onClick={addDeliverable}>
                    <DsIcon name="plus" size={16} />Add deliverable
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </section>

        {markUpDeliverable ? (
          <aside className="masters-comments-rail masters-recut-panel" aria-label={`${markUpDeliverable.name} recut mark-up`}>
            <RecutMarkupPanel
              parent={markUpDeliverable}
              marks={recutMarks}
              selectedMarkId={selectedRecutMarkId}
              targetDuration={recutTargetDuration}
              targetAspect={recutTargetAspect}
              name={recutName}
              notes={recutNotes}
              onCancel={cancelRecutMarkup}
              onChangeName={setRecutName}
              onChangeNotes={setRecutNotes}
              onChangeTargetAspect={(aspect) => {
                setRecutTargetAspect(aspect);
                setRecutName(getAutoRecutName(recutTargetDuration, aspect, markUpDeliverable.name));
              }}
              onChangeTargetDuration={(duration) => {
                setRecutTargetDuration(duration);
                setRecutName(getAutoRecutName(duration, recutTargetAspect, markUpDeliverable.name));
              }}
              onDeleteMark={deleteRecutMark}
              onPrepareEdit={rememberRecutMarks}
              onSelectMark={(mark) => {
                setDraftRecutRange(null);
                setSelectedRecutMarkId(mark.id);
                setCurrentTimeSeconds(mark.inSec);
              }}
              onSubmit={submitRecut}
              onUpdateMark={updateRecutMark}
            />
          </aside>
        ) : recutPanelDeliverable?.recutBrief ? (
          <aside className="masters-comments-rail masters-recut-panel" aria-label={`${recutPanelDeliverable.name} recut brief`}>
            <RecutBriefPanel
              deliverable={recutPanelDeliverable}
              isFilmmaker={isFilmmaker}
              selectedMarkId={selectedRecutMarkId}
              onSelectMark={(mark) => {
                setSelectedRecutMarkId(mark.id);
                setCurrentTimeSeconds(mark.inSec);
              }}
              onOpenInEdit={() => openRecutInEdit(recutPanelDeliverable)}
            />
          </aside>
        ) : assetInspector && assetDeliverable ? (
          <aside className="masters-comments-rail masters-asset-inspector" aria-label={`${assetDeliverable.name} ${assetInspector.type}`}>
            <header className="masters-comments-rail-header">
              <div>
                <h2>{assetInspector.type === "captions" ? "Captions (SRT)" : assetInspector.type === "versions" ? `Versions (${assetDeliverable.versions.length})` : "Thumbnail"}</h2>
                <span className="label-xs">{assetDeliverable.name}</span>
              </div>
              <button type="button" aria-label="Close inspector" onClick={() => setAssetInspector(null)}><DsIcon name="x-close-cross" size={16} /></button>
            </header>
            {assetInspector.type === "captions" && assetDeliverable.srt ? (
              <SrtInspector
                key={`${assetDeliverable.id}-${assetDeliverable.srt.filename}`}
                attachment={assetDeliverable.srt}
                isEditable={isFilmmaker}
                onDownload={() => downloadSrt(assetDeliverable)}
                onSave={(lines) => saveCaptions(assetDeliverable.id, lines)}
                onSeek={(seconds) => { setExpandedDeliverableId(assetDeliverable.id); setCurrentTimeSeconds(seconds); }}
              />
            ) : assetInspector.type === "thumbnail" && assetDeliverable.thumbnail ? (
              <ThumbnailInspector
                deliverable={assetDeliverable}
                isFilmmaker={isFilmmaker}
                onEditCopy={() => openThumbnailGenerator(assetDeliverable.id, true)}
                onRegenerate={() => openThumbnailGenerator(assetDeliverable.id)}
                onReplace={() => openThumbnailUpload(assetDeliverable.id)}
              />
            ) : assetInspector.type === "versions" ? (
              <VersionsPanel
                deliverable={assetDeliverable}
                selectedVersionId={getPresentedVersion(assetDeliverable, selectedVersionByDeliverable)?.id}
                isFilmmaker={isFilmmaker}
                onDelete={(versionId) => deleteVersion(assetDeliverable.id, versionId)}
                onDownload={(version) => downloadPrototypeFile(version.filename, showToast)}
                onApprove={(versionId) => approveDeliverable(assetDeliverable.id, versionId)}
                onUnapprove={(versionId) => unapproveDeliverable(assetDeliverable.id, versionId)}
                onSelect={(versionId) => selectVersion(assetDeliverable.id, versionId)}
                onSetCurrent={(versionId) => setCurrentVersion(assetDeliverable.id, versionId)}
                onUpload={() => openUpload(assetDeliverable.id)}
              />
            ) : null}
          </aside>
        ) : commentsDeliverable ? (
          <aside className="masters-comments-rail" aria-label={`${commentsDeliverable.name} comments`}>
            <header className="masters-comments-rail-header">
              <div>
                <h2>Comments ({commentsDeliverable.comments.length})</h2>
                <span className="label-xs">{commentsDeliverable.name}</span>
              </div>
            </header>
            <CommentsPanel
              comments={commentsDeliverable.comments}
              filter={commentFilter}
              role={role}
              selectedCommentId={selectedCommentId}
              onFilter={setCommentFilter}
              onCommentsChange={(comments) => setDeliverables((current) => current.map((deliverable) =>
                deliverable.id === commentsDeliverable.id ? { ...deliverable, comments } : deliverable,
              ))}
              onSelect={(comment) => {
                setSelectedCommentId(comment.id);
                if (typeof comment.timecodeSeconds === "number") {
                  setHasCommentAnchor(true);
                  setCurrentTimeSeconds(comment.timecodeSeconds);
                }
              }}
            />
            <ReviewCommentComposer
              body={commentDraft}
              currentTimeSeconds={currentTimeSeconds}
              visibility={commentVisibility}
              hasAnchor={hasCommentAnchor}
              hasDrawingAttachment={hasDrawingAttachment}
              hasFramePinAttachment={false}
              isDrawingMode={isDrawingMode}
              isEditingOverallComment={false}
              isPostingMenuOpen={isPostingMenuOpen}
              onBodyChange={setCommentDraft}
              onRemoveAnchor={() => setHasCommentAnchor(false)}
              onSetVisibility={(visibility) => {
                setCommentVisibility(visibility);
                setIsPostingMenuOpen(false);
              }}
              onSubmit={postComment}
              onToggleDrawingMode={() => {
                setHasCommentAnchor(true);
                setIsPlaying(false);
                setIsDrawingMode((current) => !current);
              }}
              onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
            />
          </aside>
        ) : null}

        <footer className="masters-action-footer" aria-label="Masters actions">
          <div className="masters-action-footer-inner">
            <button className="masters-footer-share" type="button" aria-label="Copy share link" onClick={() => copyShareLink("all-deliverables", showToast)}>
              <DsIcon name="link" size={20} />
            </button>
            {canDownloadAll ? (
              <button className="masters-secondary-button label-s-semibold" type="button" onClick={() => downloadPrototypeFile(`${project.name}-Masters.zip`, showToast)}>
                <DsIcon name="download" size={18} />Download all (.zip)
              </button>
            ) : null}
            {isProjectDelivered && completionRecord && undoSeconds > 0 ? (
              <button
                className="masters-undo-approval label-s-semibold"
                type="button"
                onClick={undoApproval}
              >
                <CountdownRing seconds={undoSeconds} />
                Approved by mistake? Undo
              </button>
            ) : !isProjectDelivered ? (
              <span
                className="masters-approve-all-wrap"
                data-tooltip={readyDeliverables.length === 0 ? "No deliverables are ready for review yet." : undefined}
              >
                <button
                  className="masters-primary-button label-s-semibold"
                  type="button"
                  disabled={readyDeliverables.length === 0}
                  onClick={() => setBulkApproveStep("confirm")}
                >
                  <DsIcon name="thumbs-up-like-fill" size={20} />Approve all
                </button>
              </span>
            ) : null}
          </div>
        </footer>
      </section>

      {isFilmmaker ? <input ref={uploadInputRef} className="sr-only" type="file" onChange={uploadVersion} /> : null}
      <input ref={thumbnailUploadInputRef} className="sr-only" type="file" accept="image/*" onChange={replaceThumbnail} />
      {bulkApproveStep ? (
        <BulkApproveDialog
          deliverables={readyDeliverables}
          isSuccess={bulkApproveStep === "success"}
          onCancel={() => setBulkApproveStep(null)}
          onConfirm={approveAllReady}
          onDownload={() => downloadPrototypeFile(`${project.name}-Masters.zip`, showToast)}
        />
      ) : null}
      {requestSourceId ? (
        <RequestDialog
          source={deliverables.find((deliverable) => deliverable.id === requestSourceId)}
          tab={requestTab}
          name={requestName}
          format={requestFormat}
          duration={requestDuration}
          notes={requestNotes}
          onCancel={() => setRequestSourceId(null)}
          onChangeDuration={setRequestDuration}
          onChangeFormat={setRequestFormat}
          onChangeName={setRequestName}
          onChangeNotes={setRequestNotes}
          onChangeTab={setRequestTab}
          onSubmit={submitRequest}
        />
      ) : null}
      {thumbnailGenerator ? (
        <ThumbnailGeneratorDialog
          deliverable={deliverables.find((deliverable) => deliverable.id === thumbnailGenerator.deliverableId)}
          focusCopy={thumbnailGenerator.focusCopy}
          onCancel={() => setThumbnailGenerator(null)}
          onUpload={() => openThumbnailUpload(thumbnailGenerator.deliverableId)}
          onUse={(thumbnail) => useGeneratedThumbnail(thumbnailGenerator.deliverableId, thumbnail)}
        />
      ) : null}
      {isReopenDialogOpen ? (
        <ReopenProjectDialog onCancel={() => setIsReopenDialogOpen(false)} />
      ) : null}
      {deleteConfirmId ? (
        <DeleteDeliverableDialog
          deliverableName={deliverables.find((deliverable) => deliverable.id === deleteConfirmId)?.name ?? "this deliverable"}
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => deleteDeliverable(deleteConfirmId)}
        />
      ) : null}
      {toast ? (
        <div className="masters-toast label-s-semibold" role="status">
          <span>{toast.message}</span>
          {toast.canUndo && undoSeconds > 0 ? <button type="button" onClick={undoApproval}>Undo</button> : null}
        </div>
      ) : null}
    </main>
  );
}

function DeliverableRow({
  deliverable,
  expanded,
  hasChildren,
  childrenExpanded,
  selectedVersion,
  commentCount,
  unreadCommentCount,
  isFilmmaker,
  customerName,
  studioName,
  editingName,
  commentsOpen,
  versionsOpen,
  rowMenuOpen,
  onChangeName,
  onApprove,
  onDelete,
  onDownload,
  onEditName,
  onMoveFocus,
  onOpenCaptions,
  onOpenThumbnail,
  canMarkUpRecut,
  onMarkUpRecut,
  onReplace,
  onSelect,
  onToggleChildren,
  onSelectVersion,
  onShare,
  onToggleComments,
  onToggleVersions,
  onUpload,
  onToggleRowMenu,
}: {
  deliverable: MastersDeliverable;
  expanded: boolean;
  hasChildren: boolean;
  childrenExpanded: boolean;
  selectedVersion?: MastersVersion;
  commentCount: number;
  unreadCommentCount: number;
  isFilmmaker: boolean;
  customerName: string;
  studioName: string;
  editingName: boolean;
  commentsOpen: boolean;
  versionsOpen: boolean;
  rowMenuOpen: boolean;
  onChangeName: (name: string) => void;
  onApprove: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEditName: () => void;
  onMoveFocus: (direction: -1 | 1) => void;
  onOpenCaptions: () => void;
  onOpenThumbnail: () => void;
  canMarkUpRecut: boolean;
  onMarkUpRecut: () => void;
  onReplace: () => void;
  onSelect: () => void;
  onToggleChildren: () => void;
  onSelectVersion: (versionId: string) => void;
  onShare: () => void;
  onToggleComments: () => void;
  onToggleVersions: () => void;
  onUpload: () => void;
  onToggleRowMenu: () => void;
}) {
  const hasCaptions = Boolean(deliverable.srt && deliverable.captions.some((caption) => caption !== "None"));
  const primaryAction = getDeliverablePrimaryAction(deliverable.status, selectedVersion, isFilmmaker);
  const primaryActionIsDownload = primaryAction?.kind === "download";

  const runPrimaryAction = () => {
    if (!primaryAction) return;
    if (primaryAction.kind === "upload") onUpload();
    if (primaryAction.kind === "approve") onApprove();
    if (primaryAction.kind === "download") onDownload();
  };

  return (
    <article
      id={`masters-row-${deliverable.id}`}
      className={`masters-deliverable-row ${expanded ? "expanded" : ""} ${childrenExpanded ? "children-expanded" : ""} ${deliverable.parentDeliverableId ? "is-child" : ""}`}
      role="row"
      tabIndex={0}
      aria-selected={expanded}
      aria-label={`${deliverable.name}, ${statusLabel(deliverable.status, studioName, customerName)}`}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" && !expanded) { event.preventDefault(); onSelect(); }
        if (event.key === " ") { event.preventDefault(); onSelect(); }
        if (event.key === "Escape" && expanded) { event.preventDefault(); onSelect(); }
        if (event.key === "ArrowDown") { event.preventDefault(); onMoveFocus(1); }
        if (event.key === "ArrowUp") { event.preventDefault(); onMoveFocus(-1); }
        if (event.key.toLowerCase() === "a" && primaryAction) { event.preventDefault(); runPrimaryAction(); }
      }}
    >
      <div className="masters-row-identity" role="cell">
        <button
          className="masters-disclosure"
          type="button"
          aria-label={`${hasChildren ? (childrenExpanded ? "Hide recuts for" : "Show recuts for") : (expanded ? "Collapse" : "Expand")} ${deliverable.name}`}
          aria-expanded={hasChildren ? childrenExpanded : expanded}
          onClick={(event) => { event.stopPropagation(); if (hasChildren) onToggleChildren(); else onSelect(); }}
        >
          {deliverable.parentDeliverableId ? <span className="masters-child-connector" aria-hidden="true">└</span> : null}
          <DsIcon name="caret-right" size={16} />
        </button>
        <DeliverableThumbnail
          deliverable={deliverable}
          version={selectedVersion}
          onOpen={onOpenThumbnail}
        />
        <div className="masters-row-name-zone">
          <div className="masters-row-name-line">
            {editingName ? (
              <input
                className="masters-row-name-input label-m-semibold"
                autoFocus
                value={deliverable.name}
                onChange={(event) => onChangeName(event.target.value)}
                onBlur={onEditName}
                onClick={(event) => event.stopPropagation()}
              />
            ) : <span className="masters-row-name label-m-semibold">{deliverable.name}</span>}
            {deliverable.isRequested ? <span className="masters-requested-tag label-xs-semibold">Client request</span> : null}
          </div>
          <span className="masters-row-meta label-xs">{formatRowMetadata(deliverable, selectedVersion)}</span>
        </div>
      </div>

      <div className="masters-row-details" role="cell">
        <button
          className={`masters-detail-pill ${commentCount > 0 ? "active" : "ghosted"} ${commentsOpen ? "selected" : ""}`}
          type="button"
          aria-label={`${commentsOpen ? "Close" : "Open"} comments for ${deliverable.name}`}
          aria-expanded={commentsOpen}
          onClick={(event) => { event.stopPropagation(); onToggleComments(); }}
        >
          <DsIcon name="chat-circle" size={16} />
          <span className="label-xs-semibold">Comments</span>
          {commentCount > 0 ? (
            <span className={`masters-detail-count label-xs-semibold ${unreadCommentCount > 0 ? "unread" : ""}`}>
              {commentCount}
            </span>
          ) : null}
        </button>

        <div className="masters-row-versions-wrap">
          <button
            className={`masters-detail-pill ${selectedVersion ? "active" : "ghosted"} ${versionsOpen ? "selected" : ""}`}
            type="button"
            disabled={!selectedVersion}
            aria-label={`${versionsOpen ? "Close" : "Open"} versions for ${deliverable.name}`}
            aria-expanded={versionsOpen}
            onClick={(event) => { event.stopPropagation(); onToggleVersions(); }}
          >
            <DsIcon name="copy" size={16} />
            <span className="label-xs-semibold">Versions</span>
            {selectedVersion ? <span className="masters-detail-value label-xs-semibold">V{selectedVersion.number}</span> : null}
          </button>
          {versionsOpen ? (
            <div className="masters-row-versions-menu" onClick={(event) => event.stopPropagation()}>
              {[...deliverable.versions].reverse().map((version) => (
                <button
                  className={version.id === selectedVersion?.id ? "selected" : ""}
                  type="button"
                  key={version.id}
                  onClick={() => onSelectVersion(version.id)}
                >
                  <span className="label-xs-semibold">V{version.number}</span>
                  <span className="label-xs">{formatShortDate(version.uploadedAt)}</span>
                  <small className="label-xs">{version.uploadedBy}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className={`masters-detail-pill ${hasCaptions ? "active" : "ghosted"}`}
          type="button"
          disabled={!hasCaptions}
          aria-label={`${hasCaptions ? "Open" : "No"} captions for ${deliverable.name}`}
          onClick={(event) => { event.stopPropagation(); onOpenCaptions(); }}
        >
          <DsIcon name="file-text" size={16} />
          <span className="label-xs-semibold">Captions</span>
        </button>
      </div>

      <div className="masters-row-status" role="cell">
        <StatusPill status={deliverable.status} studioName={studioName} customerName={customerName} />
      </div>

      <div className="masters-row-actions" role="cell">
        {primaryAction ? (
        <button
          className={`masters-row-primary-action ${primaryAction.style} label-s-semibold`}
          type="button"
          onClick={(event) => { event.stopPropagation(); runPrimaryAction(); }}
        >
          <DsIcon name={getPrimaryActionIcon(primaryAction.kind)} size={14} />
          {primaryAction.label}
        </button>
        ) : null}
        <div className="masters-row-menu-wrap">
          <button
            className="masters-row-menu-button"
            type="button"
            aria-label={`Actions for ${deliverable.name}`}
            aria-expanded={rowMenuOpen}
            onClick={(event) => { event.stopPropagation(); onToggleRowMenu(); }}
          >
            <DsIcon name="dots-three" size={15} />
          </button>
          {rowMenuOpen ? (
            <div className="masters-row-menu" onClick={(event) => event.stopPropagation()}>
              {selectedVersion && !primaryActionIsDownload ? (
                <button className="label-xs-semibold" type="button" onClick={onDownload}><DsIcon name="download" size={14} />Download</button>
              ) : null}
              <button className="label-xs-semibold" type="button" onClick={onShare}><DsIcon name="link" size={14} />Copy share link</button>
              {canMarkUpRecut ? (
                <button className="label-xs-semibold" type="button" onClick={onMarkUpRecut}>
                  <DsIcon name="stage-edit" size={14} />Mark up a re-cut
                </button>
              ) : null}
              {isFilmmaker ? (
                <>
                  <button className="label-xs-semibold" type="button" onClick={onUpload}><DsIcon name="upload-simple" size={14} />Upload new version</button>
                  {selectedVersion ? <button className="label-xs-semibold" type="button" onClick={onReplace}><DsIcon name="arrows-clockwise" size={14} />Replace file</button> : null}
                  <button className="label-xs-semibold" type="button" onClick={onEditName}><DsIcon name="pencil-simple" size={14} />Rename</button>
                  <span className="masters-row-menu-divider" role="separator" />
                  <button className="delete label-xs-semibold" type="button" onClick={onDelete}><DsIcon name="trash" size={14} />Delete deliverable</button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DeliverableThumbnail({
  deliverable,
  version,
  onOpen,
}: {
  deliverable: MastersDeliverable;
  version?: MastersVersion;
  onOpen: () => void;
}) {
  const thumbnail = deliverable.thumbnail;
  return (
    <span className="masters-thumbnail-asset-wrap" data-tooltip="Edit thumbnail">
      <button
        className={`masters-row-thumbnail ${thumbnail ? "has-generated-thumbnail" : version ? "has-poster" : "placeholder"}`}
        type="button"
        aria-label={`Open thumbnail for ${deliverable.name}`}
        onClick={(event) => { event.stopPropagation(); onOpen(); }}
      >
        {thumbnail
          ? <img src={thumbnail.imageUrl} alt="" />
          : deliverable.kind === "captions"
            ? <DsIcon name="file-text" size={18} />
            : version
              ? <DsIcon name="play" size={18} />
              : <span className="label-xs-semibold">{deliverable.format}</span>}
      </button>
    </span>
  );
}

function ExpandedDeliverable({
  deliverable,
  sourceDeliverable,
  version,
  role,
  isFilmmaker,
  currentTimeSeconds,
  isPlaying,
  isMuted,
  isDrawingMode,
  drawingPaths,
  activeDrawingPath,
  selectedDrawingPaths,
  isMarkUpMode,
  recutMarks,
  draftRecutRange,
  selectedRecutMarkId,
  canUndoRecut,
  canRedoRecut,
  onApprove,
  onUnapprove,
  onClearDrawing,
  onDoneDrawing,
  onDownload,
  onCancelRecutMarkup,
  onSubmitRecut,
  onBeginRecutInstruction,
  onChangeDraftRecutRange,
  onChooseRecutVerb,
  onChangeRecutVerb,
  onPrepareRecutEdit,
  onSelectRecutMark,
  onEndDrawing,
  onSeek,
  onSelectComment,
  onStartDrawing,
  onToggleMuted,
  onTogglePlaying,
  onUndoDrawing,
  onUndoRecut,
  onRedoRecut,
  onUpdateRecutMark,
  onUpdateDrawing,
  onUpload,
}: {
  deliverable: MastersDeliverable;
  sourceDeliverable: MastersDeliverable;
  version?: MastersVersion;
  role: MastersRole;
  isFilmmaker: boolean;
  currentTimeSeconds: number;
  isPlaying: boolean;
  isMuted: boolean;
  isDrawingMode: boolean;
  drawingPaths: DrawingPath[];
  activeDrawingPath: DrawingPath | null;
  selectedDrawingPaths: DrawingPath[];
  isMarkUpMode: boolean;
  recutMarks: RecutMark[];
  draftRecutRange: RecutDraftRange | null;
  selectedRecutMarkId: string | null;
  canUndoRecut: boolean;
  canRedoRecut: boolean;
  onApprove: () => void;
  onUnapprove: () => void;
  onClearDrawing: () => void;
  onDoneDrawing: () => void;
  onDownload: (version: MastersVersion) => void;
  onCancelRecutMarkup: () => void;
  onSubmitRecut: () => void;
  onBeginRecutInstruction: () => void;
  onChangeDraftRecutRange: (range: RecutDraftRange | null) => void;
  onChooseRecutVerb: (verb: RecutMarkVerb) => void;
  onChangeRecutVerb: (markId: string, verb: RecutMarkVerb) => void;
  onPrepareRecutEdit: () => void;
  onSelectRecutMark: (mark: RecutMark) => void;
  onEndDrawing: () => void;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: MastersComment) => void;
  onStartDrawing: (point: DrawingPoint) => void;
  onToggleMuted: () => void;
  onTogglePlaying: () => void;
  onUndoDrawing: () => void;
  onUndoRecut: () => void;
  onRedoRecut: () => void;
  onUpdateRecutMark: (markId: string, updates: Partial<Pick<RecutMark, "inSec" | "outSec" | "note">>) => void;
  onUpdateDrawing: (point: DrawingPoint) => void;
  onUpload: () => void;
}) {
  const isRecutBriefOnly = Boolean(deliverable.recutBrief && deliverable.versions.length === 0);

  return (
    <section
      className="masters-expanded-panel"
      id={`masters-expanded-${deliverable.id}`}
      aria-label={`${deliverable.name} delivery details`}
    >
      <div className="masters-expanded-layout">
        <div className="masters-expanded-preview">
          {version ? (
            <CompactPlayer
              deliverable={sourceDeliverable}
              contextDeliverable={deliverable}
              version={version}
              comments={deliverable.comments.filter((comment) => role !== "Customer" || comment.visibility === "external")}
              currentTimeSeconds={currentTimeSeconds}
              isPlaying={isPlaying}
              isMuted={isMuted}
              isDrawingMode={isDrawingMode}
              drawingPaths={drawingPaths}
              activeDrawingPath={activeDrawingPath}
              selectedDrawingPaths={selectedDrawingPaths}
              isMarkUpMode={isMarkUpMode}
              recutMarks={recutMarks}
              draftRecutRange={draftRecutRange}
              selectedRecutMarkId={selectedRecutMarkId}
              canUndoRecut={canUndoRecut}
              canRedoRecut={canRedoRecut}
              onClearDrawing={onClearDrawing}
              onDoneDrawing={onDoneDrawing}
              onEndDrawing={onEndDrawing}
              onBeginRecutInstruction={onBeginRecutInstruction}
              onChangeDraftRecutRange={onChangeDraftRecutRange}
              onChooseRecutVerb={onChooseRecutVerb}
              onChangeRecutVerb={onChangeRecutVerb}
              onPrepareRecutEdit={onPrepareRecutEdit}
              onSeek={onSeek}
              onSelectComment={onSelectComment}
              onSelectRecutMark={onSelectRecutMark}
              onStartDrawing={onStartDrawing}
              onToggleMuted={onToggleMuted}
              onTogglePlaying={onTogglePlaying}
              onUndoDrawing={onUndoDrawing}
              onUndoRecut={onUndoRecut}
              onRedoRecut={onRedoRecut}
              onUpdateRecutMark={onUpdateRecutMark}
              onUpdateDrawing={onUpdateDrawing}
            />
          ) : (
            <div className="masters-inline-empty">
              <DsIcon name={deliverable.kind === "captions" ? "file-text" : "film-strip"} size={26} />
              <strong>Nothing delivered here yet.</strong>
              {isFilmmaker ? (
                <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onUpload}>
                  <DsIcon name="upload-simple" size={14} />Upload V1
                </button>
              ) : null}
            </div>
          )}

          {isRecutBriefOnly ? (
            <div className="masters-recut-awaiting-upload" role="status">
              <span className="masters-recut-awaiting-icon" aria-hidden="true"><DsIcon name="upload-simple" size={20} /></span>
              <div>
                <strong>Recut brief - awaiting the first video</strong>
                <span className="label-s">
                  {isFilmmaker
                    ? "Upload V1 when the editor has completed this recut."
                    : `${mastersStudioName} still needs to upload the first version for you to review.`}
                </span>
              </div>
              {isFilmmaker ? (
                <button className="masters-primary-button label-s-semibold" type="button" onClick={onUpload}>
                  <DsIcon name="upload-simple" size={16} />Upload V1
                </button>
              ) : null}
            </div>
          ) : (
            <div className="masters-expanded-actions">
              {version && !version.approved ? (
                <button
                  className="masters-primary-button label-s-semibold"
                  type="button"
                  onClick={onApprove}
                >
                  <DsIcon name="check" size={16} />Approve this version
                </button>
              ) : null}
              {version?.approved ? (
                <button className="masters-secondary-button label-s-semibold" type="button" onClick={onUnapprove}>
                  <DsIcon name="arrow-counter-clockwise" size={16} />Unapprove this version
                </button>
              ) : null}
              {version?.approved ? (
                <button className="masters-secondary-button label-s-semibold" type="button" onClick={() => onDownload(version)}>
                  <DsIcon name="download" size={16} />Download
                </button>
              ) : null}
            </div>
          )}
          {isMarkUpMode ? (
            <div className="masters-markup-player-actions">
              <button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancelRecutMarkup}>Cancel</button>
              <button className="masters-primary-button label-s-semibold" type="button" disabled={recutMarks.length === 0 || recutMarks.some((mark) => mark.verb === "trim" && !mark.note?.trim())} onClick={onSubmitRecut}>
                Send to editor
              </button>
            </div>
          ) : null}
          {deliverable.recutBrief && deliverable.versions.length > 0 ? (
            <details className="masters-inline-recut-brief">
              <summary className="label-s-semibold">Recut Brief · {deliverable.recutBrief.marks.length} {deliverable.recutBrief.marks.length === 1 ? "mark" : "marks"}</summary>
              <div>
                {deliverable.recutBrief.marks.map((mark) => (
                  <button className={`masters-inline-recut-mark mark-${mark.verb}`} type="button" key={mark.id} onClick={() => onSelectRecutMark(mark)}>
                    <span className="label-xs-semibold">{formatTime(mark.inSec)} - {formatTime(mark.outSec)}</span>
                    <span className="label-xs-semibold">{recutFriendlyVerbLabel(mark.verb)}</span>
                    {mark.note ? <span className="label-s">{mark.note}</span> : null}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>

      </div>
    </section>
  );
}

function CompactPlayer({
  deliverable,
  contextDeliverable,
  version,
  comments,
  currentTimeSeconds,
  isPlaying,
  isMuted,
  isDrawingMode,
  drawingPaths,
  activeDrawingPath,
  selectedDrawingPaths,
  isMarkUpMode,
  recutMarks,
  draftRecutRange,
  selectedRecutMarkId,
  canUndoRecut,
  canRedoRecut,
  onClearDrawing,
  onDoneDrawing,
  onEndDrawing,
  onBeginRecutInstruction,
  onChangeDraftRecutRange,
  onChooseRecutVerb,
  onChangeRecutVerb,
  onPrepareRecutEdit,
  onSeek,
  onSelectComment,
  onSelectRecutMark,
  onStartDrawing,
  onToggleMuted,
  onTogglePlaying,
  onUndoDrawing,
  onUndoRecut,
  onRedoRecut,
  onUpdateRecutMark,
  onUpdateDrawing,
}: {
  deliverable: MastersDeliverable;
  contextDeliverable: MastersDeliverable;
  version: MastersVersion;
  comments: MastersComment[];
  currentTimeSeconds: number;
  isPlaying: boolean;
  isMuted: boolean;
  isDrawingMode: boolean;
  drawingPaths: DrawingPath[];
  activeDrawingPath: DrawingPath | null;
  selectedDrawingPaths: DrawingPath[];
  isMarkUpMode: boolean;
  recutMarks: RecutMark[];
  draftRecutRange: RecutDraftRange | null;
  selectedRecutMarkId: string | null;
  canUndoRecut: boolean;
  canRedoRecut: boolean;
  onClearDrawing: () => void;
  onDoneDrawing: () => void;
  onEndDrawing: () => void;
  onBeginRecutInstruction: () => void;
  onChangeDraftRecutRange: (range: RecutDraftRange | null) => void;
  onChooseRecutVerb: (verb: RecutMarkVerb) => void;
  onChangeRecutVerb: (markId: string, verb: RecutMarkVerb) => void;
  onPrepareRecutEdit: () => void;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: MastersComment) => void;
  onSelectRecutMark: (mark: RecutMark) => void;
  onStartDrawing: (point: DrawingPoint) => void;
  onToggleMuted: () => void;
  onTogglePlaying: () => void;
  onUndoDrawing: () => void;
  onUndoRecut: () => void;
  onRedoRecut: () => void;
  onUpdateRecutMark: (markId: string, updates: Partial<Pick<RecutMark, "inSec" | "outSec" | "note">>) => void;
  onUpdateDrawing: (point: DrawingPoint) => void;
}) {
  const duration = version.durationSeconds || durationLabelToSeconds(deliverable.duration);
  const progress = Math.min(100, (currentTimeSeconds / duration) * 100);
  const timecodedComments = comments.filter((comment) => typeof comment.timecodeSeconds === "number");
  const hasDrawingStrokes = drawingPaths.length > 0 || activeDrawingPath !== null;
  const selectedRecutMark = recutMarks.find((mark) => mark.id === selectedRecutMarkId) ?? null;
  const timelineRef = useRef<HTMLDivElement>(null);
  const recutSelectionStartRef = useRef<number | null>(null);
  const recutMarkDragRef = useRef<{
    markId: string;
    pointerStartSec: number;
    inSec: number;
    outSec: number;
    hasRemembered: boolean;
  } | null>(null);
  const [isSelectingRecutRange, setIsSelectingRecutRange] = useState(false);
  const getDrawingPoint = (event: PointerEvent<SVGSVGElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 562.5,
    };
  };
  const getTimelineTime = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return quantiseToFrame(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };
  const normaliseRange = (range: RecutDraftRange) => ({
    inSec: Math.min(range.inSec, range.outSec),
    outSec: Math.max(range.inSec, range.outSec),
  });

  return (
    <div className={`masters-compact-player ${isMarkUpMode ? "is-marking-up" : ""}`} key={`${contextDeliverable.id}-${version.id}`}>
      <div className="masters-compact-player-top">
        {isMarkUpMode ? (
          <span className="masters-markup-banner label-xs-semibold">Add instructions for the editor</span>
        ) : contextDeliverable.recutBrief && contextDeliverable.versions.length === 0 ? (
          <span className="masters-recut-brief-chip label-xs-semibold">Recut brief - awaiting V1 · target {contextDeliverable.recutBrief.targetDurationSec}s</span>
        ) : (
          <span className={`masters-player-version label-xs-semibold ${version.approved ? "approved" : ""}`}>
            V{version.number}{version.approved ? " · Approved" : " · In review"}
          </span>
        )}
      </div>
      <div className={`masters-inline-frame ${isDrawingMode ? "drawing-active" : ""}`}>
        <div className="masters-player-orb"><span>{deliverable.kind === "captions" ? "SRT" : deliverable.name.slice(0, 2).toUpperCase()}</span></div>
        <svg
          className="drawing-layer"
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          aria-label={isDrawingMode ? "Drawing layer active" : "Drawing layer"}
          onPointerDown={(event) => {
            if (!isDrawingMode) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onStartDrawing(getDrawingPoint(event));
          }}
          onPointerMove={(event) => {
            if (!isDrawingMode || !activeDrawingPath) return;
            event.preventDefault();
            onUpdateDrawing(getDrawingPoint(event));
          }}
          onPointerUp={(event) => {
            if (!isDrawingMode) return;
            event.preventDefault();
            onEndDrawing();
          }}
          onPointerCancel={onEndDrawing}
          onPointerLeave={() => {
            if (isDrawingMode && activeDrawingPath) onEndDrawing();
          }}
        >
          {[...selectedDrawingPaths, ...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])].map((path) => (
            <path className="drawing-stroke" d={formatDrawingPath(path.points)} key={path.id} />
          ))}
        </svg>
        {isDrawingMode ? (
          <div className="drawing-toolbar" aria-label="Drawing options">
            <span className="drawing-toolbar-label label-xs-semibold">Draw on screen</span>
            <button className="label-xs-semibold" type="button" disabled={!hasDrawingStrokes} onClick={onUndoDrawing}>
              Undo
            </button>
            <button className="label-xs-semibold" type="button" disabled={!hasDrawingStrokes} onClick={onClearDrawing}>
              Clear
            </button>
            <button className="label-xs-semibold done" type="button" onClick={onDoneDrawing}>
              Done
            </button>
          </div>
        ) : null}
      </div>
      <div className="masters-compact-controls">
        {isMarkUpMode ? (
          <div className="masters-recut-simple-toolbar">
            <div>
              <strong className="label-s-semibold">Choose a section</strong>
              <span className="label-xs">Click the timeline below and drag the start and end points.</span>
            </div>
            <div className="masters-recut-simple-actions">
              <button
                className="masters-recut-history-button"
                type="button"
                aria-label="Undo last recut change"
                data-tooltip="Undo"
                disabled={!canUndoRecut}
                onClick={onUndoRecut}
              >
                <DsIcon name="arrow-counter-clockwise" size={16} />
              </button>
              <button
                className="masters-recut-history-button"
                type="button"
                aria-label="Redo last recut change"
                data-tooltip="Redo"
                disabled={!canRedoRecut}
                onClick={onRedoRecut}
              >
                <DsIcon name="arrow-clockwise" size={16} />
              </button>
            </div>
          </div>
        ) : null}
        <div className={`masters-timeline-row ${isMarkUpMode ? "is-marking-up" : ""}`}>
          <span className="label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
          <div
            className={`masters-timeline ${isMarkUpMode ? "is-marking-up" : ""}`}
            ref={timelineRef}
            role="slider"
            aria-label="Video timeline"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.round(currentTimeSeconds)}
            tabIndex={0}
            onPointerDown={(event) => {
              const time = getTimelineTime(event.clientX);
              if (isMarkUpMode) {
                event.preventDefault();
                onBeginRecutInstruction();
                event.currentTarget.setPointerCapture(event.pointerId);
                recutSelectionStartRef.current = time;
                setIsSelectingRecutRange(true);
                onChangeDraftRecutRange({ inSec: time, outSec: time });
                onSeek(time);
                return;
              }
              onSeek(time);
            }}
            onPointerMove={(event) => {
              const selectionStart = recutSelectionStartRef.current;
              if (!isMarkUpMode || selectionStart === null || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const time = getTimelineTime(event.clientX);
              onChangeDraftRecutRange(normaliseRange({ inSec: selectionStart, outSec: time }));
            }}
            onPointerUp={(event) => {
              const selectionStart = recutSelectionStartRef.current;
              if (!isMarkUpMode || selectionStart === null) return;
              event.preventDefault();
              const time = getTimelineTime(event.clientX);
              const wasClick = Math.abs(time - selectionStart) < 0.25;
              const range = wasClick
                ? getUnassignedRecutRangeAtTime(recutMarks, duration, time)
                : normaliseRange({ inSec: selectionStart, outSec: time });
              onChangeDraftRecutRange({ inSec: Math.min(range.inSec, Math.max(0, duration - 1)), outSec: Math.min(duration, Math.max(range.inSec + 1, range.outSec)) });
              recutSelectionStartRef.current = null;
              setIsSelectingRecutRange(false);
            }}
            onPointerCancel={() => {
              recutSelectionStartRef.current = null;
              setIsSelectingRecutRange(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") onSeek(Math.max(0, quantiseToFrame(currentTimeSeconds - 1 / 25)));
              if (event.key === "ArrowRight") onSeek(Math.min(duration, quantiseToFrame(currentTimeSeconds + 1 / 25)));
            }}
          >
            <span className="masters-timeline-progress" style={{ width: isMarkUpMode ? "100%" : `${progress}%` }} />
            <span className="masters-playhead" style={{ left: `${progress}%` }} />
            {recutMarks.map((mark) => (
              <button
                className={`masters-recut-mark mark-${mark.verb} ${selectedRecutMarkId === mark.id ? "selected" : ""}`}
                key={mark.id}
                type="button"
                aria-label={`${recutFriendlyVerbLabel(mark.verb)} from ${formatTime(mark.inSec)} to ${formatTime(mark.outSec)}`}
                style={{
                  left: `${(mark.inSec / duration) * 100}%`,
                  width: `${Math.max(0.8, ((mark.outSec - mark.inSec) / duration) * 100)}%`,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  onSelectRecutMark(mark);
                  recutMarkDragRef.current = {
                    markId: mark.id,
                    pointerStartSec: getTimelineTime(event.clientX),
                    inSec: mark.inSec,
                    outSec: mark.outSec,
                    hasRemembered: false,
                  };
                }}
                onPointerMove={(event) => {
                  const drag = recutMarkDragRef.current;
                  if (!drag || drag.markId !== mark.id || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const delta = getTimelineTime(event.clientX) - drag.pointerStartSec;
                  if (Math.abs(delta) < 0.04) return;
                  if (!drag.hasRemembered) {
                    onPrepareRecutEdit();
                    drag.hasRemembered = true;
                  }
                  const markLength = drag.outSec - drag.inSec;
                  const nextIn = Math.min(Math.max(0, drag.inSec + delta), duration - markLength);
                  onUpdateRecutMark(mark.id, { inSec: nextIn, outSec: nextIn + markLength });
                }}
                onPointerUp={() => { recutMarkDragRef.current = null; }}
                onPointerCancel={() => { recutMarkDragRef.current = null; }}
              />
            ))}
            {draftRecutRange ? (
              <>
                <span
                  className="masters-recut-draft-range"
                  style={{
                    left: `${(draftRecutRange.inSec / duration) * 100}%`,
                    width: `${Math.max(0.8, ((draftRecutRange.outSec - draftRecutRange.inSec) / duration) * 100)}%`,
                  }}
                />
                <button
                  className="masters-recut-range-handle is-in"
                  type="button"
                  aria-label={`Adjust Start point, currently ${formatTime(draftRecutRange.inSec)}`}
                  style={{ left: `${(draftRecutRange.inSec / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    event.stopPropagation();
                    onChangeDraftRecutRange({
                      inSec: Math.min(getTimelineTime(event.clientX), draftRecutRange.outSec - 1),
                      outSec: draftRecutRange.outSec,
                    });
                  }}
                >
                  <span className="label-xs-semibold">Start {formatTime(draftRecutRange.inSec)}</span>
                </button>
                <button
                  className="masters-recut-range-handle is-out"
                  type="button"
                  aria-label={`Adjust End point, currently ${formatTime(draftRecutRange.outSec)}`}
                  style={{ left: `${(draftRecutRange.outSec / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    event.stopPropagation();
                    onChangeDraftRecutRange({
                      inSec: draftRecutRange.inSec,
                      outSec: Math.max(getTimelineTime(event.clientX), draftRecutRange.inSec + 1),
                    });
                  }}
                >
                  <span className="label-xs-semibold">End {formatTime(draftRecutRange.outSec)}</span>
                </button>
              </>
            ) : null}
            {selectedRecutMark && !draftRecutRange ? (
              <>
                <button
                  className="masters-recut-range-handle is-in"
                  type="button"
                  aria-label={`Adjust Start point, currently ${formatTime(selectedRecutMark.inSec)}`}
                  style={{ left: `${(selectedRecutMark.inSec / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onPrepareRecutEdit();
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    event.stopPropagation();
                    onUpdateRecutMark(selectedRecutMark.id, {
                      inSec: Math.min(getTimelineTime(event.clientX), selectedRecutMark.outSec - 1),
                    });
                  }}
                >
                  <span className="label-xs-semibold">Start {formatTime(selectedRecutMark.inSec)}</span>
                </button>
                <button
                  className="masters-recut-range-handle is-out"
                  type="button"
                  aria-label={`Adjust End point, currently ${formatTime(selectedRecutMark.outSec)}`}
                  style={{ left: `${(selectedRecutMark.outSec / duration) * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onPrepareRecutEdit();
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    event.stopPropagation();
                    onUpdateRecutMark(selectedRecutMark.id, {
                      outSec: Math.min(duration, Math.max(getTimelineTime(event.clientX), selectedRecutMark.inSec + 1)),
                    });
                  }}
                >
                  <span className="label-xs-semibold">End {formatTime(selectedRecutMark.outSec)}</span>
                </button>
              </>
            ) : null}
            {timecodedComments.map((comment) => (
              <button
                className={`masters-comment-marker ${comment.visibility} ${isMarkUpMode ? "dimmed" : ""}`}
                key={comment.id}
                type="button"
                aria-label={`Open ${comment.visibility} comment at ${formatTime(comment.timecodeSeconds ?? 0)}`}
                style={{ left: `${((comment.timecodeSeconds ?? 0) / duration) * 100}%` }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelectComment(comment)}
              />
            ))}
          </div>
          <span className="label-xs">{formatTime(duration)}</span>
        </div>
        {isMarkUpMode && !isSelectingRecutRange && (draftRecutRange || selectedRecutMark) ? (
          <div className="masters-recut-action-step">
            <div className="masters-recut-friendly-actions">
              {(["keep", "cut", "trim"] as const).map((verb) => (
                <button
                  className={`mark-${verb} label-xs-semibold ${selectedRecutMark?.verb === verb ? "active" : ""}`}
                  type="button"
                  key={verb}
                  aria-pressed={selectedRecutMark ? selectedRecutMark.verb === verb : undefined}
                  onClick={() => {
                    if (draftRecutRange) onChooseRecutVerb(verb);
                    else if (selectedRecutMark) onChangeRecutVerb(selectedRecutMark.id, verb);
                  }}
                >
                  {recutFriendlyVerbLabel(verb)}
                </button>
              ))}
            </div>
            {selectedRecutMark?.verb === "trim" ? (
              <label className="masters-recut-change-note label-xs-semibold">
                Describe the change
                <textarea
                  className="label-s"
                  rows={2}
                  required
                  placeholder="Tell the editor what should happen here..."
                  value={selectedRecutMark.note ?? ""}
                  onFocus={onPrepareRecutEdit}
                  onChange={(event) => onUpdateRecutMark(selectedRecutMark.id, { note: event.target.value })}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        <div className="masters-control-row">
          <div>
            <button type="button" aria-label="Step back five seconds" onClick={() => onSeek(Math.max(0, currentTimeSeconds - 5))}><DsIcon name="arrow-counter-clockwise" size={16} /></button>
            <button className="play" type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlaying}><DsIcon name={isPlaying ? "pause" : "play"} size={16} /></button>
            <button type="button" aria-label="Step forward five seconds" onClick={() => onSeek(Math.min(duration, currentTimeSeconds + 5))}><DsIcon name="arrow-clockwise" size={16} /></button>
          </div>
          <div>
            <button type="button" aria-label={isMuted ? "Unmute" : "Mute"} onClick={onToggleMuted}><DsIcon name="speaker-high" size={16} /></button>
            <button type="button" aria-label="Fullscreen"><DsIcon name="frame-corners" size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  studioName,
  customerName,
}: {
  status: DeliverableStatus;
  studioName: string;
  customerName: string;
}) {
  return (
    <span className={`masters-status-pill label-xs-semibold is-${slugStatus(status)}`}>
      {statusLabel(status, studioName, customerName)}
    </span>
  );
}

type DeliverablePrimaryAction = {
  kind: "upload" | "approve" | "download";
  label: string;
  style: "primary" | "secondary";
};

function getDeliverablePrimaryAction(
  status: DeliverableStatus,
  selectedVersion: MastersVersion | undefined,
  isFilmmaker: boolean,
): DeliverablePrimaryAction | null {
  if (status === "not_started") return isFilmmaker ? { kind: "upload", label: "Upload", style: "primary" } : null;
  if (status === "waiting_for_studio") return isFilmmaker ? { kind: "upload", label: "Upload new version", style: "primary" } : null;

  if (selectedVersion?.approved) return { kind: "download", label: "Download", style: "secondary" };
  if (selectedVersion) return { kind: "approve", label: "Approve", style: "primary" };
  return null;
}

function getPrimaryActionIcon(kind: DeliverablePrimaryAction["kind"]) {
  if (kind === "upload") return "upload-simple" as const;
  if (kind === "approve") return "check" as const;
  return "download" as const;
}

function VersionsPanel({ deliverable, selectedVersionId, isFilmmaker, onApprove, onUnapprove, onDelete, onDownload, onSelect, onSetCurrent, onUpload }: { deliverable: MastersDeliverable; selectedVersionId?: string; isFilmmaker: boolean; onApprove: (versionId: string) => void; onUnapprove: (versionId: string) => void; onDelete: (versionId: string) => void; onDownload: (version: MastersVersion) => void; onSelect: (versionId: string) => void; onSetCurrent: (versionId: string) => void; onUpload: () => void }) {
  const versions = [...deliverable.versions].reverse();
  const nextNumber = Math.max(0, ...deliverable.versions.map((version) => version.number)) + 1;
  return (
    <div className="masters-versions-panel">
      <div className="masters-inline-panel-toolbar">
        <p className="label-s">Every upload stays in the version stack.</p>
        {isFilmmaker ? <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onUpload}><DsIcon name="upload-simple" size={14} />Upload V{nextNumber}</button> : null}
      </div>
      <div className="masters-version-list">
        {versions.length ? versions.map((version) => {
          const isCurrent = version.id === deliverable.currentVersionId;
          return (
            <article className={`masters-version-card ${version.id === selectedVersionId ? "selected" : ""}`} key={version.id}>
              <button className="masters-version-select" type="button" onClick={() => onSelect(version.id)}>
                <span className="masters-version-thumbnail"><DsIcon name={deliverable.kind === "captions" ? "file-text" : "play"} size={18} /></span>
                <span className="masters-version-copy"><span className="label-s-semibold">V{version.number}</span><span className="label-xs">{version.filename}</span><span className="label-xs">{formatShortDate(version.uploadedAt)} · {version.uploadedBy}</span></span>
              </button>
              <span className={`masters-version-state label-xs-semibold ${version.approved ? "approved" : ""}`}>{version.approved ? "Approved" : isCurrent ? "Current" : "Previous"}</span>
              <div className="masters-version-card-actions">
                {!isCurrent ? <button type="button" aria-label={`Set V${version.number} as current`} data-tooltip="Set as current" onClick={() => onSetCurrent(version.id)}><DsIcon name="eye" size={14} /></button> : null}
                <button className="masters-version-download label-xs-semibold" type="button" aria-label={`Download V${version.number}`} onClick={() => onDownload(version)}><DsIcon name="download" size={14} />Download</button>
                {!isFilmmaker && isCurrent && !version.approved && deliverable.status === "waiting_for_customer" ? <button className="masters-version-approve label-xs-semibold" type="button" onClick={() => onApprove(version.id)}><DsIcon name="check" size={14} />Approve</button> : null}
                {!isFilmmaker && isCurrent && version.approved ? <button className="masters-version-unapprove label-xs-semibold" type="button" onClick={() => onUnapprove(version.id)}><DsIcon name="arrow-counter-clockwise" size={14} />Unapprove</button> : null}
                {isFilmmaker ? <button className="delete" type="button" aria-label={`Delete V${version.number}`} data-tooltip="Delete" onClick={() => onDelete(version.id)}><DsIcon name="trash" size={14} /></button> : null}
              </div>
            </article>
          );
        }) : <div className="masters-panel-empty"><DsIcon name="upload-simple" size={22} /><strong>No versions yet</strong><span className="label-s">Upload V1 to begin the review loop.</span></div>}
      </div>
    </div>
  );
}

function CommentsPanel({
  comments,
  filter,
  role,
  selectedCommentId,
  onCommentsChange,
  onFilter,
  onSelect,
}: {
  comments: MastersComment[];
  filter: CommentFilter;
  role: MastersRole;
  selectedCommentId: string | null;
  onCommentsChange: (comments: MastersComment[]) => void;
  onFilter: (filter: CommentFilter) => void;
  onSelect: (comment: MastersComment) => void;
}) {
  const [expandedResolvedIds, setExpandedResolvedIds] = useState<Set<string>>(() => new Set());
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const usersById = useMemo(() => {
    const users = new Map<string, User>(reviewUsers.map((user) => [user.id, user]));
    comments.forEach((comment) => {
      const authorId = getMastersCommentAuthorId(comment);
      const existingUser = users.get(authorId);
      users.set(authorId, existingUser
        ? { ...existingUser, name: comment.author, initials: comment.initials }
        : {
            id: authorId,
            name: comment.author,
            initials: comment.initials,
            team: comment.visibility === "internal" ? "studio" : "customer",
            avatarTone: comment.visibility === "internal" ? "cyan" : "pink",
          });
    });
    return users;
  }, [comments]);

  const visibleComments = [...comments]
    .reverse()
    .filter((comment) => role !== "Customer" || comment.visibility === "external")
    .filter((comment) => {
      if (filter === "all") return true;
      if (filter === "unresolved") return !comment.resolved;
      return comment.visibility === filter;
    });

  const updateComment = (commentId: string, updater: (comment: MastersComment) => MastersComment) => {
    onCommentsChange(comments.map((comment) => comment.id === commentId ? updater(comment) : comment));
  };

  const deleteComment = (commentId: string) => {
    onCommentsChange(comments.filter((comment) => comment.id !== commentId));
    setOpenCommentMenuId(null);
  };

  const toggleResolved = (commentId: string) => {
    updateComment(commentId, (comment) => ({ ...comment, resolved: !comment.resolved }));
    setExpandedResolvedIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });
  };

  const startEdit = (comment: ReviewComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setOpenCommentMenuId(null);
  };

  const saveEdit = (commentId: string) => {
    const nextBody = editDraft.trim();
    if (!nextBody) return;
    updateComment(commentId, (comment) => ({ ...comment, body: nextBody, createdAgo: "Just now" }));
    setEditingCommentId(null);
    setEditDraft("");
  };

  const submitReply = (commentId: string) => {
    const body = replyDraft.trim();
    if (!body) return;
    updateComment(commentId, (comment) => ({
      ...comment,
      replies: [
        ...(comment.replies ?? []),
        {
          id: `masters-reply-${Date.now()}`,
          authorId: "user-tom",
          createdAgo: "Just now",
          body,
        },
      ],
    }));
    setReplyingCommentId(null);
    setReplyDraft("");
  };

  const toggleReaction = (commentId: string, emoji: ReactionEmoji) => {
    updateComment(commentId, (comment) => ({
      ...comment,
      reactions: toggleReviewReactionInList(comment.reactions, emoji),
    }));
  };

  const toggleReplyReaction = (commentId: string, replyId: string, emoji: ReactionEmoji) => {
    updateComment(commentId, (comment) => ({
      ...comment,
      replies: (comment.replies ?? []).map((reply) => reply.id === replyId
        ? { ...reply, reactions: toggleReviewReactionInList(reply.reactions, emoji) }
        : reply),
    }));
  };

  return (
    <div className="masters-comments-panel">
      <div className="masters-comment-filters">
        {commentFilters
          .filter((item) => role !== "Customer" || item.value !== "internal")
          .map((item) => (
            <button
              className={`label-xs-semibold ${filter === item.value ? "active" : ""}`}
              key={item.value}
              type="button"
              onClick={() => onFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
      </div>
      <div className="comment-list">
        {visibleComments.length ? visibleComments.map((comment) => {
          const reviewComment = toReviewComment(comment);
          return (
            <ReviewCommentThread
              comment={reviewComment}
              editDraft={editDraft}
              isEditing={editingCommentId === comment.id}
              isHighlighted={false}
              isExpandedResolved={expandedResolvedIds.has(comment.id)}
              isReplying={replyingCommentId === comment.id}
              isSelected={selectedCommentId === comment.id}
              isMenuOpen={openCommentMenuId === comment.id}
              key={comment.id}
              replyDraft={replyDraft}
              usersById={usersById}
              onExpandResolved={(commentId) => setExpandedResolvedIds((current) => new Set(current).add(commentId))}
              onCancelEdit={() => {
                setEditingCommentId(null);
                setEditDraft("");
              }}
              onDeleteComment={deleteComment}
              onEditDraftChange={setEditDraft}
              onOpenReply={(commentId, mentionName) => {
                setReplyingCommentId(commentId);
                setReplyDraft(mentionName ? `@${mentionName} ` : "");
              }}
              onRegisterCommentRef={() => undefined}
              onSelectComment={() => onSelect(comment)}
              onSetReplyDraft={setReplyDraft}
              onSetOpenCommentMenu={setOpenCommentMenuId}
              onSaveEdit={saveEdit}
              onStartEdit={startEdit}
              onSubmitReply={submitReply}
              onToggleCommentVisibility={(commentId) => updateComment(commentId, (item) => ({
                ...item,
                visibility: item.visibility === "internal" ? "external" : "internal",
              }))}
              onToggleReaction={toggleReaction}
              onToggleReplyReaction={toggleReplyReaction}
              onToggleResolved={toggleResolved}
            />
          );
        }) : (
          <div className="masters-panel-empty">
            <DsIcon name="chat-circle" size={22} />
            <strong>No comments here</strong>
            <span className="label-s">This filter is all clear.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getMastersCommentAuthorId(comment: MastersComment) {
  return reviewUsers.find((user) => user.initials === comment.initials)?.id
    ?? `masters-author-${comment.initials.toLowerCase()}`;
}

function toReviewComment(comment: MastersComment): ReviewComment {
  return {
    id: comment.id,
    authorId: getMastersCommentAuthorId(comment),
    visibility: comment.visibility,
    timecodeSeconds: comment.timecodeSeconds,
    createdAgo: comment.createdAgo,
    body: comment.body,
    resolved: comment.resolved,
    reactions: comment.reactions,
    drawingPaths: comment.drawingPaths,
    replies: comment.replies ?? [],
  };
}

function RecutMarkupPanel({
  parent,
  marks,
  selectedMarkId,
  targetDuration,
  targetAspect,
  name,
  notes,
  onCancel,
  onChangeName,
  onChangeNotes,
  onChangeTargetAspect,
  onChangeTargetDuration,
  onDeleteMark,
  onPrepareEdit,
  onSelectMark,
  onSubmit,
  onUpdateMark,
}: {
  parent: MastersDeliverable;
  marks: RecutMark[];
  selectedMarkId: string | null;
  targetDuration: number;
  targetAspect: string;
  name: string;
  notes: string;
  onCancel: () => void;
  onChangeName: (name: string) => void;
  onChangeNotes: (notes: string) => void;
  onChangeTargetAspect: (aspect: string) => void;
  onChangeTargetDuration: (duration: number) => void;
  onDeleteMark: (markId: string) => void;
  onPrepareEdit: () => void;
  onSelectMark: (mark: RecutMark) => void;
  onSubmit: () => void;
  onUpdateMark: (markId: string, updates: Partial<Pick<RecutMark, "inSec" | "outSec" | "verb" | "note">>) => void;
}) {
  return (
    <>
      <header className="masters-comments-rail-header">
        <div>
          <h2>Recut mark-up</h2>
          <span className="label-xs">{marks.length} {marks.length === 1 ? "mark" : "marks"} · target {targetDuration}s</span>
        </div>
        <button type="button" aria-label="Cancel recut mark-up" onClick={onCancel}><DsIcon name="x-close-cross" size={16} /></button>
      </header>
      <div className="masters-recut-panel-body">
        <label className="masters-recut-target label-s-semibold">
          <span>Target:</span>
          <input
            type="number"
            min={1}
            max={getDeliverableDurationSeconds(parent)}
            value={targetDuration}
            onChange={(event) => onChangeTargetDuration(Math.max(1, Number(event.target.value) || 1))}
          />
          <span>sec</span>
        </label>
        <div className="masters-recut-mark-list">
          {marks.length ? marks.map((mark) => (
            <article className={`masters-recut-mark-card mark-${mark.verb} ${selectedMarkId === mark.id ? "selected" : ""}`} key={mark.id}>
              <button className="masters-recut-mark-select" type="button" onClick={() => onSelectMark(mark)}>
                <span className="masters-recut-timecode label-xs-semibold">{formatTime(mark.inSec)} - {formatTime(mark.outSec)}</span>
                <span className={`masters-recut-verb-chip mark-${mark.verb} label-xs-semibold`}>{recutFriendlyVerbLabel(mark.verb)}</span>
              </button>
              {selectedMarkId === mark.id ? (
                <div className="masters-recut-mark-editor">
                  <div>
                    <label className="label-xs">Start <input type="number" min={0} step={0.04} value={mark.inSec} onFocus={onPrepareEdit} onChange={(event) => onUpdateMark(mark.id, { inSec: Number(event.target.value) })} /></label>
                    <label className="label-xs">End <input type="number" min={mark.inSec + 0.04} step={0.04} value={mark.outSec} onFocus={onPrepareEdit} onChange={(event) => onUpdateMark(mark.id, { outSec: Number(event.target.value) })} /></label>
                  </div>
                  <textarea
                    className="label-s"
                    rows={2}
                    required={mark.verb === "trim"}
                    placeholder={mark.verb === "trim" ? "Tell the editor what should happen here..." : "Add a note..."}
                    value={mark.note ?? ""}
                    onFocus={onPrepareEdit}
                    onChange={(event) => onUpdateMark(mark.id, { note: event.target.value })}
                  />
                </div>
              ) : mark.note ? <p className="label-s">“{mark.note}”</p> : null}
              <div className="masters-recut-card-actions">
                <button className="label-xs-semibold" type="button" onClick={() => onSelectMark(mark)}>Edit</button>
                <button className="label-xs-semibold delete" type="button" onClick={() => onDeleteMark(mark.id)}>Delete</button>
              </div>
            </article>
          )) : (
            <div className="masters-recut-empty">
              <DsIcon name="film-strip" size={22} />
              <span className="label-s">Choose a section of the timeline to add your first instruction</span>
            </div>
          )}
        </div>
      </div>
      <footer className="masters-recut-panel-footer">
        <label className="label-xs-semibold">Overall notes for the editor
          <textarea className="label-s" rows={3} placeholder="Overall notes for the editor..." value={notes} onChange={(event) => onChangeNotes(event.target.value)} />
        </label>
        <label className="label-xs-semibold">Aspect ratio
          <select className="label-s" value={targetAspect} onChange={(event) => onChangeTargetAspect(event.target.value)}>
            {mastersFormatOptions.map((aspect) => <option key={aspect} value={aspect}>{aspect}</option>)}
          </select>
        </label>
        <label className="label-xs-semibold">Deliverable name
          <input className="label-s" value={name} onChange={(event) => onChangeName(event.target.value)} />
        </label>
        <button className="masters-primary-button label-s-semibold" type="button" disabled={marks.length === 0 || marks.some((mark) => mark.verb === "trim" && !mark.note?.trim())} onClick={onSubmit}>Send to editor</button>
      </footer>
    </>
  );
}

function RecutBriefPanel({ deliverable, isFilmmaker, selectedMarkId, onSelectMark, onOpenInEdit }: {
  deliverable: MastersDeliverable;
  isFilmmaker: boolean;
  selectedMarkId: string | null;
  onSelectMark: (mark: RecutMark) => void;
  onOpenInEdit: () => void;
}) {
  const brief = deliverable.recutBrief;
  if (!brief) return null;
  return (
    <>
      <header className="masters-comments-rail-header">
        <div><h2>Recut Brief</h2><span className="label-xs">{brief.marks.length} {brief.marks.length === 1 ? "mark" : "marks"} · target {brief.targetDurationSec}s</span></div>
      </header>
      <div className="masters-recut-panel-body read-only">
        <div className="masters-recut-brief-summary">
          <span className="label-xs-semibold">Target {brief.targetDurationSec}s</span>
          <span className="label-xs-semibold">{brief.targetAspect}</span>
          <span className="label-xs-semibold">Timeline mark-up</span>
        </div>
        <div className="masters-recut-mark-list">
          {brief.marks.map((mark) => (
            <button className={`masters-recut-mark-card mark-${mark.verb} ${selectedMarkId === mark.id ? "selected" : ""}`} type="button" key={mark.id} onClick={() => onSelectMark(mark)}>
              <span className="masters-recut-mark-select">
                <span className="masters-recut-timecode label-xs-semibold">{formatTime(mark.inSec)} - {formatTime(mark.outSec)}</span>
                <span className={`masters-recut-verb-chip mark-${mark.verb} label-xs-semibold`}>{recutFriendlyVerbLabel(mark.verb)}</span>
              </span>
              {mark.note ? <span className="label-s">“{mark.note}”</span> : null}
            </button>
          ))}
        </div>
        {brief.notes ? <div className="masters-recut-overall-notes"><strong className="label-xs-semibold">Overall notes</strong><p className="label-s">{brief.notes}</p></div> : null}
      </div>
      {isFilmmaker ? <footer className="masters-recut-panel-footer"><button className="masters-primary-button label-s-semibold" type="button" onClick={onOpenInEdit}>Open in Edit tab</button></footer> : null}
    </>
  );
}

function SrtInspector({
  attachment,
  isEditable,
  onDownload,
  onSave,
  onSeek,
}: {
  attachment: NonNullable<MastersDeliverable["srt"]>;
  isEditable: boolean;
  onDownload: () => void;
  onSave: (lines: MastersSrtLine[]) => void;
  onSeek: (seconds: number) => void;
}) {
  const [lines, setLines] = useState(() => structuredClone(attachment.lines));
  return (
    <div className="masters-srt-inspector">
      <div className="masters-asset-summary">
        <span className="masters-asset-ready label-xs-semibold">Ready</span>
        <span className="label-xs">{attachment.filename}</span>
      </div>
      <div className="masters-srt-lines">
        {lines.map((line) => (
          <label className="masters-srt-line" key={line.id}>
            <button type="button" className="label-xs-semibold" onClick={() => onSeek(line.startSeconds)}>
              {formatTime(line.startSeconds)} - {formatTime(line.endSeconds)}
            </button>
            <input
              value={line.text}
              readOnly={!isEditable}
              aria-label={`Caption at ${formatTime(line.startSeconds)}`}
              onChange={(event) => setLines((current) => current.map((item) =>
                item.id === line.id ? { ...item, text: event.target.value } : item,
              ))}
              onBlur={() => { if (isEditable) onSave(lines); }}
            />
          </label>
        ))}
      </div>
      <div className="masters-asset-inspector-actions">
        <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onDownload}>
          <DsIcon name="download" size={14} />Download SRT
        </button>
      </div>
    </div>
  );
}

function ThumbnailInspector({
  deliverable,
  isFilmmaker,
  onEditCopy,
  onRegenerate,
  onReplace,
}: {
  deliverable: MastersDeliverable;
  isFilmmaker: boolean;
  onEditCopy: () => void;
  onRegenerate: () => void;
  onReplace: () => void;
}) {
  const thumbnail = deliverable.thumbnail;
  if (!thumbnail) return null;
  return (
    <div className="masters-thumbnail-inspector">
      <div className="masters-thumbnail-preview">
        <img src={thumbnail.imageUrl} alt={`${deliverable.name} thumbnail`} />
        <strong>{thumbnail.copy}</strong>
      </div>
      <dl className="masters-thumbnail-details label-xs">
        <div><dt>Status</dt><dd>Ready</dd></div>
        <div><dt>Platform</dt><dd>{thumbnail.platform}</dd></div>
        <div><dt>Source frame</dt><dd>{formatTime(thumbnail.frameSeconds)}</dd></div>
        <div><dt>Created</dt><dd>{thumbnail.source === "regenerated" ? "Regenerated with Brisk AI" : thumbnail.source === "uploaded" ? "Uploaded" : "Generated with Brisk AI"}</dd></div>
      </dl>
      {isFilmmaker ? (
        <div className="masters-thumbnail-inspector-actions">
          <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onRegenerate}>Regenerate thumbnail</button>
          <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onReplace}>Replace with upload</button>
          <button className="masters-tertiary-button label-xs-semibold" type="button" onClick={onEditCopy}>Edit copy</button>
        </div>
      ) : null}
    </div>
  );
}

function ThumbnailGeneratorDialog({
  deliverable,
  focusCopy,
  onCancel,
  onUpload,
  onUse,
}: {
  deliverable?: MastersDeliverable;
  focusCopy: boolean;
  onCancel: () => void;
  onUpload: () => void;
  onUse: (thumbnail: MastersThumbnailAttachment) => void;
}) {
  const thumbnail = deliverable?.thumbnail;
  const copyInputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<ThumbnailPlatform>(thumbnail?.platform ?? "Custom");
  const [frameSeconds, setFrameSeconds] = useState(thumbnail?.frameSeconds ?? 0);
  const [copy, setCopy] = useState(thumbnail?.copy ?? "");
  const [generation, setGeneration] = useState(0);
  const [showVariants, setShowVariants] = useState(false);
  const duration = deliverable ? getPresentedVersion(deliverable, {})?.durationSeconds ?? durationLabelToSeconds(deliverable.duration) : 60;

  useEffect(() => {
    if (focusCopy) copyInputRef.current?.focus();
  }, [focusCopy]);

  if (!deliverable || !thumbnail) return null;
  const variants = mastersThumbnailVariantUrls.map((_, index) => mastersThumbnailVariantUrls[(index + generation) % mastersThumbnailVariantUrls.length]);

  return (
    <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="masters-modal masters-thumbnail-generator" role="dialog" aria-modal="true" aria-labelledby="thumbnail-generator-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="masters-modal-header">
          <h2 id="thumbnail-generator-title">Regenerate thumbnail with Brisk AI</h2>
          <button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button>
        </div>
        <div className="masters-thumbnail-generator-form">
          <label>
            <span className="label-xs-semibold">Where will this thumbnail be used?</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value as ThumbnailPlatform)}>
              {thumbnailPlatformOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <div className="masters-frame-picker">
            <span className="label-xs-semibold">Source frame</span>
            <div><img src={thumbnail.imageUrl} alt="Current source frame" /><span className="label-xs-semibold">{formatTime(frameSeconds)}</span></div>
            <input type="range" min={0} max={duration} step={1} value={frameSeconds} onChange={(event) => setFrameSeconds(Number(event.target.value))} />
          </div>
          <label>
            <span className="label-xs-semibold">Thumbnail copy</span>
            <input
              ref={copyInputRef}
              value={copy}
              placeholder="Brisk AI will suggest copy based on your brief and script."
              onChange={(event) => setCopy(event.target.value)}
            />
          </label>
          <div className="masters-graphics-kit-card">
            <img src={mastersGraphicsKit.logoUrl} alt="Brisk Graphics Kit logo" />
            <span><strong className="label-xs-semibold">Graphics Kit applied</strong><small className="label-xs">{mastersGraphicsKit.font} · Studio colours · Logo</small></span>
            <span className="masters-graphics-kit-swatches" aria-label="Graphics Kit colours">
              {mastersGraphicsKit.colours.map((colour) => <i key={colour} style={{ backgroundColor: colour }} />)}
            </span>
          </div>
          <button className="masters-primary-button label-s-semibold masters-generate-button" type="button" onClick={() => setShowVariants(true)}>
            <DsIcon name="sparkle" size={16} />Generate
          </button>
        </div>
        {showVariants ? (
          <div className="masters-thumbnail-variant-grid">
            {variants.map((imageUrl, index) => (
              <article className="masters-thumbnail-variant" key={`${imageUrl}-${generation}-${index}`}>
                <div><img src={imageUrl} alt={`Generated thumbnail option ${index + 1}`} /><strong>{copy || "Clear care starts here"}</strong></div>
                <button className="masters-primary-button label-xs-semibold" type="button" onClick={() => onUse({ status: "ready", imageUrl, platform, frameSeconds, copy: copy || "Clear care starts here", source: "regenerated" })}>Use this thumbnail</button>
                <button className="masters-ghost-button label-xs-semibold" type="button" onClick={() => setGeneration((current) => current + 1)}>Try again</button>
              </article>
            ))}
          </div>
        ) : null}
        <button className="masters-thumbnail-upload-fallback label-xs-semibold" type="button" onClick={onUpload}>
          <DsIcon name="upload-simple" size={14} />Upload thumbnail instead
        </button>
      </section>
    </div>
  );
}

function BulkApproveDialog({
  deliverables,
  isSuccess,
  onCancel,
  onConfirm,
  onDownload,
}: {
  deliverables: MastersDeliverable[];
  isSuccess: boolean;
  onCancel: () => void;
  onConfirm: (selectedIds: string[]) => void;
  onDownload: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState(() => deliverables.map((deliverable) => deliverable.id));

  if (isSuccess) {
    return (
      <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}>
        <section className="masters-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-approve-success-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="masters-modal-header">
            <h2 id="bulk-approve-success-title">🎉 Project delivered. Download your files below.</h2>
            <button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button>
          </div>
          <div className="masters-modal-actions">
            <button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Close</button>
            <button className="masters-primary-button label-s-semibold" type="button" onClick={onDownload}>
              <DsIcon name="download" size={16} />Download all (.zip)
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="masters-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-approve-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="masters-modal-header">
          <h2 id="bulk-approve-title">Approve and finalise this project?</h2>
          <button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button>
        </div>
        <p className="label-s">This marks all deliverables as delivered and finalises the project.</p>
        <ul className="masters-approval-list">
          {deliverables.map((deliverable) => {
            const latest = deliverable.versions[deliverable.versions.length - 1];
            const checked = selectedIds.includes(deliverable.id);
            return (
              <li key={deliverable.id}>
                <label className="masters-approval-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedIds((current) => checked ? current.filter((id) => id !== deliverable.id) : [...current, deliverable.id])}
                  />
                  <span aria-hidden="true">{checked ? <DsIcon name="check" size={13} /> : null}</span>
                  <span><strong className="label-s-semibold">{deliverable.name}</strong><small className="label-xs">V{latest.number} · {latest.filename}</small></span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="masters-modal-actions">
          <button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button>
          <button className="masters-primary-button label-s-semibold" type="button" disabled={selectedIds.length === 0} onClick={() => onConfirm(selectedIds)}>
            <DsIcon name="checks" size={16} />Approve and finalise
          </button>
        </div>
      </section>
    </div>
  );
}

function ReopenProjectDialog({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="masters-modal" role="dialog" aria-modal="true" aria-labelledby="reopen-project-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="masters-modal-header">
          <h2 id="reopen-project-title">Reopen project?</h2>
          <button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button>
        </div>
        <p className="label-s">Reopen project for further work? Deliverables return to their previous status.</p>
        <div className="masters-modal-actions">
          <button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button>
          <button className="masters-primary-button label-s-semibold" type="button" onClick={onCancel}>Reopen project</button>
        </div>
      </section>
    </div>
  );
}

function DeleteDeliverableDialog({
  deliverableName,
  onCancel,
  onConfirm,
}: {
  deliverableName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="masters-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deliverable-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="masters-modal-header">
          <h2 id="delete-deliverable-title">Delete {deliverableName}?</h2>
          <button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button>
        </div>
        <p className="label-s">This removes the deliverable, its versions, and comments from this project.</p>
        <div className="masters-modal-actions">
          <button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button>
          <button className="masters-danger-button label-s-semibold" type="button" onClick={onConfirm}>Delete deliverable</button>
        </div>
      </section>
    </div>
  );
}

function CountdownRing({ seconds }: { seconds: number }) {
  return (
    <span className="masters-countdown-ring" style={{ "--masters-countdown": `${Math.max(0, Math.min(30, seconds)) / 30 * 360}deg` } as CSSProperties} aria-label={`${seconds} seconds remaining`}>
      <span>{seconds}</span>
    </span>
  );
}

function ConfettiBurst() {
  return (
    <div className="masters-confetti" aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <span
          key={index}
          style={{
            "--confetti-index": index,
            "--confetti-x": `${8 + (index * 17) % 84}%`,
            "--confetti-delay": `${(index % 8) * 45}ms`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function RequestDialog({ source, tab, name, format, duration, notes, onCancel, onChangeDuration, onChangeFormat, onChangeName, onChangeNotes, onChangeTab, onSubmit }: { source?: MastersDeliverable; tab: RequestTab; name: string; format: string; duration: string; notes: string; onCancel: () => void; onChangeDuration: (value: string) => void; onChangeFormat: (value: string) => void; onChangeName: (value: string) => void; onChangeNotes: (value: string) => void; onChangeTab: (tab: RequestTab) => void; onSubmit: () => void }) {
  return <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="masters-modal masters-request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => event.stopPropagation()}><div className="masters-modal-header"><div><span className="masters-modal-kicker label-xs-semibold">NEW DELIVERABLE</span><h2 id="request-title">Request a cut-down or reformat</h2></div><button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button></div><p className="label-s">Source master: <strong>{source?.name}</strong>. Your note stays attached to this request, not the source master.</p><div className="masters-request-tabs" role="tablist">{(["cutdown", "reformat", "script"] as RequestTab[]).map((option) => <button className={`label-s-semibold ${tab === option ? "active" : ""}`} key={option} type="button" role="tab" aria-selected={tab === option} onClick={() => onChangeTab(option)}>{option === "cutdown" ? "Cut-Downs" : option === "reformat" ? "Reformats" : "Script optional"}</button>)}</div><div className="masters-request-form"><label><span className="label-xs-semibold">Request name</span><input value={name} onChange={(event) => onChangeName(event.target.value)} /></label>{tab === "cutdown" ? <label><span className="label-xs-semibold">Duration</span><select value={duration} onChange={(event) => onChangeDuration(event.target.value)}>{mastersDurationOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}{tab === "reformat" ? <label><span className="label-xs-semibold">Format</span><select value={format} onChange={(event) => onChangeFormat(event.target.value)}>{mastersFormatOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}{tab === "script" ? <p className="masters-request-hint label-s">Add an optional script or wording note below. The filmmaker will confirm the edit approach.</p> : null}<label><span className="label-xs-semibold">Comments</span><textarea rows={4} value={notes} placeholder="What should change in this new deliverable?" onChange={(event) => onChangeNotes(event.target.value)} /></label></div><div className="masters-modal-actions"><button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="masters-primary-button label-s-semibold" type="button" disabled={!name.trim()} onClick={onSubmit}>Submit request</button></div></section></div>;
}

function createDeliverableSnapshots(deliverables: MastersDeliverable[]) {
  return Object.fromEntries(deliverables.map((deliverable) => [deliverable.id, {
    status: deliverable.status,
    approvedVersionId: deliverable.approvedVersionId,
    currentVersionId: deliverable.currentVersionId,
    approvedVersionIds: deliverable.versions.filter((version) => version.approved).map((version) => version.id),
  } satisfies DeliverableApprovalSnapshot]));
}

function applyCompletedDeliverables(deliverables: MastersDeliverable[], approvedDeliverableIds: string[]) {
  const approvedIds = new Set(approvedDeliverableIds);
  return deliverables.map((deliverable) => {
    if (!approvedIds.has(deliverable.id)) return deliverable;
    const latest = deliverable.versions[deliverable.versions.length - 1];
    if (!latest) return deliverable;
    return {
      ...deliverable,
      status: "delivered" as const,
      approvedVersionId: latest.id,
      currentVersionId: latest.id,
      versions: deliverable.versions.map((version) => ({ ...version, approved: version.id === latest.id })),
    };
  });
}

function areAllDeliveredFilesApproved(deliverables: MastersDeliverable[]) {
  return deliverables.length > 0 && deliverables.every((deliverable) => {
    if (!deliverable.approvedVersionId || deliverable.versions.length === 0) return false;
    const approvedVersion = deliverable.versions.find((version) => version.id === deliverable.approvedVersionId);
    return Boolean(
      approvedVersion?.approved
      && deliverable.status === "delivered",
    );
  });
}

function restoreDeliverableSnapshots(
  deliverables: MastersDeliverable[],
  snapshots: Record<string, DeliverableApprovalSnapshot>,
) {
  return deliverables.map((deliverable) => {
    const snapshot = snapshots[deliverable.id];
    if (!snapshot) return deliverable;
    return {
      ...deliverable,
      status: snapshot.status,
      approvedVersionId: snapshot.approvedVersionId,
      currentVersionId: snapshot.currentVersionId,
      versions: deliverable.versions.map((version) => ({ ...version, approved: snapshot.approvedVersionIds.includes(version.id) })),
    };
  });
}

function getPresentedVersion(deliverable: MastersDeliverable, selections: Record<string, string>) {
  const selectedId = selections[deliverable.id];
  return deliverable.versions.find((version) => version.id === selectedId)
    ?? deliverable.versions.find((version) => version.id === deliverable.currentVersionId)
    ?? deliverable.versions.find((version) => version.id === deliverable.approvedVersionId)
    ?? deliverable.versions[deliverable.versions.length - 1];
}

function formatRowMetadata(deliverable: MastersDeliverable, version?: MastersVersion) {
  const duration = deliverable.duration.replace("mins", "min").replace("secs", "sec");
  return [version ? `V${version.number}` : deliverable.recutBrief ? "V0" : null, deliverable.format, duration].filter(Boolean).join(" · ");
}

function formatShortDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function formatTime(seconds: number) { const safe = Math.max(0, Math.round(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`; }
function getDeliverableDurationSeconds(deliverable: MastersDeliverable) {
  const currentVersion = getPresentedVersion(deliverable, {});
  return currentVersion?.durationSeconds ?? durationLabelToSeconds(deliverable.duration);
}
function getRecutSource(deliverable: MastersDeliverable, deliverables: MastersDeliverable[]) {
  if (!deliverable.parentDeliverableId) return deliverable;
  return deliverables.find((item) => item.id === deliverable.parentDeliverableId) ?? deliverable;
}
function getAutoRecutName(duration: number, aspect: string, parentName: string) {
  return `${duration}s ${aspect} from ${parentName}`;
}
function formatRecutDuration(duration: number) {
  return duration === 1 ? "1 sec" : `${duration} secs`;
}
function insertRecutChild(deliverables: MastersDeliverable[], child: MastersDeliverable) {
  const parentIndex = deliverables.findIndex((deliverable) => deliverable.id === child.parentDeliverableId);
  if (parentIndex === -1) return [...deliverables, child];
  let insertIndex = parentIndex + 1;
  while (insertIndex < deliverables.length && deliverables[insertIndex].parentDeliverableId === child.parentDeliverableId) insertIndex += 1;
  return [...deliverables.slice(0, insertIndex), child, ...deliverables.slice(insertIndex)];
}
function orderDeliverables(deliverables: MastersDeliverable[], collapsedParentIds: Set<string>) {
  const parents = deliverables.filter((deliverable) => !deliverable.parentDeliverableId);
  return parents.flatMap((parent) => {
    if (collapsedParentIds.has(parent.id)) return [parent];
    const children = deliverables
      .filter((deliverable) => deliverable.parentDeliverableId === parent.id)
      .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""));
    return [parent, ...children];
  });
}
function getUnassignedRecutRangeAtTime(marks: RecutMark[], duration: number, time: number): RecutDraftRange {
  const sortedMarks = [...marks].sort((left, right) => left.inSec - right.inSec);
  let gapStart = 0;
  for (const mark of sortedMarks) {
    if (time >= gapStart && time <= mark.inSec) return { inSec: gapStart, outSec: mark.inSec };
    gapStart = Math.max(gapStart, mark.outSec);
  }
  return { inSec: gapStart, outSec: duration };
}
function recutFriendlyVerbLabel(verb: RecutMarkVerb) {
  if (verb === "keep") return "Keep this";
  if (verb === "cut") return "Remove this";
  return "Describe a change";
}
function formatDrawingPath(points: DrawingPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}
function quantiseToFrame(seconds: number) { return Math.round(seconds * 25) / 25; }
function slugStatus(status: DeliverableStatus) { return status.replaceAll("_", "-"); }
function statusLabel(status: DeliverableStatus, studioName: string, customerName: string) {
  if (status === "not_started") return "Not started";
  if (status === "waiting_for_studio") return `Waiting for ${studioName}`;
  if (status === "waiting_for_customer") return `Waiting for ${customerName}`;
  if (status === "approved") return "✅ Approved";
  return "🚀 Delivered";
}
function durationLabelToSeconds(value: string) { const minuteMatch = value.match(/(\d+)\s*min/); const secondMatch = value.match(/(\d+)\s*sec/); return (minuteMatch ? Number(minuteMatch[1]) * 60 : 0) + (secondMatch ? Number(secondMatch[1]) : 0) || 60; }
function formatFileSize(bytes: number) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function formatSrtTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const remainingSeconds = Math.floor((safe % 60_000) / 1000);
  const milliseconds = safe % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

function formatSrtFile(lines: MastersSrtLine[]) {
  return lines.map((line, index) => `${index + 1}\n${formatSrtTime(line.startSeconds)} --> ${formatSrtTime(line.endSeconds)}\n${line.text}\n`).join("\n");
}

function downloadTextFile(filename: string, content: string, mimeType: string, showToast: (message: string) => void) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`Downloading ${filename}`);
}

function downloadPrototypeFile(filename: string, showToast: (message: string) => void) {
  downloadTextFile(filename, `Brisk prototype download: ${filename}\n`, "text/plain", showToast);
}

async function copyShareLink(deliverableId: string, showToast: (message: string) => void) {
  try { await navigator.clipboard?.writeText(`https://share.brisk.prototype/masters/${deliverableId}`); } catch { /* Prototype feedback remains available when clipboard access is blocked. */ }
  showToast("Share link copied.");
}
