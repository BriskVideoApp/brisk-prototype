"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  formatAbsoluteNotificationTime,
  formatNotificationRelativeTime,
} from "@/components/notifications/NotificationInboxItem";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { NotificationSemanticState } from "@/components/notifications/types";
import { chatProjects } from "@/data/chat";
import { notificationInboxRecipientByRole } from "@/data/notification-inbox";
import { getVisibleActivityFeed } from "@/data/project-history";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

export const openCustomerLatestActivityEventName = "brisk:open-customer-latest-activity";
export const openCustomerGlobalChatEventName = "brisk:open-customer-global-chat";

export function GlobalHeaderActions() {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const activityPopoverId = useId();
  const activityControlRef = useRef<HTMLDivElement>(null);
  const usesCustomerDashboardDrawers = selectedRole !== "Studio Freelancer" && pathname === "/customer-dashboard";
  const isScenarioEmpty = activeScenario?.state === "new";
  const chatUnreadCount = isScenarioEmpty ? 0 : getChatUnreadCount(selectedRole);
  const activityEntries = useMemo(
    () => (isScenarioEmpty ? [] : getVisibleActivityFeed(selectedRole)).filter(
      (entry): entry is typeof entry & { href: string } => entry.href !== null,
    ).slice(0, 6),
    [isScenarioEmpty, selectedRole],
  );

  useEffect(() => {
    setIsActivityOpen(false);
  }, [pathname, selectedRole]);

  useEffect(() => {
    if (!isActivityOpen) return;

    const closeOutside = (event: MouseEvent) => {
      if (!activityControlRef.current?.contains(event.target as Node)) {
        setIsActivityOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsActivityOpen(false);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isActivityOpen]);

  const openLatestActivity = () => {
    if (usesCustomerDashboardDrawers) {
      window.dispatchEvent(new Event(openCustomerLatestActivityEventName));
      return;
    }

    setIsActivityOpen((current) => !current);
  };

  const openCustomerChat = () => {
    window.dispatchEvent(new Event(openCustomerGlobalChatEventName));
  };

  const chatControl = usesCustomerDashboardDrawers ? (
    <button
      className="app-global-action-button"
      type="button"
      aria-label={`Open Chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
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
    >
      <DsIcon name="chats" size={20} />
      <CommentCountBadge count={chatUnreadCount} label={`${chatUnreadCount} unread messages`} />
    </Link>
  );

  return (
    <nav className="app-global-header-actions" aria-label="Personal updates">
      <NotificationBell />
      <div className="app-global-activity-control" ref={activityControlRef}>
        <button
          className={`app-global-action-button ${isActivityOpen ? "is-active" : ""}`}
          type="button"
          aria-label="Open latest activity"
          aria-controls={usesCustomerDashboardDrawers ? undefined : activityPopoverId}
          aria-expanded={usesCustomerDashboardDrawers ? undefined : isActivityOpen}
          onClick={openLatestActivity}
        >
          <DsIcon name="clock-clockwise" size={20} />
        </button>

        {isActivityOpen ? (
          <section
            className="notification-popover app-global-activity-popover"
            id={activityPopoverId}
            aria-label="Latest activity"
          >
            <header className="notification-popover-header">
              <div>
                <h2 className="headings-xs-bold">Latest activity</h2>
                <span className="label-xs">Updates across your projects.</span>
              </div>
              <div className="notification-popover-actions">
                <button
                  className="notification-popover-close"
                  type="button"
                  aria-label="Close latest activity"
                  onClick={() => setIsActivityOpen(false)}
                >
                  <DsIcon name="x-close-cross" size={16} />
                </button>
              </div>
            </header>

            {activityEntries.length ? (
              <div className="notification-popover-list">
                {activityEntries.map((entry) => (
                  <article className="notification-inbox-item is-read is-compact" key={entry.id}>
                    <div className="notification-inbox-item-layout">
                      <span
                        className={`notification-inbox-item-icon is-${entry.state}`}
                        role="img"
                        aria-label={`Status: ${entry.label}`}
                      >
                        <DsIcon name={getActivityIcon(entry.state)} size={16} />
                      </span>
                      <Link
                        className="notification-inbox-item-main-link"
                        href={entry.href}
                        aria-label={`${entry.action}. ${entry.entityLabel}. ${formatAbsoluteNotificationTime(entry.occurredAt)}`}
                        onClick={() => setIsActivityOpen(false)}
                      >
                        <span className="notification-inbox-item-title-row">
                          <strong className="label-s-semibold">{entry.action}</strong>
                        </span>
                        <span className="notification-inbox-item-meta label-xs">{entry.entityLabel}</span>
                      </Link>
                      <time
                        className="notification-inbox-item-time label-xs"
                        dateTime={entry.occurredAt}
                        title={formatAbsoluteNotificationTime(entry.occurredAt)}
                      >
                        {formatNotificationRelativeTime(entry.occurredAt)}
                      </time>
                      <Link
                        className="notification-inbox-item-chevron"
                        href={entry.href}
                        aria-label={`Open ${entry.action}`}
                        onClick={() => setIsActivityOpen(false)}
                      >
                        <DsIcon name="caret-right" size={16} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="notification-popover-empty">
                <DsIcon name="clock-clockwise" size={24} />
                <strong className="label-s-semibold">No activity to show</strong>
                <span className="label-xs">Actions you can access will appear here.</span>
              </div>
            )}
          </section>
        ) : null}
      </div>
      {chatControl}
    </nav>
  );
}

function getActivityIcon(state: NotificationSemanticState): DsIconName {
  if (state === "success") return "check-circle";
  if (state === "warning" || state === "failure") return "alert-triangle";
  return "info";
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
