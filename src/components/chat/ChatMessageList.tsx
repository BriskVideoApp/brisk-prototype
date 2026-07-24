"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import {
  CommentAvatar,
  CommentReactionPill,
  MentionChip,
} from "@/components/comments/CommentPrimitives";
import { getMessageSourceDirection, SourceLogo } from "@/components/chat/SourceLogo";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  ChatProject,
  ChatUser,
} from "@/components/chat/types";
import {
  formatMessageTime,
  formatMessageDate,
  formatRelativeTime,
  groupMessagesByDate,
  isSameMessageRun,
} from "@/components/chat/chat-utils";
import type { ReactionEmoji } from "@/components/video-review/types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  allMessages: ChatMessage[];
  users: ChatUser[];
  project: ChatProject;
  channel: ChatChannel;
  surface?: ChatChannel | "direct";
  currentUserId: string;
  highlightedMessageId: string | null;
  onOpenThread: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: ReactionEmoji, label: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, body: string) => void;
  onFilesDropped: (files: File[]) => void;
  onNotify: (message: string) => void;
};

const reactionChoices: Array<{ emoji: ReactionEmoji; label: string }> = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Strong" },
  { emoji: "✅", label: "Approved" },
  { emoji: "👀", label: "Watching" },
  { emoji: "👏", label: "Applause" },
  { emoji: "🎉", label: "Party" },
  { emoji: "👍", label: "Like" },
];

const quickReactionChoices: Array<{ emoji: ReactionEmoji; label: string }> = [
  { emoji: "🔥", label: "Strong" },
  { emoji: "✅", label: "Approved" },
  { emoji: "❤️", label: "Love" },
];

