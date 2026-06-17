"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { reviewUsers, reviewVideo } from "@/data/video-review";
import { DsIcon } from "./DsIcon";
import type {
  CommentFilter,
  CommentVisibility,
  DrawingPath,
  DrawingPoint,
  FramePin,
  Reaction,
  ReactionEmoji,
  ReviewComment,
  User,
  Video,
} from "./types";

const currentUserId = "user-tom";
const versionUploadInputId = "video-version-upload";
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

type LocalVideoVersion = {
  label: string;
  fileName: string;
  sourceUrl: string;
  durationSeconds: number;
};

export function VideoReviewScreen() {
  const [reviewComments, setReviewComments] = useState(reviewVideo.comments);
  const [activeFilter, setActiveFilter] = useState<CommentFilter>("unresolved");
  const [resolvedIds, setResolvedIds] = useState(
    () => new Set(reviewVideo.comments.filter((comment) => comment.resolved).map((comment) => comment.id)),
  );
  const [expandedResolvedIds, setExpandedResolvedIds] = useState(new Set<string>());
  const [isTopbarMenuOpen, setIsTopbarMenuOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [selectedVersionLabel, setSelectedVersionLabel] = useState(reviewVideo.versionLabel);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasAnchor, setHasAnchor] = useState(true);
  const [composerBody, setComposerBody] = useState("");
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
  const [editDraft, setEditDraft] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [localVideoVersions, setLocalVideoVersions] = useState<LocalVideoVersion[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [activeDrawingPath, setActiveDrawingPath] = useState<DrawingPath | null>(null);
  const [pendingFramePin, setPendingFramePin] = useState<FramePin | null>(null);
  const localVideoUrlsRef = useRef<string[]>([]);
  const commentRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usersById = useMemo(() => new Map(reviewUsers.map((user) => [user.id, user])), []);
  const existingOverallComment = reviewComments.find(
    (comment) => comment.authorId === currentUserId && isOverallComment(comment),
  );
  const comments = sortCommentsForReview(
    getFilteredComments(
      reviewComments.map((comment) => ({
        ...comment,
        resolved: resolvedIds.has(comment.id),
      })),
      activeFilter,
    ),
  );
  const unresolvedCount = comments.filter((comment) => !comment.resolved).length;
  const selectedVisibleIndex = selectedCommentId
    ? comments.findIndex((comment) => comment.id === selectedCommentId)
    : -1;
  const canSkipPrevious = comments.length > 0 && selectedVisibleIndex > 0;
  const canSkipNext =
    comments.length > 0 && (selectedVisibleIndex === -1 || selectedVisibleIndex < comments.length - 1);
  const selectedComment = selectedCommentId
    ? reviewComments.find((comment) => comment.id === selectedCommentId)
    : undefined;
  const selectedLocalVideo = localVideoVersions.find((version) => version.label === selectedVersionLabel);
  const hasDrawingAttachment = drawingPaths.length > 0 || activeDrawingPath !== null;
  const pendingDrawingPaths = [...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])];
  const selectedDrawingPaths = pendingFramePin ? [] : (selectedComment?.drawingPaths ?? []);
  const activeFramePin = pendingFramePin ?? selectedComment?.framePin ?? null;
  const activeVideo: Video = selectedLocalVideo
    ? {
        ...reviewVideo,
        fileName: selectedLocalVideo.fileName,
        versionLabel: selectedLocalVideo.label,
        versions: localVideoVersions.map((version) => version.label),
        durationSeconds: selectedLocalVideo.durationSeconds,
        sourceUrl: selectedLocalVideo.sourceUrl,
      }
    : {
        ...reviewVideo,
        versionLabel: "",
        versions: [],
      };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      localVideoUrlsRef.current.forEach((sourceUrl) => URL.revokeObjectURL(sourceUrl));
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
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setReplyingCommentId(null);

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

    if (!trimmedBody) {
      return;
    }

    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              body: trimmedBody,
              createdAgo: "Just now",
            }
          : comment,
      ),
    );
    setEditingCommentId(null);
    setEditDraft("");
    setToastMessage("Comment updated");
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditDraft("");
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

    if (editingOverallCommentId === commentId) {
      setEditingOverallCommentId(null);
    }

    if (openCommentMenuId === commentId) {
      setOpenCommentMenuId(null);
    }

    setToastMessage("Comment deleted");
  };

  const downloadVideo = () => {
    setIsTopbarMenuOpen(false);
    setToastMessage("Download started");
  };

  const deleteVideo = () => {
    setIsTopbarMenuOpen(false);
    setToastMessage("Video deleted");
  };

  const uploadVersion = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const nextLabel = `v${localVideoVersions.length + 1}`;
    const sourceUrl = URL.createObjectURL(file);

    localVideoUrlsRef.current.push(sourceUrl);
    setLocalVideoVersions((current) => [
      ...current,
      {
        label: nextLabel,
        fileName: file.name,
        sourceUrl,
        durationSeconds: reviewVideo.durationSeconds,
      },
    ]);
    setSelectedVersionLabel(nextLabel);
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
    setPendingFramePin(null);
    setSelectedCommentId(null);
    clearDrawingAttachment();
    setToastMessage(`${nextLabel} uploaded`);
    event.target.value = "";
  };

  const updateLocalVideoDuration = (durationSeconds: number) => {
    setLocalVideoVersions((current) =>
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

  const toggleReaction = (commentId: string, emoji: ReactionEmoji) => {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, reactions: toggleReactionInList(comment.reactions, emoji) } : comment,
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
                reply.id === replyId ? { ...reply, reactions: toggleReactionInList(reply.reactions, emoji) } : reply,
              ),
            }
          : comment,
      ),
    );
  };

  const toggleCommentVisibility = (commentId: string) => {
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

  const resolveAll = () => {
    setResolvedIds(new Set(reviewComments.map((comment) => comment.id)));
    setExpandedResolvedIds(new Set());
    setIsConfirmOpen(false);
  };

  const removeAnchor = () => {
    setHasAnchor(false);
    setPendingFramePin(null);
    setEditingOverallCommentId(existingOverallComment?.id ?? null);
    setComposerBody(existingOverallComment?.body ?? "");
    setToastMessage("General comment");
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

  const clearCurrentDrawing = () => {
    setDrawingPaths([]);
    setActiveDrawingPath(null);
  };

  const finishDrawingMode = () => {
    finishDrawing();
    setIsDrawingMode(false);
  };

  const placeFramePin = (framePin: FramePin) => {
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
    const submittedBody = trimmedBody || "Drawing note";

    if (!trimmedBody && !hasDrawingAttachment) {
      return;
    }

    if (hasAnchor) {
      const newComment: ReviewComment = {
        id: `comment-${Date.now()}`,
        authorId: currentUserId,
        visibility: composerVisibility,
        timecodeSeconds: currentTimeSeconds,
        createdAgo: "Just now",
        body: submittedBody,
        drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
        framePin: pendingFramePin ?? undefined,
        resolved: false,
        replies: [],
      };

      setReviewComments((current) => [...current, newComment]);
      setComposerBody("");
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
                createdAgo: "Just now",
              }
            : comment,
        ),
      );
      setPendingFramePin(null);
      clearDrawingAttachment();
      setToastMessage("Overall comment updated");
      return;
    }

    const newComment: ReviewComment = {
      id: `comment-overall-${currentUserId}-${reviewVideo.versionLabel}`,
      authorId: currentUserId,
      visibility: composerVisibility,
      createdAgo: "Just now",
      body: submittedBody,
      drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
      framePin: pendingFramePin ?? undefined,
      resolved: false,
      replies: [],
    };

    setReviewComments((current) => [newComment, ...current]);
    setEditingOverallCommentId(newComment.id);
    setSelectedCommentId(newComment.id);
    setComposerBody("");
    setPendingFramePin(null);
    clearDrawingAttachment();
    setToastMessage("Overall comment added");
  };

  return (
    <main className="video-review-shell">
      <VideoReviewTopBar
        video={activeVideo}
        selectedVersionLabel={selectedVersionLabel}
        toastMessage={toastMessage}
        uploadInputId={versionUploadInputId}
        isVersionMenuOpen={isVersionMenuOpen}
        isMenuOpen={isTopbarMenuOpen}
        onDelete={deleteVideo}
        onDismissToast={() => setToastMessage("")}
        onDownload={downloadVideo}
        onPrepareUpload={() => {
          setTimeout(() => setIsVersionMenuOpen(false), 0);
        }}
        onSelectVersion={(versionLabel) => {
          setSelectedVersionLabel(versionLabel);
          setCurrentTimeSeconds(0);
          setIsPlaying(false);
          setPendingFramePin(null);
          setSelectedCommentId(null);
          clearDrawingAttachment();
          setIsVersionMenuOpen(false);
        }}
        onToggleVersionMenu={() => setIsVersionMenuOpen((current) => !current)}
        onToggleMenu={() => setIsTopbarMenuOpen((current) => !current)}
      />
      <input
        className="visually-hidden-file-input"
        id={versionUploadInputId}
        type="file"
        accept="video/*"
        aria-label="Upload a new version"
        onChange={uploadVersion}
      />
      <section className="review-workspace" aria-label="Video review workspace">
        <VideoPlayer
          video={activeVideo}
          comments={reviewComments.map((comment) => ({
            ...comment,
            resolved: resolvedIds.has(comment.id),
          }))}
          currentTimeSeconds={currentTimeSeconds}
          isPlaying={isPlaying}
          selectedCommentId={selectedCommentId}
          activeDrawingPath={activeDrawingPath}
          activeFramePin={activeFramePin}
          composerBody={composerBody}
          drawingPaths={drawingPaths}
          selectedDrawingPaths={selectedDrawingPaths}
          isDrawingMode={isDrawingMode}
          pendingFramePin={pendingFramePin}
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
          onClearDrawing={clearCurrentDrawing}
          onDoneDrawing={finishDrawingMode}
          onSubmitComposer={submitComposer}
          onUndoDrawing={undoLastDrawingStroke}
          onSelectComment={selectComment}
          onSkipNextComment={() => skipComment(1)}
          onSkipPreviousComment={() => skipComment(-1)}
          onSeek={setCurrentTimeSeconds}
          onTimeChange={setCurrentTimeSeconds}
          onDurationChange={updateLocalVideoDuration}
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
        <CommentPanel
          activeFilter={activeFilter}
          canSkipNext={canSkipNext}
          canSkipPrevious={canSkipPrevious}
          comments={comments}
          visibleCommentsCount={comments.length}
          unresolvedCount={unresolvedCount}
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
          isConfirmOpen={isConfirmOpen}
          isPostingMenuOpen={isPostingMenuOpen}
          openCommentMenuId={openCommentMenuId}
          replyingCommentId={replyingCommentId}
          replyDraft={replyDraft}
          selectedCommentId={selectedCommentId}
          onChangeFilter={setActiveFilter}
          onCancelEditComment={cancelEditComment}
          onComposerBodyChange={setComposerBody}
          onDeleteComment={deleteComment}
          onEditDraftChange={setEditDraft}
          onExpandResolved={expandResolved}
          onOpenReply={openReply}
          onOpenConfirm={() => {
            setIsConfirmOpen(true);
          }}
          onRemoveAnchor={removeAnchor}
          onRegisterCommentRef={registerCommentRef}
          onResolveAll={resolveAll}
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
          onSaveEditComment={saveEditComment}
          onStartEditComment={startEditComment}
          onSubmitReply={submitReply}
          onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
          onToggleCommentVisibility={toggleCommentVisibility}
          onToggleReaction={toggleReaction}
          onToggleReplyReaction={toggleReplyReaction}
          onToggleResolved={toggleResolved}
          onCancelConfirm={() => setIsConfirmOpen(false)}
        />
      </section>
    </main>
  );
}

