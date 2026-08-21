export type CustomerMessageTemplateId =
  | "invitation"
  | "brief-review"
  | "script-review"
  | "call-sheet-published"
  | "shoot-details-changed"
  | "media-requested"
  | "edit-review"
  | "changes-requested"
  | "new-version"
  | "stage-approved"
  | "masters-ready"
  | "freelancer-offer"
  | "invoice-correction";

export type CustomerMessageTone = "warm" | "direct" | "formal";

export type CustomerMessageTemplateCopy = {
  subject: string;
  greeting: string;
  context: string;
  signOff: string;
  tone: CustomerMessageTone;
  allowOneOffEdit: boolean;
};

export type CustomerMessageVariable = {
  key: string;
  label: string;
  example: string;
};

export type CustomerMessageTemplateDefinition = {
  id: CustomerMessageTemplateId;
  label: string;
  description: string;
  recipient: string;
  recipientEmail: string;
  projectCode: string;
  projectName: string;
  stage?: string;
  fixedFact: string;
  ctaLabel: string;
  ctaDestination: string;
  variables: readonly CustomerMessageVariable[];
  requiredSubjectVariables: readonly string[];
  briskDefault: CustomerMessageTemplateCopy;
  regeneratedContext: string;
};

const sharedVariables = [
  { key: "{{first_name}}", label: "First name", example: "Jess" },
  { key: "{{project_name}}", label: "Project", example: "Launch Film - Sales Narrative" },
  { key: "{{studio_name}}", label: "Studio", example: "North Star Films" },
] as const;

function template(
  definition: Omit<CustomerMessageTemplateDefinition, "recipient" | "recipientEmail" | "projectCode" | "projectName"> & Partial<Pick<CustomerMessageTemplateDefinition, "recipient" | "recipientEmail" | "projectCode" | "projectName">>,
): CustomerMessageTemplateDefinition {
  return {
    recipient: "Jess Taylor",
    recipientEmail: "jess@loom.com",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    ...definition,
  };
}

