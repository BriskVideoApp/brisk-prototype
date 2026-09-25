"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { reviewUsers, reviewVersions, reviewVideo } from "@/data/video-review";
import type { RecutBrief } from "@/data/masters";
import type { Project } from "@/components/active-videos/types";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
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
  DrawingPoint,
  FramePin,
  Reaction,
  ReactionEmoji,
  ReviewAttachment,
  ReviewComment,
  ReviewVersion,
  ReviewVersionStatus,
  User,
  Video,
} from "./types";

type RecutHandoff = { childDeliverableId: string; childName: string; brief: RecutBrief };
const versionUploadInputId = "video-version-upload";
const editCompletionHoldMs = 7200;
const toastVisibleDurationMs = 3000;
const toastFadeDurationMs = 400;
const playbackSpeeds = [0.5, 1, 1.5, 2] as const;
const reactionOptions: Array<{ emoji: ReactionEmoji; label: string }> = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Strong" },
  { emoji: "✅", label: "Approved" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👀", label: "Watching" },
  { emoji: "🙌", label: "Celebrate" },
  { emoji: "👏", label: "Applause" },
  { emoji: "🎉", label: "Party" },
  { emoji: "😂", label: "Funny" },
  { emoji: "😍", label: "Adore" },
  { emoji: "🚀", label: "Launch" },
  { emoji: "💡", label: "Idea" },
  { emoji: "👍", label: "Like" },
];

const quickReactionOptions = [
  reactionOptions.find((reaction) => reaction.emoji === "🔥"),
  reactionOptions.find((reaction) => reaction.emoji === "✅"),
  reactionOptions.find((reaction) => reaction.emoji === "❤️"),
].filter((reaction): reaction is { emoji: ReactionEmoji; label: string } => Boolean(reaction));
const reactionLibraryOptions = reactionOptions;

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
  project,
}: {
  initiallyEmpty?: boolean;
  project: Project;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRole } = usePrototypeRole();
  const viewer = usePrototypeViewer();
  const { state: prototypeState } = usePrototypeState();
  const reviewStorageKey = `brisk-edit-review-v1:${prototypeState.session.activeWorkspaceId}:${project.id}`;
  const currentUserId = viewer?.chatUserId ?? "user-tom";
  const studioCompanyName = useStudioCompanyName();
  const { getEditReadiness, getProjectStages, markReadyToEdit, setProjectStageStatus } = useProjectStageStatus();
  const editReadiness = getEditReadiness(project);
  const editStageStatus = getProjectStages(project).edit;
  const outstandingEditPrerequisites = editReadiness.items.filter((item) => !item.approved);
  const canMarkReadyToEdit = viewer?.role === "Studio Staff"
    && canActOnProject(viewer, project, prototypeState, "status", "edit")
    && !outstandingEditPrerequisites.some((item) => item.key === "storyboard");
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
      const stored = window.localStorage.getItem(reviewStorageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      if (isStoredEditReview(parsed)) {
        setVideoVersions(parsed.versions.map((version) => version.sourceUrl?.startsWith("blob:")
          ? { ...version, sourceUrl: undefined }
          : version));
        setReviewComments(parsed.comments);
        setResolvedIds(new Set(parsed.resolvedIds));
        setVersionStatuses(parsed.statuses);
        setSelectedVersionLabel((current) => parsed.versions.some((version) => version.label === current)
          ? current
          : parsed.versions[0]?.label ?? "");
      }
    } catch {
      // Keep the fixture if a browser draft cannot be read.
    }
    setLoadedReviewKey(reviewStorageKey);
  }, [reviewStorageKey]);

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
      approvedAt: "17 Aug",
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
  canMarkReady,
  items,
  onMarkReady,
  projectId,
}: {
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
            Freelancers can’t mark Edit ready.
          </p>
        )}
      </div>
    </div>
  );
}

