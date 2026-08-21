"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneCustomerMessageTemplateCopy,
  customerMessageTemplates,
  resolveCustomerMessageText,
  type CustomerMessageTemplateCopy,
  type CustomerMessageTemplateDefinition,
  type CustomerMessageTemplateId,
} from "@/data/notification-templates";

type TemplateOverrides = Partial<Record<CustomerMessageTemplateId, CustomerMessageTemplateCopy>>;
const templateStorageKey = "brisk-customer-message-templates-v1";
const studioName = "North Star Films";

export function CustomerMessageTemplatesPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<CustomerMessageTemplateId>("edit-review");
  const [overrides, setOverrides] = useState<TemplateOverrides>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const templateDefinition = customerMessageTemplates.find((message) => message.id === selectedTemplateId) ?? customerMessageTemplates[0];
  const copy = overrides[templateDefinition.id] ?? templateDefinition.briskDefault;
  const isEdited = Boolean(overrides[templateDefinition.id]);

  useEffect(() => {
    setOverrides(readTemplateOverrides());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveMessage = (nextCopy: CustomerMessageTemplateCopy) => {
    setOverrides((current) => {
      const nextOverrides = { ...current };
      if (messagesMatch(nextCopy, templateDefinition.briskDefault)) {
        delete nextOverrides[templateDefinition.id];
      } else {
        nextOverrides[templateDefinition.id] = cloneCustomerMessageTemplateCopy(nextCopy);
      }
      window.localStorage.setItem(templateStorageKey, JSON.stringify(nextOverrides));
      return nextOverrides;
    });
    setIsEditorOpen(false);
    setToast(`${templateDefinition.label} saved.`);
  };

  const restoreDefault = () => {
    setOverrides((current) => {
      const nextOverrides = { ...current };
      delete nextOverrides[templateDefinition.id];
      window.localStorage.setItem(templateStorageKey, JSON.stringify(nextOverrides));
      return nextOverrides;
    });
    setToast(`${templateDefinition.label} restored.`);
  };

  return (
    <section className="customer-message-templates-page" aria-labelledby="customer-messages-title">
      <header className="customer-message-templates-heading">
        <div>
          <Link className="customer-message-templates-back label-s-semibold" href="/settings/notifications">
            <DsIcon name="arrow-left" size={16} />
            Back to notification settings
          </Link>
          <h2 className="headings-s-bold" id="customer-messages-title">Client messages</h2>
          <p className="paragraph-s">Choose a message to see or edit.</p>
        </div>
      </header>

      <div className="customer-message-templates-layout">
        <nav className="customer-message-template-list" aria-label="Client messages">
          <header>
            <span className="label-xs-semibold">Messages</span>
            <small className="label-xs">{customerMessageTemplates.length}</small>
          </header>
          {customerMessageTemplates.map((message) => {
            const isActive = message.id === templateDefinition.id;
            const wasEdited = Boolean(overrides[message.id]);
            return (
              <button
                className={`customer-message-template-list-item ${isActive ? "is-active" : ""}`}
                type="button"
                aria-current={isActive ? "true" : undefined}
                key={message.id}
                onClick={() => setSelectedTemplateId(message.id)}
              >
                <span>
                  <strong className="label-s-semibold">{message.label}</strong>
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
              <h3 className="headings-xs-bold">{templateDefinition.label}</h3>
              <p className="paragraph-s">{templateDefinition.description}</p>
            </div>
          </header>

          <div className="customer-message-template-detail-content">
            <CustomerMessageEmailPreview copy={copy} templateDefinition={templateDefinition} />
          </div>

          <footer className="customer-message-template-actions">
            {isEdited ? <Button size="M" variant="ghost" onClick={restoreDefault}>Restore default</Button> : null}
            <Button size="M" onClick={() => setIsEditorOpen(true)}>Edit message</Button>
          </footer>
        </article>
      </div>

      {isEditorOpen ? (
        <MessageEditorModal
          copy={copy}
          key={`editor-${templateDefinition.id}`}
          templateDefinition={templateDefinition}
          onClose={() => setIsEditorOpen(false)}
          onSave={saveMessage}
        />
      ) : null}

      {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </section>
  );
}

function CustomerMessageEmailPreview({
  copy,
  templateDefinition,
}: {
  copy: CustomerMessageTemplateCopy;
  templateDefinition: CustomerMessageTemplateDefinition;
}) {
  const firstName = templateDefinition.recipient.split(" ")[0];
  const resolvedSignOff = resolveCustomerMessageText(copy.signOff, templateDefinition);
  const subject = getPreviewSubject(copy.subject, templateDefinition);
  const includesStudioName = resolvedSignOff.includes(studioName);

  return (
    <article className="customer-message-email-preview" aria-label={`${templateDefinition.label} email example`}>
      <header>
        <span className="label-xs"><strong>From</strong> {studioName} &lt;updates@northstarfilms.com&gt;</span>
        <span className="label-xs"><strong>To</strong> {templateDefinition.recipient} &lt;{templateDefinition.recipientEmail}&gt;</span>
        <span className="label-xs"><strong>Subject</strong> {subject}</span>
      </header>
      <div className="customer-message-email-body">
        <p className="paragraph-s">Hi {firstName},</p>
        <p className="paragraph-s">{resolveCustomerMessageText(copy.context, templateDefinition)}</p>
        <p className="paragraph-s"><strong>{resolveCustomerMessageText(templateDefinition.fixedFact, templateDefinition)}</strong></p>
        <span className="customer-message-preview-cta label-s-semibold">{templateDefinition.ctaLabel}</span>
        {resolvedSignOff ? (
          <div className="customer-message-email-signoff">
            <p className="paragraph-s">{resolvedSignOff}</p>
            {!includesStudioName ? <p className="paragraph-s">{studioName}</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MessageEditorModal({
  copy,
  onClose,
  onSave,
  templateDefinition,
}: {
  copy: CustomerMessageTemplateCopy;
  onClose: () => void;
  onSave: (copy: CustomerMessageTemplateCopy) => void;
  templateDefinition: CustomerMessageTemplateDefinition;
}) {
  const [draft, setDraft] = useState<CustomerMessageTemplateCopy>(() => normaliseCopyForEditing(copy, templateDefinition));

  return (
    <ClientModal
      className="customer-message-template-modal"
      title={`Edit ${templateDefinition.label}`}
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" onClick={() => onSave(draft)}>Save</Button>
        </>
      )}
    >
      <div className="customer-message-template-fields">
        <Input label="Subject" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} />
        <label className="customer-message-template-textarea">
          <span className="label-m-semibold">Message</span>
          <textarea maxLength={240} rows={5} value={draft.context} onChange={(event) => setDraft((current) => ({ ...current, context: event.target.value }))} />
        </label>
        <Input label="Sign-off" value={draft.signOff} onChange={(event) => setDraft((current) => ({ ...current, signOff: event.target.value }))} />
        <div className="customer-message-automatic-details" aria-label="Information Brisk adds automatically">
          <span className="label-xs">Brisk adds these automatically</span>
          <div className="customer-message-automatic-chips">
            <span className="label-xs-semibold">First name</span>
            <span className="label-xs-semibold">Project name</span>
            <span className="label-xs-semibold">Studio name</span>
          </div>
        </div>
      </div>
    </ClientModal>
  );
}

function getPreviewSubject(subject: string, templateDefinition: CustomerMessageTemplateDefinition) {
  if (subject.includes("{{")) return resolveCustomerMessageText(subject, templateDefinition);
  return `${templateDefinition.projectCode} - ${templateDefinition.projectName}: ${subject}`;
}

function normaliseCopyForEditing(
  copy: CustomerMessageTemplateCopy,
  templateDefinition: CustomerMessageTemplateDefinition,
): CustomerMessageTemplateCopy {
  return {
    ...templateDefinition.briskDefault,
    subject: copy.subject.includes("{{") ? templateDefinition.briskDefault.subject : copy.subject,
    context: copy.context,
    signOff: copy.signOff.replaceAll("{{studio_name}}", "").trim(),
  };
}

function messagesMatch(left: CustomerMessageTemplateCopy, right: CustomerMessageTemplateCopy) {
  return left.subject === right.subject
    && left.context === right.context
    && left.signOff === right.signOff;
}

function readTemplateOverrides(): TemplateOverrides {
  try {
    const storedValue = window.localStorage.getItem(templateStorageKey);
    if (!storedValue) return {};
    const storedOverrides = JSON.parse(storedValue) as TemplateOverrides;
    return customerMessageTemplates.reduce<TemplateOverrides>((normalisedOverrides, templateDefinition) => {
      const storedCopy = storedOverrides[templateDefinition.id];
      if (!storedCopy) return normalisedOverrides;
      const normalisedCopy = normaliseCopyForEditing(storedCopy, templateDefinition);
      if (!messagesMatch(normalisedCopy, templateDefinition.briskDefault)) {
        normalisedOverrides[templateDefinition.id] = normalisedCopy;
      }
      return normalisedOverrides;
    }, {});
  } catch {
    return {};
  }
}
