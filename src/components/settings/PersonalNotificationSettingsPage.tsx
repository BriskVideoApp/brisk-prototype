"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { NotificationSettingsCheckbox } from "@/components/settings/NotificationSettingsCheckbox";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  clonePersonalNotificationSettings,
  initialPersonalNotificationSettings,
  type PersonalNotificationSettings,
} from "@/data/notification-settings";

export function PersonalNotificationSettingsPage() {
  const { selectedRole } = usePrototypeRole();
  const isFreelancer = selectedRole === "Studio Freelancer";
  const isStudioStaff = selectedRole === "Studio Staff";
  const backHref = isFreelancer ? "/active-videos" : "/notifications";
  const backLabel = isFreelancer ? "Back to My jobs" : "Back to notification centre";
  const storageKey = `brisk-personal-notification-settings-v1:${selectedRole}`;
  const [savedSettings, setSavedSettings] = useState<PersonalNotificationSettings>(() => clonePersonalNotificationSettings(initialPersonalNotificationSettings));
  const [draft, setDraft] = useState<PersonalNotificationSettings>(() => clonePersonalNotificationSettings(initialPersonalNotificationSettings));
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedSettings), [draft, savedSettings]);

  useEffect(() => {
    const storedSettings = readPersonalNotificationSettings(storageKey);
    setSavedSettings(storedSettings);
    setDraft(clonePersonalNotificationSettings(storedSettings));
  }, [storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = clonePersonalNotificationSettings(draft);
    window.localStorage.setItem(storageKey, JSON.stringify(nextSettings));
    setSavedSettings(nextSettings);
    setToast("Your notification preferences were updated.");
  };

  const discardChanges = () => setDraft(clonePersonalNotificationSettings(savedSettings));

  return (
    <main className="personal-notification-settings-page">
      <header className="personal-notification-settings-header">
        <div>
          <Link className="personal-notification-settings-back label-s-semibold" href={backHref}>
            <DsIcon name="arrow-left" size={16} />
            {backLabel}
          </Link>
          <h1 className="headings-m-bold">Notification preferences</h1>
        </div>
      </header>

      <form className="personal-notification-settings-form" onSubmit={saveChanges}>
        <section className="notification-settings-section">
          <header>
            <span><DsIcon name="bell" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Personal notifications</h2>
              <p className="paragraph-s">These settings affect only the updates sent to you.</p>
            </div>
          </header>
          <div className="notification-settings-section-content notification-policy-list">
            {isFreelancer ? (
              <>
                <PersonalPolicyCheckbox
                  checked={draft.mentionsAndDms}
                  label="Direct messages, mentions and replies"
                  description="Notify you when someone contacts you directly or replies to you."
                  onChange={(checked) => setDraft((current) => ({ ...current, mentionsAndDms: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.offersAndChanges}
                  label="New offers and offer changes"
                  description="Notify you when a Studio sends or changes an offer."
                  onChange={(checked) => setDraft((current) => ({ ...current, offersAndChanges: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.assignmentChanges}
                  label="Assignment changes"
                  description="Notify you when assigned work, dates or responsibilities change."
                  onChange={(checked) => setDraft((current) => ({ ...current, assignmentChanges: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.assignedProjectUpdates}
                  label="Updates from assigned projects"
                  description="Project updates stop when you are removed. Direct messages and mentions continue while you still have access."
                  onChange={(checked) => setDraft((current) => ({ ...current, assignedProjectUpdates: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.invoiceStatusChanges}
                  label="Invoice status changes"
                  description="Notify you when an uploaded invoice is approved, sent back or marked paid."
                  onChange={(checked) => setDraft((current) => ({ ...current, invoiceStatusChanges: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.emailFallback}
                  label="Important email notifications"
                  description="Email you when an important work update needs your attention."
                  onChange={(checked) => setDraft((current) => ({ ...current, emailFallback: checked }))}
                />
              </>
            ) : isStudioStaff ? (
              <>
                <PersonalPolicyCheckbox
                  checked={draft.mentionsAndDms}
                  label="Direct messages, mentions and replies"
                  description="Notify you when someone contacts you directly or replies to you."
                  onChange={(checked) => setDraft((current) => ({ ...current, mentionsAndDms: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.assignmentChanges}
                  label="Assignments and assignment changes"
                  description="Notify you when assigned work, dates or responsibilities change."
                  onChange={(checked) => setDraft((current) => ({ ...current, assignmentChanges: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.assignedProjectUpdates}
                  label="Updates from assigned projects"
                  description="Project updates stop when your assignment ends. Direct messages and permitted mentions can still reach you."
                  onChange={(checked) => setDraft((current) => ({ ...current, assignedProjectUpdates: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.inAppActionRequired}
                  label="Stage assignments and due dates"
                  description="Notify you when assigned Stage work needs attention or reaches its due date."
                  onChange={(checked) => setDraft((current) => ({ ...current, inAppActionRequired: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.emailFallback}
                  label="Important email notifications"
                  description="Email you when an important work update needs your attention."
                  onChange={(checked) => setDraft((current) => ({ ...current, emailFallback: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.dailyDigest}
                  label="Daily digest"
                  description="Combine routine Studio updates into one daily email."
                  onChange={(checked) => setDraft((current) => ({ ...current, dailyDigest: checked }))}
                />
              </>
            ) : (
              <>
                <PersonalPolicyCheckbox
                  checked={draft.inAppActionRequired}
                  label="Updates that need action"
                  description="Show a notification when something needs your attention."
                  onChange={(checked) => setDraft((current) => ({ ...current, inAppActionRequired: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.mentionsAndDms}
                  label="Mentions and DMs"
                  description="Notify you about direct messages, mentions and assigned replies."
                  onChange={(checked) => setDraft((current) => ({ ...current, mentionsAndDms: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.emailFallback}
                  label="Email for important updates"
                  description="Email you when an important update needs your attention."
                  onChange={(checked) => setDraft((current) => ({ ...current, emailFallback: checked }))}
                />
                <PersonalPolicyCheckbox
                  checked={draft.dailyDigest}
                  label="Daily digest"
                  description="Combine routine internal updates into one daily email."
                  onChange={(checked) => setDraft((current) => ({ ...current, dailyDigest: checked }))}
                />
              </>
            )}
            <div className="notification-policy-row is-mandatory">
              <NotificationSettingsCheckbox checked disabled label="Important account, access and security emails" />
              <p className="label-xs">These emails are always sent to help protect your account.</p>
              <span className="notification-mandatory-label label-xs-semibold"><DsIcon name="lock" size={13} />Always on</span>
            </div>
          </div>
        </section>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Discard changes</Button>
          <Button size="M" type="submit">Save preferences</Button>
        </div>
      </form>

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div>
      ) : null}
      {!hasChanges ? <span className="sr-only">All personal notification changes are saved.</span> : null}
    </main>
  );
}

function PersonalPolicyCheckbox({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="notification-policy-row">
      <NotificationSettingsCheckbox checked={checked} label={label} onChange={onChange} />
      <p className="label-xs">{description}</p>
    </div>
  );
}

function readPersonalNotificationSettings(storageKey: string) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return clonePersonalNotificationSettings(initialPersonalNotificationSettings);
    return clonePersonalNotificationSettings({
      ...initialPersonalNotificationSettings,
      ...JSON.parse(storedValue) as Partial<PersonalNotificationSettings>,
    });
  } catch {
    return clonePersonalNotificationSettings(initialPersonalNotificationSettings);
  }
}
