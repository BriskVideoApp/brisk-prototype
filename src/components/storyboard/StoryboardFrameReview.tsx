"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  ScriptMediaPicker,
  scriptMediaPickerOptions,
} from "@/components/script/ScriptMediaPicker";
import { ReviewCommentComposer } from "@/components/video-review/ReviewCommentComposer";
import {
  ReviewCommentThread,
  toggleReviewReactionInList,
} from "@/components/video-review/VideoReviewScreen";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  CommentFilter,
  CommentVisibility,
  DrawingPath,
  DrawingPoint,
  FramePin,
  ReactionEmoji,
  ReviewComment,
  User,
} from "@/components/video-review/types";
import { reviewUsers } from "@/data/video-review";
import type { ScriptMediaType } from "@/data/script";
import type { StoryboardFrame } from "@/data/storyboard";

const filters: Array<{ label: string; value: CommentFilter }> = [
  { label: "All", value: "all" },
  { label: "Unresolved", value: "unresolved" },
  { label: "Team", value: "internal" },
  { label: "Client", value: "external" },
];

export function StoryboardFrameReview({
  frame,
  frameNumber,
  imageUrl,
  isMediaPickerOpen,
  role,
  onClose,
  onCommentsChange,
  onCopyLink,
  onDelete,
  onDownload,
  onDuplicate,
  onMediaPickerOpenChange,
  onMediaSource,
  onRemoveMedia,
}: {
  frame: StoryboardFrame;
  frameNumber: number;
  imageUrl?: string;
  isMediaPickerOpen: boolean;
  role: PrototypeRole;
  onClose: () => void;
  onCommentsChange: (comments: ReviewComment[]) => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onMediaPickerOpenChange: (isOpen: boolean) => void;
  onMediaSource: (source: ScriptMediaType) => void;
  onRemoveMedia: () => void;
}) {
  const isCustomer = role === "Customer";
  const [filter, setFilter] = useState<CommentFilter>("unresolved");
  const [composerBody, setComposerBody] = useState("");
  const [composerVisibility, setComposerVisibility] = useState<CommentVisibility>("external");
  const [isPostingMenuOpen, setIsPostingMenuOpen] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [activeDrawingPath, setActiveDrawingPath] = useState<DrawingPath | null>(null);
  const [pendingPin, setPendingPin] = useState<FramePin | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [expandedResolvedIds, setExpandedResolvedIds] = useState<Set<string>>(() => new Set());
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isFrameMenuOpen, setIsFrameMenuOpen] = useState(false);
  const frameMenuRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!isFrameMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!frameMenuRef.current?.contains(event.target as Node)) setIsFrameMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFrameMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFrameMenuOpen]);

  const usersById = useMemo(() => new Map<string, User>(reviewUsers.map((user) => [user.id, user])), []);
  const roleVisibleComments = frame.comments
    .filter((comment) => !isCustomer || comment.visibility === "external");
  const pinNumbers = new Map(
    roleVisibleComments
      .filter((comment) => comment.framePin)
      .map((comment, index) => [comment.id, index + 1]),
  );
  const comments = roleVisibleComments
    .filter((comment) => {
      if (filter === "all") return true;
      if (filter === "unresolved") return !comment.resolved;
      return comment.visibility === filter;
    });
  const pinnedComments = comments.filter((comment) => comment.framePin);
  const selectedComment = frame.comments.find((comment) => comment.id === selectedCommentId);
  const selectedDrawingPaths = pendingPin ? [] : (selectedComment?.drawingPaths ?? []);
  const pendingDrawingPaths = [...drawingPaths, ...(activeDrawingPath ? [activeDrawingPath] : [])];
  const hasDrawingAttachment = pendingDrawingPaths.length > 0;

  const selectComment = (comment: ReviewComment, scrollToThread = false) => {
    setSelectedCommentId(comment.id);
    setPendingPin(null);
    if (scrollToThread) {
      requestAnimationFrame(() => commentRefs.current.get(comment.id)?.scrollIntoView({ block: "nearest" }));
    }
  };

  const updateComment = (commentId: string, update: (comment: ReviewComment) => ReviewComment) => {
    onCommentsChange(frame.comments.map((comment) => comment.id === commentId ? update(comment) : comment));
  };

  const postComment = () => {
    const body = composerBody.trim();
    if (!body && !hasDrawingAttachment) return;
    const comment: ReviewComment = {
      id: `storyboard-comment-${Date.now()}`,
      authorId: isCustomer ? "user-jess" : "user-tom",
      visibility: isCustomer ? "external" : composerVisibility,
      createdAgo: "Just now",
      body: body || "Drawing note",
      resolved: false,
      drawingPaths: hasDrawingAttachment ? pendingDrawingPaths : undefined,
      framePin: pendingPin ?? undefined,
      replies: [],
    };
    onCommentsChange([...frame.comments, comment]);
    setComposerBody("");
    setDrawingPaths([]);
    setActiveDrawingPath(null);
    setPendingPin(null);
    setIsDrawingMode(false);
    setSelectedCommentId(comment.id);
  };

  const getDrawingPoint = (event: ReactPointerEvent<SVGSVGElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 562.5,
    };
  };

  return (
    <div className="storyboard-review" role="dialog" aria-modal="true" aria-labelledby="storyboard-review-title">
      <section className="storyboard-review-main">
        <header className="storyboard-review-header">
          <button className="storyboard-icon-button" type="button" aria-label="Back to Storyboard" onClick={onClose}>
            <DsIcon name="arrow-left" size={18} />
          </button>
          <div className="storyboard-review-header-copy">
            <span className="label-xs-semibold">Storyboard frame {frameNumber}</span>
            <h2 className="headings-2xs-bold" id="storyboard-review-title">{frame.words}</h2>
          </div>
          <div className="storyboard-review-actions" aria-label={`Actions for storyboard frame ${frameNumber}`}>
            <ScriptMediaPicker
              isOpen={isMediaPickerOpen}
              options={scriptMediaPickerOptions}
              triggerLabel={`${imageUrl ? "Replace" : "Add"} media for frame ${frameNumber}`}
              triggerClassName="storyboard-review-media-picker label-xs-semibold"
              triggerIcon={imageUrl ? "arrows-clockwise" : "plus"}
              triggerText={imageUrl ? "Replace media" : "Add media"}
              menuClassName="storyboard-review-media-menu"
              onOpenChange={onMediaPickerOpenChange}
              onSelect={onMediaSource}
            />
            <button
              className="storyboard-icon-button"
              type="button"
              aria-label={`Copy link to frame ${frameNumber}`}
              data-tooltip="Copy link"
              onClick={onCopyLink}
            >
              <DsIcon name="link" size={17} />
            </button>
            <button
              className="storyboard-icon-button"
              type="button"
              aria-label={imageUrl ? `Download media from frame ${frameNumber}` : `No media to download from frame ${frameNumber}`}
              data-tooltip={imageUrl ? "Download" : "No media to download"}
              disabled={!imageUrl}
              onClick={onDownload}
            >
              <DsIcon name="download" size={17} />
            </button>
            <div className="storyboard-review-menu-wrap" ref={frameMenuRef}>
              <button
                className="storyboard-icon-button"
                type="button"
                aria-label={`More actions for frame ${frameNumber}`}
                aria-expanded={isFrameMenuOpen}
                data-tooltip="More actions"
                onClick={() => setIsFrameMenuOpen((current) => !current)}
              >
                <DsIcon name="dots-three" size={18} />
              </button>
              {isFrameMenuOpen ? (
                <div className="storyboard-review-menu" role="menu">
                  <button className="label-s" type="button" role="menuitem" onClick={() => {
                    setIsFrameMenuOpen(false);
                    onDuplicate();
                  }}>
                    <DsIcon name="copy" size={16} />
                    Duplicate frame
                  </button>
                  {imageUrl ? (
                    <button className="label-s danger" type="button" role="menuitem" onClick={() => {
                      setIsFrameMenuOpen(false);
                      onRemoveMedia();
                    }}>
                      <DsIcon name="trash" size={16} />
                      Delete media
                    </button>
                  ) : null}
                  <button className="label-s danger" type="button" role="menuitem" onClick={() => {
                    setIsFrameMenuOpen(false);
                    onDelete();
                  }}>
                    <DsIcon name="trash" size={16} />
                    Delete frame
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div
          className={`storyboard-review-canvas ${isDrawingMode ? "drawing-active" : ""}`}
          onPointerDown={(event) => {
            if (isDrawingMode || event.target instanceof SVGElement) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setPendingPin({
              x: Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10,
              y: Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10,
            });
            setSelectedCommentId(null);
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={frame.image?.label ?? `Storyboard frame ${frameNumber}`} />
          ) : (
            <div className="storyboard-review-placeholder">
              <DsIcon name="image-square" size={32} />
              <span className="label-s-semibold">No image added</span>
            </div>
          )}
          <svg
            className="drawing-layer"
            viewBox="0 0 1000 562.5"
            preserveAspectRatio="none"
            aria-label={isDrawingMode ? "Drawing layer active" : "Drawing layer"}
            onPointerDown={(event) => {
              if (!isDrawingMode) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setActiveDrawingPath({ id: `storyboard-drawing-${Date.now()}`, points: [getDrawingPoint(event)] });
            }}
            onPointerMove={(event) => {
              if (!isDrawingMode || !activeDrawingPath) return;
              event.preventDefault();
              const point = getDrawingPoint(event);
              setActiveDrawingPath((current) => current ? { ...current, points: [...current.points, point] } : null);
            }}
            onPointerUp={(event) => {
              if (!isDrawingMode || !activeDrawingPath) return;
              event.preventDefault();
              setDrawingPaths((current) => activeDrawingPath.points.length > 1 ? [...current, activeDrawingPath] : current);
              setActiveDrawingPath(null);
            }}
            onPointerCancel={() => setActiveDrawingPath(null)}
          >
            {[...selectedDrawingPaths, ...pendingDrawingPaths].map((path) => (
              <path className="drawing-stroke" d={formatDrawingPath(path.points)} key={path.id} />
            ))}
          </svg>
          {!isDrawingMode && !pendingPin ? (
            <span className="storyboard-review-pin-prompt label-s-semibold">Click the image to pin a comment</span>
          ) : null}
          {pinnedComments.map((comment) => {
            const framePin = comment.framePin;
            if (!framePin) return null;
            const pinNumber = pinNumbers.get(comment.id);
            return (
              <button
                className={`frame-comment-dot storyboard-comment-pointer label-xs-semibold ${selectedCommentId === comment.id ? "selected" : ""}`}
                type="button"
                key={comment.id}
                aria-label={`Open pinned comment ${pinNumber}: ${comment.body}`}
                style={{ left: `${framePin.x}%`, top: `${framePin.y}%` }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => selectComment(comment, true)}
              >
                {pinNumber}
              </button>
            );
          })}
          {pendingPin ? (
            <span
              className="frame-comment-dot pending"
              style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
              aria-hidden="true"
            />
          ) : null}
          {isDrawingMode ? (
            <div className="drawing-toolbar" aria-label="Drawing options">
              <span className="drawing-toolbar-label label-xs-semibold">Draw on frame</span>
              <button className="label-xs-semibold" type="button" disabled={!pendingDrawingPaths.length} onClick={() => {
                setActiveDrawingPath(null);
                setDrawingPaths((current) => current.slice(0, -1));
              }}>Undo</button>
              <button className="label-xs-semibold" type="button" disabled={!pendingDrawingPaths.length} onClick={() => {
                setDrawingPaths([]);
                setActiveDrawingPath(null);
              }}>Clear</button>
              <button className="label-xs-semibold done" type="button" onClick={() => setIsDrawingMode(false)}>Done</button>
            </div>
          ) : null}
        </div>

        <footer className="storyboard-review-frame-copy">
          <div>
            <span className="label-xs-semibold">Words</span>
            <p className="label-s">{frame.words}</p>
          </div>
          <div>
            <span className="label-xs-semibold">Visual direction</span>
            <p className="label-s">{frame.visuals}</p>
          </div>
        </footer>
      </section>

      <aside className="storyboard-review-comments" aria-label="Frame comments">
        <header>
          <h3 className="headings-2xs-bold">Comments ({comments.length})</h3>
          <div className="filter-row" aria-label="Comment filters">
            {filters.filter((item) => !isCustomer || item.value !== "internal").map((item) => (
              <button
                className={`filter-chip label-xs-semibold ${filter === item.value ? "active" : ""}`}
                type="button"
                key={item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>
        <div className="comment-list">
          {comments.length ? comments.map((comment) => (
            <ReviewCommentThread
              anchorLabel={comment.framePin ? `Pin ${pinNumbers.get(comment.id)}` : undefined}
              comment={comment}
              canChangeVisibility={!isCustomer}
              editDraft={editDraft}
              isEditing={editingCommentId === comment.id}
              isExpandedResolved={expandedResolvedIds.has(comment.id)}
              isHighlighted={false}
              isMenuOpen={openCommentMenuId === comment.id}
              isReplying={replyingCommentId === comment.id}
              isSelected={selectedCommentId === comment.id}
              key={comment.id}
              replyDraft={replyDraft}
              usersById={usersById}
              onCancelEdit={() => {
                setEditingCommentId(null);
                setEditDraft("");
              }}
              onDeleteComment={(commentId) => onCommentsChange(frame.comments.filter((item) => item.id !== commentId))}
              onEditDraftChange={setEditDraft}
              onExpandResolved={(commentId) => setExpandedResolvedIds((current) => new Set(current).add(commentId))}
              onOpenReply={(commentId, mentionName) => {
                setReplyingCommentId(commentId);
                setReplyDraft(mentionName ? `@${mentionName} ` : "");
              }}
              onRegisterCommentRef={(commentId, node) => {
                if (node) commentRefs.current.set(commentId, node);
                else commentRefs.current.delete(commentId);
              }}
              onSelectComment={selectComment}
              onSetOpenCommentMenu={setOpenCommentMenuId}
              onSetReplyDraft={setReplyDraft}
              onSaveEdit={(commentId) => {
                if (!editDraft.trim()) return;
                updateComment(commentId, (item) => ({ ...item, body: editDraft.trim(), createdAgo: "Just now" }));
                setEditingCommentId(null);
                setEditDraft("");
              }}
              onStartEdit={(selected) => {
                setEditingCommentId(selected.id);
                setEditDraft(selected.body);
                setOpenCommentMenuId(null);
              }}
              onSubmitReply={(commentId) => {
                if (!replyDraft.trim()) return;
                updateComment(commentId, (item) => ({
                  ...item,
                  replies: [...item.replies, {
                    id: `storyboard-reply-${Date.now()}`,
                    authorId: isCustomer ? "user-jess" : "user-tom",
                    createdAgo: "Just now",
                    body: replyDraft.trim(),
                  }],
                }));
                setReplyingCommentId(null);
                setReplyDraft("");
              }}
              onToggleCommentVisibility={(commentId) => {
                if (isCustomer) return;
                updateComment(commentId, (item) => ({
                  ...item,
                  visibility: item.visibility === "internal" ? "external" : "internal",
                }));
              }}
              onToggleReaction={(commentId, emoji: ReactionEmoji) => updateComment(commentId, (item) => ({
                ...item,
                reactions: toggleReviewReactionInList(item.reactions, emoji),
              }))}
              onToggleReplyReaction={(commentId, replyId, emoji: ReactionEmoji) => updateComment(commentId, (item) => ({
                ...item,
                replies: item.replies.map((reply) => reply.id === replyId
                  ? { ...reply, reactions: toggleReviewReactionInList(reply.reactions, emoji) }
                  : reply),
              }))}
              onToggleResolved={(commentId) => updateComment(commentId, (item) => ({ ...item, resolved: !item.resolved }))}
            />
          )) : (
            <div className="storyboard-comments-empty">
              <DsIcon name="chat-circle" size={22} />
              <strong>No comments here</strong>
              <span className="label-s">Click the frame or draw to leave a note.</span>
            </div>
          )}
        </div>
        <ReviewCommentComposer
          body={composerBody}
          canChooseVisibility={!isCustomer}
          currentTimeSeconds={0}
          hasAnchor={false}
          hasDrawingAttachment={hasDrawingAttachment}
          hasFramePinAttachment={pendingPin !== null}
          isDrawingMode={isDrawingMode}
          isEditingOverallComment={false}
          isPostingMenuOpen={isPostingMenuOpen}
          visibility={isCustomer ? "external" : composerVisibility}
          onBodyChange={setComposerBody}
          onRemoveAnchor={() => undefined}
          onSetVisibility={(visibility) => {
            if (!isCustomer) setComposerVisibility(visibility);
            setIsPostingMenuOpen(false);
          }}
          onSubmit={postComment}
          onToggleDrawingMode={() => {
            setIsDrawingMode((current) => !current);
            setPendingPin(null);
            setSelectedCommentId(null);
          }}
          onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
        />
      </aside>
    </div>
  );
}

function formatDrawingPath(points: DrawingPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}
