"use client";

import { useMemo } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { ComposerSubmission } from "@/components/chat/ChatComposer";
import { ChatDateDivider, ChatMessageCard } from "@/components/chat/ChatMessageList";
import { groupMessagesByDate, isSameMessageRun } from "@/components/chat/chat-utils";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatMessage,
  ChatProject,
  ChatUser,
} from "@/components/chat/types";
import type { ReactionEmoji } from "@/components/video-review/types";

type ChatThreadPaneProps = {
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  project: ChatProject;
  users: ChatUser[];
  projects: ChatProject[];
  currentUserId: string;
  directContext?: boolean;
  customerContext?: boolean;
  onClose: () => void;
  onSend: (submission: ComposerSubmission) => void;
  onToggleReaction: (messageId: string, emoji: ReactionEmoji, label: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, body: string) => void;
  onNotify: (message: string) => void;
};

export function ChatThreadPane({
  parentMessage,
  replies,
  project,
  users,
  projects,
  currentUserId,
  directContext = false,
  customerContext = false,
  onClose,
  onSend,
  onToggleReaction,
  onDeleteMessage,
  onEditMessage,
  onNotify,
}: ChatThreadPaneProps) {
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const messageDays = useMemo(
    () => groupMessagesByDate([parentMessage, ...replies]),
    [parentMessage, replies],
  );

  return (
    <aside className="chat-thread-pane" aria-label="Message thread">
      <header className="chat-thread-header">
        <div>
          <h2>Thread</h2>
          <span className="label-xs">{project.code}</span>
        </div>
        <button className="chat-thread-close label-s-semibold" type="button" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
          Close
        </button>
      </header>

      <div className="chat-thread-content">
        {messageDays.map((day) => (
          <section className="chat-message-day" key={day.key}>
            <ChatDateDivider createdAt={day.messages[0].createdAt} />
            {day.messages.map((message) => {
              const isParent = message.id === parentMessage.id;
              const replyIndex = replies.findIndex((reply) => reply.id === message.id);
              const previousReply = replyIndex > 0 ? replies[replyIndex - 1] : undefined;

              return (
                <div className="chat-thread-message" key={message.id}>
                  <ChatMessageCard
                    message={message}
                    usersById={usersById}
                    project={project}
                    currentUserId={currentUserId}
                    grouped={!isParent && replyIndex > 0 && isSameMessageRun(previousReply, message)}
                    parentContext={isParent}
                    threadContext={!isParent}
                    onToggleReaction={onToggleReaction}
                    onDeleteMessage={onDeleteMessage}
                    onEditMessage={onEditMessage}
                    onNotify={onNotify}
                  />
                  {isParent ? (
                    <div className="chat-thread-divider">
                      <span className="label-xs-semibold">
                        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <ChatComposer
        compact
        project={project}
        channel={parentMessage.channel}
        lockedSource={parentMessage.channel === "external" ? parentMessage.sourceChannel : undefined}
        users={users}
        projects={projects}
        placeholder={
          directContext
            ? `Reply to ${project.title}`
            : customerContext
              ? "Reply to your production team"
              : undefined
        }
        onSend={onSend}
      />
    </aside>
  );
}
