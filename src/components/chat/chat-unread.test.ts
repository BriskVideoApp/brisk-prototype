import { describe, expect, it } from "vitest";
import { getConversationUnreadCount, getGlobalUnreadCounts, getGlobalViewMessages, getProjectUnreadCount } from "@/components/chat/chat-unread";
import type { ChatMessage, ConversationPreview } from "@/components/chat/types";
import { chatProjects, directConversations, directMessages } from "@/data/chat";

const userId = "user-jordan";
const project = chatProjects.find((candidate) => candidate.id === "deel-customer-story")!;
const otherProject = chatProjects.find((candidate) => candidate.id === "loom-launch-film")!;
const baseMessage = directMessages[0];
const message = (id: string, projectId: string, changes: Partial<ChatMessage> = {}): ChatMessage => ({
  ...baseMessage, id, projectId, senderId: "user-tom", readBy: ["user-tom"], mentions: [], ...changes,
});

describe("Chat unread counts", () => {
  it("shows no DM or group badges when the viewer has no conversations", () => {
    const visibleDms = directConversations.filter((conversation) => conversation.memberIds.includes(userId));
    const counts = getGlobalUnreadCounts(directMessages, [project], visibleDms, [], userId, false);
    expect(counts.dms).toBe(0);
    expect(counts.groups).toBe(0);
  });

  it("counts only visible, unread messages and matching global views", () => {
    const dm: ConversationPreview = { ...directConversations[0], id: "dm-jordan", memberIds: [userId, "user-tom"], unread: 9 };
    const messages = [
      message("dm", dm.id),
      message("own-dm", dm.id, { senderId: userId }),
      message("deleted-dm", dm.id, { deletedAt: "2026-09-28T09:00:00+10:00" }),
      message("mention", project.id, { mentions: [userId] }),
      message("hidden-mention", otherProject.id, { mentions: [userId] }),
      message("parent", project.id),
      message("reply", project.id, { threadId: "parent" }),
      message("hidden-parent", otherProject.id),
      message("hidden-reply", otherProject.id, { threadId: "hidden-parent" }),
    ];
    const counts = getGlobalUnreadCounts(messages, [project], [dm], [], userId, false);
    expect(counts).toMatchObject({ dms: 1, groups: 0, mentions: 1, threads: 1 });
    expect(getConversationUnreadCount(messages, dm.id, userId)).toBe(1);
    expect(getProjectUnreadCount(messages, project.id, userId, "internal")).toBe(3);
    expect(getGlobalViewMessages("mentions", messages, [project], userId, false).map((item) => item.id)).toEqual(["mention"]);
    expect(getGlobalViewMessages("threads", messages, [project], userId, false).map((item) => item.id)).toEqual(["parent"]);
    expect(getGlobalUnreadCounts(messages.map((item) => ({ ...item, readBy: [...item.readBy, userId] })),
      [project], [dm], [], userId, false)).toMatchObject({ dms: 0, mentions: 0, threads: 0 });
  });
});
