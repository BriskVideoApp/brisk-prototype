"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { BriskSelect } from "@/components/form/BriskSelect";
import { NotificationSettingsCheckbox } from "./NotificationSettingsCheckbox";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { useStudioSettings } from "./StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { cloneStudioNotificationSettings, studioNotificationCategories, type StudioFirstReminderId, type StudioFinalReminderId, type StudioNotificationSettings } from "@/data/notification-settings";

type Editor = "delivery" | "categories" | "reminders";
const firstOptions: { value: StudioFirstReminderId; label: string }[] = [
  { value: "none", label: "Off" }, { value: "12-hours", label: "After 12 hours" }, { value: "24-hours", label: "After 24 hours" }, { value: "48-hours", label: "After 48 hours" },
];
const secondOptions: { value: StudioFinalReminderId; label: string }[] = [
  { value: "none", label: "Off" }, { value: "48-hours", label: "After 48 hours" }, { value: "72-hours", label: "After 72 hours" },
];

export function StudioNotificationSettingsPage() {
  const { studio, updateNotificationSettings } = useStudioSettings();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [toast, setToast] = useState("");
  const settings = studio.notifications;
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return <section className="studio-settings-section" aria-label="Studio notification settings">
    <div className="studio-setup-settings-panel">
      <SettingsSummaryRow title="Delivery" headingAs="h2" actionPlacement="heading" action={<Button size="S" variant="secondary" onClick={() => setEditor("delivery")}>Edit delivery</Button>}>
        <strong className="label-m-semibold">Email {settings.emailDeliveryEnabled ? "enabled" : "disabled"}</strong>
        <p className="paragraph-s">Account and security emails are always sent.</p>
      </SettingsSummaryRow>
      <SettingsSummaryRow title="Notifications" headingAs="h2" actionPlacement="heading" action={<Button size="S" variant="secondary" onClick={() => setEditor("categories")}>Edit notifications</Button>}>
        <p className="paragraph-s">Choose a category to preview or edit its messages.</p>
        <div className="settings-notification-links">
          {studioNotificationCategories.map((category) => <div key={category.id}>
            <Link className="customer-message-templates-back label-s-semibold" href={`/settings/notifications/${category.id}`}>{category.label}<DsIcon name="caret-right" size={14} /></Link>
            <span className="label-s">{settings.categoryDefaults[category.id] ? "On" : "Off"}</span>
          </div>)}
        </div>
      </SettingsSummaryRow>
      <SettingsSummaryRow title="Reminders" headingAs="h2" actionPlacement="heading" action={<Button size="S" variant="secondary" onClick={() => setEditor("reminders")}>Edit reminders</Button>}>
        {settings.reminders.firstReminderId === "none" ? <strong className="label-m-semibold">Reminders off</strong> : <>
          <dl className="settings-reminder-summary">
            <div><dt className="label-s">First reminder</dt><dd className="label-s-semibold">{firstOptions.find((item) => item.value === settings.reminders.firstReminderId)?.label}</dd></div>
            <div><dt className="label-s">Second reminder</dt><dd className="label-s-semibold">{secondOptions.find((item) => item.value === settings.reminders.finalReminderId)?.label}</dd></div>
          </dl>
          <p className="paragraph-s">Counted from the original request. Reminders stop when there is a response.</p>
          {settings.reminders.escalateAfterFinalReminder ? <p className="paragraph-s">The Studio is notified if there is still no response after the last reminder.</p> : null}
        </>}
      </SettingsSummaryRow>
    </div>
    {editor ? <NotificationPreferencesEditor section={editor} settings={settings} onCancel={() => setEditor(null)} onSave={(next) => { updateNotificationSettings(next); setEditor(null); setToast("Notification settings saved."); }} /> : null}
    {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
  </section>;
}

function NotificationPreferencesEditor({ section, settings, onCancel, onSave }: { section: Editor; settings: StudioNotificationSettings; onCancel: () => void; onSave: (settings: StudioNotificationSettings) => void }) {
  const [draft, setDraft] = useState(() => cloneStudioNotificationSettings(settings));
  const formId = useId();
  const changed = JSON.stringify(draft) !== JSON.stringify(settings);
  const first = draft.reminders.firstReminderId;
  const second = draft.reminders.finalReminderId;
  const invalidOrder = first !== "none" && second !== "none" && parseInt(second) <= parseInt(first);
  return <EditingDialog title={`Edit ${section === "categories" ? "notifications" : section}`} description="These defaults apply across your Studio." onCancel={onCancel} actions={<>
    <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
    <Button size="S" type="submit" form={formId} disabled={!changed || invalidOrder}>Save changes</Button>
  </>}>
    <form id={formId} className="studio-editor-fields" onSubmit={(event) => { event.preventDefault(); if (!changed || invalidOrder) return;
      // Save only this editor's section, preserving other current settings.
      onSave({ ...settings, ...(section === "delivery" ? { emailDeliveryEnabled: draft.emailDeliveryEnabled } : section === "categories" ? { categoryDefaults: draft.categoryDefaults } : { reminders: draft.reminders }) });
    }}>
      {section === "delivery" ? <>
        <NotificationSettingsCheckbox label="Send email notifications" checked={draft.emailDeliveryEnabled} onChange={(checked) => setDraft({ ...draft, emailDeliveryEnabled: checked })} />
        <p className="paragraph-s">Account and security emails are always sent.</p>
        <p className="paragraph-s studio-review-dialog-note">WhatsApp and browser notifications are coming later.</p>
      </> : section === "categories" ? studioNotificationCategories.map((category) => <div key={category.id}>
        <NotificationSettingsCheckbox label={category.label} checked={draft.categoryDefaults[category.id]} onChange={(checked) => setDraft({ ...draft, categoryDefaults: { ...draft.categoryDefaults, [category.id]: checked } })} />
        <p className="paragraph-s studio-review-dialog-note">{category.description}</p>
      </div>) : <>
        <p className="paragraph-s">Both reminders are timed from the original request, not from the previous reminder.</p>
        <label className="studio-settings-select-field"><span className="label-s-semibold">First reminder</span>
          <BriskSelect<StudioFirstReminderId> ariaLabel="First reminder" clearable={false} searchable={false} placeholder="Choose time" value={first} options={firstOptions} onChange={(value) => { if (value) setDraft({ ...draft, reminders: value === "none" ? { firstReminderId: value, finalReminderId: "none", escalateAfterFinalReminder: false } : { ...draft.reminders, firstReminderId: value } }); }} />
        </label>
        {first !== "none" ? <>
          <label className="studio-settings-select-field"><span className="label-s-semibold">Second reminder</span>
            <BriskSelect<StudioFinalReminderId> ariaLabel="Second reminder" clearable={false} searchable={false} placeholder="Choose time" value={second} options={secondOptions} onChange={(value) => { if (value) setDraft({ ...draft, reminders: { ...draft.reminders, finalReminderId: value } }); }} />
          </label>
          {invalidOrder ? <p className="paragraph-s" role="alert">The second reminder must be later than the first.</p> : null}
          <NotificationSettingsCheckbox label="Notify the Studio after the last reminder if there is no response" checked={draft.reminders.escalateAfterFinalReminder} onChange={(checked) => setDraft({ ...draft, reminders: { ...draft.reminders, escalateAfterFinalReminder: checked } })} />
        </> : null}
      </>}
    </form>
  </EditingDialog>;
}
