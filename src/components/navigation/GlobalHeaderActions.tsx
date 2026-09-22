"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useShootGlobalActions, type ShootGlobalActions } from "@/components/navigation/ShootGlobalActionsContext";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { DsIcon } from "@/components/video-review/DsIcon";
import { chatProjects } from "@/data/chat";
import { notificationInboxRecipientByRole } from "@/data/notification-inbox";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { canRoleSeeNavigationItem, getNavigationItem } from "@/components/navigation/navigationConfig";
import type { DsIconName } from "@/components/video-review/DsIcon";

export const openCustomerLatestActivityEventName = "brisk:open-customer-latest-activity";
export const openCustomerGlobalChatEventName = "brisk:open-customer-global-chat";
const recentPagesStorageKey = "brisk-recent-pages-v2";

type RecentPage = {
  href: string;
  label: string;
  icon: DsIconName;
};

export function GlobalHeaderActions() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedRole, allPages } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const { actions: shootActions } = useShootGlobalActions();
  const usesCustomerDashboardDrawers = selectedRole !== "Studio Freelancer" && pathname === "/customer-dashboard";
  const isScenarioEmpty = activeScenario?.state === "new";
  const chatUnreadCount = isScenarioEmpty ? 0 : getChatUnreadCount(selectedRole);

  const openCustomerChat = () => {
    window.dispatchEvent(new Event(openCustomerGlobalChatEventName));
  };

  const chatControl = usesCustomerDashboardDrawers ? (
    <button
      className="app-global-action-button"
      type="button"
      aria-label={`Open Chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
      data-tooltip="Chat"
      onClick={openCustomerChat}
    >
      <DsIcon name="chats" size={20} />
      <CommentCountBadge count={chatUnreadCount} label={`${chatUnreadCount} unread messages`} />
    </button>
  ) : (
    <Link
      className={`app-global-action-button ${pathname === "/chat" ? "is-active" : ""}`}
      href="/chat"
      aria-label={`Open Chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
      data-tooltip="Chat"
    >
      <DsIcon name="chats" size={20} />
      <CommentCountBadge count={chatUnreadCount} label={`${chatUnreadCount} unread messages`} />
    </Link>
  );

  return (
    <nav className="app-global-header-actions" aria-label="Global actions">
      {shootActions ? <ShootActionsMenu actions={shootActions} /> : null}
      <HistoryBackControl pathname={pathname} search={searchParams.toString()} role={selectedRole} allPages={allPages} />
      <button className="app-global-action-button app-global-history-forward" type="button" aria-label="Go forward" data-tooltip="Forward" onClick={() => window.history.forward()}>
        <DsIcon name="arrow-left" size={20} />
      </button>
      {chatControl}
      <NotificationBell />
    </nav>
  );
}

function HistoryBackControl({ pathname, search, role, allPages }: { pathname: string; search: string; role: PrototypeRole; allPages: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const controlRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const openedByPressRef = useRef(false);
  const menuId = useId();
  const currentHref = search ? `${pathname}?${search}` : pathname;
  const currentItem = getNavigationItem(pathname, search);

  useEffect(() => {
    if (!currentItem) return;
    const storedPages = readRecentPages();
    const currentPage: RecentPage = { href: currentHref, label: currentItem.label, icon: currentItem.icon };
    const nextPages = [currentPage, ...storedPages.filter((page) => page.href !== currentHref)].slice(0, 12);
    window.localStorage.setItem(recentPagesStorageKey, JSON.stringify(nextPages));
    setRecentPages(nextPages);
  }, [currentHref, currentItem]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
  }, []);

  const visibleRecentPages = recentPages.filter((page) => {
    if (page.href === currentHref) return false;
    const [recentPathname, recentSearch = ""] = page.href.split("?");
    const item = getNavigationItem(recentPathname, recentSearch);
    return Boolean(item && canRoleSeeNavigationItem(item, role, allPages));
  });

  const clearPress = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const startPress = () => {
    clearPress();
    openedByPressRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      openedByPressRef.current = true;
      setIsOpen(true);
    }, 500);
  };

  return (
    <div className="app-global-history-control" ref={controlRef}>
      <button
        className="app-global-action-button"
        type="button"
        aria-label="Go back"
        aria-controls={menuId}
        aria-expanded={isOpen}
        data-tooltip="Back - press and hold for history"
        onPointerDown={startPress}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onClick={() => {
          if (openedByPressRef.current) {
            openedByPressRef.current = false;
            return;
          }
          window.history.back();
        }}
      >
        <DsIcon name="arrow-left" size={20} />
      </button>
      {isOpen ? (
        <div className="app-global-history-menu" id={menuId} role="menu" aria-label="Recent pages">
          {visibleRecentPages.length ? visibleRecentPages.map((page) => (
            <Link href={page.href} key={page.href} role="menuitem" onClick={() => setIsOpen(false)}>
              <DsIcon name={page.icon} size={16} />
              <span>{page.label}</span>
            </Link>
          )) : <span className="label-s">No recent pages yet.</span>}
        </div>
      ) : null}
    </div>
  );
}

function readRecentPages(): RecentPage[] {
  try {
    const stored = window.localStorage.getItem(recentPagesStorageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentPage);
  } catch {
    return [];
  }
}

function isRecentPage(value: unknown): value is RecentPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Record<string, unknown>;
  return typeof page.href === "string" && typeof page.label === "string" && typeof page.icon === "string";
}

function ShootActionsMenu({ actions }: { actions: ShootGlobalActions }) {
  return <ShareActionRow
    context="shoot"
    userRole={actions.userRole}
    presentation="overflow"
    initialAccess={actions.initialAccess}
    initialLinkOpens="stageOnly"
    projectName={actions.projectName}
    studioName={actions.studioName}
    customerName={actions.customerName}
    shareUrl={actions.shareUrl}
    approveLabel="Approve Shoot"
    approveDisabled={!actions.canApprove}
    approveDisabledTooltip="Only Studio Staff or Clients can approve the Shoot"
    reviewDisabled={!actions.canEdit}
    reviewDisabledTooltip="You need edit access to request a review"
    isApproved={actions.isApproved}
    beforeAction={actions.beforeAction}
    onApprove={actions.onApprove}
    onRequestReview={actions.onRequestReview}
    onSendToStudio={actions.onSendToStudio}
    onUnapprove={actions.onUnapprove}
  />;
}

function getChatUnreadCount(role: PrototypeRole) {
  const recipientId = notificationInboxRecipientByRole[role];

  return chatProjects
    .filter((project) => project.memberIds.includes(recipientId))
    .reduce(
      (total, project) => total + project.externalUnread + (role === "Customer" ? 0 : project.internalUnread),
      0,
    );
}
