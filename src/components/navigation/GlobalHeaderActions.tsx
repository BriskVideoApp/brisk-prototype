"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationSemanticState } from "@/components/notifications/NotificationSemanticState";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { chatProjects } from "@/data/chat";
import { notificationInboxRecipientByRole } from "@/data/notification-inbox";
import { getVisibleActivityFeed } from "@/data/project-history";

export const openCustomerLatestActivityEventName = "brisk:open-customer-latest-activity";
export const openCustomerGlobalChatEventName = "brisk:open-customer-global-chat";

const activityDateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Sydney",
});

export function GlobalHeaderActions() {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const activityPopoverId = useId();
  const activityControlRef = useRef<HTMLDivElement>(null);
  const usesCustomerDashboardDrawers = selectedRole === "Customer" && pathname === "/customer-dashboard";
  const chatUnreadCount = getChatUnreadCount(selectedRole);
  const activityEntries = useMemo(
    () => getVisibleActivityFeed(selectedRole).filter(
      (entry): entry is typeof entry & { href: string } => entry.href !== null,
    ).slice(0, 6),
    [selectedRole],
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
                <span className="label-xs-semibold">VISIBLE TO YOU</span>
                <h2 className="headings-xs-bold">Latest activity</h2>
              </div>
              <button
                className="app-global-activity-close"
                type="button"
                aria-label="Close latest activity"
                onClick={() => setIsActivityOpen(false)}
              >
                <DsIcon name="x-close-cross" size={16} />
              </button>
            </header>

            {activityEntries.length ? (
              <ol className="app-global-activity-list">
                {activityEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link href={entry.href} onClick={() => setIsActivityOpen(false)}>
                      <NotificationSemanticState state={entry.state} label={entry.label} compact />
                      <span className="app-global-activity-copy">
                        <strong className="label-s-semibold">{entry.action}</strong>
                        <span className="label-xs">{entry.entityLabel}</span>
                        <time className="label-xs" dateTime={entry.occurredAt} title={entry.occurredAt}>
                          {activityDateFormatter.format(new Date(entry.occurredAt))}
                        </time>
                      </span>
                      <DsIcon name="caret-right" size={16} />
                    </Link>
                  </li>
                ))}
              </ol>
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

function getChatUnreadCount(role: PrototypeRole) {
  const recipientId = notificationInboxRecipientByRole[role];

  return chatProjects
    .filter((project) => project.memberIds.includes(recipientId))
    .reduce(
      (total, project) => total + project.externalUnread + (role === "Customer" ? 0 : project.internalUnread),
      0,
    );
}
