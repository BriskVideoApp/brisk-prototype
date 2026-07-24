"use client";

import { useMemo, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { getMessageSourceDirection, SourceLogo } from "@/components/chat/SourceLogo";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ChatRailView } from "@/components/chat/ChatRail";
import type {
  ChatMessage,
  ChatProject,
  ChatUser,
  ConversationPreview,
} from "@/components/chat/types";
import { formatCompactDate } from "@/components/chat/chat-utils";

type ChatGlobalViewProps = {
  view: Exclude<ChatRailView, "projects" | "calls">;
  currentUserId: string;
  projects: ChatProject[];
  messages: ChatMessage[];
  users: ChatUser[];
  directConversations: ConversationPreview[];
  groupConversations: ConversationPreview[];
  customerContext?: boolean;
  onConversationSelect: (conversationId: string) => void;
  onGroupConversationSelect: (conversationId: string) => void;
  onMessageSelect: (message: ChatMessage, openThread?: boolean) => void;
};

export function ChatGlobalView({
  view,
  currentUserId,
  projects,
  messages,
  users,
  directConversations,
  groupConversations,
  customerContext = false,
  onConversationSelect,
  onGroupConversationSelect,
  onMessageSelect,
}: ChatGlobalViewProps) {
  const [query, setQuery] = useState("");
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const normalisedQuery = query.trim().toLowerCase();
  const scopedMessages = messages.filter(
    (message) =>
      projectsById.has(message.projectId) &&
      (!customerContext || message.channel === "external"),
  );

  if (view === "dms" || view === "groups") {
    const conversations = (view === "dms" ? directConversations : groupConversations).filter(
      (conversation) =>
        !normalisedQuery ||
        `${conversation.title} ${conversation.preview}`.toLowerCase().includes(normalisedQuery),
    );

    return (
      <section className="chat-global-page" aria-label={view === "dms" ? "Direct messages" : "Groups"}>
        <label className="chat-global-search">
          <DsIcon name="search" size={18} />
          <input
            value={query}
            placeholder={view === "dms" ? "Search direct messages" : "Search groups"}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="chat-conversation-list">
          {conversations.map((conversation) => {
            const sender = usersById.get(conversation.lastSenderId);

            return (
              <button
                className="chat-conversation-card"
                type="button"
                key={conversation.id}
                onClick={() => {
                  if (view === "dms") {
                    onConversationSelect(conversation.id);
                  } else {
                    onGroupConversationSelect(conversation.id);
                  }
                }}
              >
                <span className="chat-conversation-members">
                  {conversation.memberIds.slice(0, 4).map((memberId) => {
                    const member = usersById.get(memberId);
                    return member ? <CommentAvatar user={member} compact key={member.id} /> : null;
                  })}
                </span>
                <span className="chat-conversation-copy">
                  <strong>{conversation.title}</strong>
                  <span className="label-s">
                    <b>{sender?.name ?? "Team"}</b> {conversation.preview}
                  </span>
                </span>
                <time className="label-xs">{formatCompactDate(conversation.createdAt)}</time>
                {conversation.unread > 0 ? (
                  <span className="chat-count-badge light label-xs-semibold">{conversation.unread}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const visibleMessages =
    view === "mentions"
      ? scopedMessages.filter(
          (message) =>
            message.threadId === null &&
            message.mentions.includes(currentUserId) &&
            !message.deletedAt,
        )
      : scopedMessages.filter(
          (message) =>
            message.threadId === null &&
            scopedMessages.some((reply) => reply.threadId === message.id) &&
            !message.deletedAt,
        );
  const filteredMessages = visibleMessages.filter((message) => {
    const project = projectsById.get(message.projectId);
    return (
      !normalisedQuery ||
      `${message.body} ${project?.code ?? ""} ${project?.title ?? ""}`
        .toLowerCase()
        .includes(normalisedQuery)
    );
  });

  return (
    <section className="chat-global-page" aria-label={view === "mentions" ? "Mentions" : "Threads"}>
      <label className="chat-global-search">
        <DsIcon name="search" size={18} />
        <input
          value={query}
          placeholder={view === "mentions" ? "Search mentions" : "Search threads"}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="chat-global-message-list">
        {filteredMessages
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map((message) => {
            const project = projectsById.get(message.projectId);
            const sender = message.senderId ? usersById.get(message.senderId) : undefined;
            const replyCount = scopedMessages.filter((reply) => reply.threadId === message.id).length;

            if (!project) {
              return null;
            }

            return (
              <button
                className="chat-global-message-card"
                type="button"
                key={message.id}
                onClick={() => onMessageSelect(message, view === "threads")}
              >
                <span className="chat-global-message-project">
                  <span className="chat-project-card-icon"><DsIcon name="chat-circle" size={16} /></span>
                  <span>
                    <strong className="label-xs-semibold">{project.code}</strong>
                    <small className="label-xs">{project.title}</small>
                  </span>
                </span>
                <span className="chat-global-message-body">
                  {sender ? <CommentAvatar user={sender} compact /> : null}
                  <span>
                    <strong className="label-xs-semibold">
                      {sender?.name ?? message.senderSystem ?? "Brisk"}
                    </strong>
                    <small className="label-s">{message.body}</small>
                  </span>
                </span>
                <span className="chat-global-message-meta">
                  <SourceLogo
                    source={message.sourceChannel}
                    project={project}
                    direction={getMessageSourceDirection(message)}
                    senderName={sender?.name}
                    tooltipFocusable={false}
                  />
                  {replyCount > 0 ? <span className="label-xs-semibold">{replyCount} replies</span> : null}
                  <time className="label-xs">{formatCompactDate(message.createdAt)}</time>
                </span>
              </button>
            );
          })}
      </div>

      {filteredMessages.length === 0 ? (
        <div className="chat-empty-state compact">
          <span className="chat-empty-icon"><DsIcon name="check-circle" size={24} /></span>
          <h2>You’re all caught up</h2>
          <p>{view === "mentions" ? "Mentions will show here." : "Threads you join will show here."}</p>
        </div>
      ) : null}
    </section>
  );
}
