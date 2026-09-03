"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { useClients } from "@/components/clients/ClientDataContext";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { selectWorkspaceProjects } from "@/data/prototype-state";
import type { InvitationRole, InvitePersonPrefill } from "@/data/invitations";

export type InvitePersonSubmission = {
  role: InvitationRole;
  email: string;
  name: string;
  jobTitle: string;
  clientIds: string[];
  projectIds: string[];
};

type InvitePersonModalProps = {
  prefill: InvitePersonPrefill;
  onClose: () => void;
  onSubmit: (submission: InvitePersonSubmission) => void;
};

const standardJobTitles = ["Producer", "Editor", "Shooter"] as const;
const customJobTitleValue = "custom-role" as const;
type JobTitleChoice = typeof standardJobTitles[number] | typeof customJobTitleValue | "";

const jobTitleOptions: ReadonlyArray<{ value: Exclude<JobTitleChoice, "">; label: string; icon?: "plus"; dividerAbove?: boolean }> = [
  ...standardJobTitles.map((title) => ({ value: title, label: title })),
  { value: customJobTitleValue, label: "Add custom role", icon: "plus", dividerAbove: true },
];

const roleOptions: ReadonlyArray<{ role: InvitationRole; description: string }> = [
  { role: "Studio Staff", description: "Full Studio workspace access is automatic in V1." },
  { role: "Studio Freelancer", description: "Access only to the Clients and projects you choose." },
  { role: "Customer", description: "One Client company and only the projects you choose." },
];

