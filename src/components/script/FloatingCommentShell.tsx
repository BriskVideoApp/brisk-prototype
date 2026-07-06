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
import type { CommentVisibility, Reaction, User } from "@/components/video-review/types";
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
            <CompactCommentThread comment={comment} key={comment.id} usersById={usersById} />
          ))}
        </div>
      ) : null}

      <section className={`comment-composer floating-comment-composer ${visibility === "internal" ? "internal" : ""}`} aria-label="Add comment">
        <div className="posting-menu-wrap">
          <button
            className="posting-toggle label-xs"
            type="button"
            disabled={!canPostInternal}
            onClick={canPostInternal ? () => setIsPostingMenuOpen((isOpen) => !isOpen) : undefined}
          >
            {visibility === "internal" ? "Posting as Team" : "Posting as Client"}{" "}
            {canPostInternal ? <DsIcon name="caret-down" size={12} /> : null}
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
                Posting as Client
              </button>
              <button
                className="label-s"
                type="button"
                onClick={() => {
                  setVisibility("internal");
                  setIsPostingMenuOpen(false);
                }}
              >
                Posting as Team
              </button>
            </div>
          ) : null}
        </div>
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

function CompactCommentThread({ comment, usersById }: { comment: ScriptComment; usersById: Map<string, User> }) {
  const author = getUser(usersById, comment.authorId);

  return (
    <article className={`floating-comment-thread ${comment.visibility} ${comment.resolved ? "resolved" : ""}`}>
      <div className="floating-comment-row">
        <Avatar user={author} />
        <div className="floating-comment-body">
          <div className="floating-comment-meta">
            <span className="author-name-row">
              <span className="label-xs-semibold">{author.name}</span>
              <span className="created-ago label-xs">{comment.createdAgo}</span>
            </span>
            <span className="anchor-meta-row">
              <span className="timecode-chip script-anchor-chip label-xs-semibold">
                {formatAnchorLabel(comment.anchor)}
              </span>
              <span className={`visibility-toggle label-xs-semibold ${comment.visibility}`}>
                {comment.visibility === "internal" ? "Team" : "Client"}
              </span>
            </span>
          </div>
          <p className="comment-copy paragraph-s">{comment.body}</p>
          <ReactionPills reactions={comment.reactions ?? []} usersById={usersById} />
          {comment.replies.length > 0 ? (
            <div className="floating-comment-replies">
              {comment.replies.map((reply) => {
                const replyAuthor = getUser(usersById, reply.authorId);

                return (
                  <div className="floating-comment-reply" key={reply.id}>
                    <Avatar compact user={replyAuthor} />
                    <div>
                      <p className="label-xs-semibold">
                        {replyAuthor.name} <span className="created-ago label-xs">{reply.createdAgo}</span>
                      </p>
                      <p className="label-s">{reply.body}</p>
                    </div>
                  </div>
                );
              })}
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

function ReactionPills({ reactions, usersById }: { reactions: Reaction[]; usersById: Map<string, User> }) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="reaction-row" aria-label="Comment reactions">
      {reactions.map((reaction) => (
        <span className="reaction-pill label-xs-semibold" key={reaction.emoji} data-tooltip={formatReactionUserNames(reaction.selectedBy, usersById)}>
          <span>{reaction.emoji}</span>
          {reaction.selectedBy.length}
        </span>
      ))}
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

function formatReactionUserNames(userIds: string[], usersById: Map<string, User>) {
  return userIds.map((userId) => getUser(usersById, userId).name).join(", ");
}

function formatAnchorLabel(anchor: ScriptCommentAnchor) {
  if (anchor.kind === "selection" && anchor.snippet) {
    return `"${anchor.snippet}"`;
  }

  return anchor.label;
}
