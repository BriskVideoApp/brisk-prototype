"use client";

import { BriskSelect } from "@/components/form/BriskSelect";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";


import { useEffect, useMemo, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";

export type RequestReviewRole = "studio" | "customer";
export type RequestReviewRecipient = "customer" | "studio";
export type RequestReviewTemplateId = "standardReviewRequest" | "finalApproval" | "quickCheckIn";

export type RequestReviewModalProps = {
  role: RequestReviewRole;
  projectName: string;
  studioName: string;
  customerName: string;
  onClose: () => void;
  onSent: (recipientName: string, recipient: RequestReviewRecipient) => void;
};

type RequestReviewTemplate = {
  id: RequestReviewTemplateId;
  label: string;
  body: (values: TemplateValues) => string;
};

type TemplateValues = {
  projectName: string;
  recipientName: string;
  senderName: string;
  studioName: string;
};

const requestReviewTemplates: RequestReviewTemplate[] = [
  {
    id: "standardReviewRequest",
    label: "Standard review request",
    body: ({ projectName, recipientName, senderName }) =>
      `Hi ${recipientName},\n\n${projectName} is ready for review.\n\nPlease open the project link, leave any comments, and let us know if anything needs changing.\n\nThanks,\n${senderName}`,
  },
  {
    id: "finalApproval",
    label: "Final approval",
    body: ({ projectName, recipientName, senderName }) =>
      `Hi ${recipientName},\n\nThe final version of ${projectName} is ready for approval.\n\nPlease review the latest version and approve it when you are happy for us to finalise delivery.\n\nThanks,\n${senderName}`,
  },
  {
    id: "quickCheckIn",
    label: "Quick check-in",
    body: ({ projectName, recipientName, senderName }) =>
      `Hi ${recipientName},\n\nCould you take a quick look at ${projectName} when you have a moment?\n\nA short note is fine if everything is on track.\n\nThanks,\n${senderName}`,
  },
];

export function RequestReviewModal({
  role,
  projectName,
  studioName,
  customerName,
  onClose,
  onSent,
}: RequestReviewModalProps) {
  const defaultRecipient: RequestReviewRecipient = role === "studio" ? "customer" : "studio";
  const [recipient, setRecipient] = useState<RequestReviewRecipient>(defaultRecipient);
  const [selectedTemplateId, setSelectedTemplateId] = useState<RequestReviewTemplateId>("standardReviewRequest");
  const [messageBody, setMessageBody] = useState("");
  const recipientName = recipient === "customer" ? customerName : studioName;
  const senderName = role === "customer" ? customerName : studioName;
  const selectedTemplate = requestReviewTemplates.find((template) => template.id === selectedTemplateId) ?? requestReviewTemplates[0];

  const templateValues = useMemo(
    () => ({
      projectName,
      recipientName,
      senderName,
      studioName,
    }),
    [projectName, recipientName, senderName, studioName],
  );

  useEffect(() => {
    setMessageBody(selectedTemplate.body(templateValues));
  }, [selectedTemplate, templateValues]);

  const selectTemplate = (templateId: RequestReviewTemplateId) => {
    setSelectedTemplateId(templateId);
    const nextTemplate = requestReviewTemplates.find((template) => template.id === templateId) ?? requestReviewTemplates[0];
    setMessageBody(nextTemplate.body(templateValues));
  };

  const sendRequest = () => {
    onSent(recipientName, recipient);
    onClose();
  };

  return (
    <ConfirmationDialog title="Request review" expanded confirmLabel="Request review" onCancel={onClose} onConfirm={sendRequest}>  {role === "studio" ? (
          <fieldset className="request-review-send-to">
            <legend className="label-s-semibold">Send to</legend>
            <span className="request-review-recipient-options" role="radiogroup" aria-label="Send review request to">
              <RecipientRadio
                label="Customer"
                selected={recipient === "customer"}
                onSelect={() => setRecipient("customer")}
              />
              <RecipientRadio
                label={`${studioName} internal`}
                selected={recipient === "studio"}
                onSelect={() => setRecipient("studio")}
              />
            </span>
          </fieldset>
        ) : null}  <label className="request-review-field label-s-semibold">
          Choose a template
          <BriskSelect<string> ariaLabel={"Choose a template"} clearable={false} placeholder={"Choose an option"} triggerClassName="request-review-select label-s" value={selectedTemplateId} onChange={(value) => selectTemplate(value as RequestReviewTemplateId)} options={[...requestReviewTemplates.map((template) => ({ value: template.id, label: (template.label) }))]} />
        </label>  <label className="request-review-field label-s-semibold">
          Message
          <textarea
            className="request-review-textarea label-s"
            value={messageBody}
            rows={9}
            onChange={(event) => setMessageBody(event.target.value)}
          />
        </label>  <div className="request-review-helper-row">
          <p className="request-review-helper label-xs">
            Sent as an email and in-app message to {recipientName}.
          </p>
        </div>  </ConfirmationDialog>
  );
}

function RecipientRadio({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`request-review-radio label-s ${selected ? "selected" : ""}`}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
    >
      <span className="share-radio-control" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
