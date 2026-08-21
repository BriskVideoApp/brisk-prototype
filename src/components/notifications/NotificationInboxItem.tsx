"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type {
  NotificationEmailReminderPreview,
  RecipientInboxItem,
} from "@/data/notification-inbox";

export function NotificationInboxItem({
  item,
  read,
  compact = false,
  onMarkAsRead,
  onRetryEmail,
  onNavigate,
}: {
  item: RecipientInboxItem;
  read: boolean;
  compact?: boolean;
  onMarkAsRead: (itemId: string) => void;
  onRetryEmail?: (itemId: string) => void;
  onNavigate?: () => void;
}) {
  const [isReminderPreviewOpen, setIsReminderPreviewOpen] = useState(false);
  const metadata = [
    item.actorName ? `From ${item.actorName}` : null,
    item.projectCode,
    formatStage(item.stage),
  ]
    .filter(Boolean)
    .join(" · ");
  const absoluteTime = formatAbsoluteNotificationTime(item.occurredAt);
  const status = item.emailDeliveryState === "sent"
    ? { label: "Email sent", tone: "success" } as const
    : null;
  const copyContent = (
    <>
      <span className="notification-inbox-item-title-row">
        {!read ? <span className="notification-inbox-item-unread-dot"><span className="sr-only">Unread</span></span> : null}
        <strong className="label-s-semibold">{item.title}</strong>
        {status ? <span className={`notification-inbox-item-status is-${status.tone} label-xs-semibold`}>{status.label}</span> : null}
      </span>
      <span className="notification-inbox-item-body label-s">{item.copy}</span>
      {metadata ? <span className="notification-inbox-item-meta label-xs">{metadata}</span> : null}
    </>
  );

  return (
    <article
      className={`notification-inbox-item ${read ? "is-read" : "is-unread"} ${compact ? "is-compact" : ""}`}
    >
      <div className="notification-inbox-item-layout">
        <span
          className={`notification-inbox-item-icon is-${item.state}`}
          role="img"
          aria-label={`Status: ${getSemanticStatusLabel(item)}`}
        >
          <DsIcon name={getSemanticIcon(item)} size={16} />
        </span>
        {item.href ? (
          <Link
            className="notification-inbox-item-main-link"
            href={item.href}
            aria-label={`${item.title}. ${item.copy}. ${absoluteTime}`}
            onClick={() => {
              onMarkAsRead(item.id);
              onNavigate?.();
            }}
          >
            {copyContent}
          </Link>
        ) : (
          <div className="notification-inbox-item-main-link is-static">{copyContent}</div>
        )}
        <time className="notification-inbox-item-time label-xs" dateTime={item.occurredAt} title={absoluteTime}>
          {formatNotificationRelativeTime(item.occurredAt)}
        </time>
        <NotificationItemAction
          item={item}
          read={read}
          onMarkAsRead={() => onMarkAsRead(item.id)}
          onNavigate={onNavigate}
          onPreview={item.emailReminderPreview ? () => {
            onMarkAsRead(item.id);
            setIsReminderPreviewOpen(true);
          } : undefined}
          onRetry={item.emailDeliveryState === "failed" && onRetryEmail ? () => onRetryEmail(item.id) : undefined}
        />
      </div>
      {isReminderPreviewOpen && item.emailReminderPreview ? (
        <EmailReminderPreview
          preview={item.emailReminderPreview}
          onClose={() => setIsReminderPreviewOpen(false)}
          onNavigate={onNavigate}
        />
      ) : null}
    </article>
  );
}