export const customerMessageTemplates = [
  template({
    id: "invitation",
    label: "Invitation",
    description: "Sent when someone is invited to a Studio or project.",
    fixedFact: "{{studio_name}} invited you to {{project_name}}.",
    ctaLabel: "Accept invitation",
    ctaDestination: "Protected invitation link",
    variables: sharedVariables,
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "You’re invited",
      greeting: "Hi {{first_name}},",
      context: "We’ve added you to the project in Brisk.",
      signOff: "Thanks,",
      tone: "warm",
      allowOneOffEdit: true,
    },
    regeneratedContext: "Your project space is ready when you are.",
  }),
  template({
    id: "brief-review",
    label: "Brief review",
    description: "Sent when a Brief is ready for Client review.",
    stage: "Brief",
    fixedFact: "{{project_name}} Brief is ready for your review.",
    ctaLabel: "Review Brief",
    ctaDestination: "Exact Brief review",
    variables: [...sharedVariables, { key: "{{stage_name}}", label: "Stage", example: "Brief" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Brief ready for review",
      greeting: "Hi {{first_name}},",
      context: "Please check the latest Brief and add any feedback in Brisk.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "The latest Brief is ready. Please review it when you have a moment.",
  }),
  template({
    id: "script-review",
    label: "Script review",
    description: "Sent when a Script is ready for Client review.",
    stage: "Script",
    fixedFact: "{{project_name}} {{version_name}} is ready for your review.",
    ctaLabel: "Review Script",
    ctaDestination: "Exact Script version",
    variables: [...sharedVariables, { key: "{{version_name}}", label: "Version", example: "Script v4" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Script ready for review",
      greeting: "Hi {{first_name}},",
      context: "Please review the latest words and leave your feedback in Brisk.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "We’ve prepared the latest Script for your review and feedback.",
  }),
  template({
    id: "call-sheet-published",
    label: "Call sheet",
    description: "Sent when a call sheet is published.",
    stage: "Shoot",
    fixedFact: "The call sheet for {{project_name}} was published for {{shoot_date}}.",
    ctaLabel: "View call sheet",
    ctaDestination: "Published call sheet",
    variables: [...sharedVariables, { key: "{{shoot_date}}", label: "Shoot date", example: "24 August 2026" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Call sheet published",
      greeting: "Hi {{first_name}},",
      context: "Your shoot details are ready. Please check the call time and location.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "Please review the published shoot details before the day.",
  }),
  template({
    id: "shoot-details-changed",
    label: "Shoot change",
    description: "Sent when published shoot details change.",
    stage: "Shoot",
    fixedFact: "The published call time changed: {{changed_details}}.",
    ctaLabel: "View call sheet",
    ctaDestination: "Updated published call sheet",
    variables: [...sharedVariables, { key: "{{changed_details}}", label: "Changed facts", example: "7:00 am to 6:30 am" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Important shoot change",
      greeting: "Hi {{first_name}},",
      context: "Please review this change before the shoot.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "A published shoot detail has changed. Please check the updated call sheet.",
  }),
  template({
    id: "media-requested",
    label: "File request",
    description: "Sent when the Studio asks a Client for files.",
    stage: "Media",
    fixedFact: "{{studio_name}} requested {{media_request}} for {{project_name}}.",
    ctaLabel: "Add files",
    ctaDestination: "Exact file request",
    variables: [...sharedVariables, { key: "{{media_request}}", label: "Requested files", example: "Product screenshots" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Files requested",
      greeting: "Hi {{first_name}},",
      context: "Please add the requested files so the project can continue.",
      signOff: "Thanks,",
      tone: "warm",
      allowOneOffEdit: true,
    },
    regeneratedContext: "We need one more file to keep the project moving.",
  }),
  template({
    id: "edit-review",
    label: "Edit review",
    description: "Sent when an Edit is ready for Client review.",
    stage: "Edit",
    fixedFact: "{{project_name}} {{version_name}} is ready for your review.",
    ctaLabel: "Review Edit",
    ctaDestination: "Exact Edit version",
    variables: [...sharedVariables, { key: "{{version_name}}", label: "Version", example: "Edit v3" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Edit ready for review",
      greeting: "Hi {{first_name}},",
      context: "Please watch the latest version and add any feedback in Brisk.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "The latest Edit is ready. Please share your feedback in Brisk.",
  }),
  template({
    id: "changes-requested",
    label: "Changes requested",
    description: "Sent when feedback requires another update.",
    fixedFact: "Changes were requested on {{project_name}} {{stage_name}}.",
    ctaLabel: "View changes",
    ctaDestination: "Exact requested changes",
    variables: [...sharedVariables, { key: "{{stage_name}}", label: "Stage", example: "Edit" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Changes requested",
      greeting: "Hi {{first_name}},",
      context: "The latest feedback is ready for you to review.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "Please review the requested changes and update the project when ready.",
  }),
  template({
    id: "new-version",
    label: "New version",
    description: "Sent when a new version is ready after feedback.",
    fixedFact: "{{version_name}} of {{project_name}} is ready.",
    ctaLabel: "View version",
    ctaDestination: "Exact new version",
    variables: [...sharedVariables, { key: "{{version_name}}", label: "Version", example: "Edit v4" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "New version ready",
      greeting: "Hi {{first_name}},",
      context: "We’ve made the latest changes and the new version is ready to review.",
      signOff: "Thanks,",
      tone: "warm",
      allowOneOffEdit: true,
    },
    regeneratedContext: "The updated version is ready for your review.",
  }),
  template({
    id: "stage-approved",
    label: "Approval",
    description: "Sent when a Stage approval is recorded.",
    stage: "Script",
    fixedFact: "{{project_name}} {{stage_name}} was approved.",
    ctaLabel: "View Script",
    ctaDestination: "Approved Stage object",
    variables: [...sharedVariables, { key: "{{stage_name}}", label: "Stage", example: "Script" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Stage approved",
      greeting: "Hi {{first_name}},",
      context: "Thanks for reviewing this Stage. The project can now continue.",
      signOff: "Thanks,",
      tone: "warm",
      allowOneOffEdit: true,
    },
    regeneratedContext: "The approval is recorded and the project can move forward.",
  }),
  template({
    id: "masters-ready",
    label: "Masters ready",
    description: "Sent when a Masters deliverable is ready.",
    stage: "Masters",
    fixedFact: "The {{deliverable_name}} for {{project_name}} is ready.",
    ctaLabel: "Review master",
    ctaDestination: "Exact Masters deliverable",
    variables: [...sharedVariables, { key: "{{deliverable_name}}", label: "Deliverable", example: "16:9 master" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Master ready",
      greeting: "Hi {{first_name}},",
      context: "Please review this deliverable before final delivery.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "Your latest master is ready for a final review.",
  }),
  template({
    id: "freelancer-offer",
    label: "Freelancer offer",
    description: "Sent when you offer a project to a freelancer.",
    recipient: "Nina Patel",
    recipientEmail: "nina@northstarfilms.com",
    fixedFact: "{{studio_name}} offered you {{offer_details}} on {{project_name}}.",
    ctaLabel: "Review offer",
    ctaDestination: "Exact Freelancer offer",
    variables: [...sharedVariables, { key: "{{offer_details}}", label: "Offer facts", example: "the Editor role for A$1,800" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "New project offer",
      greeting: "Hi {{first_name}},",
      context: "Please review the project details and respond in Brisk.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "We’d like you to join this project. Please review the offer when ready.",
  }),
  template({
    id: "invoice-correction",
    label: "Invoice correction",
    description: "Sent when a contractor invoice needs correcting.",
    recipient: "Chris Taylor",
    recipientEmail: "chris@freelance-edit.com",
    fixedFact: "Invoice {{invoice_number}} for {{project_name}} needs a correction.",
    ctaLabel: "Review invoice",
    ctaDestination: "Exact contractor invoice",
    variables: [...sharedVariables, { key: "{{invoice_number}}", label: "Invoice", example: "CT-3142" }],
    requiredSubjectVariables: ["{{project_name}}"],
    briskDefault: {
      subject: "Invoice correction needed",
      greeting: "Hi {{first_name}},",
      context: "Please review the note and submit a corrected invoice.",
      signOff: "Thanks,",
      tone: "direct",
      allowOneOffEdit: true,
    },
    regeneratedContext: "We need one correction before this invoice can be approved.",
  }),
] as const satisfies readonly CustomerMessageTemplateDefinition[];

export const customerMessageToneOptions: ReadonlyArray<{ value: CustomerMessageTone; label: string }> = [
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Clear and direct" },
  { value: "formal", label: "Formal" },
];

export function cloneCustomerMessageTemplateCopy(copy: CustomerMessageTemplateCopy): CustomerMessageTemplateCopy {
  return { ...copy };
}

export function resolveCustomerMessageText(text: string, templateDefinition: CustomerMessageTemplateDefinition) {
  const variableExamples = Object.fromEntries(
    templateDefinition.variables.map((variable) => [variable.key, variable.example]),
  );
  const replacements: Readonly<Record<string, string>> = {
    ...variableExamples,
    "{{first_name}}": templateDefinition.recipient.split(" ")[0],
    "{{project_name}}": templateDefinition.projectName,
    "{{studio_name}}": "North Star Films",
    "{{stage_name}}": templateDefinition.stage ?? "Edit",
  };

  return Object.entries(replacements).reduce(
    (resolvedText, [variable, value]) => resolvedText.replaceAll(variable, value),
    text,
  );
}

export function getMissingSubjectVariables(subject: string, templateDefinition: CustomerMessageTemplateDefinition) {
  return templateDefinition.requiredSubjectVariables.filter((variable) => !subject.includes(variable));
}
