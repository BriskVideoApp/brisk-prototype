"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { reviewUsers, reviewVersions, reviewVideo } from "@/data/video-review";
import { recoverLegacyEditReview } from "@/data/project-legacy-recovery";
import type { RecutBrief } from "@/data/masters";
import type { Project } from "@/components/active-videos/types";

import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { useProjectStageStatus, type EditReadinessItem } from "@/components/project/ProjectStageStatusContext";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { canActOnProject } from "@/data/prototype-access";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { getProjectStageHref } from "@/data/project-fixtures";
import { DsIcon } from "./DsIcon";
import { ReviewCommentComposer } from "./ReviewCommentComposer";
import type {
  CommentFilter,
  CommentVisibility,
  DrawingPath,
  FramePin,
  ReactionEmoji,
  ReviewAttachment,
  ReviewComment,
  ReviewVersion,
  ReviewVersionStatus,
  User,
  Video,
} from "./types";
import { formatVersionStatus, hasTimecode, isOverallComment } from "@/components/video-review/review-utils";
import { ReviewCommentThread, toggleReviewReactionInList } from "@/components/video-review/ReviewCommentThread";
import { InlinePlayer } from "@/components/video-review/InlinePlayer";

type RecutHandoff = { childDeliverableId: string; childName: string; brief: RecutBrief };
const versionUploadInputId = "video-version-upload";
const editCompletionHoldMs = 7200;
const toastVisibleDurationMs = 3000;
const toastFadeDurationMs = 400;

type StoredEditReview = {
  versions: ReviewVersion[];
  comments: ReviewComment[];
  resolvedIds: string[];
  statuses: Record<string, ReviewVersionStatus>;
};

function isStoredEditReview(value: unknown): value is StoredEditReview {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<StoredEditReview>;
  return Array.isArray(review.versions)
    && review.versions.every((version) => typeof version.label === "string")
    && Array.isArray(review.comments)
    && Array.isArray(review.resolvedIds)
    && !!review.statuses && typeof review.statuses === "object";
}

