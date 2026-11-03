"use client";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { usePathname } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { chatProjects } from "@/data/chat";
import { canViewProject, type PrototypeViewer } from "@/data/prototype-access";
import type { PrototypeState } from "@/data/prototype-state";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectTiming } from "@/components/project-timing/ProjectTimingContext";

export const openCustomerLatestActivityEventName = "brisk:open-customer-latest-activity";
export const openCustomerGlobalChatEventName = "brisk:open-customer-global-chat";

export function GlobalHeaderActions() {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { messages: timingMessages } = useProjectTiming();
  const usesCustomerDashboardDrawers = selectedRole !== "Studio Freelancer" && pathname === "/customer-dashboard";
  const isScenarioEmpty = activeScenario?.state === "new";
  const timingUnreadCount = viewer ? timingMessages.filter((message) => !message.readBy.includes(viewer.chatUserId)).length : 0;
  const chatUnreadCount = isScenarioEmpty ? 0 : getChatUnreadCount(viewer, state) + timingUnreadCount;

  const openCustomerChat = () => {
    window.dispatchEvent(new Event(openCustomerGlobalChatEventName));
  };

  const chatControl = (
    <Button
      className="app-global-chat-button"
      size="S"
      variant="ghost"
      type="button"
      aria-label={`Open Chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
      onClick={usesCustomerDashboardDrawers ? openCustomerChat : () => window.dispatchEvent(new Event(openCustomerGlobalChatEventName))}
    >
      <DsIcon name="chats" size={20} />
      Chat
      <CommentCountBadge count={chatUnreadCount} label={`${chatUnreadCount} unread messages`} />
    </Button>
  );

  return (
    <nav className="app-global-header-actions" aria-label="Global actions">
      <GlobalSearch />
      {chatControl}
      <NotificationBell />
    </nav>
  );
}

function getChatUnreadCount(viewer: PrototypeViewer | null, state: PrototypeState) {
  return chatProjects
    .filter((project) => {
      const scoped = state.projects.find((candidate) => candidate.id === project.id);
      return Boolean(scoped && canViewProject(viewer, scoped, state));
    })
    .reduce(
      (total, project) => total + project.externalUnread + (viewer?.role === "Customer" ? 0 : project.internalUnread),
      0,
    );
}