function EditReadinessConfirmation({
  items,
  onCancel,
  onConfirm,
}: {
  items: EditReadinessItem[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="request-review-backdrop" role="presentation">
      <section className="request-review-modal" role="dialog" aria-modal="true" aria-labelledby="edit-readiness-title">
        <header className="request-review-header">
          <h2 className="request-review-title" id="edit-readiness-title">
            Mark ready to edit?
          </h2>
          <button className="request-review-close" type="button" aria-label="Close confirmation" onClick={onCancel}>
            <DsIcon name="x-close-cross" size={16} />
          </button>
        </header>
        <p className="paragraph-s edit-readiness-confirmation-copy">
          This will approve the outstanding work below and set Edit to Waiting on Brisk.
        </p>
        <ul className="edit-readiness-confirmation-list" aria-label="Work that will be approved">
          {items.map((item) => (
            <li className="label-s" key={item.key}>
              <span>{item.label}</span>
              <span>{getReadinessStatusLabel(item.status)}</span>
            </li>
          ))}
        </ul>
        <div className="edit-readiness-confirmation-actions">
          <Button size="M" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="M" onClick={onConfirm}>
            Approve and mark ready
          </Button>
        </div>
      </section>
    </div>
  );
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

export function InlinePlayer({
  video,
  comments,
  currentTimeSeconds,
  isPlaying,
  isCompareMode,
  comparisonVersions = [],
  versionStatus,
  selectedCommentId,
  activeDrawingPath,
  activeFramePin,
  composerBody,
  drawingPaths,
  selectedDrawingPaths,
  isDrawingMode,
  isEditingDrawing,
  pendingFramePin,
  recutBrief,
  onComposerBodyChange,
  onCancelFramePin,
  onPlaceFramePin,
  onStartDrawing,
  onUpdateDrawing,
  onEndDrawing,
  onEditSelectedDrawing = () => undefined,
  onSubmitComposer,
  onSeek,
  onTimeChange,
  onDurationChange,
  onSelectComment,
  onSkipNextComment,
  onSkipPreviousComment,
  onSetPlaying,
  onTogglePlay,
}: {
  video: Video;
  comments: ReviewComment[];
  currentTimeSeconds: number;
  isPlaying: boolean;
  isCompareMode: boolean;
  comparisonVersions?: ReviewVersion[];
  versionStatus: ReviewVersionStatus;
  selectedCommentId: string | null;
  activeDrawingPath: DrawingPath | null;
  activeFramePin: FramePin | null;
  composerBody: string;
  drawingPaths: DrawingPath[];
  selectedDrawingPaths: DrawingPath[];
  isDrawingMode: boolean;
  isEditingDrawing: boolean;
  pendingFramePin: FramePin | null;
  recutBrief?: RecutBrief;
  onComposerBodyChange: (body: string) => void;
  onCancelFramePin: () => void;
  onPlaceFramePin: (framePin: FramePin) => void;
  onStartDrawing: (point: DrawingPoint) => void;
  onUpdateDrawing: (point: DrawingPoint) => void;
  onEndDrawing: () => void;
  onClearDrawing?: () => void;
  onDoneDrawing?: () => void;
  onEditSelectedDrawing?: () => void;
  onSubmitComposer: () => void;
  onSeek: (seconds: number) => void;
  onTimeChange: (seconds: number) => void;
  onDurationChange: (seconds: number) => void;
  onSelectComment: (comment: ReviewComment) => void;
  onSkipNextComment: () => void;
  onSkipPreviousComment: () => void;
  onSetPlaying: (isPlaying: boolean) => void;
  onTogglePlay: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [dismissedDrawingPromptPathId, setDismissedDrawingPromptPathId] = useState<string | null>(null);
  const columnRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameNoteInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackSpeed = playbackSpeeds[speedIndex];
  const latestDrawingPath = drawingPaths[drawingPaths.length - 1];
  const latestDrawingPoint = latestDrawingPath?.points[latestDrawingPath.points.length - 1];
  const isDrawingCommentPromptVisible = Boolean(
    isDrawingMode
      && !isEditingDrawing
      && !activeDrawingPath
      && latestDrawingPath
      && latestDrawingPoint
      && dismissedDrawingPromptPathId !== latestDrawingPath.id,
  );
  const composerPopoverAnchor = pendingFramePin ?? (latestDrawingPoint
    ? {
        x: latestDrawingPoint.x / 10,
        y: latestDrawingPoint.y / 5.625,
      }
    : null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !video.sourceUrl) {
      return;
    }

    if (Math.abs(videoElement.currentTime - currentTimeSeconds) > 0.4) {
      videoElement.currentTime = currentTimeSeconds;
    }
  }, [currentTimeSeconds, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !video.sourceUrl) {
      return;
    }

    if (isPlaying) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  }, [isPlaying, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.playbackRate = playbackSpeed;
  }, [playbackSpeed, video.sourceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = isMuted;
  }, [isMuted, video.sourceUrl]);

  useEffect(() => {
    if (!pendingFramePin && !isDrawingCommentPromptVisible) {
      return;
    }

    requestAnimationFrame(() => {
      frameNoteInputRef.current?.focus();
    });
  }, [isDrawingCommentPromptVisible, latestDrawingPath?.id, pendingFramePin]);

  const seekTo = (seconds: number) => {
    const nextSeconds = Math.min(Math.max(seconds, 0), video.durationSeconds);
    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.currentTime = nextSeconds;
    }

    onSeek(nextSeconds);
  };

  const stepPlayback = (seconds: number) => {
    onSetPlaying(false);
    seekTo(currentTimeSeconds + seconds);
  };

  const cyclePlaybackSpeed = () => {
    setSpeedIndex((current) => (current + 1) % playbackSpeeds.length);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void columnRef.current?.requestFullscreen();
  };

  const getDrawingPoint = (event: PointerEvent<SVGSVGElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 562.5,
    };
  };

  const placePinFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (isDrawingMode) {
      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest("button, input, textarea, .frame-note-popover, .drawing-stroke.editable")) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    onPlaceFramePin({
      x: Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10,
      y: Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10,
    });
  };

  return (
    <section className={`video-column ${isCompareMode ? "is-comparing" : ""}`} ref={columnRef} aria-label={`${video.fileName} video player`}>
      <div className="review-player-statusbar">
        {isCompareMode ? (
          <span className="review-version-status is-comparing label-s-semibold">
            {comparisonVersions.map((version) => `V${version.number}`).join(" + ")} · Comparison
          </span>
        ) : recutBrief ? (
          <span className="review-recut-banner label-s-semibold">Recut brief · {recutBrief.marks.length} {recutBrief.marks.length === 1 ? "mark" : "marks"} · target {recutBrief.targetDurationSec}s</span>
        ) : (
          <span className={`review-version-status label-s-semibold is-${versionStatus}`}>
            {video.versionLabel.toUpperCase()} · {formatVersionStatus(versionStatus)}
          </span>
        )}
      </div>
      <div
        className={`video-frame ${isDrawingMode ? "drawing-active" : ""} ${isCompareMode ? "is-comparing" : ""}`}
        ref={frameRef}
        onPointerDown={placePinFromPointer}
      >
        {isCompareMode ? (
          <div
            className="review-compare-view"
            aria-label={`Side-by-side comparison of ${comparisonVersions.map((version) => `V${version.number}`).join(" and ")}`}
          >
            {comparisonVersions.map((version) => (
              <CompareFrame key={version.label} version={version} />
            ))}
          </div>
        ) : video.sourceUrl ? (
          <video
            className="review-video"
            ref={videoRef}
            src={video.sourceUrl}
            playsInline
            onLoadedMetadata={(event) => {
              onDurationChange(Math.max(1, Math.round(event.currentTarget.duration)));
            }}
            onTimeUpdate={(event) => {
              onTimeChange(Math.round(event.currentTarget.currentTime));
            }}
            onEnded={() => {
              onTimeChange(video.durationSeconds);
              onSetPlaying(false);
            }}
          />
        ) : (
          <div className="video-art" aria-hidden="true">
            <div className="soft-orb" />
          </div>
        )}
        {!isCompareMode ? <svg
          className={`drawing-layer ${selectedDrawingPaths.length > 0 ? "has-editable-drawing" : ""}`}
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          aria-label={isDrawingMode ? "Drawing layer active" : "Drawing layer"}
          onPointerDown={(event) => {
            if (!isDrawingMode) {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onStartDrawing(getDrawingPoint(event));
          }}
          onPointerMove={(event) => {
            if (!isDrawingMode || !activeDrawingPath) {
              return;
            }

            event.preventDefault();
            onUpdateDrawing(getDrawingPoint(event));
          }}
          onPointerUp={(event) => {
            if (!isDrawingMode) {
              return;
            }

            event.preventDefault();
            onEndDrawing();
          }}
          onPointerCancel={onEndDrawing}
          onPointerLeave={() => {
            if (isDrawingMode && activeDrawingPath) {
              onEndDrawing();
            }
          }}
        >
          {selectedDrawingPaths.map((path) => (
            <path
              className="drawing-stroke editable"
              d={formatDrawingPath(path.points)}
              key={path.id}
              role="button"
              tabIndex={0}
              aria-label="Edit drawing feedback"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onEditSelectedDrawing}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }

                event.preventDefault();
                onEditSelectedDrawing();
              }}
            />
          ))}
          {[...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])].map((path) => (
            <path className="drawing-stroke" d={formatDrawingPath(path.points)} key={path.id} />
          ))}
        </svg> : null}
        {!isCompareMode && !isDrawingMode && !activeFramePin ? (
          <div className="frame-comment-prompt label-s-semibold">Click to add a comment</div>
        ) : null}
        {!isCompareMode && activeFramePin ? (
          <button
            className={`frame-comment-dot ${pendingFramePin ? "pending" : ""}`}
            type="button"
            aria-label={pendingFramePin ? "Pending pinned comment" : "Selected pinned comment"}
            style={{
              left: `${activeFramePin.x}%`,
              top: `${activeFramePin.y}%`,
            }}
          />
        ) : null}
        {!isCompareMode && composerPopoverAnchor && (pendingFramePin || isDrawingCommentPromptVisible) ? (
          <div
            className="frame-note-popover"
            style={{
              "--frame-note-x": `${composerPopoverAnchor.x}%`,
              "--frame-note-y": `${composerPopoverAnchor.y}%`,
            } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="frame-note-main">
              <span className="frame-note-time label-s-semibold">{formatTime(currentTimeSeconds)}</span>
              <input
                className="frame-note-input label-s"
                ref={frameNoteInputRef}
                placeholder="Comment"
                value={composerBody}
                onChange={(event) => onComposerBodyChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    if (pendingFramePin) {
                      onCancelFramePin();
                    } else if (latestDrawingPath) {
                      setDismissedDrawingPromptPathId(latestDrawingPath.id);
                    }
                    return;
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSubmitComposer();
                  }
                }}
              />
              <button
                className="frame-note-post label-s-semibold"
                type="button"
                disabled={composerBody.trim().length === 0}
                onClick={onSubmitComposer}
              >
                Post
              </button>
              <button
                className="frame-note-close"
                type="button"
                aria-label={pendingFramePin ? "Close pinned comment" : "Close drawing comment"}
                onClick={() => {
                  if (pendingFramePin) {
                    onCancelFramePin();
                  } else if (latestDrawingPath) {
                    setDismissedDrawingPromptPathId(latestDrawingPath.id);
                  }
                }}
              >
                <DsIcon name="x-close-cross" size={12} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {!isCompareMode ? <div className="player-controls">
        <ScrubBar
          video={video}
          comments={comments}
          currentTimeSeconds={currentTimeSeconds}
          selectedCommentId={selectedCommentId}
          recutBrief={recutBrief}
          onSeek={onSeek}
          onSelectComment={onSelectComment}
        />
        <div className="control-row">
          <div className="control-cluster">
            <button
              className="ghost-control"
              type="button"
              aria-label="Step back five seconds"
              onClick={() => stepPlayback(-5)}
            >
              <DsIcon name="arrow-counter-clockwise" size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Step forward five seconds"
              onClick={() => stepPlayback(5)}
            >
              <DsIcon name="arrow-clockwise" size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Previous comment"
              onClick={() => {
                onSetPlaying(false);
                onSkipPreviousComment();
              }}
            >
              <DsIcon name="caret-left" size={18} />
            </button>
            <button
              className="play-control"
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={onTogglePlay}
            >
              <DsIcon name={isPlaying ? "pause" : "play"} size={18} />
            </button>
            <button
              className="ghost-control"
              type="button"
              aria-label="Next comment"
              onClick={() => {
                onSetPlaying(false);
                onSkipNextComment();
              }}
            >
              <DsIcon name="caret-right" size={18} />
            </button>
          </div>

          <div className="control-cluster right-controls">
            <button
              className="speed-button label-xs-semibold"
              type="button"
              aria-label={`Playback speed ${playbackSpeed}x`}
              onClick={cyclePlaybackSpeed}
            >
              {playbackSpeed}x <DsIcon name="caret-down" size={12} />
            </button>
            <button
              className={`ghost-control ${isMuted ? "muted" : ""}`}
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
              onClick={() => setIsMuted((current) => !current)}
            >
              <DsIcon name="speaker-high" size={18} />
            </button>
            <button className="ghost-control" type="button" aria-label="Fullscreen" onClick={toggleFullscreen}>
              <DsIcon name="frame-corners" size={18} />
            </button>
          </div>
        </div>
      </div> : null}
    </section>
  );
}

