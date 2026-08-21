"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { NotificationSettingsCheckbox } from "@/components/settings/NotificationSettingsCheckbox";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneStudioNotificationSettings,
  studioNotificationCategories,
  type StudioFinalReminderId,
  type StudioFirstReminderId,
  type StudioNotificationCategoryId,
  type StudioNotificationSettings,
} from "@/data/notification-settings";

const firstReminderOptions: ReadonlyArray<{ value: StudioFirstReminderId; label: string }> = [
  { value: "none", label: "No reminders" },
  { value: "12-hours", label: "After 12 hours" },
  { value: "24-hours", label: "After 24 hours" },
  { value: "48-hours", label: "After 48 hours" },
];

const finalReminderOptions: ReadonlyArray<{ value: StudioFinalReminderId; label: string }> = [
  { value: "none", label: "Off" },
  { value: "48-hours", label: "After 48 hours" },
  { value: "72-hours", label: "After 72 hours" },
];

export function StudioNotificationSettingsPage() {
  const router = useRouter();
  const { studio, updateNotificationSettings } = useStudioSettings();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioNotificationSettings>(() => cloneStudioNotificationSettings(studio.notifications));
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.notifications), [draft, studio.notifications]);

  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateNotificationSettings(draft);
    setHasUnsavedChanges(false);
    setToast("Notification settings saved.");
  };

  const discardChanges = () => {
    setDraft(cloneStudioNotificationSettings(studio.notifications));
    setHasUnsavedChanges(false);
  };

  const updateCategory = (categoryId: StudioNotificationCategoryId, enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      categoryDefaults: {
        ...current.categoryDefaults,
        [categoryId]: enabled,
      },
    }));
  };

  return (
    <section className="studio-settings-section notification-settings" aria-label="Studio notification settings">
      <form className="notification-settings-form" onSubmit={saveChanges}>
        <NotificationSettingsSection
          icon="envelope-simple"
          title="Delivery"
        >
          <div className="notification-channel-list">
            <div className="notification-channel-row">
              <NotificationSettingsCheckbox
                checked={draft.emailDeliveryEnabled}
                label="Email"
                onChange={(checked) => setDraft((current) => ({ ...current, emailDeliveryEnabled: checked }))}
              />
            </div>
            <div className="notification-channel-row is-disabled">
              <NotificationSettingsCheckbox checked={false} disabled label="WhatsApp and browser notifications" />
              <span className="notification-phase-label label-xs-semibold">Coming soon</span>
            </div>
          </div>
          <p className="notification-settings-note label-xs">
            Account and security emails are always sent.
          </p>
        </NotificationSettingsSection>

        <NotificationSettingsSection
          icon="bell"
          title="Notifications for your team"
          description="Choose what your team gets. Open an item to see or change the message."
        >
          <div className="notification-policy-list">
            {studioNotificationCategories.map((category) => (
              <div
                className="notification-policy-row notification-category-row"
                key={category.id}
                role="link"
                tabIndex={0}
                aria-label={`Open ${category.label} messages`}
                onClick={(event) => {
                  const target = event.target;
                  if (target instanceof Element && target.closest("label, button")) return;
                  router.push(`/settings/notifications/${category.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  router.push(`/settings/notifications/${category.id}`);
                }}
              >
                <NotificationSettingsCheckbox
                  checked={draft.categoryDefaults[category.id]}
                  disabled={"mandatory" in category && category.mandatory}
                  label={category.label}
                  onChange={(checked) => updateCategory(category.id, checked)}
                />
                {"mandatory" in category && category.mandatory ? (
                  <span className="notification-mandatory-label label-xs-semibold"><DsIcon name="lock" size={13} />Always on</span>
                ) : null}
                <button
                  className="notification-category-row-chevron"
                  type="button"
                  aria-label={`Open ${category.label}`}
                  onClick={() => router.push(`/settings/notifications/${category.id}`)}
                >
                  <DsIcon name="caret-right" size={16} />
                </button>
              </div>
            ))}
          </div>
        </NotificationSettingsSection>

        <NotificationSettingsSection
          icon="chat-circle-text"
          title="Messages for Clients"
          description="Choose which messages Clients get."
        >
          <div className="notification-policy-list">
            <NotificationPolicyCheckbox
              checked={draft.customerMessages.sendReviewRequests}
              label="Work to review"
              onChange={(checked) => setDraft((current) => ({ ...current, customerMessages: { ...current.customerMessages, sendReviewRequests: checked } }))}
            />
            <NotificationPolicyCheckbox
              checked={draft.customerMessages.sendApprovalConfirmations}
              label="Approval changes"
              onChange={(checked) => setDraft((current) => ({ ...current, customerMessages: { ...current.customerMessages, sendApprovalConfirmations: checked } }))}
            />
            <NotificationPolicyCheckbox
              checked={draft.customerMessages.notifyAssignedReplies}
              label="Replies needed"
              onChange={(checked) => setDraft((current) => ({ ...current, customerMessages: { ...current.customerMessages, notifyAssignedReplies: checked } }))}
            />
          </div>
          <Link className="customer-message-template-link label-s-semibold" href="/settings/notifications/templates">
            See and edit messages
            <DsIcon name="caret-right" size={16} />
          </Link>
        </NotificationSettingsSection>

        <NotificationSettingsSection
          icon="clock-clockwise"
          title="Reminders"
        >
          <div className="notification-settings-field-grid">
            <NotificationSelectField
              label="First reminder"
              options={firstReminderOptions}
              value={draft.reminders.firstReminderId}
              onChange={(value) => setDraft((current) => ({
                ...current,
                reminders: value === "none"
                  ? { firstReminderId: value, finalReminderId: "none", escalateAfterFinalReminder: false }
                  : { ...current.reminders, firstReminderId: value },
              }))}
            />
            <NotificationSelectField
              disabled={draft.reminders.firstReminderId === "none"}
              label="Second reminder"
              options={finalReminderOptions}
              value={draft.reminders.finalReminderId}
              onChange={(value) => setDraft((current) => ({ ...current, reminders: { ...current.reminders, finalReminderId: value } }))}
            />
          </div>
          <NotificationPolicyCheckbox
            checked={draft.reminders.escalateAfterFinalReminder}
            disabled={draft.reminders.firstReminderId === "none"}
            label="Notify the Studio if there is no response"
            onChange={(checked) => setDraft((current) => ({ ...current, reminders: { ...current.reminders, escalateAfterFinalReminder: checked } }))}
          />
        </NotificationSettingsSection>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Cancel</Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function NotificationSettingsSection({
  children,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  icon: "bell" | "chat-circle-text" | "clock-clockwise" | "envelope-simple";
  title: string;
}) {
  return (
    <section className="notification-settings-section">
      <header>
        <span><DsIcon name={icon} size={18} /></span>
        <div>
          <h2 className="headings-xs-bold">{title}</h2>
          {description ? <p className="paragraph-s">{description}</p> : null}
        </div>
      </header>
      <div className="notification-settings-section-content">{children}</div>
    </section>
  );
}

function NotificationPolicyCheckbox({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="notification-policy-row">
      <NotificationSettingsCheckbox checked={checked} disabled={disabled} label={label} onChange={onChange} />
    </div>
  );
}

function NotificationSelectField<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <label className={`notification-settings-select-field ${disabled ? "is-disabled" : ""}`}>
      <span className="label-s-semibold">{label}</span>
      <div aria-disabled={disabled}>
        <BriskSelect
          ariaLabel={label}
          clearable={false}
          options={options}
          placeholder={`Choose ${label.toLocaleLowerCase("en-AU")}`}
          searchable={false}
          value={value}
          onChange={(nextValue) => {
            if (nextValue && !disabled) onChange(nextValue);
          }}
        />
      </div>
    </label>
  );
}