export function ChatMessageList({
  messages,
  allMessages,
  users,
  project,
  channel,
  surface = channel,
  currentUserId,
  highlightedMessageId,
  onOpenThread,
  onToggleReaction,
  onDeleteMessage,
  onEditMessage,
  onFilesDropped,
  onNotify,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const messageDays = useMemo(() => groupMessagesByDate(messages), [messages]);

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (scrollElement && isAtBottom) {
      scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: "smooth" });
    }
  }, [isAtBottom, messages.length]);

  useEffect(() => {
    const target = highlightedMessageId
      ? document.getElementById(`chat-message-${highlightedMessageId}`)
      : null;

    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightedMessageId]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return (
    <div
      className={`chat-message-scroll ${surface} ${isDragging ? "dragging" : ""}`}
      ref={scrollRef}
      onScroll={(event) => {
        const element = event.currentTarget;
        setIsAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 64);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="chat-drop-overlay" aria-hidden="true">
          <DsIcon name="upload-simple" size={24} />
          <strong>Drop files to attach</strong>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className={`chat-empty-chat ${surface}`}>
          <span><DsIcon name="chat-circle" size={24} /></span>
          <h2>
            {surface === "direct"
              ? "No messages yet"
              : channel === "external"
                ? "No messages yet"
                : "No internal messages yet"}
          </h2>
          <p>
            {surface === "direct"
              ? "Send a private message to start the conversation."
              : channel === "external"
              ? `Say hello to your client - they’ll see this in ${project.preferredSource}.`
              : "Loop your team in here - clients will never see this."}
          </p>
        </div>
      ) : (
        <div className="chat-message-stack">
          {messageDays.map((day) => (
            <section className="chat-message-day" key={day.key}>
              <ChatDateDivider createdAt={day.messages[0].createdAt} />
              {day.messages.map((message, index) => {
                const previous = day.messages[index - 1];
                const replies = allMessages.filter((candidate) => candidate.threadId === message.id);

                return (
                  <ChatMessageCard
                    message={message}
                    usersById={usersById}
                    project={project}
                    currentUserId={currentUserId}
                    grouped={isSameMessageRun(previous, message)}
                    replies={replies}
                    highlighted={highlightedMessageId === message.id}
                    key={message.id}
                    onOpenThread={onOpenThread}
                    onToggleReaction={onToggleReaction}
                    onDeleteMessage={onDeleteMessage}
                    onEditMessage={onEditMessage}
                    onNotify={onNotify}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatDateDivider({ createdAt }: { createdAt: string }) {
  return (
    <div className="chat-date-divider" role="separator" aria-label={formatMessageDate(createdAt)}>
      <span className="chat-date-divider-line" aria-hidden="true" />
      <span className="chat-date-pill label-xs-semibold">
        {formatMessageDate(createdAt)}
        <DsIcon name="caret-down" size={12} />
      </span>
      <span className="chat-date-divider-line" aria-hidden="true" />
    </div>
  );
}

type ChatMessageCardProps = {
  message: ChatMessage;
  usersById: Map<string, ChatUser>;
  project: ChatProject;
  currentUserId: string;
  grouped?: boolean;
  replies?: ChatMessage[];
  highlighted?: boolean;
  threadContext?: boolean;
  parentContext?: boolean;
  onOpenThread?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: ReactionEmoji, label: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, body: string) => void;
  onNotify?: (message: string) => void;
};

export function ChatMessageCard({
  message,
  usersById,
  project,
  currentUserId,
  grouped = false,
  replies = [],
  highlighted = false,
  threadContext = false,
  parentContext = false,
  onOpenThread,
  onToggleReaction,
  onNotify,
}: ChatMessageCardProps) {
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const sender = message.senderId ? usersById.get(message.senderId) : undefined;

  const handleMessageActionKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }

    const actions = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-message-action]"),
    );

    if (actions.length === 0) {
      return;
    }

    event.preventDefault();
    const currentIndex = actions.indexOf(document.activeElement as HTMLButtonElement);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex === -1
      ? direction === 1 ? 0 : actions.length - 1
      : (currentIndex + direction + actions.length) % actions.length;
    actions[nextIndex]?.focus();
  };

  if (message.senderRole === "system") {
    const projectUpdate = message.projectUpdate ?? {
      kind: "neutral" as const,
      copy: stripEventEmoji(message.body),
    };

    if (projectUpdate.kind === "review") {
      return (
        <a
          className={`chat-project-update-card ${highlighted ? "highlighted" : ""}`}
          href={getProjectUpdateHref(project.id, projectUpdate.asset)}
          id={`chat-message-${message.id}`}
          aria-label={`${projectUpdate.ctaLabel}: ${projectUpdate.context}`}
        >
          <img src={projectUpdate.thumbnailUrl} alt="" />
          <span className="chat-project-update-copy">
            <strong className="label-s-semibold">{stripEventEmoji(projectUpdate.action)}</strong>
            <span>{stripEventEmoji(projectUpdate.context)}</span>
            <time className="label-xs" dateTime={message.createdAt} title={message.createdAt}>
              {formatRelativeTime(message.createdAt)}
            </time>
          </span>
          <span className="chat-project-update-cta label-s-semibold">
            {projectUpdate.ctaLabel}
          </span>
        </a>
      );
    }

    return (
      <article
        className={`chat-project-update-pill ${projectUpdate.kind} ${highlighted ? "highlighted" : ""}`}
        id={`chat-message-${message.id}`}
      >
        <span className="label-xs-semibold">{stripEventEmoji(projectUpdate.copy)}</span>
      </article>
    );
  }

  if (message.deletedAt) {
    return (
      <article className={`chat-message-row ${message.senderRole}`}>
        <div className="chat-deleted-message label-s">This message was deleted.</div>
      </article>
    );
  }

  return (
    <article
      className={`chat-message-row ${message.senderRole} ${grouped ? "grouped" : ""} ${
        threadContext ? "thread-context" : ""
      } ${parentContext ? "parent-context" : ""} ${highlighted ? "highlighted" : ""}`}
      id={`chat-message-${message.id}`}
      tabIndex={0}
      onKeyDown={handleMessageActionKeys}
    >
      <div className="chat-message-avatar" aria-hidden={grouped || !sender}>
        {!grouped && sender ? <CommentAvatar user={sender} /> : null}
      </div>

      <div className={`chat-message-content ${message.deepLinkStage ? "deep-linked" : ""}`}>
        {!grouped && sender ? (
          <div className="chat-message-sender">
            <span className="label-s-semibold">{sender.name}</span>
            <time
              className="label-xs"
              dateTime={message.createdAt}
              title={formatRelativeTime(message.createdAt)}
            >
              {formatMessageTime(message.createdAt)}
            </time>
            <SourceLogo
              source={message.sourceChannel}
              size={14}
              project={project}
              direction={getMessageSourceDirection(message)}
              senderName={sender.name}
            />
          </div>
        ) : null}

        <div className="chat-message-bubble-wrap">
        <div
          className={`chat-message-bubble paragraph-s ${
            message.deepLinkStage ? "linked-comment" : ""
          }`}
        >
          {message.deepLinkStage ? (
            <span className="chat-linked-comment-icon">
              <DsIcon name="chat-circle-text" size={24} />
            </span>
          ) : null}
          <div className={message.deepLinkStage ? "chat-linked-comment-body" : undefined}>
            <RichMessageBody message={message} usersById={usersById} />
            {message.attachments.map((attachment) => (
              <MessageAttachment key={attachment.id} attachment={attachment} />
            ))}
            {message.deepLinkStage ? (
              <button className="chat-deep-link label-xs-semibold" type="button">
                Open comment in {message.deepLinkStage}
              </button>
            ) : null}
          </div>
        </div>

        {!parentContext ? (
          <div className="chat-message-hover-actions" aria-label="Message actions">
            <span className="chat-quick-reaction-actions" aria-label="Quick reactions">
              {quickReactionChoices.map((reaction) => {
                const isSelected = message.reactions
                  .find((item) => item.emoji === reaction.emoji)
                  ?.selectedBy.includes(currentUserId);

                return (
                  <button
                    className={`chat-message-quick-reaction label-xs ${isSelected ? "selected" : ""}`}
                    type="button"
                    data-message-action
                    aria-label={reaction.label}
                    key={reaction.emoji}
                    onClick={() => onToggleReaction?.(message.id, reaction.emoji, reaction.label)}
                  >
                    {reaction.emoji}
                  </button>
                );
              })}
            </span>
            <div className="chat-hover-action-wrap">
              <button
                className="chat-message-icon-action chat-reaction-library-trigger"
                type="button"
                data-message-action
                aria-label="Find another reaction"
                aria-expanded={isReactionPickerOpen}
                onClick={() => setIsReactionPickerOpen((current) => !current)}
              >
                <DsIcon name="smiley" size={15} />
                <DsIcon name="plus" size={8} />
              </button>
              {isReactionPickerOpen ? (
                <div className="chat-message-reaction-picker" aria-label="Reaction library">
                  {reactionChoices.map((reaction) => (
                    <button
                      type="button"
                      key={reaction.emoji}
                      aria-label={reaction.label}
                      onClick={() => {
                        onToggleReaction?.(message.id, reaction.emoji, reaction.label);
                        setIsReactionPickerOpen(false);
                      }}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {!threadContext ? (
              <button
                className="chat-message-reply-action label-xs-semibold"
                type="button"
                data-message-action
                data-tooltip="Reply in thread"
                aria-label="Reply in thread"
                onClick={() => onOpenThread?.(message.id)}
              >
                Reply
              </button>
            ) : null}
            <button
              className="chat-message-icon-action"
              type="button"
              data-message-action
              data-tooltip="Forward"
              aria-label="Forward"
              onClick={() => onNotify?.("Message ready to forward")}
            >
              <DsIcon name="arrow-bend-up-right" size={15} />
            </button>
            <button
              className="chat-message-icon-action"
              type="button"
              data-message-action
              data-tooltip="Mark unread"
              aria-label="Mark unread"
              onClick={() => onNotify?.("Message marked as unread")}
            >
              <DsIcon name="envelope-simple" size={15} />
            </button>
          </div>
        ) : null}

        {message.editedAt ? <span className="chat-edited-label label-xs">Edited</span> : null}

        {message.reactions.length > 0 ? (
          <div className="reaction-row chat-reaction-row">
            {message.reactions.map((reaction) => (
              <CommentReactionPill
                key={reaction.emoji}
                reaction={reaction}
                selected={reaction.selectedBy.includes(currentUserId)}
                aria-label={reaction.label}
                onClick={() => onToggleReaction?.(message.id, reaction.emoji, reaction.label)}
              />
            ))}
          </div>
        ) : null}

        {replies.length > 0 && !threadContext ? (
          <button
            className="chat-thread-indicator"
            type="button"
            onClick={() => onOpenThread?.(message.id)}
          >
            <span className="chat-thread-avatars">
              {[...new Set(replies.map((reply) => reply.senderId))]
                .filter((id): id is string => Boolean(id))
                .slice(0, 3)
                .map((id) => {
                  const user = usersById.get(id);
                  return user ? <CommentAvatar key={id} user={user} compact /> : null;
                })}
            </span>
            <span className="label-xs-semibold">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <span className="label-xs">
              Last reply {formatRelativeTime(replies[replies.length - 1].createdAt)}
            </span>
            <DsIcon name="caret-right" size={12} />
          </button>
        ) : null}
      </div>
      </div>
    </article>
  );
}

function RichMessageBody({
  message,
  usersById,
}: {
  message: ChatMessage;
  usersById: Map<string, ChatUser>;
}) {
  let parts: ReactNode[] = [message.body];

  message.mentions.forEach((userId) => {
    const user = usersById.get(userId);

    if (!user) {
      return;
    }

    parts = parts.flatMap((part, partIndex) => {
      if (typeof part !== "string") {
        return [part];
      }

      return part.split(`@${user.name}`).flatMap((text, index, splitParts) => {
        const nodes: ReactNode[] = [text];

        if (index < splitParts.length - 1) {
          nodes.push(
            <MentionChip key={`${user.id}-${partIndex}-${index}`}>@{user.name}</MentionChip>,
          );
        }

        return nodes;
      });
    });
  });

  return (
    <p>
      {parts.map((part, index) =>
        typeof part === "string" ? <span key={`copy-${index}`}>{renderLinks(part)}</span> : part,
      )}
    </p>
  );
}

function renderLinks(copy: string) {
  const parts = copy.split(/(https?:\/\/[^\s]+)/gu);

  return parts.map((part, index) =>
    /^https?:\/\//u.test(part) ? (
      <a href={part} target="_blank" rel="noreferrer" key={`${part}-${index}`}>
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function MessageAttachment({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.type === "image") {
    return (
      <button className="chat-image-attachment" type="button" aria-label={`Open ${attachment.name}`}>
        {attachment.previewUrl ? (
          <img src={attachment.previewUrl} alt={attachment.name} />
        ) : (
          <span className="chat-image-placeholder">
            <DsIcon name="image-square" size={24} />
            <span className="label-xs-semibold">Edit frame 184</span>
          </span>
        )}
        <span className="chat-attachment-caption label-xs">
          {attachment.name} {attachment.size ? `· ${attachment.size}` : ""}
        </span>
      </button>
    );
  }

  if (attachment.type === "loom" || attachment.type === "video") {
    return (
      <a
        className="chat-video-attachment"
        href={attachment.url ?? "#"}
        target="_blank"
        rel="noreferrer"
      >
        <span className="chat-video-poster">
          <span className="chat-video-play"><DsIcon name="play" size={18} /></span>
          <span className="label-xs-semibold">Loom walkthrough</span>
        </span>
        <span>
          <strong className="label-s-semibold">{attachment.name}</strong>
          <small className="label-xs">Open embedded video</small>
        </span>
      </a>
    );
  }

  return (
    <a className="chat-file-attachment" href={attachment.url ?? "#"} download>
      <span><DsIcon name="file-text" size={20} /></span>
      <span>
        <strong className="label-s-semibold">{attachment.name}</strong>
        <small className="label-xs">{attachment.size ?? "Project file"}</small>
      </span>
      <DsIcon name="download-simple" size={16} />
    </a>
  );
}

function getProjectUpdateHref(projectId: string, asset: "Script" | "Edit" | "Masters") {
  if (asset === "Script") {
    return `/projects/${projectId}/script`;
  }

  if (asset === "Masters") {
    return `/projects/${projectId}/stages/masters`;
  }

  return "/review";
}

function stripEventEmoji(copy: string) {
  return copy
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
