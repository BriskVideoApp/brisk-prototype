import type { ChatMessage, ChatProject, ConversationPreview } from "@/components/chat/types";

export type GlobalMessageView = "mentions" | "threads";

export function getConversationUnreadCount(messages: readonly ChatMessage[], conversationId: string, userId: string): number {
  return messages.filter((message) => message.projectId === conversationId
    && !message.deletedAt && message.senderId !== userId && !message.readBy.includes(userId)).length;
}

export function getProjectUnreadCount(messages: readonly ChatMessage[], projectId: string, userId: string,
  channel: "external" | "internal"): number {
  return messages.filter((message) => message.projectId === projectId && message.channel === channel
    && !message.deletedAt && message.senderId !== userId && !message.readBy.includes(userId)).length;
}

export function getGlobalViewMessages(
  view: GlobalMessageView,
  messages: readonly ChatMessage[],
  projects: readonly ChatProject[],
  userId: string,
  customerContext: boolean,
): ChatMessage[] {
  const projectIds = new Set(projects.map((project) => project.id));
  const scoped = messages.filter((message) => projectIds.has(message.projectId)
    && (!customerContext || message.channel === "external") && !message.deletedAt);
  if (view === "mentions") return scoped.filter((message) => message.threadId === null && message.mentions.includes(userId));
  const parentIds = new Set(scoped.filter((message) => message.threadId !== null).map((message) => message.threadId));
  return scoped.filter((message) => message.threadId === null && parentIds.has(message.id));
}

export function getGlobalUnreadCounts(
  messages: readonly ChatMessage[],
  projects: readonly ChatProject[],
  dms: readonly ConversationPreview[],
  groups: readonly ConversationPreview[],
  userId: string,
  customerContext: boolean,
) {
  const unreadInConversations = (conversations: readonly ConversationPreview[]) => conversations.reduce(
    (total, conversation) => total + getConversationUnreadCount(messages, conversation.id, userId), 0);
  const mentions = getGlobalViewMessages("mentions", messages, projects, userId, customerContext);
  const threads = getGlobalViewMessages("threads", messages, projects, userId, customerContext);
  return {
    dms: unreadInConversations(dms),
    groups: unreadInConversations(groups),
    mentions: mentions.filter((message) => message.senderId !== userId && !message.readBy.includes(userId)).length,
    threads: threads.filter((parent) => messages.some((reply) => reply.threadId === parent.id
      && reply.projectId === parent.projectId && (!customerContext || reply.channel === "external")
      && !reply.deletedAt && reply.senderId !== userId && !reply.readBy.includes(userId))).length,
    calls: 0,
  };
}