function NotificationItemAction({
  item,
  read,
  onMarkAsRead,
  onNavigate,
  onPreview,
  onRetry,
}: {
  item: RecipientInboxItem;
  read: boolean;
  onMarkAsRead: () => void;
  onNavigate?: () => void;
  onPreview?: () => void;
  onRetry?: () => void;
}) {
  if (onRetry) {
    return (
      <button
        className="notification-inbox-item-action label-xs-semibold"
        type="button"
        onClick={() => {
          onMarkAsRead();
          onRetry();
        }}
      >
        <DsIcon name="arrows-clockwise" size={14} />
        Retry
      </button>
    );
  }

  if (onPreview) {
    return (
      <button
        className="notification-inbox-item-action is-tertiary label-xs-semibold"
        type="button"
        onClick={onPreview}
      >
        {item.ctaLabel ?? "Preview reminder"}
      </button>
    );
  }

  if (item.ctaLabel && item.href) {
    return (
      <Link
        className="notification-inbox-item-action label-xs-semibold"
        href={item.href}
        aria-label={`${item.ctaLabel}: ${item.title}`}
        onClick={() => {
          onMarkAsRead();
          onNavigate?.();
        }}
      >
        {item.ctaLabel}
      </Link>
    );
  }

  if (item.href) {
    return (
      <Link
        className="notification-inbox-item-chevron"
        href={item.href}
        aria-label={`Open ${item.title}`}
        onClick={() => {
          onMarkAsRead();
          onNavigate?.();
        }}
      >
        <DsIcon name="caret-right" size={16} />
      </Link>
    );
  }

  return !read ? (
    <button className="notification-inbox-mark-read label-xs-semibold" type="button" onClick={onMarkAsRead}>
      Mark as read
    </button>
  ) : null;
}

function getSemanticIcon(item: RecipientInboxItem): DsIconName {
  if (item.state === "failure" || item.state === "warning") return "alert-triangle";
  if (item.state === "success") return "check-circle";
  return "info";
}

function getSemanticStatusLabel(item: RecipientInboxItem) {
  if (item.state === "failure") return "Failure";
  if (item.state === "warning") return "Needs attention";
  if (item.category === "action-required") return "Action required";
  if (item.state === "success") return "Completed";
  return "Update";
}

function EmailReminderPreview({
  preview,
  onClose,
  onNavigate,
}: {
  preview: NotificationEmailReminderPreview;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  return (
    <ClientModal
      className="notification-reminder-preview-modal"
      title="Scheduled reminder"
      description="Read-only Client email preview"
      onClose={onClose}
      footer={<Button size="M" variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="notification-reminder-preview-meta">
        <span>
          <small className="label-xs">To</small>
          <strong className="label-s-semibold">{preview.recipient}</strong>
        </span>
        <span>
          <small className="label-xs">Scheduled</small>
          <time className="label-s-semibold" dateTime={preview.scheduledFor}>
            {formatReminderSchedule(preview.scheduledFor)}
          </time>
        </span>
      </div>
      <article className="notification-reminder-email-preview" aria-label="Reminder email text">
        <header>
          <span className="label-xs-semibold">SUBJECT</span>
          <strong className="label-m-semibold">{preview.subject}</strong>
        </header>
        <div>
          {preview.body.map((paragraph) => (
            <p className="paragraph-s" key={paragraph}>{paragraph}</p>
          ))}
          <Link
            className="notification-reminder-cta label-s-semibold"
            href={preview.ctaHref}
            onClick={() => {
              onClose();
              onNavigate?.();
            }}
          >
            {preview.ctaLabel}
            <DsIcon name="caret-right" size={16} />
          </Link>
        </div>
      </article>
      <p className="notification-reminder-safety label-xs">
        <DsIcon name="lock" size={14} />
        Client-safe preview. Internal notes and commercial details are excluded.
      </p>
    </ClientModal>
  );
}

function formatReminderSchedule(isoDate: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(new Date(isoDate));
}

export function formatAbsoluteNotificationTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

export function formatNotificationRelativeTime(isoDate: string) {
  const differenceInMinutes = Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000));

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);
  if (differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);
  return `${differenceInDays} ${differenceInDays === 1 ? "day" : "days"} ago`;
}

function formatStage(stage: RecipientInboxItem["stage"]) {
  if (!stage) return null;
  return `${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
}
