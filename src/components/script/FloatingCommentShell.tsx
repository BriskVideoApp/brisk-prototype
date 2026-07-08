"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { CommentVisibility, Reaction, ReactionEmoji, User } from "@/components/video-review/types";
import type { ScriptComment, ScriptCommentAnchor } from "@/data/script";

type FloatingCommentPosition = {
  left: number;
  top: number;
};

type FloatingCommentShellProps = {
  anchor: ScriptCommentAnchor;
  canPostInternal: boolean;
  comments: ScriptComment[];
  currentUserId: string;
  position: FloatingCommentPosition;
  users: User[];
  onCommentsChange: (comments: ScriptComment[]) => void;
  onDismiss: () => void;
};

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

export function FloatingCommentShell({
  anchor,
  canPostInternal,
  comments,
  currentUserId,
  position,
  users,
  onCommentsChange,
  onDismiss,
}: FloatingCommentShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("external");
  const [isPostingMenuOpen, setIsPostingMenuOpen] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [anchor]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!shellRef.current?.contains(target)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const submitComment = () => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    const newComment: ScriptComment = {
      id: `script-comment-${Date.now()}`,
      authorId: currentUserId,
      visibility,
      anchor,
      createdAgo: "Just now",
      body: trimmedBody,
      resolved: false,
      replies: [],
    };

    onCommentsChange([...comments, newComment]);
    setBody("");
  };

  const submitReply = (commentId: string) => {
    const trimmedReply = replyDraft.trim();

    if (!trimmedReply) {
      return;
    }

    onCommentsChange(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: `script-reply-${Date.now()}`,
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

  const toggleCommentReaction = (commentId: string, emoji: ReactionEmoji) => {
    onCommentsChange(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              reactions: toggleReactionInList(comment.reactions, emoji, currentUserId),
            }
          : comment,
      ),
    );
  };

  const toggleReplyReaction = (commentId: string, replyId: string, emoji: ReactionEmoji) => {
    onCommentsChange(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === replyId
                  ? {
                      ...reply,
                      reactions: toggleReactionInList(reply.reactions, emoji, currentUserId),
                    }
                  : reply,
              ),
            }
          : comment,
      ),
    );
  };

  const openReply = (commentId: string) => {
    setReplyingCommentId(commentId);
    setReplyDraft("");
    setEditingCommentId(null);
  };

  const toggleResolved = (commentId: string) => {
    onCommentsChange(comments.map((comment) => (comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment)));
  };

  const deleteComment = (commentId: string) => {
    onCommentsChange(comments.filter((comment) => comment.id !== commentId));
    setOpenCommentMenuId(null);
    setEditingCommentId((currentId) => (currentId === commentId ? null : currentId));
    setReplyingCommentId((currentId) => (currentId === commentId ? null : currentId));
  };

  const startEdit = (comment: ScriptComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setOpenCommentMenuId(null);
    setReplyingCommentId(null);
  };

  const saveEdit = (commentId: string) => {
    const trimmedBody = editDraft.trim();

    if (!trimmedBody) {
      return;
    }

    onCommentsChange(comments.map((comment) => (comment.id === commentId ? { ...comment, body: trimmedBody } : comment)));
    setEditingCommentId(null);
    setEditDraft("");
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditDraft("");
  };

  return (
    <div
      className="floating-comment-shell"
      ref={shellRef}
      role="dialog"
      aria-label={`Comments for ${formatAnchorLabel(anchor)}`}
      style={{ "--floating-comment-left": `${position.left}px`, "--floating-comment-top": `${position.top}px` } as CSSProperties}
    >
      {comments.length > 0 ? (
        <div className="floating-comment-thread-list" aria-label="Row comments">
          {comments.map((comment) => (
            <CompactCommentThread
              canPostInternal={canPostInternal}
              comment={comment}
              currentUserId={currentUserId}
              editDraft={editDraft}
              isEditing={editingCommentId === comment.id}
              isMenuOpen={openCommentMenuId === comment.id}
              isReplying={replyingCommentId === comment.id}
              key={comment.id}
              replyDraft={replyDraft}
              usersById={usersById}
              onCancelEdit={cancelEdit}
              onDeleteComment={deleteComment}
              onEditDraftChange={setEditDraft}
              onOpenReply={openReply}
              onReplyDraftChange={setReplyDraft}
              onSaveEdit={saveEdit}
              onSetOpenCommentMenu={setOpenCommentMenuId}
              onStartEdit={startEdit}
              onSubmitReply={submitReply}
              onToggleResolved={toggleResolved}
              onToggleReaction={toggleCommentReaction}
              onToggleReplyReaction={toggleReplyReaction}
            />
          ))}
        </div>
      ) : null}

      <section className={`comment-composer floating-comment-composer ${visibility === "internal" ? "internal" : ""}`} aria-label="Add comment">
        {canPostInternal ? (
          <div className="posting-menu-wrap">
            <button
              className="posting-toggle label-xs"
              type="button"
              onClick={() => setIsPostingMenuOpen((isOpen) => !isOpen)}
            >
              {visibility === "internal" ? "Post to team" : "Post to everyone"} <DsIcon name="caret-down" size={12} />
            </button>
            {isPostingMenuOpen ? (
              <div className="posting-menu">
                <button
                  className="label-s"
                  type="button"
                  onClick={() => {
                    setVisibility("external");
                    setIsPostingMenuOpen(false);
                  }}
                >
                  Post to everyone
                </button>
                <button
                  className="label-s"
                  type="button"
                  onClick={() => {
                    setVisibility("internal");
                    setIsPostingMenuOpen(false);
                  }}
                >
                  Post to team
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={`composer-box ${visibility === "internal" ? "internal" : ""}`}>
          <textarea
            className="composer-input label-s"
            placeholder={`Comment on ${formatAnchorLabel(anchor)}...`}
            ref={inputRef}
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => submitWithKeyboard(event, submitComment)}
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <button type="button" data-tooltip="Attach file" aria-label="Attach file">
                <DsIcon name="paperclip" size={16} />
              </button>
              <button type="button" data-tooltip="Record your screen and voice" aria-label="Record your screen and voice">
                <DsIcon name="video-camera" size={16} />
              </button>
            </div>
            <div className="composer-send">
              <span className="anchor-chip label-xs-semibold">@{formatAnchorLabel(anchor)}</span>
              <button
                className={`send-button ${visibility === "internal" ? "internal" : ""}`}
                type="button"
                disabled={!body.trim()}
                aria-label="Send comment"
                onClick={submitComment}
              >
                <DsIcon name="paper-plane-tilt" size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CompactCommentThread({
  canPostInternal,
  comment,
  currentUserId,
  editDraft,
  isEditing,
  isMenuOpen,
  isReplying,
  replyDraft,
  usersById,
  onCancelEdit,
  onDeleteComment,
  onEditDraftChange,
  onOpenReply,
  onReplyDraftChange,
  onSaveEdit,
  onSetOpenCommentMenu,
  onStartEdit,
  onSubmitReply,
  onToggleResolved,
  onToggleReaction,
  onToggleReplyReaction,
}: {
  canPostInternal: boolean;
  comment: ScriptComment;
  currentUserId: string;
  editDraft: string;
  isEditing: boolean;
  isMenuOpen: boolean;
  isReplying: boolean;
  replyDraft: string;
  usersById: Map<string, User>;
  onCancelEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  onEditDraftChange: (body: string) => void;
  onOpenReply: (commentId: string) => void;
  onReplyDraftChange: (body: string) => void;
  onSaveEdit: (commentId: string) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onStartEdit: (comment: ScriptComment) => void;
  onSubmitReply: (commentId: string) => void;
  onToggleResolved: (commentId: string) => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
  onToggleReplyReaction: (commentId: string, replyId: string, emoji: ReactionEmoji) => void;
}) {
  const author = getUser(usersById, comment.authorId);
  const lastReplyId = comment.replies.at(-1)?.id;

  return (
    <article className={`floating-comment-thread ${comment.visibility} ${comment.resolved ? "resolved" : ""}`}>
      <div className="floating-comment-row">
        <Avatar user={author} />
        <div className="floating-comment-body">
          <div className="floating-comment-meta">
            <div className="floating-comment-meta-top">
              <span className="author-name-row">
                <span className="label-xs-semibold">{author.name}</span>
                <span className="created-ago label-xs">{comment.createdAgo}</span>
              </span>
            </div>
            <span className="anchor-meta-row">
              <span className="timecode-chip script-anchor-chip label-xs-semibold">
                {formatAnchorLabel(comment.anchor)}
              </span>
              {canPostInternal ? (
                <span className={`visibility-toggle label-xs-semibold ${comment.visibility}`}>
                  {comment.visibility === "internal" ? "Team" : "Everyone"}
                </span>
              ) : null}
            </span>
            {canPostInternal ? (
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
            ) : null}
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
              currentUserId={currentUserId}
              itemId={comment.id}
              reactions={comment.reactions ?? []}
              onToggleReaction={onToggleReaction}
            />
            {comment.replies.length === 0 && !isReplying ? (
              <button className="comment-reply-button label-xs-semibold" type="button" aria-label="Reply" onClick={() => onOpenReply(comment.id)}>
                Reply
              </button>
            ) : null}
          </div>
          {comment.replies.length > 0 ? (
            <div className="reply-list floating-comment-replies">
              {comment.replies.map((reply) => {
                const replyAuthor = getUser(usersById, reply.authorId);

                return (
                  <div className="reply-row floating-comment-reply" key={reply.id}>
                    <span className="reply-corner" aria-hidden="true">
                      <DsIcon name="caret-right" size={12} />
                    </span>
                    <Avatar compact user={replyAuthor} />
                    <div className="reply-message">
                      <p className="reply-meta label-xs-semibold">
                        {replyAuthor.name} <span className="created-ago label-xs">{reply.createdAgo}</span>
                      </p>
                      <p className="reply-copy label-s">{reply.body}</p>
                      <ReactionPills
                        currentUserId={currentUserId}
                        reactions={reply.reactions ?? []}
                        usersById={usersById}
                        onToggleReaction={(emoji) => onToggleReplyReaction(comment.id, reply.id, emoji)}
                      />
                      <div className="comment-secondary-actions">
                        <QuickReactionActions
                          currentUserId={currentUserId}
                          itemId={reply.id}
                          reactions={reply.reactions ?? []}
                          onToggleReaction={(replyId, emoji) => onToggleReplyReaction(comment.id, replyId, emoji)}
                        />
                        {reply.id === lastReplyId && !isReplying ? (
                          <button className="comment-reply-button label-xs-semibold" type="button" aria-label="Reply" onClick={() => onOpenReply(comment.id)}>
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
              <InlineReplyComposer body={replyDraft} onBodyChange={onReplyDraftChange} onSubmit={() => onSubmitReply(comment.id)} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Avatar({ compact = false, user }: { compact?: boolean; user: User }) {
  return (
    <span className={`avatar ${user.avatarTone} ${compact ? "compact" : ""}`} aria-label={user.name}>
      {user.initials}
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

function CommentEditDeleteActions({
  comment,
  isMenuOpen,
  onDeleteComment,
  onSetOpenCommentMenu,
  onStartEdit,
}: {
  comment: ScriptComment;
  isMenuOpen: boolean;
  onDeleteComment: (commentId: string) => void;
  onSetOpenCommentMenu: (commentId: string | null) => void;
  onStartEdit: (comment: ScriptComment) => void;
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

function QuickReactionActions({
  currentUserId,
  itemId,
  reactions,
  onToggleReaction,
}: {
  currentUserId: string;
  itemId: string;
  reactions: Reaction[];
  onToggleReaction: (itemId: string, emoji: ReactionEmoji) => void;
}) {
  return (
    <span className="quick-reaction-actions" aria-label="Quick reactions">
      {quickReactionOptions.map((reaction) => {
        const isSelected = reactions.find((item) => item.emoji === reaction.emoji)?.selectedBy.includes(currentUserId);

        return (
          <button
            className={`comment-action-icon quick-reaction-button label-xs ${isSelected ? "selected" : ""}`}
            key={reaction.emoji}
            type="button"
            aria-label={reaction.label}
            onClick={() => onToggleReaction(itemId, reaction.emoji)}
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
            const isSelected = reactions.find((item) => item.emoji === reaction.emoji)?.selectedBy.includes(currentUserId);

            return (
              <button
                className={`reaction-library-option label-s ${isSelected ? "selected" : ""}`}
                key={reaction.emoji}
                type="button"
                aria-label={reaction.label}
                onClick={() => onToggleReaction(itemId, reaction.emoji)}
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

function submitWithKeyboard(event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (event.key === "Enter" && event.metaKey) {
    event.preventDefault();
    submit();
  }
}

function getUser(usersById: Map<string, User>, id: string) {
  const user = usersById.get(id);

  if (!user) {
    throw new Error(`Missing comment user: ${id}`);
  }

  return user;
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

  return selectedBy.length > 0
    ? reactionList.map((item, index) => (index === reactionIndex ? { ...item, selectedBy } : item))
    : reactionList.filter((item) => item.emoji !== emoji);
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
