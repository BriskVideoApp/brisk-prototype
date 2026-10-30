"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";
import { ActionMenu, type BrandMenuItem } from "@/components/brand-kits/AssetManagement";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useInvitations } from "@/components/invitations/InvitationContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import {
  ClientCompanySettingsPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  type ClientProjectAccess,
  type ClientMembershipRole,
  type ClientTeamMember,
} from "@/data/client-account-settings";
import { clientMembershipLabels } from "@/data/prototype-permissions";
import { prototypeCustomerPersonId } from "@/data/people";
import { selectClientProjects } from "@/data/prototype-state";

const clientRoleOptions: ReadonlyArray<{ value: ClientMembershipRole; label: string }> = [
  { value: "Client Admin", label: "Owner" },
  { value: "Client Member", label: "Teammate" },
];

export function ClientTeamPage() {
  const { state, setClientMemberProjects } = usePrototypeState();
  const { account, clientId: accountClientId } = useClientAccountSettings();
  const clientId = accountClientId ?? "loom";
  const projectOptions = selectClientProjects(state, state.session.activeWorkspaceId, clientId)
    .map((project) => ({ id: project.id, code: project.code ?? "", name: project.name }));
  const { resendInvitation } = useInvitations();
  const {
    createPerson,
    deletePerson,
    people,
    setPersonStatus,
    updatePersonClientMembershipRole,
    updatePersonProjectAccess,
  } = usePeople();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [projectMember, setProjectMember] = useState<ClientTeamMember | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const currentCustomer = people.find((person) => person.id === prototypeCustomerPersonId) ?? null;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const memberActions = (member: ClientTeamMember): BrandMenuItem[] => {
    if (member.status === "Pending invitation") {
      return [
        {
          label: "Resend invitation",
          icon: "envelope-simple",
          onSelect: () => {
            const person = people.find((candidate) => candidate.id === member.id);
            if (person) resendInvitation(person);
            setToast(`Invitation resent to ${member.email}.`);
          },
        },
        {
          label: "Cancel invitation",
          icon: "trash-simple",
          destructive: true,
          onSelect: () => {
            setClientMemberProjects({ clientId, memberId: member.id, projectIds: [] });
            deletePerson(member.id);
            setToast(`Invitation for ${member.email} was cancelled.`);
          },
        },
      ];
    }

    return [{
      label: "Remove user",
      icon: "trash-simple",
      destructive: true,
      onSelect: () => {
        updatePersonProjectAccess(member.id, []);
        setClientMemberProjects({ clientId, memberId: member.id, projectIds: [] });
        setPersonStatus(member.id, "Paused");
        setToast(`${member.name} was removed from ${account.company.name}.`);
      },
    }];
  };

  return (
    <ClientSettingsAccessBoundary requireAdmin>
      <ClientCompanySettingsPageShell
        title="Team access"
      >
        <section className="account-team-section" aria-labelledby="client-team-heading">
          <div className="account-settings-section-heading">
            <div>
              <h2 className="headings-xs-bold" id="client-team-heading">{account.company.name} team</h2>
              <p className="paragraph-s">Client Owners manage company details, billing and access. Anyone on a project can review and approve.</p>
            </div>
            <Button size="S" onClick={() => setInviteModalOpen(true)}>
              <span className="account-settings-button-content"><DsIcon name="plus" size={16} />Invite colleague</span>
            </Button>
          </div>

          <div className="account-team-table-frame">
            <table className="account-team-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Project access</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {account.team.map((member) => {
                  const isCurrentUser = member.id === prototypeCustomerPersonId;
                  const projectCount = member.projectIds.filter((id) => projectOptions.some((project) => project.id === id)).length;
                  const visibleMember = isCurrentUser && currentCustomer ? {
                    ...member,
                    name: currentCustomer.name,
                    email: currentCustomer.email,
                    avatarUrl: currentCustomer.avatarUrl,
                  } : member;
                  return (
                    <tr key={member.id}>
                      <td data-label="Person">
                        <div className="account-team-person">
                          <PeopleAvatar person={{ avatarUrl: visibleMember.avatarUrl, name: visibleMember.name, type: "Client contact" }} size="S" />
                          <span>
                            <strong className="label-m-semibold">{visibleMember.name}{isCurrentUser ? " (you)" : ""}</strong>
                            <small className="label-xs">{visibleMember.email}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Role">
                        {isCurrentUser ? (
                          <span className="label-s-semibold">{clientMembershipLabels[member.role]}</span>
                        ) : (
                          <BriskSelect
                            ariaLabel={`Role for ${member.name}`}
                            clearable={false}
                            options={clientRoleOptions}
                            placeholder="Choose role"
                            searchable={false}
                            value={member.role}
                            onChange={(role) => {
                              const nextRole = role as ClientMembershipRole;
                              updatePersonClientMembershipRole(member.id, nextRole);
                            }}
                          />
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`account-settings-status-badge ${member.status === "Active" ? "is-active" : "is-pending"} label-xs-semibold`}>
                          {member.status}
                        </span>
                        {member.invitationSentAt ? <small className="account-team-invite-date label-xs">Sent {member.invitationSentAt}</small> : null}
                      </td>
                      <td data-label="Project access">
                        <button className="account-team-project-button label-s-semibold" type="button" onClick={() => setProjectMember(member)}>
                          {projectOptions.length > 0 && projectCount === projectOptions.length
                            ? "All projects"
                            : `${projectCount} ${projectCount === 1 ? "project" : "projects"}`}
                          <DsIcon name="caret-right" size={14} />
                        </button>
                      </td>
                      <td data-label="Actions">
                        {isCurrentUser ? <span className="label-xs account-team-current-label">Current account</span> : <ActionMenu label={`Actions for ${member.name}`} items={memberActions(member)} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {inviteModalOpen ? (
          <InviteClientColleagueModal
            clientName={account.company.name}
            projectOptions={projectOptions}
            onClose={() => setInviteModalOpen(false)}
            onInvite={(input) => {
              const person = createPerson({
                type: "Client contact",
                name: input.name,
                email: input.email,
                clientId,
                projectIds: input.projectIds,
              });
              setClientMemberProjects({ clientId, memberId: person.id, projectIds: input.projectIds, role: input.role });
              setInviteModalOpen(false);
              setToast(`Invitation sent to ${input.email}.`);
            }}
          />
        ) : null}

        {projectMember ? (
          <ProjectAccessModal
            member={projectMember}
            projectOptions={projectOptions}
            onClose={() => setProjectMember(null)}
            onSave={(projectIds) => {
              updatePersonProjectAccess(projectMember.id, projectIds);
              setClientMemberProjects({ clientId, memberId: projectMember.id, projectIds });
              setProjectMember(null);
              setToast(`Project access updated for ${projectMember.name}.`);
            }}
          />
        ) : null}

        {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
      </ClientCompanySettingsPageShell>
    </ClientSettingsAccessBoundary>
  );
}

function InviteClientColleagueModal({
  clientName,
  onClose,
  onInvite,
  projectOptions,
}: {
  clientName: string;
  onClose: () => void;
  onInvite: (input: { name: string; email: string; role: ClientMembershipRole; projectIds: string[] }) => void;
  projectOptions: readonly ClientProjectAccess[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientMembershipRole>("Client Member");
  const [projectIds, setProjectIds] = useState<string[]>(() => projectOptions[0] ? [projectOptions[0].id] : []);

  return (
    <ClientModal
      title="Invite a colleague"
      description={`Invite someone to ${clientName} and choose the projects they can open.`}
      onClose={onClose}
      footer={(
        <>
          <Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="S" disabled={!name.trim() || !email.trim()} onClick={() => {
            if (name.trim() && email.trim()) onInvite({ name: name.trim(), email: email.trim(), role, projectIds });
          }}>Send invitation</Button>
        </>
      )}
    >
      <div className="account-team-invite-form">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="account-settings-select-field">
          <span className="label-m-semibold">Role</span>
          <BriskSelect
            ariaLabel="Client role"
            clearable={false}
            options={clientRoleOptions}
            placeholder="Choose role"
            searchable={false}
            value={role}
            onChange={(nextRole) => setRole(nextRole as ClientMembershipRole)}
          />
        </label>
        <ProjectAccessChecklist projectIds={projectIds} projectOptions={projectOptions} onChange={setProjectIds} />
      </div>
    </ClientModal>
  );
}

function ProjectAccessModal({
  member,
  onClose,
  onSave,
  projectOptions,
}: {
  member: ClientTeamMember;
  onClose: () => void;
  onSave: (projectIds: string[]) => void;
  projectOptions: readonly ClientProjectAccess[];
}) {
  const [projectIds, setProjectIds] = useState<string[]>(() => [...member.projectIds]);
  return (
    <ClientModal
      title={`Project access for ${member.name}`}
      description="Choose the Client projects this person can open."
      onClose={onClose}
      footer={(
        <>
          <Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="S" onClick={() => onSave(projectIds)}>Save access</Button>
        </>
      )}
    >
      <ProjectAccessChecklist projectIds={projectIds} projectOptions={projectOptions} onChange={setProjectIds} />
    </ClientModal>
  );
}

function ProjectAccessChecklist({
  onChange,
  projectIds,
  projectOptions,
}: {
  onChange: (projectIds: string[]) => void;
  projectIds: string[];
  projectOptions: readonly ClientProjectAccess[];
}) {
  const allSelected = projectOptions.length > 0 && projectOptions.every((project) => projectIds.includes(project.id));
  const someSelected = projectOptions.some((project) => projectIds.includes(project.id));
  return (
    <fieldset className="account-team-project-checklist">
      <legend className="label-m-semibold">Project access</legend>
      <Checkbox
        wrapperClassName="account-team-project-all"
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onChange={(checked) => onChange(checked ? projectOptions.map((project) => project.id) : [])}
        label={<span><strong className="label-s-semibold">All current projects</strong><small className="label-xs">Give access to every project listed below.</small></span>}
      />
      <div className="account-team-project-divider label-xs-semibold"><span>Or choose individual projects</span></div>
      <div className="account-team-project-options">
        {projectOptions.map((project) => (
          <Checkbox
            key={project.id}
            checked={projectIds.includes(project.id)}
            onChange={(checked) => onChange(checked
              ? [...new Set([...projectIds, project.id])]
              : projectIds.filter((projectId) => projectId !== project.id))}
            label={<span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.code}</small></span>}
          />
        ))}
      </div>
    </fieldset>
  );
}