export function VideoReviewScreen({
  initiallyEmpty = false,
  isolateLegacyReview = false,
  project,
}: {
  initiallyEmpty?: boolean;
  isolateLegacyReview?: boolean;
  project: Project;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRole } = usePrototypeRole();
  const viewer = usePrototypeViewer();
  const { state: prototypeState } = usePrototypeState();
  const legacyReviewStorageKey = `brisk-edit-review-v1:${prototypeState.session.activeWorkspaceId}:${project.id}`;
  const reviewStorageKey = isolateLegacyReview
    ? `brisk-edit-review-v2:${prototypeState.session.activeWorkspaceId}:${project.id}`
    : legacyReviewStorageKey;
  const currentUserId = viewer?.chatUserId ?? "user-tom";
  const studioCompanyName = useStudioCompanyName();
  const { getEditReadiness, getProjectStages, markReadyToEdit, setProjectStageStatus } = useProjectStageStatus();
  const editReadiness = getEditReadiness(project);
  const editStageStatus = getProjectStages(project).edit;
  const outstandingEditPrerequisites = editReadiness.items.filter((item) => !item.approved);
  const canMarkReadyToEdit = viewer?.role === "Studio Staff"
    && canActOnProject(viewer, project, prototypeState, "status", "edit")
    && !outstandingEditPrerequisites.some((item) => item.key === "storyboard");
  const editReadinessBlockedReason = viewer?.role !== "Studio Staff"
    ? "Only Studio Staff can mark Edit ready."
    : !canActOnProject(viewer, project, prototypeState, "status", "edit")
      ? "You don’t have permission to mark Edit ready for this project."
      : "Approve the Storyboard before marking Edit ready.";
  const canUploadVersions = canActOnProject(viewer, project, prototypeState, "upload", "edit");
  const canChooseCommentVisibility = selectedRole !== "Customer";
  const initialReviewVersions = initiallyEmpty ? [] : reviewVersions;
  const initialReviewComments = initialReviewVersions.length === 0
    ? []
    : reviewVideo.comments.map((comment) => ({
        ...comment,
        versionLabel: comment.versionLabel ?? reviewVideo.versionLabel,
      }));
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>(initialReviewComments);
  const [activeFilter, setActiveFilter] = useState<CommentFilter>("unresolved");
  const [resolvedIds, setResolvedIds] = useState(
    () => new Set(initialReviewComments.filter((comment) => comment.resolved).map((comment) => comment.id)),
  );
  const [expandedResolvedIds, setExpandedResolvedIds] = useState(new Set<string>());
  const [selectedVersionLabel, setSelectedVersionLabel] = useState(() => {
    const linkedVersion = searchParams.get("version");
    return initialReviewVersions.find((version) => version.label === linkedVersion)?.label ?? initialReviewVersions[0]?.label ?? "";
  });
  const [versionStatuses, setVersionStatuses] = useState<Record<string, ReviewVersionStatus>>(() =>
    Object.fromEntries(initialReviewVersions.map((version) => [version.label, version.status])),
  );
  const [comparisonVersionLabels, setComparisonVersionLabels] = useState<string[]>(() =>
    initialReviewVersions.slice(0, 2).map((version) => version.label),
  );
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [hasAnchor, setHasAnchor] = useState(true);
  const [composerBody, setComposerBody] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<ReviewAttachment[]>([]);
  const [composerVisibility, setComposerVisibility] = useState<CommentVisibility>("external");
  const [isPostingMenuOpen, setIsPostingMenuOpen] = useState(false);
  const [editingOverallCommentId, setEditingOverallCommentId] = useState<string | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(reviewVideo.currentTimeSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDrawingCommentId, setEditingDrawingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastFading, setIsToastFading] = useState(false);
  const [videoVersions, setVideoVersions] = useState<ReviewVersion[]>(() =>
    initialReviewVersions.map((version) => ({ ...version })),
  );
  const [loadedReviewKey, setLoadedReviewKey] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [activeDrawingPath, setActiveDrawingPath] = useState<DrawingPath | null>(null);
  const [pendingFramePin, setPendingFramePin] = useState<FramePin | null>(null);
  const [recutHandoff, setRecutHandoff] = useState<RecutHandoff | null>(null);
  const [isReadyConfirmationOpen, setIsReadyConfirmationOpen] = useState(false);
  const [isCompletionVisible, setIsCompletionVisible] = useState(false);
  const localVideoUrlsRef = useRef<string[]>([]);
  const localAttachmentUrlsRef = useRef<string[]>([]);
  const commentRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionRedirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRemoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usersById = useMemo(() => new Map(reviewUsers.map((user) => [user.id, user])), []);

  useEffect(() => {
    try {
      const currentRaw = window.localStorage.getItem(reviewStorageKey);
      const currentParsed: unknown = currentRaw ? JSON.parse(currentRaw) : null;
      let restored = isStoredEditReview(currentParsed) ? currentParsed : null;
      if (isolateLegacyReview) {
        const legacyRaw = window.localStorage.getItem(legacyReviewStorageKey);
        const legacyParsed: unknown = legacyRaw ? JSON.parse(legacyRaw) : null;
        const legacy = isStoredEditReview(legacyParsed) ? recoverLegacyEditReview(legacyParsed) : null;
        if (legacy && (!restored || (restored.versions.length === 0 && restored.comments.length === 0))) restored = legacy;
        else if (legacy && restored) {
          const current = restored;
          restored = {
            ...current,
            versions: [...current.versions, ...legacy.versions.filter((version) =>
              !current.versions.some((candidate) => candidate.label === version.label))],
            comments: [...current.comments, ...legacy.comments.filter((comment) =>
              !current.comments.some((candidate) => candidate.id === comment.id))],
            resolvedIds: [...new Set([...current.resolvedIds, ...legacy.resolvedIds])],
            statuses: { ...legacy.statuses, ...current.statuses },
          };
        }
      }
      if (restored) {
        setVideoVersions(restored.versions.map((version) => version.sourceUrl?.startsWith("blob:")
          ? { ...version, sourceUrl: undefined }
          : version));
        setReviewComments(restored.comments);
        setResolvedIds(new Set(restored.resolvedIds));
        setVersionStatuses(restored.statuses);
        setSelectedVersionLabel((current) => restored.versions.some((version) => version.label === current)
          ? current
          : restored.versions[0]?.label ?? "");
      }
    } catch {
      // Keep the fixture if a browser draft cannot be read.
    }
    setLoadedReviewKey(reviewStorageKey);
  }, [isolateLegacyReview, legacyReviewStorageKey, reviewStorageKey]);

  useEffect(() => {
    if (loadedReviewKey !== reviewStorageKey) return;
    try {
      window.localStorage.setItem(reviewStorageKey, JSON.stringify({
        versions: videoVersions.map((version) => version.sourceUrl?.startsWith("blob:")
          ? { ...version, sourceUrl: undefined }
          : version),
        comments: reviewComments,
        resolvedIds: [...resolvedIds],
        statuses: versionStatuses,
      }));
    } catch {
      setToastMessage("This browser could not save review changes.");
    }
  }, [loadedReviewKey, reviewComments, reviewStorageKey, resolvedIds, versionStatuses, videoVersions]);
  const versionComments = reviewComments.filter((comment) => comment.versionLabel === selectedVersionLabel);
  const roleVisibleVersionComments = canChooseCommentVisibility
    ? versionComments
    : versionComments.filter((comment) => comment.visibility === "external");
  const visibleActiveFilter = !canChooseCommentVisibility
    && (activeFilter === "internal" || activeFilter === "external")
      ? "unresolved"
      : activeFilter;
  const existingOverallComment = roleVisibleVersionComments.find(
    (comment) => comment.authorId === currentUserId && isOverallComment(comment),
  );
  const comments = sortCommentsForReview(
    getFilteredComments(
      roleVisibleVersionComments.map((comment) => ({
        ...comment,
        resolved: resolvedIds.has(comment.id),
      })),
      visibleActiveFilter,
    ),
  );
  const selectedVisibleIndex = selectedCommentId
    ? comments.findIndex((comment) => comment.id === selectedCommentId)
    : -1;
  const canSkipPrevious = comments.length > 0 && selectedVisibleIndex > 0;
  const canSkipNext =
    comments.length > 0 && (selectedVisibleIndex === -1 || selectedVisibleIndex < comments.length - 1);
  const selectedComment = selectedCommentId
    ? reviewComments.find((comment) => comment.id === selectedCommentId)
    : undefined;
  const allReviewVersions = videoVersions;
  const selectedReviewVersion = allReviewVersions.find((version) => version.label === selectedVersionLabel) ?? allReviewVersions[0];
  const activeComparisonVersionLabels = allReviewVersions.length === 2
    ? allReviewVersions.map((version) => version.label)
    : comparisonVersionLabels;
  const comparisonVersions = activeComparisonVersionLabels
    .map((versionLabel) => allReviewVersions.find((version) => version.label === versionLabel))
    .filter((version): version is ReviewVersion => Boolean(version));
  const isActiveCompareMode = isCompareMode && comparisonVersions.length === 2;
  const selectedVersionStatus = selectedReviewVersion
    ? (versionStatuses[selectedReviewVersion.label] ?? selectedReviewVersion.status)
    : "in_review";
  const isEditingDrawing = editingDrawingCommentId !== null;
  const hasDrawingAttachment = !isEditingDrawing && (drawingPaths.length > 0 || activeDrawingPath !== null);
  const pendingDrawingPaths = [...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])];
  const selectedDrawingPaths = pendingFramePin || editingDrawingCommentId === selectedCommentId
    ? []
    : (selectedComment?.drawingPaths ?? []);
  const activeFramePin = pendingFramePin ?? selectedComment?.framePin ?? null;
  const activeVideo: Video = selectedReviewVersion
    ? {
        ...reviewVideo,
        fileName: selectedReviewVersion.fileName,
        versionLabel: selectedReviewVersion.label,
        versions: allReviewVersions.map((version) => version.label),
        durationSeconds: selectedReviewVersion.durationSeconds,
        sourceUrl: selectedReviewVersion.sourceUrl,
      }
    : reviewVideo;
  const isEditEmpty = allReviewVersions.length === 0;

  useEffect(() => {
    if (loadedReviewKey === reviewStorageKey && isEditEmpty && editStageStatus.state === "done") {
      setProjectStageStatus(project.id, "edit", { state: "in_progress", daysAgo: 0 });
    }
  }, [editStageStatus.state, isEditEmpty, loadedReviewKey, project.id, reviewStorageKey, setProjectStageStatus]);

  useEffect(() => {
    if (allReviewVersions.length !== 2) {
      return;
    }

    const availableLabels = allReviewVersions.map((version) => version.label);

    setComparisonVersionLabels((current) => (
      current.length === availableLabels.length
      && current.every((label, index) => label === availableLabels[index])
        ? current
        : availableLabels
    ));
  }, [allReviewVersions]);

  useEffect(() => {
    if (!selectedReviewVersion) return;

    setVersionStatuses((current) => {
      const currentStatus = current[selectedReviewVersion.label] ?? selectedReviewVersion.status;
      const nextStatus = editStageStatus.state === "done"
        ? "approved"
        : currentStatus === "approved"
          ? "in_review"
          : currentStatus;

      return nextStatus === currentStatus
        ? current
        : { ...current, [selectedReviewVersion.label]: nextStatus };
    });
  }, [editStageStatus.state, selectedReviewVersion]);

  useEffect(() => {
    if (canChooseCommentVisibility) {
      return;
    }

    setComposerVisibility("external");
    setIsPostingMenuOpen(false);
  }, [canChooseCommentVisibility]);

  useEffect(() => {
    if (!window.location.search.includes("recut=")) return;
    const storedBrief = window.sessionStorage.getItem("brisk-recut-brief");
    if (!storedBrief) return;
    try {
      setRecutHandoff(JSON.parse(storedBrief) as RecutHandoff);
    } catch {
      window.sessionStorage.removeItem("brisk-recut-brief");
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      setIsToastFading(false);
      return;
    }

    setIsToastFading(false);
    toastFadeTimeoutRef.current = setTimeout(() => {
      setIsToastFading(true);
    }, toastVisibleDurationMs);
    toastRemoveTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, toastVisibleDurationMs + toastFadeDurationMs);

    return () => {
      if (toastFadeTimeoutRef.current) {
        clearTimeout(toastFadeTimeoutRef.current);
        toastFadeTimeoutRef.current = null;
      }

      if (toastRemoveTimeoutRef.current) {
        clearTimeout(toastRemoveTimeoutRef.current);
        toastRemoveTimeoutRef.current = null;
      }
    };
  }, [toastMessage]);

  useEffect(() => {
    if (!isDrawingMode) {
      return;
    }

    const exitDrawingMode = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setActiveDrawingPath(null);
      setIsDrawingMode(false);
    };

    document.addEventListener("keydown", exitDrawingMode);
    return () => document.removeEventListener("keydown", exitDrawingMode);
  }, [isDrawingMode]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      if (completionRedirectTimeoutRef.current) {
        clearTimeout(completionRedirectTimeoutRef.current);
      }

      localVideoUrlsRef.current.forEach((sourceUrl) => URL.revokeObjectURL(sourceUrl));
      localAttachmentUrlsRef.current.forEach((sourceUrl) => URL.revokeObjectURL(sourceUrl));
    };
  }, []);

  const registerCommentRef = (commentId: string, node: HTMLElement | null) => {
    if (node) {
      commentRefs.current.set(commentId, node);
    } else {
      commentRefs.current.delete(commentId);
    }
  };

  const flashComment = (commentId: string) => {
    setHighlightedCommentId(commentId);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedCommentId(null);
    }, 1200);
  };

  const scrollToComment = (commentId: string) => {
    requestAnimationFrame(() => {
      commentRefs.current.get(commentId)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };

  const selectComment = (comment: ReviewComment) => {
    setSelectedCommentId(comment.id);
    setPendingFramePin(null);
    flashComment(comment.id);
    scrollToComment(comment.id);

    if (hasTimecode(comment)) {
      setCurrentTimeSeconds(comment.timecodeSeconds);
      setHasAnchor(true);
      setEditingOverallCommentId(null);
    }
  };

  useEffect(() => {
    const seekFromAi = (event: Event) => {
      const detail = (event as CustomEvent<{ seconds?: number }>).detail;
      if (typeof detail?.seconds !== "number") return;
      setCurrentTimeSeconds(detail.seconds);
      setIsPlaying(false);
      setHasAnchor(true);
    };
    const openCommentFromAi = (event: Event) => {
      const detail = (event as CustomEvent<{ commentId?: string }>).detail;
      const comment = detail?.commentId ? reviewComments.find((candidate) => candidate.id === detail.commentId) : null;
      if (comment) selectComment(comment);
    };

    window.addEventListener("brisk:ai-seek", seekFromAi);
    window.addEventListener("brisk:ai-open-comment", openCommentFromAi);
    return () => {
      window.removeEventListener("brisk:ai-seek", seekFromAi);
      window.removeEventListener("brisk:ai-open-comment", openCommentFromAi);
    };
  }, [reviewComments]);

  const skipComment = (direction: -1 | 1) => {
    if (comments.length === 0) {
      return;
    }

    const baseIndex = selectedVisibleIndex === -1 ? (direction === 1 ? -1 : comments.length) : selectedVisibleIndex;
    const nextIndex = baseIndex + direction;
    const nextComment = comments[nextIndex];

    if (nextComment) {
      selectComment(nextComment);
    }
  };

  const toggleResolved = (commentId: string) => {
    setResolvedIds((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
    setExpandedResolvedIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });
  };

  const openReply = (commentId: string, mentionName?: string) => {
    setReplyingCommentId(commentId);
    setReplyDraft(mentionName ? `@${mentionName} ` : "");
    setEditingCommentId(null);
  };

  const submitReply = (commentId: string) => {
    const trimmedReply = replyDraft.trim();

    if (!trimmedReply) {
      return;
    }

    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: `reply-${Date.now()}`,
                  authorId: currentUserId,
                  createdAgo: "Just now",
                  body: trimmedReply,
                },
              ],
            }
          : comment,
      ),
    );
    setReplyDraft("");
    setReplyingCommentId(null);
  };

  const startEditComment = (comment: ReviewComment) => {
    const commentDrawingPaths = comment.drawingPaths?.map((path) => ({
      ...path,
      points: path.points.map((point) => ({ ...point })),
    })) ?? [];

    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setReplyingCommentId(null);
    setOpenCommentMenuId(null);
    selectComment(comment);

    if (commentDrawingPaths.length > 0) {
      setEditingDrawingCommentId(comment.id);
      setDrawingPaths(commentDrawingPaths);
      setActiveDrawingPath(null);
      setIsDrawingMode(true);
      setIsPlaying(false);
    } else {
      setEditingDrawingCommentId(null);
      clearDrawingAttachment();
    }

    if (comment.resolved) {
      setExpandedResolvedIds((current) => {
        const next = new Set(current);
        next.add(comment.id);
        return next;
      });
    }
  };

  const saveEditComment = (commentId: string) => {
    const trimmedBody = editDraft.trim();
    const editedDrawingPaths = [...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])];
    const isSavingDrawing = editingDrawingCommentId === commentId;

    if (!trimmedBody) {
      return;
    }

    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              body: trimmedBody,
              drawingPaths: isSavingDrawing
                ? (editedDrawingPaths.length > 0 ? editedDrawingPaths : undefined)
                : comment.drawingPaths,
              createdAgo: "Just now",
            }
          : comment,
      ),
    );
    setEditingCommentId(null);
    setEditingDrawingCommentId(null);
    setEditDraft("");
    clearDrawingAttachment();
    setToastMessage(isSavingDrawing ? "Comment and drawing updated" : "Comment updated");
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingDrawingCommentId(null);
    setEditDraft("");
    clearDrawingAttachment();
  };

  const deleteComment = (commentId: string) => {
    setReviewComments((current) => current.filter((comment) => comment.id !== commentId));
    setResolvedIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });
    setExpandedResolvedIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });

    if (selectedCommentId === commentId) {
      setSelectedCommentId(null);
    }

    if (highlightedCommentId === commentId) {
      setHighlightedCommentId(null);
    }

    if (replyingCommentId === commentId) {
      setReplyingCommentId(null);
      setReplyDraft("");
    }

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditDraft("");
    }

    if (editingDrawingCommentId === commentId) {
      setEditingDrawingCommentId(null);
      clearDrawingAttachment();
    }

    if (editingOverallCommentId === commentId) {
      setEditingOverallCommentId(null);
    }

    if (openCommentMenuId === commentId) {
      setOpenCommentMenuId(null);
    }

    setToastMessage("Comment deleted");
  };

  const uploadVersion = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canUploadVersions) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const nextNumber = Math.max(0, ...allReviewVersions.map((version) => version.number)) + 1;
    const nextLabel = `v${nextNumber}`;
    const sourceUrl = URL.createObjectURL(file);

    localVideoUrlsRef.current.push(sourceUrl);
    setVideoVersions((current) => [
      ...current,
      {
        label: nextLabel,
        number: nextNumber,
        fileName: file.name,
        sourceUrl,
        durationSeconds: reviewVideo.durationSeconds,
        uploadedAt: new Date().toISOString(),
        uploadedBy: viewer?.name ?? "Tom Mitchell",
        codec: "H.264 High",
        resolution: "1920 × 1080",
        fileSize: formatFileSize(file.size),
        status: "in_review",
      },
    ]);
    setVersionStatuses((current) => ({ ...current, [nextLabel]: "in_review" }));
    setSelectedVersionLabel(nextLabel);
    setIsCompareMode(false);
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
    setPendingFramePin(null);
    setSelectedCommentId(null);
    setEditingCommentId(null);
    setEditingDrawingCommentId(null);
    setEditDraft("");
    clearDrawingAttachment();
    setToastMessage(`${nextLabel} uploaded`);
    event.target.value = "";
  };

  const updateVideoDuration = (durationSeconds: number) => {
    setVideoVersions((current) =>
      current.map((version) =>
        version.label === selectedVersionLabel
          ? {
              ...version,
              durationSeconds,
            }
          : version,
      ),
    );
  };

  const openMasters = () => {
    if (completionRedirectTimeoutRef.current) {
      clearTimeout(completionRedirectTimeoutRef.current);
      completionRedirectTimeoutRef.current = null;
    }

    router.push(`/projects/${project.id}/stages/masters`);
  };

  const approveSelectedVersion = () => {
    if (!canActOnProject(viewer, project, prototypeState, "approve", "edit") || !selectedReviewVersion || isCompletionVisible) {
      return;
    }

    setVersionStatuses((current) => ({ ...current, [selectedReviewVersion.label]: "approved" }));
    setProjectStageStatus(project.id, "edit", {
      state: "done",
      daysAgo: 0,
      approvedAt: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" }),
      approvedBy: viewer?.name ?? "Tom Mitchell",
    });

    if (selectedRole === "Customer") {
      setIsCompletionVisible(true);
      completionRedirectTimeoutRef.current = setTimeout(openMasters, editCompletionHoldMs);
      return;
    }

    setToastMessage(`V${selectedReviewVersion.number} approved`);
  };

  const unapproveSelectedVersion = () => {
    if (!canActOnProject(viewer, project, prototypeState, "approve", "edit") || !selectedReviewVersion) {
      return;
    }

    setVersionStatuses((current) => ({ ...current, [selectedReviewVersion.label]: "in_review" }));
    setProjectStageStatus(project.id, "edit", {
      state: selectedRole === "Customer" ? "waiting" : "in_progress",
      daysAgo: 0,
    });
    setToastMessage(`Approval removed from V${selectedReviewVersion.number}`);
  };

  const selectReviewVersion = (versionLabel: string) => {
    setSelectedVersionLabel(versionLabel);
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
    setHasAnchor(true);
    setComposerBody("");
    setComposerAttachments([]);
    setEditingOverallCommentId(null);
    setPendingFramePin(null);
    setSelectedCommentId(null);
    setEditingCommentId(null);
    setEditingDrawingCommentId(null);
    setEditDraft("");
    setIsCompareMode(false);
    clearDrawingAttachment();
  };

  const toggleComparisonVersion = (versionLabel: string) => {
    setComparisonVersionLabels((current) => {
      if (current.includes(versionLabel)) {
        return current.filter((label) => label !== versionLabel);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, versionLabel];
    });
    setIsCompareMode(false);
  };

  const replaceReviewVersionFile = (version: ReviewVersion, file: File) => {
    if (!canUploadVersions) {
      return;
    }

    const sourceUrl = URL.createObjectURL(file);

    localVideoUrlsRef.current.push(sourceUrl);
    setVideoVersions((current) =>
      current.map((currentVersion) =>
        currentVersion.label === version.label
          ? {
              ...currentVersion,
              fileName: file.name,
              sourceUrl,
              fileSize: formatFileSize(file.size),
              uploadedAt: new Date().toISOString(),
              uploadedBy: viewer?.name ?? "Tom Mitchell",
              status: "in_review",
            }
          : currentVersion,
      ),
    );
    setVersionStatuses((current) => ({ ...current, [version.label]: "in_review" }));
    selectReviewVersion(version.label);
    setToastMessage(`V${version.number} file replaced`);
  };

  const deleteReviewVersion = (version: ReviewVersion) => {
    if (!canUploadVersions) {
      return;
    }

    if (allReviewVersions.length <= 1) {
      setToastMessage("Keep at least one version");
      return;
    }

    const remainingVersions = allReviewVersions
      .filter((currentVersion) => currentVersion.label !== version.label)
      .sort((left, right) => right.number - left.number);

    setVideoVersions(remainingVersions);
    setVersionStatuses((current) => {
      const nextStatuses = { ...current };
      delete nextStatuses[version.label];
      return nextStatuses;
    });

    if (version.sourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(version.sourceUrl);
      localVideoUrlsRef.current = localVideoUrlsRef.current.filter((sourceUrl) => sourceUrl !== version.sourceUrl);
    }

    if (selectedVersionLabel === version.label) {
      selectReviewVersion(remainingVersions[0].label);
    }

    if (remainingVersions.length < 2) {
      setIsCompareMode(false);
    }

    if (comparisonVersionLabels.includes(version.label)) {
      setComparisonVersionLabels((current) => current.filter((label) => label !== version.label));
      setIsCompareMode(false);
    }

    setToastMessage(`V${version.number} deleted`);
  };

  const toggleReaction = (commentId: string, emoji: ReactionEmoji) => {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, reactions: toggleReviewReactionInList(comment.reactions, emoji, currentUserId) } : comment,
      ),
    );
  };

  const toggleReplyReaction = (commentId: string, replyId: string, emoji: ReactionEmoji) => {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === replyId ? { ...reply, reactions: toggleReviewReactionInList(reply.reactions, emoji, currentUserId) } : reply,
              ),
            }
          : comment,
      ),
    );
  };

  const toggleCommentVisibility = (commentId: string) => {
    if (!canChooseCommentVisibility) {
      return;
    }

    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              visibility: comment.visibility === "internal" ? "external" : "internal",
            }
          : comment,
      ),
    );
  };

  const expandResolved = (commentId: string) => {
    setExpandedResolvedIds((current) => {
      const next = new Set(current);
      next.add(commentId);
      return next;
    });
  };

  const removeAnchor = () => {
    setHasAnchor(false);
    setEditingOverallCommentId(existingOverallComment?.id ?? null);
    setComposerBody((currentBody) => currentBody || existingOverallComment?.body || "");
    setToastMessage("General comment");
  };

  const addComposerAttachments = (files: File[]) => {
    const createdAt = Date.now();
    const attachments = files.map<ReviewAttachment>((file, index) => {
      const url = URL.createObjectURL(file);
      localAttachmentUrlsRef.current.push(url);

      return {
        id: `review-attachment-${createdAt}-${index}-${file.name}`,
        name: file.name,
        size: formatFileSize(file.size),
        mimeType: file.type,
        url,
      };
    });

    setComposerAttachments((current) => [...current, ...attachments]);
  };

  const removeComposerAttachment = (attachmentId: string) => {
    setComposerAttachments((current) => {
      const attachment = current.find((candidate) => candidate.id === attachmentId);

      if (attachment) {
        URL.revokeObjectURL(attachment.url);
        localAttachmentUrlsRef.current = localAttachmentUrlsRef.current.filter((url) => url !== attachment.url);
      }

      return current.filter((candidate) => candidate.id !== attachmentId);
    });
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
    if (activeDrawingPath) {
      setActiveDrawingPath(null);
      return;
    }

    setDrawingPaths((current) => current.slice(0, -1));
  };

  const placeFramePin = (framePin: FramePin) => {
    setComposerBody("");
    setComposerAttachments([]);
    clearDrawingAttachment();
    setPendingFramePin(framePin);
    setSelectedCommentId(null);
    setHasAnchor(true);
    setEditingOverallCommentId(null);
    setIsPlaying(false);
  };

  const cancelFramePin = () => {
    setPendingFramePin(null);
    setComposerBody("");
  };

  const submitComposer = () => {
    const trimmedBody = composerBody.trim();
    const submittedBody = trimmedBody || (hasDrawingAttachment ? "Drawing note" : "Attached file");
    const submittedVisibility = canChooseCommentVisibility ? composerVisibility : "external";

    if (!trimmedBody && !hasDrawingAttachment && composerAttachments.length === 0) {
      return;
    }

    if (hasAnchor) {
      const newComment: ReviewComment = {
        id: `comment-${Date.now()}`,
        versionLabel: selectedReviewVersion.label,
        authorId: currentUserId,
        visibility: submittedVisibility,
        timecodeSeconds: currentTimeSeconds,
        createdAgo: "Just now",
        body: submittedBody,
        drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
        framePin: pendingFramePin ?? undefined,
        attachments: composerAttachments.length > 0 ? composerAttachments : undefined,
        resolved: false,
        replies: [],
      };

      setReviewComments((current) => [...current, newComment]);
      setComposerBody("");
      setComposerAttachments([]);
      setPendingFramePin(null);
      clearDrawingAttachment();
      setSelectedCommentId(newComment.id);
      flashComment(newComment.id);
      setTimeout(() => scrollToComment(newComment.id), 0);
      return;
    }

    if (editingOverallCommentId) {
      setReviewComments((current) =>
        current.map((comment) =>
          comment.id === editingOverallCommentId
            ? {
                ...comment,
                body: submittedBody,
                drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : comment.drawingPaths,
                framePin: pendingFramePin ?? comment.framePin,
                attachments: composerAttachments.length > 0
                  ? [...(comment.attachments ?? []), ...composerAttachments]
                  : comment.attachments,
                createdAgo: "Just now",
              }
            : comment,
        ),
      );
      setPendingFramePin(null);
      setComposerAttachments([]);
      clearDrawingAttachment();
      setToastMessage("Overall comment updated");
      return;
    }

    const newComment: ReviewComment = {
      id: `comment-overall-${currentUserId}-${selectedReviewVersion.label}`,
      versionLabel: selectedReviewVersion.label,
      authorId: currentUserId,
      visibility: submittedVisibility,
      createdAgo: "Just now",
      body: submittedBody,
      drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
      framePin: pendingFramePin ?? undefined,
      attachments: composerAttachments.length > 0 ? composerAttachments : undefined,
      resolved: false,
      replies: [],
    };

    setReviewComments((current) => [newComment, ...current]);
    setEditingOverallCommentId(newComment.id);
    setSelectedCommentId(newComment.id);
    setComposerBody(submittedBody);
    setComposerAttachments([]);
    setPendingFramePin(null);
    clearDrawingAttachment();
    setToastMessage("Overall comment added");
  };

  return (
    <>
      <main className="video-review-shell">
      <div className="video-review-main">
        <ProjectStageHeader
          activeStage="edit"
          project={project}
          showProjectShare={!editReadiness.ready || isEditEmpty}
        />
        {canUploadVersions ? (
          <input
            className="visually-hidden-file-input"
            id={versionUploadInputId}
            type="file"
            accept="video/*"
            aria-label="Upload a new version"
            onChange={uploadVersion}
          />
        ) : null}
        {!editReadiness.ready ? (
          <section className="review-workspace is-empty" aria-label="Edit readiness">
            <EditReadinessEmptyState
              blockedReason={editReadinessBlockedReason}
              canMarkReady={canMarkReadyToEdit}
              items={editReadiness.items}
              onMarkReady={() => setIsReadyConfirmationOpen(true)}
              projectId={project.id}
            />
          </section>
        ) : isEditEmpty ? (
          <section className="review-workspace is-empty" aria-label="Edit stage empty state">
            <EditEmptyState
              isCustomer={selectedRole === "Customer"}
              onMessageStudio={() => router.push(`/chat?project=${encodeURIComponent(project.id)}`)}
              onUpload={() => document.getElementById(versionUploadInputId)?.click()}
            />
          </section>
        ) : (
          <section className="review-workspace" aria-label="Video review workspace">
            <div className="review-media-pane">
          <InlinePlayer
            video={activeVideo}
            comments={roleVisibleVersionComments.map((comment) => ({
              ...comment,
              resolved: resolvedIds.has(comment.id),
            }))}
            currentTimeSeconds={currentTimeSeconds}
            isPlaying={isPlaying}
            isCompareMode={isActiveCompareMode}
            comparisonVersions={comparisonVersions}
            versionStatus={selectedVersionStatus}
            selectedCommentId={selectedCommentId}
            activeDrawingPath={activeDrawingPath}
            activeFramePin={activeFramePin}
            composerBody={composerBody}
            drawingPaths={drawingPaths}
            selectedDrawingPaths={selectedDrawingPaths}
            isDrawingMode={isDrawingMode}
            isEditingDrawing={isEditingDrawing}
            pendingFramePin={pendingFramePin}
            recutBrief={recutHandoff?.brief}
            onComposerBodyChange={setComposerBody}
            onPlaceFramePin={placeFramePin}
            onCancelFramePin={cancelFramePin}
            onStartDrawing={(point) => {
              setIsPlaying(false);
              setActiveDrawingPath({
                id: `drawing-${Date.now()}`,
                points: [point],
              });
            }}
            onUpdateDrawing={(point) => {
              setActiveDrawingPath((currentPath) =>
                currentPath
                  ? {
                      ...currentPath,
                      points: [...currentPath.points, point],
                    }
                  : currentPath,
              );
            }}
            onEndDrawing={finishDrawing}
            onSubmitComposer={submitComposer}
            onEditSelectedDrawing={() => {
              if (selectedComment?.drawingPaths?.length) {
                startEditComment(selectedComment);
              }
            }}
            onSelectComment={selectComment}
            onSkipNextComment={() => skipComment(1)}
            onSkipPreviousComment={() => skipComment(-1)}
            onSeek={setCurrentTimeSeconds}
            onTimeChange={setCurrentTimeSeconds}
            onDurationChange={updateVideoDuration}
            onSetPlaying={setIsPlaying}
            onTogglePlay={() => {
              setIsPlaying((current) => {
                const nextIsPlaying = !current;

                if (nextIsPlaying) {
                  setSelectedCommentId(null);
                }

                return nextIsPlaying;
              });
            }}
          />
          <ReviewVersionLibrary
            versions={allReviewVersions}
            statuses={versionStatuses}
            selectedVersionLabel={selectedVersionLabel}
            canUpload={canUploadVersions}
            uploadInputId={versionUploadInputId}
            isCompareMode={isCompareMode}
            comparisonVersionLabels={activeComparisonVersionLabels}
            onDelete={deleteReviewVersion}
            onDownload={(version) => setToastMessage(`Downloading ${version.fileName}`)}
            onReplace={replaceReviewVersionFile}
            onSelectVersion={selectReviewVersion}
            onToggleCompare={() => {
              if (comparisonVersions.length === 2) {
                setIsCompareMode((current) => !current);
              }
            }}
            onToggleComparisonVersion={toggleComparisonVersion}
          />
        </div>
        <CommentPanel
          activeFilter={visibleActiveFilter}
          canChooseVisibility={canChooseCommentVisibility}
          canSkipNext={canSkipNext}
          canSkipPrevious={canSkipPrevious}
          comments={comments}
          composerAttachments={composerAttachments}
          canUndoDrawing={drawingPaths.length > 0 || activeDrawingPath !== null}
          visibleCommentsCount={comments.length}
          usersById={usersById}
          currentTimeSeconds={currentTimeSeconds}
          composerBody={composerBody}
          composerVisibility={composerVisibility}
          editingCommentId={editingCommentId}
          editDraft={editDraft}
          expandedResolvedIds={expandedResolvedIds}
          highlightedCommentId={highlightedCommentId}
          isEditingOverallComment={!hasAnchor && editingOverallCommentId !== null}
          hasAnchor={hasAnchor}
          hasDrawingAttachment={hasDrawingAttachment}
          hasFramePinAttachment={pendingFramePin !== null}
          isDrawingMode={isDrawingMode}
          isPostingMenuOpen={isPostingMenuOpen}
          openCommentMenuId={openCommentMenuId}
          replyingCommentId={replyingCommentId}
          replyDraft={replyDraft}
          selectedCommentId={selectedCommentId}
          onAddComposerAttachments={addComposerAttachments}
          onChangeFilter={setActiveFilter}
          onCancelEditComment={cancelEditComment}
          onComposerBodyChange={setComposerBody}
          onDeleteComment={deleteComment}
          onEditDraftChange={setEditDraft}
          onExpandResolved={expandResolved}
          onOpenReply={openReply}
          onRemoveAnchor={removeAnchor}
          onRegisterCommentRef={registerCommentRef}
          onRemoveComposerAttachment={removeComposerAttachment}
          onSelectComment={selectComment}
          onSetComposerVisibility={(visibility) => {
            setComposerVisibility(visibility);
            setIsPostingMenuOpen(false);
          }}
          onSetOpenCommentMenu={setOpenCommentMenuId}
          onSetReplyDraft={setReplyDraft}
          onSkipNext={() => skipComment(1)}
          onSkipPrevious={() => skipComment(-1)}
          onSubmitComposer={submitComposer}
          onToggleDrawingMode={() => setIsDrawingMode((current) => !current)}
          onUndoDrawing={undoLastDrawingStroke}
          onSaveEditComment={saveEditComment}
          onStartEditComment={startEditComment}
          onSubmitReply={submitReply}
          onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
          onToggleCommentVisibility={toggleCommentVisibility}
          onToggleReaction={toggleReaction}
          onToggleReplyReaction={toggleReplyReaction}
          onToggleResolved={toggleResolved}
        />
        <footer className="review-action-footer" aria-label="Edit review actions">
          <div className="review-action-footer-inner">
            {toastMessage ? (
              <Toast
                isFading={isToastFading}
                message={toastMessage}
                onDismiss={() => setToastMessage("")}
              />
            ) : null}
            <ShareActionRow
              context="edit"
              userRole={selectedRole}
              projectId={project.id}
              reviewScopeKey={selectedReviewVersion?.label}
              reviewFingerprint={selectedReviewVersion ? JSON.stringify(selectedReviewVersion) : undefined}
              scopeType={selectedReviewVersion ? "version" : "stage"}
              allowProjectScope
              shareTitle={selectedReviewVersion ? `V${selectedReviewVersion.number}` : "Edit"}
              initialLinkOpens="videoOnly"
              projectName={project.name}
              studioName={studioCompanyName}
              customerName={project.clientName}
              isWaitingOnReview={editStageStatus.state === "waiting" && editStageStatus.reviewVersion === selectedReviewVersion?.label}
              waitingOnCompany={editStageStatus.assignedTo}
              shareUrl={selectedReviewVersion ? `/projects/${project.id}/stages/edit?version=${encodeURIComponent(selectedReviewVersion.label)}` : `/projects/${project.id}/stages/edit`}
              copyLinkIconOnly
              copyLinkLabel="Copy link"
              sendLabel={selectedReviewVersion ? `Ask ${selectedRole === "Customer" || selectedRole === "Studio Freelancer" ? studioCompanyName : project.clientName} to review V${selectedReviewVersion.number}` : undefined}
              approveLabel={selectedReviewVersion ? `Approve V${selectedReviewVersion.number}` : "Approve Edit"}
              approveDisabled={selectedRole === "Studio Freelancer"}
              approvedAt={editStageStatus.approvedAt}
              approvedBy={editStageStatus.approvedBy}
              isApproved={selectedVersionStatus === "approved"}
              showApprove={Boolean(selectedReviewVersion)}
              onApprove={approveSelectedVersion}
              onRequestReview={(recipient, message) => {
                if (!canActOnProject(viewer, project, prototypeState, "send", "edit") || !selectedReviewVersion) return;

                setProjectStageStatus(project.id, "edit", {
                  state: "waiting",
                  daysAgo: 0,
                  assignedTo: recipient === "customer" ? project.clientName : studioCompanyName,
                  reviewVersion: selectedReviewVersion.label,
                });

                void message;
              }}
              onSendToStudio={() => {
                if (!canActOnProject(viewer, project, prototypeState, "send", "edit")) return;
                setProjectStageStatus(project.id, "edit", {
                  state: "in_progress",
                  daysAgo: 0,
                  assignedTo: studioCompanyName,
                  reviewVersion: selectedReviewVersion?.label,
                });
              }}
              onUnapprove={unapproveSelectedVersion}
            />
          </div>
            </footer>
          </section>
        )}
      </div>
      </main>
      {isReadyConfirmationOpen ? (
        <EditReadinessConfirmation
          items={outstandingEditPrerequisites}
          onCancel={() => setIsReadyConfirmationOpen(false)}
          onConfirm={() => {
            if (!canMarkReadyToEdit) return;
            markReadyToEdit(project);
            setIsReadyConfirmationOpen(false);
          }}
        />
      ) : null}
      {isCompletionVisible ? <EditCompletionMoment onDismiss={openMasters} /> : null}
    </>
  );
}

