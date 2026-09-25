import type { ChatMessage, ChatProject, ConversationPreview } from "@/components/chat/types";

export type StoredChatState = {
  projects: ChatProject[];
  messages: ChatMessage[];
  dmConversations: ConversationPreview[];
  groupConversations: ConversationPreview[];
};

export function isStoredChatState(value: unknown): value is StoredChatState {
  if (!value || typeof value !== "object") return false;
  const chat = value as Partial<StoredChatState>;
  return Array.isArray(chat.projects) && Array.isArray(chat.messages)
    && Array.isArray(chat.dmConversations) && Array.isArray(chat.groupConversations);
}

function changedFields<T extends { id: string }>(base: T, current: T, latest: T, excluded: (keyof T)[]): T {
  return (Object.keys(current) as (keyof T)[]).reduce((result, field) => {
    if (excluded.includes(field) || JSON.stringify(current[field]) === JSON.stringify(base[field])) return result;
    return { ...result, [field]: current[field] };
  }, latest);
}

function mergeItems<T extends { id: string }>(base: T[], current: T[], latest: T[], merge: (baseItem: T, currentItem: T, latestItem: T) => T): T[] {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const currentById = new Map(current.map((item) => [item.id, item]));
  const latestById = new Map(latest.map((item) => [item.id, item]));
  return [
    ...latest.map((latestItem) => {
      const baseItem = baseById.get(latestItem.id);
      const currentItem = currentById.get(latestItem.id);
      return baseItem && currentItem ? merge(baseItem, currentItem, latestItem) : latestItem;
    }),
    ...current.filter((item) => !latestById.has(item.id) && !baseById.has(item.id)),
  ];
}

function applyCountChange(base: number, current: number, latest: number): number {
  return Math.max(0, latest + current - base);
}

function mergeReadBy(base: string[], current: string[], latest: string[]): string[] {
  const removed = new Set(base.filter((id) => !current.includes(id)));
  const added = current.filter((id) => !base.includes(id));
  return [...new Set([...latest.filter((id) => !removed.has(id)), ...added])];
}

export function mergeChatState(base: StoredChatState, current: StoredChatState, latest: StoredChatState): StoredChatState {
  return {
    projects: mergeItems(base.projects, current.projects, latest.projects, (before, now, saved) => ({
      ...changedFields(before, now, saved, ["externalUnread", "internalUnread"]),
      externalUnread: applyCountChange(before.externalUnread, now.externalUnread, saved.externalUnread),
      internalUnread: applyCountChange(before.internalUnread, now.internalUnread, saved.internalUnread),
    })),
    messages: mergeItems(base.messages, current.messages, latest.messages, (before, now, saved) => ({
      ...changedFields(before, now, saved, ["readBy"]),
      readBy: mergeReadBy(before.readBy, now.readBy, saved.readBy),
    })),
    dmConversations: mergeItems(base.dmConversations, current.dmConversations, latest.dmConversations, (before, now, saved) => ({
      ...changedFields(before, now, saved, ["unread"]),
      unread: applyCountChange(before.unread, now.unread, saved.unread),
    })),
    groupConversations: mergeItems(base.groupConversations, current.groupConversations, latest.groupConversations, (before, now, saved) => ({
      ...changedFields(before, now, saved, ["unread"]),
      unread: applyCountChange(before.unread, now.unread, saved.unread),
    })),
  };
}
