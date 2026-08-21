"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type {
  StudioNotificationCategoryCopy,
  StudioNotificationCopy,
  StudioNotificationPreview,
} from "@/data/studio-notification-copy";

type NotificationCopyOverrides = Record<string, StudioNotificationCopy>;
const notificationCopyStorageKey = "brisk-studio-notification-copy-v1";

export function StudioNotificationCategoryPage({ category }: { category: StudioNotificationCategoryCopy }) {
  const [selectedNotificationId, setSelectedNotificationId] = useState(category.notifications[0].id);
  const [overrides, setOverrides] = useState<NotificationCopyOverrides>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDemonstrationVisible, setIsDemonstrationVisible] = useState(false);
  const [demonstrationRun, setDemonstrationRun] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const demonstrationTriggerRef = useRef<HTMLButtonElement>(null);
  const demonstrationPopoverRef = useRef<HTMLElement>(null);
  const demonstrationCloseRef = useRef<HTMLButtonElement>(null);
  const notification = category.notifications.find((item) => item.id === selectedNotificationId) ?? category.notifications[0];
  const copy = overrides[notification.id] ?? notification.briskDefault;
  const isEdited = Boolean(overrides[notification.id]);

  useEffect(() => {
    setOverrides(readNotificationCopyOverrides(category));
  }, [category]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const closeDemonstration = useCallback((restoreFocus: boolean) => {
    setIsDemonstrationVisible(false);
    if (restoreFocus) demonstrationTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isDemonstrationVisible) return;

    const focusFrame = window.requestAnimationFrame(() => demonstrationCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDemonstration(true);
    };
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (demonstrationPopoverRef.current?.contains(target) || demonstrationTriggerRef.current?.contains(target)) return;
      closeDemonstration(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [closeDemonstration, isDemonstrationVisible]);

  const saveNotification = (nextCopy: StudioNotificationCopy) => {
    if (!notification.editable) return;
    setOverrides((current) => {
      const nextOverrides = { ...current };
      const allStoredOverrides = readAllNotificationCopyOverrides();
      if (notificationCopyMatches(nextCopy, notification.briskDefault)) {
        delete nextOverrides[notification.id];
        delete allStoredOverrides[notification.id];
      } else {
        nextOverrides[notification.id] = { ...nextCopy };
        allStoredOverrides[notification.id] = { ...nextCopy };
      }
      window.localStorage.setItem(notificationCopyStorageKey, JSON.stringify(allStoredOverrides));
      return nextOverrides;
    });
    setIsEditorOpen(false);
    setToast(`${notification.label} saved.`);
  };

  const restoreDefault = () => {
    setOverrides((current) => {
      const nextOverrides = { ...current };
      const allStoredOverrides = readAllNotificationCopyOverrides();
      delete nextOverrides[notification.id];
      delete allStoredOverrides[notification.id];
      window.localStorage.setItem(notificationCopyStorageKey, JSON.stringify(allStoredOverrides));
      return nextOverrides;
    });
    setToast(`${notification.label} restored.`);
  };

  return (
    <section className="customer-message-templates-page notification-category-page" aria-labelledby="notification-category-title">
      <header className="customer-message-templates-heading">
        <div>
          <Link className="customer-message-templates-back label-s-semibold" href="/settings/notifications">
            <DsIcon name="arrow-left" size={16} />
            Back to notification settings
          </Link>
          <h2 className="headings-s-bold" id="notification-category-title">{category.label}</h2>
          <p className="paragraph-s">Choose an item to see or change its message.</p>
        </div>
      </header>

      <div className="customer-message-templates-layout">
        <nav className="customer-message-template-list" aria-label={`${category.label} messages`}>
          <header>
            <span className="label-xs-semibold">Messages</span>
            <small className="label-xs">{category.notifications.length}</small>
          </header>
          {category.notifications.map((item) => {
            const isActive = item.id === notification.id;
            const wasEdited = Boolean(overrides[item.id]);
            return (
              <button
                className={`customer-message-template-list-item ${isActive ? "is-active" : ""}`}
                type="button"
                aria-current={isActive ? "true" : undefined}
                key={item.id}
                onClick={() => {
                  setSelectedNotificationId(item.id);
                  closeDemonstration(false);
                }}
              >
                <span>
                  <strong className="label-s-semibold">{item.label}</strong>
                  {wasEdited ? <small className="customer-message-edited-label label-xs-semibold">Edited</small> : null}
                </span>
                <DsIcon name="caret-right" size={14} />
              </button>
            );
          })}
        </nav>

        <article className="customer-message-template-detail">
          <header className="customer-message-template-detail-header">
            <div>
              <h3 className="headings-xs-bold">{notification.label}</h3>
            </div>
          </header>

          <div className="customer-message-template-detail-content">
            <dl className="notification-detail-facts">
              <div>
                <dt className="label-xs-semibold">When it sends</dt>
                <dd className="paragraph-s">
                  {notification.demonstration === "edit-request-review"
                    ? <>When a filmmaker clicks <strong>Request review</strong> in Edit.</>
                    : notification.sentWhen}
                </dd>
              </div>
              <div>
                <dt className="label-xs-semibold">Who receives it</dt>
                <dd className="paragraph-s">{notification.recipient}</dd>
              </div>
            </dl>

            {notification.demonstration === "edit-request-review" ? (
              <div className="notification-trigger-popover-anchor">
                <button
                  className="client-secondary-button label-s-semibold"
                  type="button"
                  ref={demonstrationTriggerRef}
                  aria-haspopup="dialog"
                  aria-controls="notification-trigger-popover"
                  aria-expanded={isDemonstrationVisible}
                  onClick={() => {
                    if (isDemonstrationVisible) {
                      closeDemonstration(false);
                      return;
                    }
                    setDemonstrationRun((current) => current + 1);
                    setIsDemonstrationVisible(true);
                  }}
                >
                  Show when this sends
                </button>
                {isDemonstrationVisible ? (
                  <>
                    <button
                      className="notification-trigger-popover-backdrop"
                      type="button"
                      aria-label="Close when this sends"
                      onClick={() => closeDemonstration(true)}
                    />
                    <section
                      className="notification-trigger-popover"
                      id="notification-trigger-popover"
                      ref={demonstrationPopoverRef}
                      role="dialog"
                      aria-modal="false"
                      aria-labelledby="notification-trigger-popover-title"
                    >
                      <header>
                        <h4 className="label-l-semibold" id="notification-trigger-popover-title">When this sends</h4>
                        <button
                          className="client-icon-button"
                          type="button"
                          ref={demonstrationCloseRef}
                          aria-label="Close when this sends"
                          onClick={() => closeDemonstration(true)}
                        >
                          <DsIcon name="x-close-cross" size={16} />
                        </button>
                      </header>
                      <p className="notification-trigger-popover-sentence paragraph-s">
                        <strong>David Ryan</strong>, Producer, clicks <strong>Request review</strong>. <strong>Sarah Chen</strong>, Editor, receives the notification.
                      </p>
                      <ReviewRequestDemonstration key={demonstrationRun} />
                      <footer>
                        <button
                          className="notification-trigger-replay label-xs-semibold"
                          type="button"
                          onClick={() => setDemonstrationRun((current) => current + 1)}
                        >
                          Replay
                        </button>
                      </footer>
                    </section>
                  </>
                ) : null}
              </div>
            ) : null}

            <StudioNotificationPreviewCard copy={copy} notification={notification} />
          </div>

          {notification.editable ? (
            <footer className="customer-message-template-actions">
              {isEdited ? <Button size="M" variant="ghost" onClick={restoreDefault}>Restore default</Button> : null}
              <Button size="M" onClick={() => setIsEditorOpen(true)}>Edit message</Button>
            </footer>
          ) : (
            <footer className="customer-message-template-actions notification-wording-fixed-footer">
              <span className="notification-mandatory-label label-xs-semibold"><DsIcon name="lock" size={13} />Wording fixed</span>
            </footer>
          )}
        </article>
      </div>

      {isEditorOpen && notification.editable ? (
        <NotificationEditorModal
          copy={copy}
          key={`editor-${notification.id}`}
          notification={notification}
          onClose={() => setIsEditorOpen(false)}
          onSave={saveNotification}
        />
      ) : null}

      {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </section>
  );
}

function StudioNotificationPreviewCard({
  copy,
  notification,
}: {
  copy: StudioNotificationCopy;
  notification: StudioNotificationPreview;
}) {
  const icon = getStatusIcon(notification.status);

  return (
    <article className={`notification-wording-preview is-${notification.status}`} aria-label={`${notification.label} example`}>
      <header>
        <span className="notification-wording-status label-xs-semibold"><DsIcon name={icon} size={14} />{notification.statusLabel}</span>
      </header>
      <div className="notification-wording-preview-body">
        <div className="notification-wording-content">
          <h4 className="label-l-semibold">{copy.title}</h4>
          <p className="paragraph-s">{copy.message}</p>
          <p className="notification-wording-meta label-xs">
            {notification.projectName} · {notification.stage}
          </p>
        </div>
      </div>
      <footer>
        <Link className="notification-wording-destination label-s-semibold" href={notification.destinationHref}>
          {notification.destinationLabel}
          <DsIcon name="caret-right" size={14} />
        </Link>
      </footer>
    </article>
  );
}

function ReviewRequestDemonstration() {
  return (
    <section className="notification-trigger-demonstration" aria-label="Request review demonstration">
      <div className="notification-trigger-source">
        <span className="notification-trigger-person">
          <strong className="label-xs-semibold">David Ryan</strong>
          <small className="label-xs">Producer · Edit</small>
        </span>
        <span className="notification-trigger-demo-button label-s-semibold">Request review</span>
        <span className="notification-trigger-pointer" aria-hidden="true">
          <DsIcon name="cursor" size={20} />
        </span>
      </div>
      <div className="notification-trigger-arrow" aria-hidden="true">
        <DsIcon name="arrow-right" size={32} />
      </div>
      <div className="notification-trigger-result">
        <span className="label-xs-semibold">Sent to Sarah Chen · Editor</span>
        <strong className="label-s-semibold">Edit v3 is ready to review</strong>
      </div>
    </section>
  );
}

function NotificationEditorModal({
  copy,
  notification,
  onClose,
  onSave,
}: {
  copy: StudioNotificationCopy;
  notification: StudioNotificationPreview;
  onClose: () => void;
  onSave: (copy: StudioNotificationCopy) => void;
}) {
  const [draft, setDraft] = useState<StudioNotificationCopy>({ ...copy });

  return (
    <ClientModal
      className="customer-message-template-modal"
      title={`Edit ${notification.label}`}
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" onClick={() => onSave(draft)}>Save</Button>
        </>
      )}
    >
      <div className="customer-message-template-fields">
        <Input label="Title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        <label className="customer-message-template-textarea">
          <span className="label-m-semibold">Message</span>
          <textarea maxLength={240} rows={5} value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} />
        </label>
      </div>
    </ClientModal>
  );
}

function getStatusIcon(status: StudioNotificationPreview["status"]): DsIconName {
  if (status === "success") return "check-circle";
  if (status === "warning" || status === "failure") return "alert-triangle";
  return "info";
}

function notificationCopyMatches(left: StudioNotificationCopy, right: StudioNotificationCopy) {
  return left.title === right.title && left.message === right.message;
}

function readNotificationCopyOverrides(category: StudioNotificationCategoryCopy): NotificationCopyOverrides {
  try {
    const storedOverrides = readAllNotificationCopyOverrides();
    return category.notifications.reduce<NotificationCopyOverrides>((categoryOverrides, notification) => {
      const storedCopy = storedOverrides[notification.id];
      if (notification.editable && storedCopy && !notificationCopyMatches(storedCopy, notification.briskDefault)) {
        categoryOverrides[notification.id] = { ...storedCopy };
      }
      return categoryOverrides;
    }, {});
  } catch {
    return {};
  }
}

function readAllNotificationCopyOverrides(): NotificationCopyOverrides {
  try {
    const storedValue = window.localStorage.getItem(notificationCopyStorageKey);
    return storedValue ? JSON.parse(storedValue) as NotificationCopyOverrides : {};
  } catch {
    return {};
  }
}