function VideoReviewTopBar({
  video,
  selectedVersionLabel,
  toastMessage,
  uploadInputId,
  isVersionMenuOpen,
  isMenuOpen,
  onDelete,
  onDismissToast,
  onDownload,
  onPrepareUpload,
  onSelectVersion,
  onToggleMenu,
  onToggleVersionMenu,
}: {
  video: Video;
  selectedVersionLabel: string;
  toastMessage: string;
  uploadInputId: string;
  isVersionMenuOpen: boolean;
  isMenuOpen: boolean;
  onDelete: () => void;
  onDismissToast: () => void;
  onDownload: () => void;
  onPrepareUpload: () => void;
  onSelectVersion: (versionLabel: string) => void;
  onToggleMenu: () => void;
  onToggleVersionMenu: () => void;
}) {
  const hasNoVersions = video.versions.length === 0;
  const hasVersions = video.versions.length > 0;
  const openUploadWithKeyboard = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onPrepareUpload();

    const uploadInput = document.getElementById(uploadInputId);

    if (uploadInput instanceof HTMLInputElement) {
      uploadInput.click();
    }
  };

  return (
    <header className="review-topbar">
      <div className="topbar-left">
        <button className="icon-button" type="button" aria-label="Back to project">
          <DsIcon name="arrow-left" size={18} />
        </button>
        <span className="file-name label-s-semibold">{video.fileName}</span>
        <div className="version-control-wrap">
          {hasNoVersions ? (
            <label
              className="version-pill upload-pill label-s-semibold"
              htmlFor={uploadInputId}
              role="button"
              tabIndex={0}
              onClick={onPrepareUpload}
              onKeyDown={openUploadWithKeyboard}
            >
              <DsIcon name="upload-simple" size={16} />
              Upload
            </label>
          ) : null}
          {hasVersions ? (
            <>
              <button
                className="version-pill label-s-semibold"
                type="button"
                aria-label="Choose version"
                aria-expanded={isVersionMenuOpen}
                onClick={onToggleVersionMenu}
              >
                {selectedVersionLabel}
                <DsIcon name="caret-down" size={14} />
              </button>
              {isVersionMenuOpen ? (
                <div className="version-menu">
                  {video.versions.map((versionLabel) => {
                    const isSelected = versionLabel === selectedVersionLabel;
                    return (
                      <button
                        className={`version-menu-item label-s-semibold ${isSelected ? "selected" : ""}`}
                        type="button"
                        key={versionLabel}
                        onClick={() => onSelectVersion(versionLabel)}
                      >
                        <span>{versionLabel}</span>
                        {isSelected ? <DsIcon name="check" size={13} /> : null}
                      </button>
                    );
                  })}
                  <label
                    className="version-menu-item add upload-menu-item label-s-semibold"
                    htmlFor={uploadInputId}
                    role="button"
                    tabIndex={0}
                    onClick={onPrepareUpload}
                    onKeyDown={openUploadWithKeyboard}
                  >
                    + Add new version
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
          {toastMessage ? <Toast message={toastMessage} onDismiss={onDismissToast} /> : null}
        </div>
      </div>

      <div className="topbar-actions" aria-label="Review actions">
        <button className="group-button label-s-semibold" type="button">
          <DsIcon name="link" size={16} />
          Copy link
        </button>
        <button className="group-button label-s-semibold" type="button">
          Request review
        </button>
        <button className="group-button approve-button label-s-semibold" type="button">
          Approve
        </button>
        <div className="topbar-more-wrap">
          <button
            className="icon-button more-button"
            type="button"
            aria-label="More actions"
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
          >
            <DsIcon name="dots-three" size={18} />
          </button>
          {isMenuOpen ? (
            <div className="topbar-more-menu">
              <button className="label-s-semibold" type="button" onClick={onDownload}>
                <DsIcon name="download-simple" size={15} />
                Download
              </button>
              <button className="delete label-s-semibold" type="button" onClick={onDelete}>
                <DsIcon name="trash-simple" size={15} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function VideoPlayer({
  video,
  comments,
  currentTimeSeconds,
  isPlaying,
  selectedCommentId,
  activeDrawingPath,
  activeFramePin,
  composerBody,
  drawingPaths,
  selectedDrawingPaths,
  isDrawingMode,
  pendingFramePin,
  onComposerBodyChange,
  onCancelFramePin,
  onPlaceFramePin,
  onStartDrawing,
  onUpdateDrawing,
  onEndDrawing,
  onClearDrawing,
  onDoneDrawing,
  onSubmitComposer,
  onUndoDrawing,
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
  selectedCommentId: string | null;
  activeDrawingPath: DrawingPath | null;
  activeFramePin: FramePin | null;
  composerBody: string;
  drawingPaths: DrawingPath[];
  selectedDrawingPaths: DrawingPath[];
  isDrawingMode: boolean;
  pendingFramePin: FramePin | null;
  onComposerBodyChange: (body: string) => void;
  onCancelFramePin: () => void;
  onPlaceFramePin: (framePin: FramePin) => void;
  onStartDrawing: (point: DrawingPoint) => void;
  onUpdateDrawing: (point: DrawingPoint) => void;
  onEndDrawing: () => void;
  onClearDrawing: () => void;
  onDoneDrawing: () => void;
  onSubmitComposer: () => void;
  onUndoDrawing: () => void;
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
  const columnRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameNoteInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackSpeed = playbackSpeeds[speedIndex];
  const hasDrawingStrokes = drawingPaths.length > 0 || activeDrawingPath !== null;

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
    if (!pendingFramePin) {
      return;
    }

    requestAnimationFrame(() => {
      frameNoteInputRef.current?.focus();
    });
  }, [pendingFramePin]);

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

    if (target instanceof HTMLElement && target.closest("button, input, textarea, .frame-note-popover")) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    onPlaceFramePin({
      x: Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10,
      y: Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10,
    });
  };

  return (
    <section className="video-column" ref={columnRef} aria-label={`${video.fileName} video player`}>
      <div
        className={`video-frame ${isDrawingMode ? "drawing-active" : ""}`}
        ref={frameRef}
        onPointerDown={placePinFromPointer}
      >
        {video.sourceUrl ? (
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
        <svg
          className="drawing-layer"
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
          {[...selectedDrawingPaths, ...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])].map((path) => (
            <path className="drawing-stroke" d={formatDrawingPath(path.points)} key={path.id} />
          ))}
        </svg>
        {!isDrawingMode && !activeFramePin ? (
          <div className="frame-comment-prompt label-s-semibold">Click to add a comment</div>
        ) : null}
        {activeFramePin ? (
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
        {pendingFramePin ? (
          <div
            className="frame-note-popover"
            style={{
              "--frame-note-x": `${pendingFramePin.x}%`,
              "--frame-note-y": `${pendingFramePin.y}%`,
            } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="frame-note-main">
              <span className="frame-note-time label-s-semibold">{formatTime(currentTimeSeconds)}</span>
              <input
                className="frame-note-input label-s"
                ref={frameNoteInputRef}
                placeholder="Add a note"
                value={composerBody}
                onChange={(event) => onComposerBodyChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelFramePin();
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
                aria-label="Close pinned comment"
                onClick={onCancelFramePin}
              >
                <DsIcon name="x-close-cross" size={12} />
              </button>
            </div>
            <p className="frame-note-hint label-xs">Use @ to mention others</p>
          </div>
        ) : null}
        {isDrawingMode ? (
          <div className="drawing-toolbar" aria-label="Drawing options">
            <span className="drawing-toolbar-label label-xs-semibold">Draw on screen</span>
            <button
              className="label-xs-semibold"
              type="button"
              disabled={!hasDrawingStrokes}
              onClick={onUndoDrawing}
            >
              Undo
            </button>
            <button
              className="label-xs-semibold"
              type="button"
              disabled={!hasDrawingStrokes}
              onClick={onClearDrawing}
            >
              Clear
            </button>
            <button className="label-xs-semibold done" type="button" onClick={onDoneDrawing}>
              Done
            </button>
          </div>
        ) : null}
      </div>

      <div className="player-controls">
        <ScrubBar
          video={video}
          comments={comments}
          currentTimeSeconds={currentTimeSeconds}
          selectedCommentId={selectedCommentId}
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
      </div>
    </section>
  );
}

function ScrubBar({
  video,
  comments,
  currentTimeSeconds,
  selectedCommentId,
  onSeek,
  onSelectComment,
}: {
  video: Video;
  comments: ReviewComment[];
  currentTimeSeconds: number;
  selectedCommentId: string | null;
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
  canSkipNext,
  canSkipPrevious,
  comments,
  composerBody,
  composerVisibility,
  currentTimeSeconds,
  editingCommentId,
  editDraft,
  highlightedCommentId,
  visibleCommentsCount,
  unresolvedCount,
  usersById,
  expandedResolvedIds,
  isEditingOverallComment,
  hasAnchor,
  hasDrawingAttachment,
  hasFramePinAttachment,
  isDrawingMode,
  isConfirmOpen,
  isPostingMenuOpen,
  openCommentMenuId,
  replyingCommentId,
  replyDraft,
  selectedCommentId,
  onCancelConfirm,
  onCancelEditComment,
  onChangeFilter,
  onComposerBodyChange,
  onDeleteComment,
  onEditDraftChange,
  onExpandResolved,
  onOpenReply,
  onOpenConfirm,
  onRemoveAnchor,
  onRegisterCommentRef,
  onResolveAll,
  onSelectComment,
  onSetComposerVisibility,
  onSetOpenCommentMenu,
  onSetReplyDraft,
  onSkipNext,
  onSkipPrevious,
  onSubmitComposer,
  onToggleDrawingMode,
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
  canSkipNext: boolean;
  canSkipPrevious: boolean;
  comments: ReviewComment[];
  composerBody: string;
  composerVisibility: CommentVisibility;
  currentTimeSeconds: number;
  editingCommentId: string | null;
  editDraft: string;
  highlightedCommentId: string | null;
  visibleCommentsCount: number;
  unresolvedCount: number;
  usersById: Map<string, User>;
  expandedResolvedIds: Set<string>;
  isEditingOverallComment: boolean;
  hasAnchor: boolean;
  hasDrawingAttachment: boolean;
  hasFramePinAttachment: boolean;
  isDrawingMode: boolean;
  isConfirmOpen: boolean;
  isPostingMenuOpen: boolean;
  openCommentMenuId: string | null;
  replyingCommentId: string | null;
  replyDraft: string;
  selectedCommentId: string | null;
  onCancelConfirm: () => void;
  onCancelEditComment: () => void;
  onChangeFilter: (filter: CommentFilter) => void;
  onComposerBodyChange: (body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditDraftChange: (body: string) => void;
  onExpandResolved: (commentId: string) => void;
  onOpenReply: (commentId: string) => void;
  onOpenConfirm: () => void;
  onRemoveAnchor: () => void;
  onRegisterCommentRef: (commentId: string, node: HTMLElement | null) => void;
  onResolveAll: () => void;
  onSelectComment: (comment: ReviewComment) => void;
  onSetComposerVisibility: (visibility: CommentVisibility) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onSetReplyDraft: (body: string) => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSubmitComposer: () => void;
  onToggleDrawingMode: () => void;
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
                  ↑
                </button>
                <button
                  className="header-menu-button"
                  type="button"
                  aria-label="Next visible comment"
                  disabled={!canSkipNext}
                  onClick={onSkipNext}
                >
                  ↓
                </button>
                <button
                  className="header-menu-button double-tick-button"
                  type="button"
                  data-tooltip="Resolve all comments"
                  aria-label="Resolve all comments"
                  onClick={onOpenConfirm}
                >
                  <DsIcon name="checks" size={15} />
                </button>
              </div>
            </div>
          </div>
          <CommentFilters active={activeFilter} onChange={onChangeFilter} />
        </div>
      </div>

      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentThread
              comment={comment}
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

      <CommentComposer
        body={composerBody}
        currentTimeSeconds={currentTimeSeconds}
        visibility={composerVisibility}
        hasAnchor={hasAnchor}
        hasDrawingAttachment={hasDrawingAttachment}
        hasFramePinAttachment={hasFramePinAttachment}
        isDrawingMode={isDrawingMode}
        isEditingOverallComment={isEditingOverallComment}
        isPostingMenuOpen={isPostingMenuOpen}
        onBodyChange={onComposerBodyChange}
        onRemoveAnchor={onRemoveAnchor}
        onSetVisibility={onSetComposerVisibility}
        onSubmit={onSubmitComposer}
        onToggleDrawingMode={onToggleDrawingMode}
        onTogglePostingMenu={onTogglePostingMenu}
      />

      {isConfirmOpen ? (
        <ResolveAllModal
          unresolvedCount={unresolvedCount}
          onCancel={onCancelConfirm}
          onResolveAll={onResolveAll}
        />
      ) : null}
    </aside>
  );
}

function CommentFilters({
  active,
  onChange,
}: {
  active: CommentFilter;
  onChange: (filter: CommentFilter) => void;
}) {
  const filters: Array<{ label: string; value: CommentFilter }> = [
    { label: "All", value: "all" },
    { label: "Unresolved", value: "unresolved" },
    { label: "Team", value: "internal" },
    { label: "Client", value: "external" },
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

function CommentThread({
  comment,
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
  comment: ReviewComment;
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
  const isOverall = isOverallComment(comment);
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
          {isTimecoded ? <TimecodeChip seconds={comment.timecodeSeconds} prefix="" /> : <OverallChip />}
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
        <Avatar user={author} />
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
                {isTimecoded ? (
                  <TimecodeChip
                    seconds={comment.timecodeSeconds}
                    prefix=""
                    onClick={() => onSelectComment(comment)}
                  />
                ) : (
                  <OverallChip />
                )}
                <VisibilityToggle
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

          {comment.drawingPaths?.length ? (
            <span className="comment-drawing-indicator label-xs-semibold">
              <DsIcon name="pencil-simple" size={13} />
              Drawing
            </span>
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
                <Avatar user={replyAuthor} compact />
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

function CommentComposer({
  body,
  currentTimeSeconds,
  hasAnchor,
  hasDrawingAttachment,
  hasFramePinAttachment,
  isDrawingMode,
  isEditingOverallComment,
  isPostingMenuOpen,
  visibility,
  onBodyChange,
  onRemoveAnchor,
  onSetVisibility,
  onSubmit,
  onToggleDrawingMode,
  onTogglePostingMenu,
}: {
  body: string;
  currentTimeSeconds: number;
  hasAnchor: boolean;
  hasDrawingAttachment: boolean;
  hasFramePinAttachment: boolean;
  isDrawingMode: boolean;
  isEditingOverallComment: boolean;
  isPostingMenuOpen: boolean;
  visibility: CommentVisibility;
  onBodyChange: (body: string) => void;
  onRemoveAnchor: () => void;
  onSetVisibility: (visibility: CommentVisibility) => void;
  onSubmit: () => void;
  onToggleDrawingMode: () => void;
  onTogglePostingMenu: () => void;
}) {
  const isInternal = visibility === "internal";
  const canSubmit = body.trim().length > 0 || hasDrawingAttachment;
  const submitWithKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isSubmitKey = event.key === "Enter" && (!event.shiftKey || event.metaKey);

    if (isSubmitKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className={`comment-composer ${isInternal ? "internal" : ""}`} aria-label="Add comment">
      <div className="posting-menu-wrap">
        <button className="posting-toggle label-xs" type="button" onClick={onTogglePostingMenu}>
          {isInternal ? "Posting to Team" : "Posting to Client"} <DsIcon name="caret-down" size={12} />
        </button>
        {isPostingMenuOpen ? (
          <div className="posting-menu">
            <button className="label-s" type="button" onClick={() => onSetVisibility("external")}>
              Posting to Client
            </button>
            <button className="label-s" type="button" onClick={() => onSetVisibility("internal")}>
              Posting to Team
            </button>
          </div>
        ) : null}
      </div>
      <div className={`composer-box ${isInternal ? "internal" : ""}`}>
        <textarea
          className="composer-input label-s"
          placeholder={hasAnchor ? `Comment on ${formatTime(currentTimeSeconds)}...` : "Add your overall comment..."}
          rows={3}
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          onKeyDown={submitWithKeyboard}
        />
        <div className="composer-toolbar">
          <div className="composer-tools">
            <button type="button" data-tooltip="Attach file" aria-label="Attach file">
              <DsIcon name="paperclip" size={16} />
            </button>
            <button type="button" data-tooltip="Record your screen and voice" aria-label="Record your screen and voice">
              <DsIcon name="video-camera" size={16} />
            </button>
            <button
              className={isDrawingMode ? "active" : ""}
              type="button"
              data-tooltip={isDrawingMode ? "Drawing mode is on" : "Draw on screen"}
              aria-label={isDrawingMode ? "Turn off drawing mode" : "Draw on screen"}
              aria-pressed={isDrawingMode}
              onClick={onToggleDrawingMode}
            >
              <DsIcon name="pencil-simple" size={16} />
            </button>
          </div>
          {hasDrawingAttachment ? (
            <div className="composer-attachment-pill label-xs-semibold">
              <DsIcon name="pencil-simple" size={13} />
              Drawing on frame
            </div>
          ) : null}
          {hasFramePinAttachment ? (
            <div className="composer-attachment-pill point label-xs-semibold">
              <span className="composer-point-dot" />
              Point pinned
            </div>
          ) : null}
          <div className="composer-send">
            {hasAnchor ? (
              <button
                className="anchor-chip label-xs-semibold"
                type="button"
                data-tooltip="Remove timecode to make an overall comment"
                aria-label="Remove timecode to make an overall comment"
                onClick={onRemoveAnchor}
              >
                @{formatTime(currentTimeSeconds)}
                <DsIcon name="x-close-cross" size={11} />
              </button>
            ) : null}
            <button
              className={`send-button ${isInternal ? "internal" : ""} ${
                isEditingOverallComment ? "update-comment-button label-xs-semibold" : ""
              }`}
              type="button"
              disabled={!canSubmit}
              aria-label={isEditingOverallComment ? "Update overall comment" : "Send comment"}
              onClick={onSubmit}
            >
              {isEditingOverallComment ? "Update" : <DsIcon name="paper-plane-tilt" size={17} />}
            </button>
          </div>
        </div>
      </div>
      <p className="composer-hint label-xs">Cmd+Enter to send</p>
    </section>
  );
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
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="toast-message label-s-semibold" role="status">
      {message}
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>
        <DsIcon name="x-close-cross" size={12} />
      </button>
    </div>
  );
}

function ResolveAllModal({
  unresolvedCount,
  onCancel,
  onResolveAll,
}: {
  unresolvedCount: number;
  onCancel: () => void;
  onResolveAll: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="resolve-modal" role="dialog" aria-modal="true" aria-labelledby="resolve-all-title">
        <h2 className="heading-3xs" id="resolve-all-title">
          Resolve all {unresolvedCount} unresolved comments?
        </h2>
        <div className="resolve-modal-actions">
          <button className="modal-cancel-button label-s-semibold" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-resolve-button label-s-semibold" type="button" onClick={onResolveAll}>
            Resolve all
          </button>
        </div>
      </div>
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

function VisibilityToggle({
  visibility,
  onToggle,
}: {
  visibility: CommentVisibility;
  onToggle: () => void;
}) {
  const isInternal = visibility === "internal";

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

function Avatar({ user, compact = false }: { user: User; compact?: boolean }) {
  return (
    <span className={`avatar ${user.avatarTone} ${compact ? "compact" : ""}`} aria-label={user.name}>
      {user.initials}
    </span>
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

function toggleReactionInList(reactions: Reaction[] | undefined, emoji: ReactionEmoji) {
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
