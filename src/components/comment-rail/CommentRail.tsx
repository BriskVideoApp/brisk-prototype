"use client";

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { CommentFilter, CommentVisibility, Reaction, ReactionEmoji, User } from "@/components/video-review/types";
import type { ScriptComment, ScriptCommentAnchor } from "@/data/script";

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

type CommentRailProps = {
  activeAnchor: ScriptCommentAnchor;
  comments: ScriptComment[];
  currentUserId: string;
  users: User[];
  canPostInternal: boolean;
  canSeeInternal: boolean;
  filterMode: "studio" | "customer";
  composerAnchor?: ScriptCommentAnchor;
  composerPlacement?: "top" | "bottom";
  title?: string;
  onClose?: () => void;
  onCommentsChange?: (comments: ScriptComment[]) => void;
  onSelectComment?: (comment: ScriptComment) => void;
};

type ReplyDrafts = Record<string, string>;

export function CommentRail({
  activeAnchor,
  comments: initialComments,
  currentUserId,
  users,
  canPostInternal,
  canSeeInternal,
  filterMode,
  composerAnchor,
  composerPlacement = "bottom",
  title,
  onClose,
  onCommentsChange,
  onSelectComment,
}: CommentRailProps) {
  const [localComments, setLocalComments] = useState(initialComments);
  const [activeFilter, setActiveFilter] = useState<CommentFilter>("all");
  const [composerBody, setComposerBody] = useState("");
  const [composerVisibility, setComposerVisibility] = useState<CommentVisibility>("external");
  const [isPostingMenuOpen, setIsPostingMenuOpen] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<ReplyDrafts>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [expandedResolvedIds, setExpandedResolvedIds] = useState(new Set<string>());
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const comments = onCommentsChange ? initialComments : localComments;
  const activeComposerAnchor = composerAnchor ?? activeAnchor;
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const visibleBaseComments = useMemo(
    () => (canSeeInternal ? comments : comments.filter((comment) => comment.visibility === "external")),
    [canSeeInternal, comments],
  );
  const visibleComments = sortCommentsForRail(getFilteredComments(visibleBaseComments, activeFilter));
  const unresolvedCount = visibleBaseComments.filter((comment) => !comment.resolved).length;
  const selectedVisibleIndex = selectedCommentId
    ? visibleComments.findIndex((comment) => comment.id === selectedCommentId)
    : -1;
  const canSkipPrevious = selectedVisibleIndex > 0;
  const canSkipNext =
    visibleComments.length > 0 && (selectedVisibleIndex === -1 || selectedVisibleIndex < visibleComments.length - 1);

  useEffect(() => {
    if (!onCommentsChange) {
      setLocalComments(initialComments);
    }
  }, [initialComments, onCommentsChange]);

  const updateComments = (updater: (currentComments: ScriptComment[]) => ScriptComment[]) => {
    if (onCommentsChange) {
      onCommentsChange(updater(initialComments));
      return;
    }

    setLocalComments(updater);
  };

  const selectComment = (comment: ScriptComment) => {
    setSelectedCommentId(comment.id);
    onSelectComment?.(comment);
  };

  const skipComment = (direction: -1 | 1) => {
    if (visibleComments.length === 0) {
      return;
    }

    const baseIndex = selectedVisibleIndex === -1 ? (direction === 1 ? -1 : visibleComments.length) : selectedVisibleIndex;
    const nextComment = visibleComments[baseIndex + direction];

    if (nextComment) {
      selectComment(nextComment);
    }
  };

  const submitComment = () => {
    const trimmedBody = composerBody.trim();

    if (!trimmedBody) {
      return;
    }

    const newComment: ScriptComment = {
      id: `script-comment-${Date.now()}`,
      authorId: currentUserId,
      visibility: composerVisibility,
      anchor: activeComposerAnchor,
      createdAgo: "Just now",
      body: trimmedBody,
      resolved: false,
      replies: [],
    };

    updateComments((current) => [...current, newComment]);
    setComposerBody("");
    setSelectedCommentId(newComment.id);
  };

  const toggleResolved = (commentId: string) => {
    updateComments((current) =>
      current.map((comment) => (comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment)),
    );
    setExpandedResolvedIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });
  };

  const resolveAll = () => {
    updateComments((current) => current.map((comment) => ({ ...comment, resolved: true })));
    setIsConfirmOpen(false);
    setExpandedResolvedIds(new Set());
  };

  const deleteComment = (commentId: string) => {
    updateComments((current) => current.filter((comment) => comment.id !== commentId));
    setOpenCommentMenuId(null);

    if (selectedCommentId === commentId) {
      setSelectedCommentId(null);
    }
  };

  const startEdit = (comment: ScriptComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setOpenCommentMenuId(null);
  };

  const saveEdit = (commentId: string) => {
    const trimmedDraft = editDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    updateComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, body: trimmedDraft, createdAgo: "Just now" } : comment,
      ),
    );
    setEditingCommentId(null);
    setEditDraft("");
  };

  const submitReply = (commentId: string) => {
    const draft = replyDrafts[commentId]?.trim() ?? "";

    if (!draft) {
      return;
    }

    updateComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: `script-reply-${Date.now()}`,
                  authorId: currentUserId,
                  createdAgo: "Just now",
                  body: draft,
                },
              ],
            }
          : comment,
      ),
    );
    setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
    setReplyingCommentId(null);
  };

  const toggleCommentVisibility = (commentId: string) => {
    if (!canPostInternal) {
      return;
    }

    updateComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, visibility: comment.visibility === "internal" ? "external" : "internal" }
          : comment,
      ),
    );
  };

  const toggleReaction = (commentId: string, emoji: ReactionEmoji) => {
    updateComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, reactions: toggleReactionInList(comment.reactions, emoji, currentUserId) } : comment,
      ),
    );
  };

  const toggleReplyReaction = (commentId: string, replyId: string, emoji: ReactionEmoji) => {
    updateComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === replyId
                  ? { ...reply, reactions: toggleReactionInList(reply.reactions, emoji, currentUserId) }
                  : reply,
              ),
            }
          : comment,
      ),
    );
  };

  return (
    <aside className={`comment-panel script-comment-panel composer-${composerPlacement}`} aria-label="Script comments">
      <div className="comment-panel-top">
        <div className="comment-header">
          <div className="comment-title-row">
            <h1 className="heading-3xs">{title ?? `Comments (${visibleComments.length})`}</h1>
            <div className="comment-header-actions">
              <div className="skip-comment-actions" aria-label="Skip between visible comments">
                <button
                  className="header-menu-button"
                  type="button"
                  aria-label="Previous visible comment"
                  disabled={!canSkipPrevious}
                  onClick={() => skipComment(-1)}
                >
                  ↑
                </button>
                <button
                  className="header-menu-button"
                  type="button"
                  aria-label="Next visible comment"
                  disabled={!canSkipNext}
                  onClick={() => skipComment(1)}
                >
                  ↓
                </button>
                <button
                  className="header-menu-button double-tick-button"
                  type="button"
                  data-tooltip="Resolve all comments"
                  aria-label="Resolve all comments"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  <DsIcon name="checks" size={15} />
                </button>
                {onClose ? (
                  <button className="header-menu-button script-comment-panel-close" type="button" aria-label="Close comments" onClick={onClose}>
                    <DsIcon name="x-close-cross" size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <CommentFilters
            active={activeFilter}
            mode={filterMode}
            onChange={(filter) => setActiveFilter(filter)}
          />
        </div>
      </div>

      {composerPlacement === "top" ? (
        <CommentComposer
          anchor={activeComposerAnchor}
          body={composerBody}
          canPostInternal={canPostInternal}
          isPostingMenuOpen={isPostingMenuOpen}
          visibility={composerVisibility}
          onBodyChange={setComposerBody}
          onSetVisibility={(visibility) => {
            setComposerVisibility(visibility);
            setIsPostingMenuOpen(false);
          }}
          onSubmit={submitComment}
          onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
        />
      ) : null}

      <div className="comment-list">
        {visibleComments.length > 0 ? (
          visibleComments.map((comment) => (
            <CommentThread
              comment={comment}
              currentUserId={currentUserId}
              editDraft={editDraft}
              expanded={expandedResolvedIds.has(comment.id)}
              isEditing={editingCommentId === comment.id}
              isMenuOpen={openCommentMenuId === comment.id}
              isReplying={replyingCommentId === comment.id}
              isSelected={selectedCommentId === comment.id}
              key={comment.id}
              replyDraft={replyDrafts[comment.id] ?? ""}
              usersById={usersById}
              canToggleVisibility={canPostInternal}
              onCancelEdit={() => {
                setEditingCommentId(null);
                setEditDraft("");
              }}
              onDelete={deleteComment}
              onEditDraftChange={setEditDraft}
              onExpandResolved={(commentId) =>
                setExpandedResolvedIds((current) => {
                  const next = new Set(current);
                  next.add(commentId);
                  return next;
                })
              }
              onOpenReply={(commentId) => setReplyingCommentId(commentId)}
              onSaveEdit={saveEdit}
              onSelect={selectComment}
              onSetMenuOpen={setOpenCommentMenuId}
              onSetReplyDraft={(commentId, draft) => setReplyDrafts((current) => ({ ...current, [commentId]: draft }))}
              onStartEdit={startEdit}
              onSubmitReply={submitReply}
              onToggleReaction={toggleReaction}
              onToggleReplyReaction={toggleReplyReaction}
              onToggleResolved={toggleResolved}
              onToggleVisibility={toggleCommentVisibility}
            />
          ))
        ) : (
          <EmptyCommentPanel />
        )}
      </div>

      {composerPlacement === "bottom" ? (
        <CommentComposer
          anchor={activeComposerAnchor}
          body={composerBody}
          canPostInternal={canPostInternal}
          isPostingMenuOpen={isPostingMenuOpen}
          visibility={composerVisibility}
          onBodyChange={setComposerBody}
          onSetVisibility={(visibility) => {
            setComposerVisibility(visibility);
            setIsPostingMenuOpen(false);
          }}
          onSubmit={submitComment}
          onTogglePostingMenu={() => setIsPostingMenuOpen((current) => !current)}
        />
      ) : null}

      {isConfirmOpen ? (
        <ResolveAllModal
          unresolvedCount={unresolvedCount}
          onCancel={() => setIsConfirmOpen(false)}
          onResolveAll={resolveAll}
        />
      ) : null}
    </aside>
  );
}

function CommentFilters({
  active,
  mode,
  onChange,
}: {
  active: CommentFilter;
  mode: "studio" | "customer";
  onChange: (filter: CommentFilter) => void;
}) {
  const filters: Array<{ label: string; value: CommentFilter }> =
    mode === "customer"
      ? [
          { label: "All", value: "all" },
          { label: "Unresolved", value: "unresolved" },
        ]
      : [
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
  canToggleVisibility,
  comment,
  currentUserId,
  editDraft,
  expanded,
  isEditing,
  isMenuOpen,
  isReplying,
  isSelected,
  replyDraft,
  usersById,
  onDelete,
  onCancelEdit,
  onEditDraftChange,
  onExpandResolved,
  onOpenReply,
  onSaveEdit,
  onSelect,
  onSetMenuOpen,
  onSetReplyDraft,
  onStartEdit,
  onSubmitReply,
  onToggleReaction,
  onToggleReplyReaction,
  onToggleResolved,
  onToggleVisibility,
}: {
  canToggleVisibility: boolean;
  comment: ScriptComment;
  currentUserId: string;
  editDraft: string;
  expanded: boolean;
  isEditing: boolean;
  isMenuOpen: boolean;
  isReplying: boolean;
  isSelected: boolean;
  replyDraft: string;
  usersById: Map<string, User>;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  onEditDraftChange: (draft: string) => void;
  onExpandResolved: (commentId: string) => void;
  onOpenReply: (commentId: string) => void;
  onSaveEdit: (commentId: string) => void;
  onSelect: (comment: ScriptComment) => void;
  onSetMenuOpen: (commentId: string | null) => void;
  onSetReplyDraft: (commentId: string, draft: string) => void;
  onStartEdit: (comment: ScriptComment) => void;
  onSubmitReply: (commentId: string) => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
  onToggleReplyReaction: (commentId: string, replyId: string, emoji: ReactionEmoji) => void;
  onToggleResolved: (commentId: string) => void;
  onToggleVisibility: (commentId: string) => void;
}) {
  const author = getUser(usersById, comment.authorId);
  const isCollapsedResolved = comment.resolved && !expanded;
  const lastReplyId = comment.replies.at(-1)?.id;

  if (isCollapsedResolved) {
    return (
      <div className={`resolved-compact-row ${comment.visibility} ${isSelected ? "selected" : ""}`}>
        <button
          className="resolved-compact-main"
          type="button"
          onClick={() => {
            onExpandResolved(comment.id);
            onSelect(comment);
          }}
        >
          <span className="resolved-compact-tick" aria-hidden="true" />
          <span className="resolved-compact-author label-xs-semibold">{author.name}</span>
          <AnchorChip anchor={comment.anchor} />
          <span className="resolved-compact-copy label-xs">{comment.body}</span>
        </button>
        <CommentEditDeleteActions
          comment={comment}
          isMenuOpen={isMenuOpen}
          onDelete={onDelete}
          onSetMenuOpen={onSetMenuOpen}
          onStartEdit={onStartEdit}
        />
      </div>
    );
  }

  return (
    <article
      className={`comment-thread ${comment.visibility} ${comment.anchor.kind === "overall" ? "overall" : ""} ${
        comment.resolved ? "resolved" : ""
      } ${isSelected ? "selected" : ""}`}
      onClick={(event) => {
        if (shouldIgnoreCommentSelection(event)) {
          return;
        }

        onSelect(comment);
      }}
    >
      <div className="comment-row">
        <Avatar user={author} />
        <div className="comment-body">
          <div className="comment-meta">
            <div className="author-line">
              <span className="author-name-row">
                <span className="label-xs-semibold">{author.name}</span>
                <span className="created-ago label-xs">{comment.createdAgo}</span>
              </span>
              <span className="anchor-meta-row">
                <AnchorChip anchor={comment.anchor} onClick={() => onSelect(comment)} />
                <VisibilityToggle
                  canToggle={canToggleVisibility}
                  visibility={comment.visibility}
                  onToggle={() => onToggleVisibility(comment.id)}
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
                onDelete={onDelete}
                onSetMenuOpen={onSetMenuOpen}
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

          <ReactionPills
            currentUserId={currentUserId}
            reactions={comment.reactions ?? []}
            usersById={usersById}
            onToggleReaction={(emoji) => onToggleReaction(comment.id, emoji)}
          />
          <div className="comment-secondary-actions">
            <QuickReactionActions
              commentId={comment.id}
              currentUserId={currentUserId}
              reactions={comment.reactions ?? []}
              onToggleReaction={onToggleReaction}
            />
            {comment.replies.length === 0 && !isReplying ? (
              <button className="comment-reply-button label-xs-semibold" type="button" onClick={() => onOpenReply(comment.id)}>
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
                    <span className="created-ago label-xs">{reply.createdAgo}</span>
                  </div>
                  <p className="reply-copy label-s">{reply.body}</p>
                  <ReactionPills
                    currentUserId={currentUserId}
                    reactions={reply.reactions ?? []}
                    usersById={usersById}
                    onToggleReaction={(emoji) => onToggleReplyReaction(comment.id, reply.id, emoji)}
                  />
                  <div className="comment-secondary-actions">
                    <QuickReactionActions
                      commentId={reply.id}
                      currentUserId={currentUserId}
                      reactions={reply.reactions ?? []}
                      onToggleReaction={(replyId, emoji) => onToggleReplyReaction(comment.id, replyId, emoji)}
                    />
                    {reply.id === lastReplyId && !isReplying ? (
                      <button className="comment-reply-button label-xs-semibold" type="button" onClick={() => onOpenReply(comment.id)}>
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
        <div className={`thread-reply-area ${comment.replies.length > 0 ? "has-replies" : ""} is-replying`}>
          <InlineReplyComposer
            body={replyDraft}
            onBodyChange={(draft) => onSetReplyDraft(comment.id, draft)}
            onSubmit={() => onSubmitReply(comment.id)}
          />
        </div>
      ) : null}
    </article>
  );
}

function CommentComposer({
  anchor,
  body,
  canPostInternal,
  isPostingMenuOpen,
  visibility,
  onBodyChange,
  onSetVisibility,
  onSubmit,
  onTogglePostingMenu,
}: {
  anchor: ScriptCommentAnchor;
  body: string;
  canPostInternal: boolean;
  isPostingMenuOpen: boolean;
  visibility: CommentVisibility;
  onBodyChange: (body: string) => void;
  onSetVisibility: (visibility: CommentVisibility) => void;
  onSubmit: () => void;
  onTogglePostingMenu: () => void;
}) {
  const isInternal = visibility === "internal";
  const canSubmit = body.trim().length > 0;
  const submitWithKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && event.metaKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className={`comment-composer ${isInternal ? "internal" : ""}`} aria-label="Add comment">
      <div className="posting-menu-wrap">
        <button
          className="posting-toggle label-xs"
          type="button"
          disabled={!canPostInternal}
          onClick={canPostInternal ? onTogglePostingMenu : undefined}
        >
          {isInternal ? "Posting to Team" : "Posting to Client"} {canPostInternal ? <DsIcon name="caret-down" size={12} /> : null}
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
          placeholder={`Comment on ${formatAnchorLabel(anchor)}...`}
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
            <button type="button" data-tooltip="Mark up selection" aria-label="Mark up selection">
              <DsIcon name="pencil-simple" size={16} />
            </button>
          </div>
          <div className="composer-send">
            <span className="anchor-chip label-xs-semibold">
              @{formatAnchorLabel(anchor)}
            </span>
            <button
              className={`send-button ${isInternal ? "internal" : ""}`}
              type="button"
              disabled={!canSubmit}
              aria-label="Send comment"
              onClick={onSubmit}
            >
              <DsIcon name="paper-plane-tilt" size={17} />
            </button>
          </div>
        </div>
      </div>
      <p className="composer-hint label-xs">Cmd+Enter to send</p>
    </section>
  );
}

function AnchorChip({ anchor, onClick }: { anchor: ScriptCommentAnchor; onClick?: () => void }) {
  const copy = anchor.kind === "selection" && anchor.snippet ? `"${anchor.snippet}"` : anchor.label;

  if (onClick) {
    return (
      <button className="timecode-chip script-anchor-chip label-xs-semibold clickable" type="button" onClick={onClick}>
        {copy}
      </button>
    );
  }

  return <span className="timecode-chip script-anchor-chip label-xs-semibold">{copy}</span>;
}

function VisibilityToggle({
  canToggle,
  visibility,
  onToggle,
}: {
  canToggle: boolean;
  visibility: CommentVisibility;
  onToggle: () => void;
}) {
  const isInternal = visibility === "internal";

  return (
    <button
      className={`visibility-toggle label-xs-semibold ${isInternal ? "internal" : "external"}`}
      type="button"
      disabled={!canToggle}
      data-tooltip={canToggle ? (isInternal ? "Switch to Client" : "Switch to Team") : undefined}
      onClick={onToggle}
    >
      {isInternal ? "Team" : "Client"}
    </button>
  );
}

function CommentEditDeleteActions({
  comment,
  isMenuOpen,
  onDelete,
  onSetMenuOpen,
  onStartEdit,
}: {
  comment: ScriptComment;
  isMenuOpen: boolean;
  onDelete: (commentId: string) => void;
  onSetMenuOpen: (commentId: string | null) => void;
  onStartEdit: (comment: ScriptComment) => void;
}) {
  return (
    <span className="comment-row-menu-wrap">
      <button
        className="comment-action-icon row-menu-button"
        type="button"
        aria-label="Comment menu"
        aria-expanded={isMenuOpen}
        onClick={() => onSetMenuOpen(isMenuOpen ? null : comment.id)}
      >
        <DsIcon name="dots-three-vertical" size={16} />
      </button>
      {isMenuOpen ? (
        <span className="comment-row-menu">
          <button className="label-s" type="button" onClick={() => onStartEdit(comment)}>
            Edit
          </button>
          <button className="label-s" type="button" onClick={() => onDelete(comment.id)}>
            Delete
          </button>
        </span>
      ) : null}
    </span>
  );
}

function ReactionPills({
  currentUserId,
  reactions,
  usersById,
  onToggleReaction,
}: {
  currentUserId: string;
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
        const tooltip = `${reaction.label} by ${formatReactionUserNames(reaction.selectedBy, usersById)}`;

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
  currentUserId,
  reactions,
  onToggleReaction,
}: {
  commentId: string;
  currentUserId: string;
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
      <div className="resolve-modal" role="dialog" aria-modal="true" aria-labelledby="script-resolve-title">
        <h2 className="heading-3xs" id="script-resolve-title">
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
      <p className="label-s-semibold">No comments yet. Highlight a line to leave one.</p>
    </div>
  );
}

function getFilteredComments(comments: ScriptComment[], filter: CommentFilter) {
  if (filter === "unresolved") {
    return comments.filter((comment) => !comment.resolved);
  }

  if (filter === "internal" || filter === "external") {
    return comments.filter((comment) => comment.visibility === filter);
  }

  return comments;
}

function sortCommentsForRail(comments: ScriptComment[]) {
  const rowNumber = (comment: ScriptComment) => {
    const match = comment.anchor.label.match(/\d+/u);
    return match ? Number(match[0]) : 0;
  };

  return [...comments].sort((first, second) => {
    if (first.anchor.kind === "overall" && second.anchor.kind !== "overall") {
      return -1;
    }

    if (first.anchor.kind !== "overall" && second.anchor.kind === "overall") {
      return 1;
    }

    return rowNumber(first) - rowNumber(second);
  });
}

function shouldIgnoreCommentSelection(event: MouseEvent<HTMLElement>) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("button, a, input, textarea, select, [role='button']"));
}

function getUser(usersById: Map<string, User>, id: string) {
  const user = usersById.get(id);

  if (!user) {
    throw new Error(`Missing comment user: ${id}`);
  }

  return user;
}

function formatReactionUserNames(userIds: string[], usersById: Map<string, User>) {
  return userIds.map((userId) => getUser(usersById, userId).name).join(", ");
}

function formatAnchorLabel(anchor: ScriptCommentAnchor) {
  if (anchor.kind === "selection" && anchor.snippet) {
    return `"${anchor.snippet}"`;
  }

  return anchor.label;
}

function toggleReactionInList(reactions: Reaction[] | undefined, emoji: ReactionEmoji, currentUserId: string) {
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

  if (selectedBy.length === 0) {
    return reactionList.filter((item) => item.emoji !== emoji);
  }

  reactionList[reactionIndex] = {
    ...reaction,
    selectedBy,
  };

  return reactionList;
}