function EditCompletionMoment({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="review-completion-moment">
      <div className="review-completion-confetti" aria-hidden="true">
        {Array.from({ length: 144 }, (_, index) => (
          <span
            key={index}
            style={{
              "--confetti-index": index,
              "--confetti-x": `${2 + (index * 37) % 96}%`,
              "--confetti-delay": `${(index % 24) * 85}ms`,
              "--confetti-duration": `${3600 + (index % 7) * 240}ms`,
              "--confetti-drift": (index * 29) % 31 - 15,
            } as CSSProperties}
          />
        ))}
      </div>
      <section
        className="review-completion-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-completion-title"
        aria-describedby="review-completion-description"
      >
        <button
          className="review-completion-dismiss"
          type="button"
          aria-label="Dismiss celebration and open Masters"
          onClick={onDismiss}
        >
          <DsIcon name="x-close-cross" size={18} />
        </button>
        <span className="review-completion-icon" aria-hidden="true">
          <DsIcon name="check" size={28} />
        </span>
        <span className="label-xs-semibold review-completion-kicker">FINAL APPROVAL CONFIRMED</span>
        <h2 className="headings-m-bold" id="review-completion-title">Your video is complete</h2>
        <p className="paragraph-s" id="review-completion-description">
          Taking you to Masters to access the completed deliverables.
        </p>
      </section>
    </div>
  );
}

