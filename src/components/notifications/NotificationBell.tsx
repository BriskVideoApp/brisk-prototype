"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { NotificationInboxItem } from "@/components/notifications/NotificationInboxItem";
import { useNotificationInbox } from "@/components/notifications/NotificationInboxContext";
import { DsIcon } from "@/components/video-review/DsIcon";

export function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { items, unreadCount, isRead, markAsRead, markAllAsRead, retryEmail } = useNotificationInbox();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const recentItems = items.slice(0, 5);
  const isNotificationsPage = pathname === "/notifications";
  const notificationLabel = `Updates${unreadCount ? `, ${unreadCount} unread` : ""}`;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOutside = (event: MouseEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isOpen]);

  return (
    <div className="app-notification-control" ref={controlRef}>
      {isNotificationsPage ? (
        <Link
          className="app-notification-bell app-notification-updates-link label-s-semibold is-active"
          href="/notifications"
          aria-current="page"
          aria-label={notificationLabel}
        >
          <NotificationBellContents unreadCount={unreadCount} />
          <span className="app-notification-updates-label">Updates</span>
        </Link>
      ) : (
        <>
          <span className="app-notification-desktop-trigger">
            <Button
              size="S"
              variant="ghost"
              className="app-notification-updates-button"
              type="button"
              aria-label={notificationLabel}
              aria-controls={popoverId}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((current) => !current)}
            >
              <NotificationBellContents unreadCount={unreadCount} />
              Updates
            </Button>
          </span>
          <Link
            className="app-notification-bell app-notification-bell-mobile-link"
            href="/notifications"
            aria-label={notificationLabel}
            data-tooltip="Updates"
            onClick={onNavigate}
          >
            <NotificationBellContents unreadCount={unreadCount} />
          </Link>
        </>
      )}

      {!isNotificationsPage && isOpen ? (
        <section className="notification-popover" id={popoverId} aria-label="Recent notifications">
          <header className="notification-popover-header">
            <div>
              <h2 className="headings-xs-bold">Notifications</h2>
            </div>
            <div className="notification-popover-actions">
              <Button size="S" variant="ghost"
                className="notification-text-action"
                type="button"
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
              <span className="notification-popover-close">
                <IconButton tooltipAlign="end" tooltipPlacement="bottom" type="button" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
                  <DsIcon name="x-close-cross" size={16} />
                </IconButton>
              </span>
            </div>
          </header>

          {recentItems.length ? (
            <div className="notification-popover-list">
              {recentItems.map((item) => (
                <NotificationInboxItem
                  item={item}
                  read={isRead(item)}
                  compact
                  key={item.id}
                  onMarkAsRead={markAsRead}
                  onRetryEmail={retryEmail}
                  onNavigate={() => {
                    setIsOpen(false);
                    onNavigate?.();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="notification-popover-empty">
              <strong className="label-s-semibold">No notifications yet</strong>
            </div>
          )}

          <footer className="notification-popover-footer">
            <Link className="notification-view-all label-s-semibold" href="/notifications" onClick={() => {
              setIsOpen(false);
              onNavigate?.();
            }}>
              View all notifications
            </Link>
          </footer>
        </section>
      ) : null}
    </div>
  );
}

function NotificationBellContents({ unreadCount }: { unreadCount: number }) {
  return (
    <>
      <span className="app-notification-bell-icon">
        <DsIcon name="bell" size={18} />
      </span>
      <CommentCountBadge count={unreadCount} maxCount={99} label={`${unreadCount} unread notifications`} />
    </>
  );
}
