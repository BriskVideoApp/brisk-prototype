"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  defaultReviewRequestMessage,
  defaultStudioSubmitMessage,
  formatReviewRequestMessage,
  getReviewRequestMessageStorageKey,
  readReviewRequestMessageTemplate,
} from "@/data/review-request-message";

export function ReviewRequestMessageSettingsPage() {
  const { selectedRole } = usePrototypeRole();
  const { state } = usePrototypeState();
  const { account } = useClientAccountSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : selectedRole === "Customer" ? "/active-videos" : "/settings/notifications";
  const previewStage = searchParams.get("stage") ?? "Brief";
  const previewProject = searchParams.get("project") ?? "Customer Story - Healthcare";
  const destination = searchParams.get("destination") === "studio" ? "studio" : "customer";
  const defaultTemplate = destination === "studio" ? defaultStudioSubmitMessage : defaultReviewRequestMessage;
  const storageKey = getReviewRequestMessageStorageKey({
    workspaceId: state.session.activeWorkspaceId,
    clientId: state.session.activeClientId ?? (selectedRole === "Customer" ? account.company.name : null),
    userId: state.session.activeUserId,
    role: selectedRole,
    destination,
  });
  const [savedTemplate, setSavedTemplate] = useState(defaultTemplate);
  const [draft, setDraft] = useState(defaultTemplate);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (selectedRole === "Customer") {
      router.replace("/active-videos");
    }
  }, [router, selectedRole]);

  useEffect(() => {
    if (selectedRole === "Customer") return;
    const template = readReviewRequestMessageTemplate(storageKey, destination);
    setSavedTemplate(template);
    setDraft(template);
    setSavedNotice(false);
  }, [destination, selectedRole, storageKey]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    if (next === defaultTemplate) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, next);
    setSavedTemplate(next);
    setDraft(next);
    setSavedNotice(true);
  };

  const restoreDefault = () => {
    setDraft(defaultTemplate);
    setSavedNotice(false);
  };

  if (selectedRole === "Customer") return null;

  return (
    <main className="personal-notification-settings-page review-request-default-page">
      <header className="personal-notification-settings-header">
        <div>
          <Link className="personal-notification-settings-back label-s-semibold" href={returnTo}>
            <DsIcon name="arrow-left" size={16} />Back to {requestedReturnTo ? "project" : "settings"}
          </Link>
          <h1 className="headings-m-bold">Default Submit message</h1>
          <p className="paragraph-s">This message appears when you submit work to the {destination === "studio" ? "Studio" : "Client"}. You can change it before each submission.</p>
        </div>
      </header>

      <form className="personal-notification-settings-form" onSubmit={save}>
        <section className="notification-settings-section">
          <header>
            <span><DsIcon name="chat-circle-text" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Message</h2>
              <p className="paragraph-s">Use {"{stage}"} and {"{project}"} to insert the right names automatically.</p>
            </div>
          </header>
          <div className="notification-settings-section-content">
            <label className="review-request-default-field label-s-semibold">
              Default message
              <textarea className="paragraph-s" maxLength={240} rows={5} required value={draft} onChange={(event) => { setDraft(event.target.value); setSavedNotice(false); }} />
            </label>
            <div className="review-request-default-preview">
              <span className="label-xs-semibold">Example</span>
              <p className="paragraph-s">{formatReviewRequestMessage(draft, previewStage, previewProject)}</p>
            </div>
            <div className="review-request-default-actions">
              <Button size="M" variant="secondary" type="button" disabled={draft === defaultTemplate} onClick={restoreDefault}>Restore Brisk default</Button>
              <Button size="M" type="submit" disabled={!draft.trim() || draft.trim() === savedTemplate}>Save default</Button>
            </div>
            {savedNotice ? <p className="label-s" role="status">Default message saved.</p> : null}
          </div>
        </section>
      </form>
    </main>
  );
}
