"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneProjectNotificationOverrides,
  getProjectNotificationCustomers,
  initialProjectNotificationOverrides,
  projectNotificationEscalationPeople,
  projectUsesStudioNotificationDefaults,
  type ProjectNotificationFollowMode,
  type ProjectNotificationOverrides,
  type ProjectNotificationReminderTiming,
  type StudioFirstReminderId,
} from "@/data/notification-settings";

const reminderOptions: ReadonlyArray<{ value: ProjectNotificationReminderTiming; label: string }> = [
  { value: "studio-default", label: "Using Studio default" },
  { value: "24-hours", label: "After 24 hours" },
  { value: "48-hours", label: "After 48 hours" },
  { value: "off", label: "No project reminders" },
];

const followOptions: ReadonlyArray<{ value: ProjectNotificationFollowMode; label: string }> = [
  { value: "studio-default", label: "Using Studio default" },
  { value: "follow-all", label: "Follow all" },
  { value: "important-only", label: "Important only" },
  { value: "mentions-only", label: "Mentions only" },
  { value: "muted", label: "Muted" },
];

export function ProjectNotificationSettings({
  clientBadge,
  projectId,
}: {
  clientBadge: string;
  projectId: string;
}) {
  const { studio } = useStudioSettings();
  const storageKey = `brisk-project-notification-overrides-v1:${projectId}`;
  const [savedOverrides, setSavedOverrides] = useState<ProjectNotificationOverrides>(() => cloneProjectNotificationOverrides(initialProjectNotificationOverrides));
  const [draft, setDraft] = useState<ProjectNotificationOverrides>(() => cloneProjectNotificationOverrides(initialProjectNotificationOverrides));
  const [toast, setToast] = useState<string | null>(null);
  const customers = getProjectNotificationCustomers(clientBadge);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedOverrides), [draft, savedOverrides]);
  const usesStudioDefaults = projectUsesStudioNotificationDefaults(draft);

  useEffect(() => {
    const storedOverrides = readProjectNotificationOverrides(storageKey);
    setSavedOverrides(storedOverrides);
    setDraft(cloneProjectNotificationOverrides(storedOverrides));
  }, [storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextOverrides = cloneProjectNotificationOverrides(draft);
    window.localStorage.setItem(storageKey, JSON.stringify(nextOverrides));
    setSavedOverrides(nextOverrides);
    setToast("Project notification settings updated.");
  };

  const restoreStudioDefaults = () => {
    const nextOverrides = cloneProjectNotificationOverrides(initialProjectNotificationOverrides);
    window.localStorage.setItem(storageKey, JSON.stringify(nextOverrides));
    setSavedOverrides(nextOverrides);
    setDraft(cloneProjectNotificationOverrides(nextOverrides));
    setToast("Studio notification defaults restored.");
  };

  return (
    <section className="project-notification-settings" aria-labelledby="project-notification-settings-title">
      <header className="project-notification-settings-header">
        <div>
          <span className="project-notification-settings-icon"><DsIcon name="bell" size={18} /></span>
          <div>
            <h2 className="headings-xs-bold" id="project-notification-settings-title">Notifications</h2>
            <p className="paragraph-s">Change how updates and reminders work for this project.</p>
          </div>
        </div>
        <span className={`project-notification-inheritance label-xs-semibold ${usesStudioDefaults ? "" : "is-custom"}`}>
          {usesStudioDefaults ? "Using Studio default" : "Custom overrides"}
        </span>
      </header>

      <form className="project-notification-settings-form" onSubmit={saveChanges}>
        <div className="project-notification-inherited-summary">
          <span className="label-xs-semibold">Studio settings</span>
          <p className="label-s">
            Email updates are {studio.notifications.emailDeliveryEnabled ? "on" : "off"}. The first Client reminder {formatFirstReminder(studio.notifications.reminders.firstReminderId)}. Important account, access and security emails are always sent.
          </p>
        </div>

        <div className="project-notification-field-grid">
          <label className="notification-settings-select-field">
            <span className="label-s-semibold">Clients for reviews and approvals</span>
            <BriskSelect
              ariaLabel="Clients for reviews and approvals"
              clearLabel="Restore Studio default reviewers"
              multiple
              options={customers.map((customer) => ({ value: customer.id, label: customer.label }))}
              placeholder="Using Studio default"
              searchable={false}
              selectionLabel={(selected) => selected.length === 1 ? selected[0].label : `${selected.length} Clients`}
              value={draft.customerRecipientIds}
              onChange={(customerRecipientIds) => setDraft((current) => ({ ...current, customerRecipientIds }))}
            />
            <small className="label-xs">Only Clients who already have project access can be selected.</small>
          </label>

          <ProjectSelectField
            label="Reminder timing"
            options={reminderOptions}
            value={draft.reminderTiming}
            onChange={(reminderTiming) => setDraft((current) => ({ ...current, reminderTiming }))}
          />

          <ProjectSelectField
            label="Project subscription"
            options={followOptions}
            value={draft.followMode}
            onChange={(followMode) => setDraft((current) => ({ ...current, followMode }))}
          />

          <label className="notification-settings-select-field">
            <span className="label-s-semibold">Responsible Studio Staff for escalation</span>
            <BriskSelect
              ariaLabel="Responsible Studio Staff for escalation"
              clearLabel="Restore Studio default responsibility"
              options={projectNotificationEscalationPeople.map((person) => ({ value: person.id, label: person.label }))}
              placeholder="Using Studio default - Project lead"
              searchable={false}
              value={draft.escalationPersonId}
              onChange={(escalationPersonId) => setDraft((current) => ({ ...current, escalationPersonId }))}
            />
            <small className="label-xs">Choose who should follow up if the Client does not respond.</small>
          </label>
        </div>

        <div className="project-notification-publish-rule">
          <DsIcon name="info" size={16} />
          <p className="label-xs"><strong>Published shoot updates only.</strong> Draft call-sheet changes do not send notifications until someone selects Publish/Send.</p>
        </div>

        <p className="notification-settings-note label-xs">
          Email is currently available. More ways to send updates will appear here when they are ready.
        </p>

        <div className="project-notification-settings-actions">
          <Button size="M" type="button" variant="ghost" onClick={restoreStudioDefaults}>Restore Studio default</Button>
          <Button size="M" type="submit">Save project settings</Button>
        </div>
      </form>

      {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
      {!hasChanges ? <span className="sr-only">All project notification changes are saved.</span> : null}
    </section>
  );
}

function ProjectSelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <label className="notification-settings-select-field">
      <span className="label-s-semibold">{label}</span>
      <BriskSelect
        ariaLabel={label}
        clearable={false}
        options={options}
        placeholder={`Choose ${label.toLocaleLowerCase("en-AU")}`}
        searchable={false}
        value={value}
        onChange={(nextValue) => {
          if (nextValue) onChange(nextValue);
        }}
      />
    </label>
  );
}

function formatFirstReminder(reminderId: StudioFirstReminderId) {
  if (reminderId === "none") return "is disabled";
  if (reminderId === "12-hours") return "after 12 hours";
  if (reminderId === "48-hours") return "after 48 hours";
  return "after 24 hours";
}

function readProjectNotificationOverrides(storageKey: string) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return cloneProjectNotificationOverrides(initialProjectNotificationOverrides);
    const storedOverrides = JSON.parse(storedValue) as Partial<ProjectNotificationOverrides>;
    return cloneProjectNotificationOverrides({
      ...initialProjectNotificationOverrides,
      ...storedOverrides,
      customerRecipientIds: Array.isArray(storedOverrides.customerRecipientIds) ? storedOverrides.customerRecipientIds : [],
    });
  } catch {
    return cloneProjectNotificationOverrides(initialProjectNotificationOverrides);
  }
}