function CompareFrame({ version }: { version: ReviewVersion }) {
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackSpeed = playbackSpeeds[speedIndex];

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !version.sourceUrl) {
      return;
    }

    videoElement.playbackRate = playbackSpeed;
    videoElement.muted = isMuted;

    if (isPlaying) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  }, [isMuted, isPlaying, playbackSpeed, version.sourceUrl]);

  useEffect(() => {
    if (version.sourceUrl || !isPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTimeSeconds((current) => Math.min(current + playbackSpeed, version.durationSeconds));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, version.durationSeconds, version.sourceUrl]);

  useEffect(() => {
    if (isPlaying && currentTimeSeconds >= version.durationSeconds) {
      setIsPlaying(false);
    }
  }, [currentTimeSeconds, isPlaying, version.durationSeconds]);

  const seekTo = (seconds: number) => {
    const nextSeconds = Math.min(Math.max(seconds, 0), version.durationSeconds);

    if (videoRef.current) {
      videoRef.current.currentTime = nextSeconds;
    }

    setCurrentTimeSeconds(nextSeconds);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void frameRef.current?.requestFullscreen();
  };

  return (
    <div className="review-compare-frame" ref={frameRef}>
      <span className="review-compare-label label-xs-semibold">V{version.number}</span>
      {version.sourceUrl ? (
        <video
          className="review-compare-video"
          ref={videoRef}
          src={version.sourceUrl}
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = Math.min(currentTimeSeconds, event.currentTarget.duration);
          }}
          onTimeUpdate={(event) => setCurrentTimeSeconds(event.currentTarget.currentTime)}
          onEnded={() => {
            setCurrentTimeSeconds(version.durationSeconds);
            setIsPlaying(false);
          }}
        />
      ) : (
        <div className="review-compare-orb" aria-hidden="true">MY</div>
      )}
      <div className="review-compare-playback" aria-label={`V${version.number} playback controls`}>
        <div className="review-compare-scrub-row">
          <span className="label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
          <input
            type="range"
            min={0}
            max={version.durationSeconds}
            step={0.1}
            value={Math.min(currentTimeSeconds, version.durationSeconds)}
            aria-label={`V${version.number} timeline`}
            onChange={(event) => seekTo(Number(event.target.value))}
          />
          <span className="label-xs">{formatTime(version.durationSeconds)}</span>
        </div>
        <div className="review-compare-control-row">
          <button
            className="play-control"
            type="button"
            aria-label={`${isPlaying ? "Pause" : "Play"} V${version.number}`}
            onClick={() => setIsPlaying((current) => !current)}
          >
            <DsIcon name={isPlaying ? "pause" : "play"} size={16} />
          </button>
          <div className="review-compare-control-actions">
            <button
              className="speed-button label-xs-semibold"
              type="button"
              aria-label={`V${version.number} playback speed ${playbackSpeed}x`}
              onClick={() => setSpeedIndex((current) => (current + 1) % playbackSpeeds.length)}
            >
              {playbackSpeed}x <DsIcon name="caret-down" size={12} />
            </button>
            <button
              className={`ghost-control ${isMuted ? "muted" : ""}`}
              type="button"
              aria-label={`${isMuted ? "Unmute" : "Mute"} V${version.number}`}
              aria-pressed={isMuted}
              onClick={() => setIsMuted((current) => !current)}
            >
              <DsIcon name="speaker-high" size={17} />
            </button>
            <button className="ghost-control" type="button" aria-label={`Fullscreen V${version.number}`} onClick={toggleFullscreen}>
              <DsIcon name="frame-corners" size={17} />
            </button>
          </div>
        </div>
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

