import { describe, expect, it } from "vitest";
import { mergeChatState, type StoredChatState } from "@/components/chat/chat-persistence";
import {
  chatMessages,
  chatProjects,
  directConversations,
  directMessages,
  groupConversations,
  groupMessages,
} from "@/data/chat";

function fixture(): StoredChatState {
  return structuredClone({
    projects: chatProjects,
    messages: [...chatMessages, ...directMessages, ...groupMessages],
    dmConversations: directConversations,
    groupConversations,
  });
}

describe("Chat persistence across open views", () => {
  it("keeps project and DM read changes made in separate views", () => {
    const base = fixture();
    const first = fixture();
    first.projects.find((project) => project.id === "hims-product-education")!.externalUnread = 0;
    first.projects.find((project) => project.id === "hims-product-education")!.internalUnread = 0;
    first.messages.find((message) => message.id === "message-hims-001")!.readBy.push("user-tom");

    const second = fixture();
    second.dmConversations.find((conversation) => conversation.id === "dm-david")!.unread = 0;

    const merged = mergeChatState(base, second, first);
    expect(merged.projects.find((project) => project.id === "hims-product-education")?.internalUnread).toBe(0);
    expect(merged.messages.find((message) => message.id === "message-hims-001")?.readBy).toContain("user-tom");
    expect(merged.dmConversations.find((conversation) => conversation.id === "dm-david")?.unread).toBe(0);
  });

  it("preserves an explicit Mark unread action alongside another view's changes", () => {
    const base = fixture();
    base.projects.find((project) => project.id === "hims-product-education")!.internalUnread = 0;
    base.messages.find((message) => message.id === "message-hims-001")!.readBy.push("user-tom");

    const unread = structuredClone(base);
    unread.projects.find((project) => project.id === "hims-product-education")!.internalUnread = 1;
    unread.messages.find((message) => message.id === "message-hims-001")!.readBy = ["user-priya"];

    const latest = structuredClone(base);
    latest.dmConversations.find((conversation) => conversation.id === "dm-david")!.unread = 0;

    const merged = mergeChatState(base, unread, latest);
    expect(merged.projects.find((project) => project.id === "hims-product-education")?.internalUnread).toBe(1);
    expect(merged.messages.find((message) => message.id === "message-hims-001")?.readBy).not.toContain("user-tom");
    expect(merged.dmConversations.find((conversation) => conversation.id === "dm-david")?.unread).toBe(0);
  });
});
