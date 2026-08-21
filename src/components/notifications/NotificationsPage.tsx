"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { useNotificationInbox } from "@/components/notifications/NotificationInboxContext";
import { NotificationInboxItem } from "@/components/notifications/NotificationInboxItem";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { NotificationInboxFilter, RecipientInboxItem } from "@/data/notification-inbox";

const notificationFilters: readonly { id: NotificationInboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "action-required", label: "Action required" },
];

export function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview");
  const { selectedRole } = usePrototypeRole();
  const { items, unreadCount, isRead, markAsRead, markAllAsRead, retryEmail } = useNotificationInbox();
  const [filter, setFilter] = useState<NotificationInboxFilter>("all");
  const visibleItems = useMemo(() => {
    if (preview === "empty") return [];
    if (filter === "unread") return items.filter((item) => !isRead(item));
    if (filter === "mentions") return items.filter((item) => item.category === "mention");
    if (filter === "action-required") return items.filter((item) => item.category === "action-required");
    return items;
  }, [filter, isRead, items, preview]);
  const filterCounts: Record<NotificationInboxFilter, number> = {
    all: preview === "empty" ? 0 : items.length,
    unread: preview === "empty" ? 0 : unreadCount,
    mentions: preview === "empty" ? 0 : items.filter((item) => item.category === "mention").length,
    "action-required": preview === "empty" ? 0 : items.filter((item) => item.category === "action-required").length,
  };
  const needsActionItems = useMemo(
    () => sortNewestFirst(visibleItems.filter((item) => item.category === "action-required")),
    [visibleItems],
  );
  const earlierItems = useMemo(
    () => sortNewestFirst(visibleItems.filter((item) => item.category !== "action-required")),
    [visibleItems],
  );

  const clearPreview = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("preview");
    router.replace(nextParams.size ? `/notifications?${nextParams}` : "/notifications");
  };

  return (
    <main className="notifications-page">
      <header className="notifications-page-header">
        <div className="notifications-page-header-inner">
          <div>
            <h1 className="headings-m-bold">Notifications</h1>
            <p className="paragraph-s">Updates that need your attention.</p>
          </div>
          <div className="notifications-header-actions">
            <Link className="notifications-settings-link label-s-semibold" href="/settings/personal/notifications">
              <DsIcon name="settings" size={16} />
              Notification settings
            </Link>
          </div>
        </div>
      </header>

      <div className="notifications-filters">
        <div className="notifications-filters-inner">
          <nav className="notifications-filter-tabs" aria-label="Notification filters">
            {notificationFilters.map((item) => (
              <button
                className={`label-s-semibold ${filter === item.id ? "is-active" : ""}`}
                type="button"
                aria-current={filter === item.id ? "page" : undefined}
                key={item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span className="label-xs">{filterCounts[item.id]}</span>
              </button>
            ))}
          </nav>
          <Button size="S" variant="secondary" onClick={unreadCount ? markAllAsRead : undefined} className={unreadCount === 0 ? "notifications-mark-all is-disabled" : "notifications-mark-all"}>
            <span className="notifications-button-content">
              <DsIcon name="checks" size={14} />
              Mark all as read
            </span>
          </Button>
        </div>
      </div>

      <section className="notifications-content" aria-live="polite">
        {preview === "loading" ? (
          <NotificationLoadingState />
        ) : preview === "error" ? (
          <NotificationErrorState onRetry={clearPreview} />
        ) : visibleItems.length ? (
          <div className="notifications-groups" aria-label={`${visibleItems.length} notifications`}>
            {needsActionItems.length ? (
              <NotificationGroup
                title="Needs action"
                items={needsActionItems}
                isRead={isRead}
                onMarkAsRead={markAsRead}
                onRetryEmail={retryEmail}
              />
            ) : null}
            {earlierItems.length ? (
              <NotificationGroup
                title="Earlier updates"
                items={earlierItems}
                quiet
                isRead={isRead}
                onMarkAsRead={markAsRead}
                onRetryEmail={retryEmail}
              />
            ) : null}
          </div>
        ) : (
          <NotificationEmptyState
            filter={filter}
            previewEmpty={preview === "empty"}
            role={selectedRole}
            onClearFilter={() => setFilter("all")}
          />
        )}
      </section>
    </main>
  );
}

function NotificationGroup({
  title,
  items,
  quiet = false,
  isRead,
  onMarkAsRead,
  onRetryEmail,
}: {
  title: string;
  items: readonly RecipientInboxItem[];
  quiet?: boolean;
  isRead: (item: RecipientInboxItem) => boolean;
  onMarkAsRead: (itemId: string) => void;
  onRetryEmail: (itemId: string) => void;
}) {
  return (
    <section className={`notifications-group ${quiet ? "is-updates" : ""}`} aria-labelledby={`notifications-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <header className="notifications-group-header">
        <h2 className="headings-xs-bold" id={`notifications-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2>
        <span className="label-xs">{items.length}</span>
      </header>
      <div className="notifications-list">
        {items.map((item) => (
          <NotificationInboxItem
            item={item}
            read={isRead(item)}
            key={item.id}
            onMarkAsRead={onMarkAsRead}
            onRetryEmail={onRetryEmail}
          />
        ))}
      </div>
    </section>
  );
}

function NotificationEmptyState({
  filter,
  previewEmpty,
  role,
  onClearFilter,
}: {
  filter: NotificationInboxFilter;
  previewEmpty: boolean;
  role: "Studio Staff" | "Studio Freelancer" | "Customer";
  onClearFilter: () => void;
}) {
  if (!previewEmpty && filter !== "all") {
    return (
      <div className="notifications-state">
        <span className="notifications-state-icon"><DsIcon name="check-circle" size={28} /></span>
        <h2 className="headings-xs-bold">Nothing in this filter</h2>
        <p className="paragraph-s">There are no {getFilterDescription(filter)} notifications for you.</p>
        <Button size="M" variant="secondary" onClick={onClearFilter}>Show all notifications</Button>
      </div>
    );
  }

  const homeHref = role === "Customer" ? "/customer-dashboard" : role === "Studio Freelancer" ? "/today" : "/active-videos";
  return (
    <div className="notifications-state">
      <span className="notifications-state-icon"><DsIcon name="bell" size={28} /></span>
      <h2 className="headings-xs-bold">No notifications yet</h2>
      <p className="paragraph-s">Important updates that need your attention will appear here.</p>
      <Link className="notifications-primary-link label-s-semibold" href={homeHref}>Back to your workspace</Link>
    </div>
  );
}

function NotificationLoadingState() {
  return (
    <div className="notifications-list notifications-loading" role="status" aria-label="Loading notifications">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="notification-skeleton" key={index}>
          <span />
          <span><i /><i /><i /></span>
        </div>
      ))}
    </div>
  );
}

function NotificationErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="notifications-state notifications-error" role="alert">
      <span className="notifications-state-icon"><DsIcon name="alert-triangle" size={28} /></span>
      <h2 className="headings-xs-bold">Notifications could not load</h2>
      <p className="paragraph-s">Your read state has not changed. Try loading your personal inbox again.</p>
      <Button size="M" variant="secondary" onClick={onRetry}>Try again</Button>
    </div>
  );
}

function getFilterDescription(filter: NotificationInboxFilter) {
  if (filter === "unread") return "unread";
  if (filter === "mentions") return "mention";
  if (filter === "action-required") return "action required";
  return "matching";
}

function sortNewestFirst(items: readonly RecipientInboxItem[]) {
  return [...items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