function ScrubBar({
  video,
  comments,
  currentTimeSeconds,
  selectedCommentId,
  recutBrief,
  onSeek,
  onSelectComment,
}: {
  video: Video;
  comments: ReviewComment[];
  currentTimeSeconds: number;
  selectedCommentId: string | null;
  recutBrief?: RecutBrief;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: ReviewComment) => void;
}) {
  const progress = (currentTimeSeconds / video.durationSeconds) * 100;
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    onSeek(Math.round(ratio * video.durationSeconds));
  };

  return (
    <div className="scrub-wrap">
      <span className="time-label label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
      <div className="scrub-bar" aria-label="Video timeline" role="slider" onPointerDown={seekFromPointer}>
        <div className="scrub-progress" style={{ width: `${progress}%` }} />
        <div className="playhead" style={{ left: `${progress}%` }} />
        {recutBrief?.marks.map((mark) => (
          <button
            className={`review-recut-mark mark-${mark.verb}`}
            type="button"
            key={mark.id}
            aria-label={`${mark.verb} from ${formatTime(mark.inSec)} to ${formatTime(mark.outSec)}`}
            style={{
              left: `${(mark.inSec / video.durationSeconds) * 100}%`,
              width: `${Math.max(0.8, ((mark.outSec - mark.inSec) / video.durationSeconds) * 100)}%`,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSeek(mark.inSec);
            }}
          />
        ))}
        {comments.filter(hasTimecode).map((comment) => (
          <button
            className={`comment-pin ${comment.visibility} ${selectedCommentId === comment.id ? "selected" : ""}`}
            key={comment.id}
            type="button"
            style={{
              left: `${(comment.timecodeSeconds / video.durationSeconds) * 100}%`,
            }}
            data-tooltip={`${formatTime(comment.timecodeSeconds)} ${comment.visibility}`}
            aria-label={`Go to comment at ${formatTime(comment.timecodeSeconds)}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectComment(comment);
            }}
          />
        ))}
      </div>
      <span className="time-label duration label-xs">{formatTime(video.durationSeconds)}</span>
    </div>
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

export function ReviewCommentThread({
  anchorLabel,
  comment,
  canChangeVisibility = true,
  editDraft,
  isEditing,
  isHighlighted,
  isExpandedResolved,
  isReplying,
  isSelected,
  isMenuOpen,
  onExpandResolved,
  onCancelEdit,
  onDeleteComment,
  onEditDraftChange,
  onOpenReply,
  onRegisterCommentRef,
  onSelectComment,
  onSetReplyDraft,
  onSetOpenCommentMenu,
  onSaveEdit,
  onStartEdit,
  onSubmitReply,
  onToggleCommentVisibility,
  onToggleReaction,
  onToggleReplyReaction,
  onToggleResolved,
  replyDraft,
  usersById,
}: {
  anchorLabel?: string;
  comment: ReviewComment;
  canChangeVisibility?: boolean;
  editDraft: string;
  isEditing: boolean;
  isHighlighted: boolean;
  isExpandedResolved: boolean;
  isReplying: boolean;
  isSelected: boolean;
  isMenuOpen: boolean;
  onExpandResolved: (commentId: string) => void;
  onCancelEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  onEditDraftChange: (body: string) => void;
  onOpenReply: (commentId: string, mentionName?: string) => void;
  onRegisterCommentRef: (commentId: string, node: HTMLElement | null) => void;
  onSelectComment: (comment: ReviewComment) => void;
  onSetReplyDraft: (body: string) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onSaveEdit: (commentId: string) => void;
  onStartEdit: (comment: ReviewComment) => void;
  onSubmitReply: (commentId: string) => void;
  onToggleCommentVisibility: (commentId: string) => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
  onToggleReplyReaction: (commentId: string, replyId: string, emoji: ReactionEmoji) => void;
  onToggleResolved: (commentId: string) => void;
  replyDraft: string;
  usersById: Map<string, User>;
}) {
  const author = getUser(usersById, comment.authorId);
  const isCollapsedResolved = comment.resolved && !isExpandedResolved;
  const isOverall = !anchorLabel && isOverallComment(comment);
  const isTimecoded = hasTimecode(comment);
  const lastReplyId = comment.replies.at(-1)?.id;

  if (isCollapsedResolved) {
    return (
      <div
        className={`resolved-compact-row ${comment.visibility} ${isOverall ? "overall" : ""} ${
          isSelected ? "selected" : ""
        } ${isHighlighted ? "highlighted" : ""}`}
        ref={(node) => onRegisterCommentRef(comment.id, node)}
      >
        <button
          className="resolved-compact-main"
          type="button"
          onClick={() => {
            onExpandResolved(comment.id);
            onSelectComment(comment);
          }}
        >
          <span className="resolved-compact-tick" aria-hidden="true" />
          <span className="resolved-compact-author label-xs-semibold">{author.name}</span>
          {anchorLabel ? <FramePinChip label={anchorLabel} /> : isTimecoded ? <TimecodeChip seconds={comment.timecodeSeconds} prefix="" /> : <OverallChip />}
          <span className="resolved-compact-copy label-xs">{comment.body}</span>
        </button>
        <CommentEditDeleteActions
          comment={comment}
          isMenuOpen={isMenuOpen}
          onDeleteComment={onDeleteComment}
          onSetOpenCommentMenu={onSetOpenCommentMenu}
          onStartEdit={onStartEdit}
        />
      </div>
    );
  }

  return (
    <article
      className={`comment-thread ${comment.visibility} ${isOverall ? "overall" : ""} ${
        comment.resolved ? "resolved" : ""
      } ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
      ref={(node) => onRegisterCommentRef(comment.id, node)}
      onClick={(event) => {
        if (shouldIgnoreCommentSelection(event)) {
          return;
        }

        onSelectComment(comment);
      }}
    >
      <div className="comment-row">
        <CommentAvatar user={author} />
        <div className="comment-body">
          <div className="comment-meta">
            <div className="author-line">
              <span className="author-name-row">
                <span className="label-xs-semibold">{author.name}</span>
                <span className="created-ago label-xs" data-tooltip={getExactCreatedAt(comment.createdAgo)}>
                  {comment.createdAgo}
                </span>
              </span>
              <span className="anchor-meta-row">
                {anchorLabel ? (
                  <FramePinChip label={anchorLabel} />
                ) : isTimecoded ? (
                  <TimecodeChip
                    seconds={comment.timecodeSeconds}
                    prefix=""
                    onClick={() => onSelectComment(comment)}
                  />
                ) : (
                  <OverallChip />
                )}
                <VisibilityToggle
                  interactive={canChangeVisibility}
                  visibility={comment.visibility}
                  onToggle={() => onToggleCommentVisibility(comment.id)}
                />
              </span>
            </div>
            <div className="comment-meta-actions">
              <button
                className={`comment-action-icon resolve-circle-button ${comment.resolved ? "resolved" : ""}`}
                type="button"
                data-tooltip={comment.resolved ? "Unresolve" : "Mark as resolved"}
                aria-label={comment.resolved ? "Unresolve comment" : "Resolve comment"}
                onClick={() => onToggleResolved(comment.id)}
              >
                <span aria-hidden="true" />
              </button>
              <CommentEditDeleteActions
                comment={comment}
                isMenuOpen={isMenuOpen}
                onDeleteComment={onDeleteComment}
                onSetOpenCommentMenu={onSetOpenCommentMenu}
                onStartEdit={onStartEdit}
              />
            </div>
          </div>

          {isEditing ? (
            <InlineEditComposer
              body={editDraft}
              onBodyChange={onEditDraftChange}
              onCancel={onCancelEdit}
              onSave={() => onSaveEdit(comment.id)}
            />
          ) : (
            <p className="comment-copy paragraph-s">{comment.body}</p>
          )}

          {comment.attachments?.length ? (
            <div className="review-comment-attachments" aria-label="Comment attachments">
              {comment.attachments.map((attachment) => (
                <a
                  className="review-comment-attachment"
                  href={attachment.url}
                  download={attachment.name}
                  key={attachment.id}
                >
                  <span className="review-comment-attachment-icon">
                    <DsIcon name={getReviewAttachmentIcon(attachment.mimeType)} size={18} />
                  </span>
                  <span>
                    <strong className="label-xs-semibold">{attachment.name}</strong>
                    <small className="label-xs">{attachment.size}</small>
                  </span>
                  <DsIcon name="download-simple" size={15} />
                </a>
              ))}
            </div>
          ) : null}

          {comment.drawingPaths?.length ? (
            <button
              className="comment-drawing-indicator label-xs-semibold"
              type="button"
              aria-label="Edit drawing feedback"
              data-tooltip="Edit drawing"
              onClick={() => onStartEdit(comment)}
            >
              <DsIcon name="pencil-simple" size={13} />
              Drawing
            </button>
          ) : null}

          <ReactionPills
            reactions={comment.reactions ?? []}
            usersById={usersById}
            onToggleReaction={(emoji) => onToggleReaction(comment.id, emoji)}
          />
          <div className="comment-secondary-actions">
            <QuickReactionActions
              commentId={comment.id}
              reactions={comment.reactions ?? []}
              onToggleReaction={onToggleReaction}
            />
            {comment.replies.length === 0 && !isReplying ? (
              <button
                className="comment-reply-button label-xs-semibold"
                type="button"
                aria-label="Reply"
                onClick={() => onOpenReply(comment.id)}
              >
                Reply
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {comment.replies.length > 0 ? (
        <div className="reply-list">
          {comment.replies.map((reply) => {
            const replyAuthor = getUser(usersById, reply.authorId);
            return (
              <div className="reply-row" key={reply.id}>
                <span className="reply-corner" aria-hidden="true">
                  <DsIcon name="caret-right" size={12} />
                </span>
                <CommentAvatar user={replyAuthor} compact />
                <div className="reply-message">
                  <div className="reply-meta">
                    <span className="label-xs-semibold">{replyAuthor.name}</span>
                    <span className="created-ago label-xs" data-tooltip={getExactCreatedAt(reply.createdAgo)}>
                      {reply.createdAgo}
                    </span>
                  </div>
                  <p className="reply-copy label-s">{reply.body}</p>
                  <ReactionPills
                    reactions={reply.reactions ?? []}
                    usersById={usersById}
                    onToggleReaction={(emoji) => onToggleReplyReaction(comment.id, reply.id, emoji)}
                  />
                  <div className="comment-secondary-actions">
                    <QuickReactionActions
                      commentId={reply.id}
                      reactions={reply.reactions ?? []}
                      onToggleReaction={(replyId, emoji) => onToggleReplyReaction(comment.id, replyId, emoji)}
                    />
                    {reply.id === lastReplyId && !isReplying ? (
                      <button
                        className="comment-reply-button label-xs-semibold"
                        type="button"
                        aria-label="Reply"
                        onClick={() => onOpenReply(comment.id)}
                      >
                        Reply
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {isReplying ? (
        <div
          className={`thread-reply-area ${comment.replies.length > 0 ? "has-replies" : ""} ${
            isReplying ? "is-replying" : ""
          }`}
        >
          <InlineReplyComposer
            body={replyDraft}
            onBodyChange={onSetReplyDraft}
            onSubmit={() => onSubmitReply(comment.id)}
          />
        </div>
      ) : null}
    </article>
  );
}

function shouldIgnoreCommentSelection(event: MouseEvent<HTMLElement>) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("button, a, input, textarea, select, [role='button']"));
}

function CommentEditDeleteActions({
  comment,
  isMenuOpen,
  onDeleteComment,
  onSetOpenCommentMenu,
  onStartEdit,
}: {
  comment: ReviewComment;
  isMenuOpen: boolean;
  onDeleteComment: (commentId: string) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onStartEdit: (comment: ReviewComment) => void;
}) {
  return (
    <span className="comment-row-menu-wrap">
      <button
        className="comment-action-icon row-menu-button"
        type="button"
        aria-label="Comment menu"
        aria-expanded={isMenuOpen}
        onClick={() => onSetOpenCommentMenu(isMenuOpen ? null : comment.id)}
      >
        <DsIcon name="dots-three-vertical" size={16} />
      </button>
      {isMenuOpen ? (
        <span className="comment-row-menu">
          <button className="label-s" type="button" onClick={() => onStartEdit(comment)}>
            Edit
          </button>
          <button className="label-s" type="button" onClick={() => onDeleteComment(comment.id)}>
            Delete
          </button>
        </span>
      ) : null}
    </span>
  );
}

function ReactionPills({
  reactions,
  usersById,
  onToggleReaction,
}: {
  reactions: Reaction[];
  usersById: Map<string, User>;
  onToggleReaction: (emoji: ReactionEmoji) => void;
}) {
  const currentUserId = usePrototypeViewer()?.chatUserId ?? "user-tom";
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="reaction-row" aria-label="Comment reactions">
      {reactions.map((reaction) => {
        const isSelected = reaction.selectedBy.includes(currentUserId);
        const userNames = formatReactionUserNames(reaction.selectedBy, usersById);
        const tooltip = `${reaction.label} by ${userNames}`;

        return (
          <button
            className={`reaction-pill label-xs-semibold ${isSelected ? "selected" : ""}`}
            key={reaction.emoji}
            type="button"
            data-tooltip={tooltip}
            aria-label={tooltip}
            onClick={() => onToggleReaction(reaction.emoji)}
          >
            <span>{reaction.emoji}</span>
            {reaction.selectedBy.length}
          </button>
        );
      })}
    </div>
  );
}

function QuickReactionActions({
  commentId,
  reactions,
  onToggleReaction,
}: {
  commentId: string;
  reactions: Reaction[];
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
}) {
  const currentUserId = usePrototypeViewer()?.chatUserId ?? "user-tom";
  return (
    <span className="quick-reaction-actions" aria-label="Quick reactions">
      {quickReactionOptions.map((reaction) => {
        const isSelected = reactions
          .find((item) => item.emoji === reaction.emoji)
          ?.selectedBy.includes(currentUserId);

        return (
          <button
            className={`comment-action-icon quick-reaction-button label-xs ${isSelected ? "selected" : ""}`}
            key={reaction.emoji}
            type="button"
            aria-label={reaction.label}
            onClick={() => onToggleReaction(commentId, reaction.emoji)}
          >
            {reaction.emoji}
          </button>
        );
      })}
      <span className="reaction-library-wrap">
        <button
          className="comment-action-icon quick-reaction-button reaction-library-trigger"
          type="button"
          aria-label="Find another reaction"
          aria-haspopup="true"
        >
          <DsIcon name="smiley" size={15} />
          <DsIcon name="plus" size={8} />
        </button>
        <span className="reaction-library" aria-label="Reaction library">
          {reactionLibraryOptions.map((reaction) => {
            const isSelected = reactions
              .find((item) => item.emoji === reaction.emoji)
              ?.selectedBy.includes(currentUserId);

            return (
              <button
                className={`reaction-library-option label-s ${isSelected ? "selected" : ""}`}
                key={reaction.emoji}
                type="button"
                aria-label={reaction.label}
                onClick={() => onToggleReaction(commentId, reaction.emoji)}
              >
                {reaction.emoji}
              </button>
            );
          })}
        </span>
      </span>
    </span>
  );
}

function InlineEditComposer({
  body,
  onBodyChange,
  onCancel,
  onSave,
}: {
  body: string;
  onBodyChange: (body: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const saveOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSave();
    }
  };

  return (
    <div className="inline-edit-composer">
      <textarea
        className="inline-edit-input label-s"
        rows={3}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={saveOnEnter}
      />
      <div className="inline-edit-actions">
        <button className="modal-cancel-button label-s-semibold" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="modal-resolve-button label-s-semibold" type="button" disabled={!body.trim()} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}

function InlineReplyComposer({
  body,
  onBodyChange,
  onSubmit,
}: {
  body: string;
  onBodyChange: (body: string) => void;
  onSubmit: () => void;
}) {
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="inline-reply-composer">
      <textarea
        className="inline-reply-input label-s"
        placeholder="Write a reply..."
        rows={2}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={submitOnEnter}
      />
      <p className="label-xs">Enter to reply - Shift+Enter for a new line</p>
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

function TimecodeChip({
  seconds,
  prefix,
  onClick,
}: {
  seconds: number;
  prefix: "" | "@";
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button className="timecode-chip label-xs-semibold clickable" type="button" onClick={onClick}>
        {prefix}
        {formatTime(seconds)}
      </button>
    );
  }

  return (
    <span className="timecode-chip label-xs-semibold">
      {prefix}
      {formatTime(seconds)}
    </span>
  );
}

function OverallChip() {
  return <span className="overall-chip label-xs-semibold">Overall</span>;
}

function FramePinChip({ label }: { label: string }) {
  return <span className="frame-pin-chip label-xs-semibold">
    <DsIcon name="push-pin-simple" size={12} />
    {label}
  </span>;
}

function VisibilityToggle({
  interactive,
  visibility,
  onToggle,
}: {
  interactive: boolean;
  visibility: CommentVisibility;
  onToggle: () => void;
}) {
  const isInternal = visibility === "internal";

  if (!interactive) {
    return (
      <span className={`visibility-toggle visibility-label label-xs-semibold ${isInternal ? "internal" : "external"}`}>
        {isInternal ? "Team" : "Client"}
      </span>
    );
  }

  return (
    <button
      className={`visibility-toggle label-xs-semibold ${isInternal ? "internal" : "external"}`}
      type="button"
      data-tooltip={isInternal ? "Switch to Client" : "Switch to Team"}
      aria-label={isInternal ? "Switch comment to Client" : "Switch comment to Team"}
      onClick={onToggle}
    >
      {isInternal ? "Team" : "Client"}
    </button>
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

function isOverallComment(comment: ReviewComment) {
  return typeof comment.timecodeSeconds !== "number";
}

function hasTimecode(comment: ReviewComment): comment is ReviewComment & { timecodeSeconds: number } {
  return typeof comment.timecodeSeconds === "number";
}

function getUser(usersById: Map<string, User>, id: string) {
  const user = usersById.get(id);

  if (!user) {
    throw new Error(`Missing review user: ${id}`);
  }

  return user;
}

export function toggleReviewReactionInList(reactions: Reaction[] | undefined, emoji: ReactionEmoji, currentUserId = "user-tom") {
  const reactionOption = reactionOptions.find((reaction) => reaction.emoji === emoji);

  if (!reactionOption) {
    return reactions;
  }

  const reactionList = [...(reactions ?? [])];
  const reactionIndex = reactionList.findIndex((reaction) => reaction.emoji === emoji);

  if (reactionIndex === -1) {
    return [
      ...reactionList,
      {
        emoji,
        label: reactionOption.label,
        selectedBy: [currentUserId],
      },
    ];
  }

  const reaction = reactionList[reactionIndex];
  const hasCurrentUser = reaction.selectedBy.includes(currentUserId);
  const selectedBy = hasCurrentUser
    ? reaction.selectedBy.filter((userId) => userId !== currentUserId)
    : [...reaction.selectedBy, currentUserId];

  return selectedBy.length
    ? reactionList.map((item, index) => (index === reactionIndex ? { ...item, selectedBy } : item))
    : reactionList.filter((item) => item.emoji !== emoji);
}

function formatReactionUserNames(userIds: string[], usersById: Map<string, User>) {
  const names = userIds.map((userId) => getUser(usersById, userId).name);

  if (names.length <= 1) {
    return names[0] ?? "Unknown reviewer";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function formatDrawingPath(points: DrawingPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function formatVersionStatus(status: ReviewVersionStatus) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "changes_requested") {
    return "Changes requested";
  }

  return "In review";
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

function getReviewAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image-square" as const;
  if (mimeType.startsWith("audio/")) return "file-audio" as const;
  if (mimeType.startsWith("video/")) return "video-camera" as const;
  return "file-text" as const;
}

function formatTime(totalSeconds: number) {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getExactCreatedAt(createdAgo: string) {
  const exactTimes: Record<string, string> = {
    "Just now": "Jun 16, 2026 at 5:23 PM",
    "25m": "Jun 16, 2026 at 4:58 PM",
    "38m": "Jun 16, 2026 at 4:45 PM",
    "1h": "Jun 16, 2026 at 4:23 PM",
    "2h": "Jun 16, 2026 at 3:23 PM",
    "3h": "Jun 16, 2026 at 2:23 PM",
    "4h": "Jun 16, 2026 at 1:23 PM",
    "5h": "Jun 16, 2026 at 12:23 PM",
    "1d": "Jun 15, 2026 at 5:23 PM",
    "2d": "Jun 14, 2026 at 5:23 PM",
  };

  return exactTimes[createdAgo] ?? "Jun 16, 2026 at 5:23 PM";
}
