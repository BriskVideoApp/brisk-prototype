"use client";

import { usePathname } from "next/navigation";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useShootGlobalActions, type ShootGlobalActions } from "@/components/navigation/ShootGlobalActionsContext";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { DsIcon } from "@/components/video-review/DsIcon";
import { chatProjects } from "@/data/chat";
import { canViewProject, type PrototypeViewer } from "@/data/prototype-access";
import type { PrototypeState } from "@/data/prototype-state";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";

export const openCustomerLatestActivityEventName = "brisk:open-customer-latest-activity";
export const openCustomerGlobalChatEventName = "brisk:open-customer-global-chat";

export function GlobalHeaderActions() {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { actions: shootActions } = useShootGlobalActions();
  const usesCustomerDashboardDrawers = selectedRole !== "Studio Freelancer" && pathname === "/customer-dashboard";
  const isScenarioEmpty = activeScenario?.state === "new";
  const chatUnreadCount = isScenarioEmpty ? 0 : getChatUnreadCount(viewer, state);

  const openCustomerChat = () => {
    window.dispatchEvent(new Event(openCustomerGlobalChatEventName));
  };

  const chatControl = (
    <button
      className="app-global-action-button"
      type="button"
      aria-label={`Open Chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
      data-tooltip="Chat"
      onClick={usesCustomerDashboardDrawers ? openCustomerChat : () => window.dispatchEvent(new Event(openCustomerGlobalChatEventName))}
    >
      <DsIcon name="chats" size={20} />
      <CommentCountBadge count={chatUnreadCount} label={`${chatUnreadCount} unread messages`} />
    </button>
  );

  return (
    <nav className="app-global-header-actions" aria-label="Global actions">
      {shootActions ? <ShootActionsMenu actions={shootActions} /> : null}
      <div className="app-global-brief-actions-slot" data-brief-global-actions-slot />
      {chatControl}
      <NotificationBell />
    </nav>
  );
}

function ShootActionsMenu({ actions }: { actions: ShootGlobalActions }) {
  return <ShareActionRow
    context="shoot"
    userRole={actions.userRole}
    presentation="overflow"
    allowProjectScope
    initialAccess={actions.initialAccess}
    initialLinkOpens="stageOnly"
    projectId={actions.projectId}
    projectName={actions.projectName}
    reviewScopeKey="shoot"
    reviewFingerprint={actions.reviewFingerprint}
    studioName={actions.studioName}
    customerName={actions.customerName}
    shareUrl={actions.shareUrl}
    sendLabel={`Ask ${actions.userRole === "Customer" || actions.userRole === "Studio Freelancer" ? actions.studioName : actions.customerName} to review the Shoot`}
    approveLabel="Approve Shoot"
    approveDisabled={!actions.canApprove}
    approveDisabledTooltip="Only Studio Staff or Clients can approve the Shoot"
    sendDisabled={!actions.canEdit}
    sendDisabledTooltip="You need edit access to send the Shoot"
    isApproved={actions.isApproved}
    isWaitingOnReview={actions.isWaitingOnReview}
    waitingOnCompany={actions.waitingOnCompany}
    beforeAction={actions.beforeAction}
    onApprove={actions.onApprove}
    onRequestReview={actions.onRequestReview}
    onSendToStudio={actions.onSendToStudio}
    onUnapprove={actions.onUnapprove}
  />;
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