function EditReadinessEmptyState({
  blockedReason,
  canMarkReady,
  items,
  onMarkReady,
  projectId,
}: {
  blockedReason: string;
  canMarkReady: boolean;
  items: EditReadinessItem[];
  onMarkReady: () => void;
  projectId: string;
}) {
  return (
    <div className="review-edit-empty-state">
      <div className="review-edit-empty-content is-readiness">
        <span className="review-edit-empty-icon" aria-hidden="true">
          <DsIcon name="stage-edit" size={28} />
        </span>
        <h2 className="headings-xs-bold">Edit isn’t ready yet</h2>
        <p className="paragraph-s">Approve the previous stages and Media before editing begins.</p>
        <ul className="review-edit-readiness-list" aria-label="Edit prerequisites">
          {items.map((item) => {
            const content = <>
              <span
                className={`review-edit-readiness-state ${item.approved ? "is-approved" : "is-outstanding"}`}
                aria-hidden="true"
              >
                {item.approved ? <DsIcon name="check" size={14} /> : null}
              </span>
              <span>
                {item.label} {getReadinessStatusLabel(item.status)}
              </span>
            </>;

            return (
              <li className="review-edit-readiness-item label-s" key={item.key}>
                {item.approved ? content : (
                  <Link
                    className="review-edit-readiness-link"
                    href={getProjectStageHref(projectId, item.key)}
                    aria-label={`Open ${item.label} - ${getReadinessStatusLabel(item.status)}`}
                  >
                    {content}
                    <DsIcon name="arrow-right" size={16} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {canMarkReady ? (
          <Button className="review-edit-empty-action" size="M" onClick={onMarkReady}>
            Mark ready to edit
          </Button>
        ) : (
          <p className="review-edit-readiness-permission label-xs">
            {blockedReason}
          </p>
        )}
      </div>
    </div>
  );
}

function EditReadinessConfirmation({ items, onCancel, onConfirm }: { items: EditReadinessItem[]; onCancel: () => void; onConfirm: () => void }) {
  return <ConfirmationDialog title="Mark ready to edit?" description="This will approve the outstanding work below and set Edit to Waiting on Brisk." expanded confirmLabel="Approve and mark ready" onCancel={onCancel} onConfirm={onConfirm}>
    <ul className="edit-readiness-confirmation-list" aria-label="Work that will be approved">
      {items.map((item) => <li className="label-s" key={item.key}><span>{item.label}</span><span>{getReadinessStatusLabel(item.status)}</span></li>)}
    </ul>
  </ConfirmationDialog>;
}

function getReadinessStatusLabel(status: EditReadinessItem["status"]) {
  if (status.state === "done") return "approved";
  if (status.state === "waiting") return "waiting on client";
  if (status.state === "in_progress") return "waiting on Brisk";
  return "not started";
}

function EditEmptyState({
  isCustomer,
  onMessageStudio,
  onUpload,
}: {
  isCustomer: boolean;
  onMessageStudio: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="review-edit-empty-state">
      <div className="review-edit-empty-content">
        <span className="review-edit-empty-icon" aria-hidden="true">
          <DsIcon name={isCustomer ? "chats" : "upload-simple"} size={28} />
        </span>
        <h2 className="headings-xs-bold">
          {isCustomer ? "No version is ready to review yet" : "No edit versions yet"}
        </h2>
        <p className="paragraph-s">
          {isCustomer
            ? "The studio will upload the first cut here when it’s ready."
            : "Upload the first cut to start feedback and approvals."}
        </p>
        <Button
          className="review-edit-empty-action"
          size="M"
          onClick={isCustomer ? onMessageStudio : onUpload}
        >
          <DsIcon name={isCustomer ? "chats" : "upload-simple"} size={16} />
          {isCustomer ? "Message the studio" : "Upload V1"}
        </Button>
      </div>
    </div>
  );
}

function ReviewVersionLibrary({
  versions,
  statuses,
  selectedVersionLabel,
  canUpload,
  uploadInputId,
  isCompareMode,
  comparisonVersionLabels,
  onDelete,
  onDownload,
  onReplace,
  onSelectVersion,
  onToggleCompare,
  onToggleComparisonVersion,
}: {
  versions: ReviewVersion[];
  statuses: Record<string, ReviewVersionStatus>;
  selectedVersionLabel: string;
  canUpload: boolean;
  uploadInputId: string;
  isCompareMode: boolean;
  comparisonVersionLabels: string[];
  onDelete: (version: ReviewVersion) => void;
  onDownload: (version: ReviewVersion) => void;
  onReplace: (version: ReviewVersion, file: File) => void;
  onSelectVersion: (versionLabel: string) => void;
  onToggleCompare: () => void;
  onToggleComparisonVersion: (versionLabel: string) => void;
}) {
  const orderedVersions = [...versions].sort((left, right) => right.number - left.number);
  const comparisonVersions = comparisonVersionLabels
    .map((versionLabel) => versions.find((version) => version.label === versionLabel))
    .filter((version): version is ReviewVersion => Boolean(version));
  const comparisonLabel = comparisonVersions.map((version) => `V${version.number}`).join(" and ");
  const openUploadWithKeyboard = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    const input = document.getElementById(uploadInputId);

    if (input instanceof HTMLInputElement) {
      input.click();
    }
  };

  return (
    <section className="review-version-library" aria-labelledby="review-version-library-title">
      <div className="review-version-library-header">
        <div>
          <span className="review-version-eyebrow label-xs-semibold">FILES</span>
          <h2 id="review-version-library-title">Versions</h2>
        </div>
        {canUpload ? (
          <label
            className="review-upload-version label-s-semibold"
            htmlFor={uploadInputId}
            role="button"
            tabIndex={0}
            onKeyDown={openUploadWithKeyboard}
          >
            <DsIcon name="upload-simple" size={16} />
            Upload new version
          </label>
        ) : null}
      </div>

      {versions.length > 1 ? (
        <button
          className={`review-compare-button label-s-semibold ${isCompareMode ? "active" : ""}`}
          type="button"
          disabled={comparisonVersions.length < 2}
          aria-pressed={isCompareMode}
          onClick={onToggleCompare}
        >
          <DsIcon name="columns" size={16} />
          {isCompareMode
            ? `Exit ${comparisonLabel} comparison`
            : comparisonVersions.length === 2
              ? `Compare ${comparisonLabel}`
              : comparisonVersions.length === 1
                ? "Choose one more version"
                : "Choose two versions to compare"}
        </button>
      ) : null}

      <div className="review-version-file-list">
        {orderedVersions.map((version) => {
          const status = statuses[version.label] ?? version.status;
          const isSelected = version.label === selectedVersionLabel;
          const comparisonIndex = comparisonVersionLabels.indexOf(version.label);
          const isSelectedForComparison = comparisonIndex !== -1;
          const comparisonSelectionFull = comparisonVersionLabels.length >= 2;

          return (
            <article className={`review-version-file ${isSelected ? "selected" : ""} ${isSelectedForComparison ? "comparison-selected" : ""}`} key={version.label}>
              <button className="review-version-file-select" type="button" onClick={() => onSelectVersion(version.label)}>
                <span className="review-version-file-thumb"><DsIcon name="play" size={18} /></span>
                <span className="review-version-file-copy">
                  <span className="review-version-file-title label-s-semibold">
                    V{version.number} · {formatVersionStatus(status)}
                  </span>
                  <span className="label-s">{version.fileName}</span>
                  <span className="label-xs">{formatReviewDate(version.uploadedAt)} · {version.uploadedBy} · {version.resolution} · {version.fileSize}</span>
                </span>
              </button>
              <div className="review-version-file-actions">
                {versions.length > 2 ? (
                  <button
                    className={`review-version-compare-select ${isSelectedForComparison ? "active" : ""}`}
                    type="button"
                    aria-label={`${isSelectedForComparison ? "Remove" : "Add"} V${version.number} ${isSelectedForComparison ? "from" : "to"} comparison`}
                    aria-pressed={isSelectedForComparison}
                    data-tooltip={isSelectedForComparison ? "Remove from comparison" : comparisonSelectionFull ? "Choose only two versions" : "Add to comparison"}
                    disabled={!isSelectedForComparison && comparisonSelectionFull}
                    onClick={() => onToggleComparisonVersion(version.label)}
                  >
                    <DsIcon name={isSelectedForComparison ? "check" : "columns"} size={15} />
                    <span className="label-xs-semibold">{isSelectedForComparison ? `Compare ${comparisonIndex + 1}` : "Compare"}</span>
                  </button>
                ) : null}
                {!isSelected && canUpload ? (
                  <button type="button" aria-label={`Set V${version.number} as current`} data-tooltip="Set as current" onClick={() => onSelectVersion(version.label)}>
                    <DsIcon name="eye" size={15} />
                  </button>
                ) : isSelected ? <span className="review-current-version label-xs-semibold">Current</span> : null}
                <button type="button" aria-label={`Download V${version.number}`} data-tooltip="Download" onClick={() => onDownload(version)}>
                  <DsIcon name="download" size={15} />
                </button>
                {canUpload ? (
                  <>
                    <label
                      className="review-version-file-action"
                      htmlFor={`replace-${version.label}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Replace file for V${version.number}`}
                      data-tooltip="Replace file"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        document.getElementById(`replace-${version.label}`)?.click();
                      }}
                    >
                      <DsIcon name="arrows-clockwise" size={15} />
                    </label>
                    <input
                      className="visually-hidden-file-input"
                      id={`replace-${version.label}`}
                      type="file"
                      accept="video/*"
                      aria-label={`Choose replacement file for V${version.number}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onReplace(version, file);
                        event.target.value = "";
                      }}
                    />
                    <button
                      className="delete"
                      type="button"
                      aria-label={`Delete V${version.number}`}
                      data-tooltip={versions.length <= 1 ? "Keep at least one version" : "Delete"}
                      disabled={versions.length <= 1}
                      onClick={() => onDelete(version)}
                    >
                      <DsIcon name="trash-simple" size={15} />
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CommentPanel({
  activeFilter,
  canChooseVisibility,
  canSkipNext,
  canSkipPrevious,
  comments,
  canUndoDrawing,
  composerAttachments,
  composerBody,
  composerVisibility,
  currentTimeSeconds,
  editingCommentId,
  editDraft,
  highlightedCommentId,
  visibleCommentsCount,
  usersById,
  expandedResolvedIds,
  isEditingOverallComment,
  hasAnchor,
  hasDrawingAttachment,
  hasFramePinAttachment,
  isDrawingMode,
  isPostingMenuOpen,
  openCommentMenuId,
  replyingCommentId,
  replyDraft,
  selectedCommentId,
  onAddComposerAttachments,
  onCancelEditComment,
  onChangeFilter,
  onComposerBodyChange,
  onDeleteComment,
  onEditDraftChange,
  onExpandResolved,
  onOpenReply,
  onRemoveAnchor,
  onRegisterCommentRef,
  onRemoveComposerAttachment,
  onSelectComment,
  onSetComposerVisibility,
  onSetOpenCommentMenu,
  onSetReplyDraft,
  onSkipNext,
  onSkipPrevious,
  onSubmitComposer,
  onToggleDrawingMode,
  onUndoDrawing,
  onSaveEditComment,
  onStartEditComment,
  onSubmitReply,
  onTogglePostingMenu,
  onToggleCommentVisibility,
  onToggleReaction,
  onToggleReplyReaction,
  onToggleResolved,
}: {
  activeFilter: CommentFilter;
  canChooseVisibility: boolean;
  canSkipNext: boolean;
  canSkipPrevious: boolean;
  comments: ReviewComment[];
  canUndoDrawing: boolean;
  composerAttachments: ReviewAttachment[];
  composerBody: string;
  composerVisibility: CommentVisibility;
  currentTimeSeconds: number;
  editingCommentId: string | null;
  editDraft: string;
  highlightedCommentId: string | null;
  visibleCommentsCount: number;
  usersById: Map<string, User>;
  expandedResolvedIds: Set<string>;
  isEditingOverallComment: boolean;
  hasAnchor: boolean;
  hasDrawingAttachment: boolean;
  hasFramePinAttachment: boolean;
  isDrawingMode: boolean;
  isPostingMenuOpen: boolean;
  openCommentMenuId: string | null;
  replyingCommentId: string | null;
  replyDraft: string;
  selectedCommentId: string | null;
  onAddComposerAttachments: (files: File[]) => void;
  onCancelEditComment: () => void;
  onChangeFilter: (filter: CommentFilter) => void;
  onComposerBodyChange: (body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditDraftChange: (body: string) => void;
  onExpandResolved: (commentId: string) => void;
  onOpenReply: (commentId: string) => void;
  onRemoveAnchor: () => void;
  onRegisterCommentRef: (commentId: string, node: HTMLElement | null) => void;
  onRemoveComposerAttachment: (attachmentId: string) => void;
  onSelectComment: (comment: ReviewComment) => void;
  onSetComposerVisibility: (visibility: CommentVisibility) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onSetReplyDraft: (body: string) => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSubmitComposer: () => void;
  onToggleDrawingMode: () => void;
  onUndoDrawing: () => void;
  onSaveEditComment: (commentId: string) => void;
  onStartEditComment: (comment: ReviewComment) => void;
  onSubmitReply: (commentId: string) => void;
  onTogglePostingMenu: () => void;
  onToggleCommentVisibility: (commentId: string) => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
  onToggleReplyReaction: (commentId: string, replyId: string, emoji: ReactionEmoji) => void;
  onToggleResolved: (commentId: string) => void;
}) {
  return (
    <aside className="comment-panel" aria-label="Review comments">
      <div className="comment-panel-top">
        <div className="comment-header">
          <div className="comment-title-row">
            <h1 className="heading-3xs">Comments ({visibleCommentsCount})</h1>
            <div className="comment-header-actions">
              <div className="skip-comment-actions" aria-label="Skip between visible comments">
                <button
                  className="header-menu-button"
                  type="button"
                  aria-label="Previous visible comment"
                  disabled={!canSkipPrevious}
                  onClick={onSkipPrevious}
                >
                  <span className="comment-skip-icon is-up" aria-hidden="true">
                    <DsIcon name="caret-left" size={18} />
                  </span>
                </button>
                <button
                  className="header-menu-button"
                  type="button"
                  aria-label="Next visible comment"
                  disabled={!canSkipNext}
                  onClick={onSkipNext}
                >
                  <span className="comment-skip-icon is-down" aria-hidden="true">
                    <DsIcon name="caret-right" size={18} />
                  </span>
                </button>
              </div>
            </div>
          </div>
          <CommentFilters
            active={activeFilter}
            onChange={onChangeFilter}
            showVisibilityFilters={canChooseVisibility}
          />
        </div>
      </div>

      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <ReviewCommentThread
              comment={comment}
              canChangeVisibility={canChooseVisibility}
              isExpandedResolved={expandedResolvedIds.has(comment.id)}
              editDraft={editDraft}
              isEditing={editingCommentId === comment.id}
              isHighlighted={highlightedCommentId === comment.id}
              isReplying={replyingCommentId === comment.id}
              isSelected={selectedCommentId === comment.id}
              isMenuOpen={openCommentMenuId === comment.id}
              key={comment.id}
              replyDraft={replyDraft}
              usersById={usersById}
              onExpandResolved={onExpandResolved}
              onCancelEdit={onCancelEditComment}
              onDeleteComment={onDeleteComment}
              onEditDraftChange={onEditDraftChange}
              onOpenReply={onOpenReply}
              onRegisterCommentRef={onRegisterCommentRef}
              onSelectComment={onSelectComment}
              onSetReplyDraft={onSetReplyDraft}
              onSetOpenCommentMenu={onSetOpenCommentMenu}
              onSaveEdit={onSaveEditComment}
              onStartEdit={onStartEditComment}
              onSubmitReply={onSubmitReply}
              onToggleCommentVisibility={onToggleCommentVisibility}
              onToggleReaction={onToggleReaction}
              onToggleReplyReaction={onToggleReplyReaction}
              onToggleResolved={onToggleResolved}
            />
          ))
        ) : (
          <EmptyCommentPanel />
        )}
      </div>

      <ReviewCommentComposer
        attachments={composerAttachments}
        body={composerBody}
        canUndoDrawing={canUndoDrawing}
        canChooseVisibility={canChooseVisibility}
        currentTimeSeconds={currentTimeSeconds}
        visibility={composerVisibility}
        hasAnchor={hasAnchor}
        hasDrawingAttachment={hasDrawingAttachment}
        hasFramePinAttachment={hasFramePinAttachment}
        isDrawingMode={isDrawingMode}
        isEditingOverallComment={isEditingOverallComment}
        isPostingMenuOpen={isPostingMenuOpen}
        onAddAttachments={onAddComposerAttachments}
        onBodyChange={onComposerBodyChange}
        onRemoveAnchor={onRemoveAnchor}
        onRemoveAttachment={onRemoveComposerAttachment}
        onSetVisibility={onSetComposerVisibility}
        onSubmit={onSubmitComposer}
        onToggleDrawingMode={onToggleDrawingMode}
        onTogglePostingMenu={onTogglePostingMenu}
        onUndoDrawing={onUndoDrawing}
      />

    </aside>
  );
}

function CommentFilters({
  active,
  onChange,
  showVisibilityFilters,
}: {
  active: CommentFilter;
  onChange: (filter: CommentFilter) => void;
  showVisibilityFilters: boolean;
}) {
  const filters: Array<{ label: string; value: CommentFilter }> = [
    { label: "All", value: "all" },
    { label: "Unresolved", value: "unresolved" },
    ...(showVisibilityFilters
      ? [
          { label: "Team", value: "internal" as const },
          { label: "Client", value: "external" as const },
        ]
      : []),
  ];

  return (
    <div className="filter-row" aria-label="Comment filters">
      {filters.map((filter) => (
        <button
          className={`filter-chip label-xs-semibold ${active === filter.value ? "active" : ""}`}
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function Toast({
  isFading,
  message,
  onDismiss,
}: {
  isFading: boolean;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className={`toast-message label-s-semibold ${isFading ? "is-fading" : ""}`} role="status">
      {message}
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>
        <DsIcon name="x-close-cross" size={12} />
      </button>
    </div>
  );
}

function EmptyCommentPanel() {
  return (
    <div className="empty-comments">
      <p className="label-s-semibold">Click anywhere on the frame to leave a comment</p>
    </div>
  );
}

function getFilteredComments(comments: ReviewComment[], filter: CommentFilter) {
  if (filter === "unresolved") {
    return comments.filter((comment) => !comment.resolved);
  }

  if (filter === "internal" || filter === "external") {
    return comments.filter((comment) => comment.visibility === filter);
  }

  return comments;
}

function sortCommentsForReview(comments: ReviewComment[]) {
  const externalOverall = comments.filter(
    (comment) => isOverallComment(comment) && comment.visibility === "external",
  );
  const internalOverall = comments.filter(
    (comment) => isOverallComment(comment) && comment.visibility === "internal",
  );
  const timecoded = comments
    .filter(hasTimecode)
    .sort((first, second) => first.timecodeSeconds - second.timecodeSeconds);

  return [...externalOverall, ...internalOverall, ...timecoded];
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