export function InvitePersonModal({ onClose, onSubmit, prefill }: InvitePersonModalProps) {
  const { clients } = useClients();
  const { people } = usePeople();
  const { state } = usePrototypeState();
  const workspaceProjects = selectWorkspaceProjects(state, state.session.activeWorkspaceId);
  const prefilledProjectIds = prefill.projectIds ?? [];
  const projectClientIds = prefilledProjectIds
    .map((projectId) => workspaceProjects.find((project) => project.id === projectId)?.clientId)
    .filter((clientId): clientId is string => Boolean(clientId));
  const initialClientIds = unique([...(prefill.clientIds ?? []), ...projectClientIds]);
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<InvitationRole>(prefill.role ?? "Studio Staff");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [name, setName] = useState(prefill.name ?? "");
  const [jobTitle, setJobTitle] = useState(prefill.jobTitle ?? "");
  const [jobTitleChoice, setJobTitleChoice] = useState<JobTitleChoice>(() => {
    if (!prefill.jobTitle) return "";
    return isStandardJobTitle(prefill.jobTitle) ? prefill.jobTitle : customJobTitleValue;
  });
  const [clientIds, setClientIds] = useState<string[]>(initialClientIds);
  const [customerClientId, setCustomerClientId] = useState(initialClientIds[0] ?? "");
  const [projectIds, setProjectIds] = useState<string[]>(prefilledProjectIds);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const activeClients = useMemo(() => clients.filter((client) => client.status !== "Archived"), [clients]);
  const normalisedEmail = email.trim().toLocaleLowerCase("en-AU");
  const existingPerson = normalisedEmail
    ? people.find((person) => person.email.trim().toLocaleLowerCase("en-AU") === normalisedEmail)
    : undefined;
  const inviteeName = name.trim() || existingPerson?.name || normalisedEmail;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalisedEmail);
  const selectedClientIds = role === "Customer" ? (customerClientId ? [customerClientId] : []) : clientIds;
  const availableProjects = workspaceProjects.filter((project) => project.status !== "Archived" && selectedClientIds.includes(project.clientId));
  const selectedProjects = projectIds.filter((projectId) => availableProjects.some((project) => project.id === projectId));
  const hasCustomerConflict = role === "Customer" && existingPerson?.type === "Client contact" && existingPerson.clientId !== customerClientId;
  const canSend = emailIsValid
    && !hasCustomerConflict
    && (
      role === "Studio Staff"
      || (role === "Customer" && selectedClientIds.length > 0)
      || (role === "Studio Freelancer" && selectedClientIds.length > 0 && selectedProjects.length > 0)
    );

  const goNext = () => {
    setAttemptedNext(true);
    if (emailIsValid) setStep(2);
  };

  const changeRole = (nextRole: InvitationRole) => {
    setRole(nextRole);
    if (nextRole === "Customer" && !customerClientId) setCustomerClientId(clientIds[0] ?? activeClients[0]?.id ?? "");
  };

  const changeCustomerClient = (nextClientId: string) => {
    setCustomerClientId(nextClientId);
    setProjectIds((current) => current.filter((projectId) => workspaceProjects.find((project) => project.id === projectId)?.clientId === nextClientId));
  };

  const toggleClient = (clientId: string) => {
    if (clientIds.includes(clientId)) {
      setClientIds((current) => current.filter((id) => id !== clientId));
      setProjectIds((current) => current.filter((projectId) => workspaceProjects.find((project) => project.id === projectId)?.clientId !== clientId));
      return;
    }
    setClientIds((current) => [...current, clientId]);
  };

  const toggleAllClients = () => {
    const activeClientIds = activeClients.map((client) => client.id);
    const allSelected = activeClientIds.every((clientId) => clientIds.includes(clientId));
    if (allSelected) {
      setClientIds([]);
      setProjectIds([]);
      return;
    }
    setClientIds((current) => unique([...current, ...activeClientIds]));
  };

  const toggleAllProjects = () => {
    const availableProjectIds = availableProjects.map((project) => project.id);
    setProjectIds((current) => {
      const allSelected = availableProjectIds.every((projectId) => current.includes(projectId));
      return allSelected
        ? current.filter((projectId) => !availableProjectIds.includes(projectId))
        : unique([...current, ...availableProjectIds]);
    });
  };

  const changeJobTitleChoice = (nextChoice: JobTitleChoice) => {
    setJobTitleChoice(nextChoice);
    if (!nextChoice) {
      setJobTitle("");
      return;
    }
    if (nextChoice === customJobTitleValue) {
      if (isStandardJobTitle(jobTitle)) setJobTitle("");
      return;
    }
    setJobTitle(nextChoice);
  };

  const send = () => {
    if (!canSend) return;
    onSubmit({
      role,
      email: normalisedEmail,
      name,
      jobTitle,
      clientIds: role === "Studio Staff" ? [] : selectedClientIds,
      projectIds: role === "Studio Staff" ? [] : selectedProjects,
    });
  };

  return (
    <ClientModal
      className="invite-person-modal"
      title="Invite person"
      description={`Step ${step} of 2 - ${step === 1 ? "Who are you inviting?" : "Add the relevant details"}`}
      onClose={onClose}
      footer={step === 1 ? (
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <button className="client-primary-button label-m-semibold" type="button" disabled={!emailIsValid} onClick={goNext}>Next</button>
        </>
      ) : (
        <>
          <Button size="M" variant="secondary" onClick={() => setStep(1)}>Back</Button>
          <button className="client-primary-button label-m-semibold" type="button" disabled={!canSend} onClick={send}>Send invite</button>
        </>
      )}
    >
      <div className="invite-person-flow">
        <ol className="invite-person-progress" aria-label="Invitation progress">
          <li className="is-active label-xs-semibold" aria-current={step === 1 ? "step" : undefined}><span>1</span> Person</li>
          <li className={step === 2 ? "is-active label-xs-semibold" : "label-xs-semibold"} aria-current={step === 2 ? "step" : undefined}><span>2</span> Access</li>
        </ol>

        {step === 1 ? (
          <>
            <fieldset className="invite-role-choice">
              <legend className="label-m-semibold">Who are you inviting?</legend>
              <div>
                {roleOptions.map((option) => (
                  <label className={role === option.role ? "is-selected" : ""} key={option.role}>
                    <input type="radio" name="invitation-role" value={option.role} checked={role === option.role} onChange={() => changeRole(option.role)} />
                    <span><strong className="label-s-semibold">{option.role === "Customer" ? "Client" : option.role}</strong><small className="label-xs">{option.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="invite-person-identity-fields">
              <Input label="Email" type="email" value={email} hint="Required" error={attemptedNext && !emailIsValid} onChange={(event) => setEmail(event.target.value)} />
              <Input label="Name" value={name} hint="Optional" onChange={(event) => setName(event.target.value)} />
            </div>
            {attemptedNext && !emailIsValid ? <p className="invite-field-error label-xs" role="alert">Enter a valid email address.</p> : null}
            {existingPerson ? <ExistingPersonNotice name={existingPerson.name} /> : null}
          </>
        ) : (
          <>
            <section className="invite-person-summary" aria-label="Person being invited">
              <span><strong className="label-m-semibold">{name.trim() || existingPerson?.name || normalisedEmail}</strong><small className="label-xs">{normalisedEmail}</small></span>
              <button className="client-text-button label-xs-semibold" type="button" onClick={() => setStep(1)}>Change</button>
            </section>

            {role === "Studio Staff" ? (
              <JobTitleField
                choice={jobTitleChoice}
                jobTitle={jobTitle}
                label="Job title"
                onChoiceChange={changeJobTitleChoice}
                onCustomChange={setJobTitle}
              />
            ) : null}

            {role === "Studio Freelancer" ? (
              <>
                <JobTitleField
                  choice={jobTitleChoice}
                  jobTitle={jobTitle}
                  label="Job title or project role"
                  onChoiceChange={changeJobTitleChoice}
                  onCustomChange={setJobTitle}
                />
                <SearchableSelection
                  label="Clients"
                  emptyMessage="No Clients match this search."
                  options={activeClients.map((client) => ({ value: client.id, label: client.name, description: client.website }))}
                  selected={clientIds}
                  onToggle={toggleClient}
                  selectAll={{ label: "All Clients", onToggle: toggleAllClients }}
                />
                <SearchableSelection
                  label="Projects"
                  emptyMessage={clientIds.length ? "No projects match this search." : "Choose at least one Client to see projects."}
                  options={availableProjects.map((project) => ({ value: project.id, label: project.name, description: project.clientName }))}
                  selected={selectedProjects}
                  onToggle={(projectId) => setProjectIds((current) => toggleValue(current, projectId))}
                  selectAll={{ label: "All projects", onToggle: toggleAllProjects }}
                />
              </>
            ) : null}

            {role === "Customer" ? (
              <>
                <div className="invite-person-select-field">
                  <span className="label-m-semibold">Client company</span>
                  <BriskSelect
                    ariaLabel="Select Client company"
                    clearable={false}
                    options={activeClients.map((client) => ({ value: client.id, label: client.name }))}
                    placeholder="Select a Client"
                    searchable
                    value={customerClientId}
                    onChange={changeCustomerClient}
                  />
                </div>
                <SearchableSelection
                  label="Projects (optional)"
                  emptyMessage={customerClientId ? "No projects match this search." : "Choose a Client company to see projects."}
                  options={availableProjects.map((project) => ({ value: project.id, label: project.name, description: project.status }))}
                  selected={selectedProjects}
                  onToggle={(projectId) => setProjectIds((current) => toggleValue(current, projectId))}
                  selectAll={{ label: "All projects", onToggle: toggleAllProjects }}
                />
              </>
            ) : null}

            {existingPerson ? <ExistingPersonNotice name={existingPerson.name} /> : null}
            {hasCustomerConflict ? (
              <div className="invite-person-warning" role="alert"><DsIcon name="alert-triangle" size={18} /><p className="label-s">This email is already a Client contact for {existingPerson?.clientName}. Choose that Client or use a different email to keep Client data isolated.</p></div>
            ) : null}
            <AccessExplanation role={role} clientIds={selectedClientIds} inviteeName={inviteeName} projectIds={selectedProjects} />
          </>
        )}
      </div>
    </ClientModal>
  );
}

function ExistingPersonNotice({ name }: { name: string }) {
  return (
    <div className="invite-existing-person">
      <DsIcon name="check-circle" size={18} />
      <p className="label-s"><strong className="label-s-semibold">{name} already has a Person record.</strong> Brisk will update the same person&apos;s project access instead of creating a duplicate.</p>
    </div>
  );
}

function JobTitleField({ choice, jobTitle, label, onChoiceChange, onCustomChange }: {
  choice: JobTitleChoice;
  jobTitle: string;
  label: string;
  onChoiceChange: (choice: JobTitleChoice) => void;
  onCustomChange: (jobTitle: string) => void;
}) {
  return (
    <div className="invite-job-title-field">
      <div className="invite-person-select-field">
        <span className="label-m-semibold">{label}</span>
        <BriskSelect
          ariaLabel={`Choose ${label.toLocaleLowerCase("en-AU")}`}
          options={jobTitleOptions}
          placeholder="Choose a role"
          searchable={false}
          value={choice}
          onChange={(value) => onChoiceChange(value)}
        />
        <small className="label-xs">Optional - job titles and project roles never change permissions.</small>
      </div>
      {choice === customJobTitleValue ? (
        <Input label="Custom role" value={jobTitle} hint="Enter a job title or project role" onChange={(event) => onCustomChange(event.target.value)} />
      ) : null}
    </div>
  );
}

function AccessExplanation({ clientIds, inviteeName, projectIds, role }: { clientIds: string[]; inviteeName: string; projectIds: string[]; role: InvitationRole }) {
  const { clients } = useClients();
  const { state } = usePrototypeState();
  const selectedClients = clients.filter((client) => clientIds.includes(client.id));
  const selectedProjects = selectWorkspaceProjects(state, state.session.activeWorkspaceId).filter((project) => projectIds.includes(project.id));
  const firstProject = selectedProjects[0];
  const accessSentence = role === "Studio Staff"
    ? "They can see and act on everything in the Studio workspace."
    : role === "Studio Freelancer"
      ? "They can only see the Clients and projects you choose."
      : projectIds.length > 0
        ? `${inviteeName} belongs to ${selectedClients[0]?.name ?? "one Client company"} and can only see the projects you choose.`
        : `${inviteeName} belongs to ${selectedClients[0]?.name ?? "one Client company"}. No project access has been added yet.`;
  const destinationSentence = role === "Customer"
    ? null
    : role === "Studio Staff"
      ? "The invitation opens the North Star Films Studio workspace."
      : firstProject
      ? `The invitation opens ${firstProject.name}.`
      : "The invitation opens their selected project access.";

  return (
    <section className="invite-access-explanation" aria-label="Access summary">
      <span><DsIcon name="lock" size={18} /></span>
      <div>
        <strong className="label-m-semibold">What they can access</strong>
        <p className="paragraph-s">{accessSentence}</p>
        {role === "Customer" ? (
          <p className="label-xs">
            {projectIds.length > 0
              ? "They can comment, approve and invite other Client contacts from the same Client. Studio notes, rates, freelancer costs, other Clients and internal comments stay private."
              : "Add project access when the first video is ready. Other Clients and Studio-only information stay private."}
          </p>
        ) : null}
        {destinationSentence ? <p className="label-xs">{destinationSentence}</p> : null}
        {role !== "Customer" ? <p className="label-xs">Job titles and project roles never change permissions.</p> : null}
      </div>
    </section>
  );
}

function SearchableSelection({ emptyMessage, label, onToggle, options, selectAll, selected }: {
  emptyMessage: string;
  label: string;
  onToggle: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string; description: string }>;
  selectAll?: { label: string; onToggle: () => void };
  selected: string[];
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const showSearch = options.length >= 6;
  const normalisedQuery = showSearch ? query.trim().toLocaleLowerCase("en-AU") : "";
  const filteredOptions = normalisedQuery
    ? options.filter((option) => option.label.toLocaleLowerCase("en-AU").includes(normalisedQuery))
    : options;
  const allSelected = options.length > 0 && options.every((option) => selected.includes(option.value));
  const someSelected = options.some((option) => selected.includes(option.value));

  useEffect(() => {
    if (!showSearch && query) setQuery("");
  }, [query, showSearch]);

  return (
    <fieldset className="invite-searchable-selection">
      <legend>
        <span className="invite-selection-title label-m-semibold">
          {label} <small className="invite-selection-count label-xs">{selected.length} selected</small>
        </span>
        {showSearch ? (
          <label className="invite-selection-search" htmlFor={inputId}>
            <DsIcon name="search" size={16} />
            <span className="sr-only">Search {label}</span>
            <input id={inputId} type="search" value={query} placeholder={`Search ${label}`} onChange={(event) => setQuery(event.target.value)} />
          </label>
        ) : null}
        {selectAll && options.length > 0 ? (
          <label className="invite-select-all label-s-semibold">
            <input
              ref={(element) => {
                if (element) element.indeterminate = someSelected && !allSelected;
              }}
              type="checkbox"
              checked={allSelected}
              onChange={selectAll.onToggle}
            />
            <span>{selectAll.label}</span>
          </label>
        ) : null}
      </legend>
      <div className="invite-selection-options">
        {filteredOptions.map((option) => (
          <label className={selected.includes(option.value) ? "is-selected" : ""} key={option.value}>
            <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} />
            <span><strong className="label-s-semibold">{option.label}</strong><small className="label-xs">{option.description}</small></span>
          </label>
        ))}
        {filteredOptions.length === 0 ? <p className="invite-selection-empty label-s">{emptyMessage}</p> : null}
      </div>
    </fieldset>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isStandardJobTitle(value: string): value is typeof standardJobTitles[number] {
  return standardJobTitles.some((title) => title === value);
}
