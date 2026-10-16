"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import type {
  CommentVisibility,
  Reaction,
  ReactionEmoji,
  ReviewComment,
  User,
} from "./types";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { DsIcon } from "./DsIcon";
import type { KeyboardEvent, MouseEvent } from "react";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { formatTime, hasTimecode, isOverallComment } from "@/components/video-review/review-utils";

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
              <Button size="S" variant="ghost"
                className="comment-reply-button"
                type="button"
                aria-label="Reply"
                onClick={() => onOpenReply(comment.id)}
              >
                Reply
              </Button>
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
                      <Button size="S" variant="ghost"
                        className="comment-reply-button"
                        type="button"
                        aria-label="Reply"
                        onClick={() => onOpenReply(comment.id)}
                      >
                        Reply
                      </Button>
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
        <Button size="S" variant="secondary" className="modal-cancel-button" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="S" variant="primary" className="modal-resolve-button" type="button" disabled={!body.trim()} onClick={onSave}>
          Save
        </Button>
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

function getReviewAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image-square" as const;
  if (mimeType.startsWith("audio/")) return "file-audio" as const;
  if (mimeType.startsWith("video/")) return "video-camera" as const;
  return "file-text" as const;
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
