"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ActionMenu, type BrandMenuItem } from "@/components/brand-kits/AssetManagement";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import {
  ClientCompanySettingsPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  clientProjectAccessOptions,
  type ClientMembershipRole,
  type ClientTeamMember,
} from "@/data/client-account-settings";
import { prototypeCustomerPersonId } from "@/data/people";

const clientRoleOptions: ReadonlyArray<{ value: ClientMembershipRole; label: string }> = [
  { value: "Client Admin", label: "Client Admin" },
  { value: "Client Member", label: "Client Member" },
];

export function ClientTeamPage() {
  const {
    createPerson,
    deletePerson,
    people,
    setPersonStatus,
    updatePersonClientMembershipRole,
    updatePersonProjectAccess,
  } = usePeople();
  const {
    account,
    cancelInvitation,
    inviteTeamMember,
    removeTeamMember,
    resendInvitation,
    updateTeamMemberProjects,
    updateTeamMemberRole,
  } = useClientAccountSettings();
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
            resendInvitation(member.id);
            setPersonStatus(member.id, "Invited");
            setToast(`Invitation resent to ${member.email}.`);
          },
        },
        {
          label: "Cancel invitation",
          icon: "trash-simple",
          destructive: true,
          onSelect: () => {
            cancelInvitation(member.id);
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
        removeTeamMember(member.id);
        updatePersonProjectAccess(member.id, []);
        setPersonStatus(member.id, "Paused");
        setToast(`${member.name} was removed from Loom.`);
      },
    }];
  };

  return (
    <ClientSettingsAccessBoundary requireAdmin>
      <ClientCompanySettingsPageShell
        activeSection="team"
        title="Team access"
      >
        <section className="account-team-section" aria-labelledby="client-team-heading">
          <div className="account-settings-section-heading">
            <div>
              <h2 className="headings-xs-bold" id="client-team-heading">Loom team</h2>
              <p className="paragraph-s">Client Admins manage this list. Project access is selected per person.</p>
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
                          <span className="label-s-semibold">{member.role}</span>
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
                              updateTeamMemberRole(member.id, nextRole);
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
                          {member.projectIds.length === clientProjectAccessOptions.length
                            ? "All projects"
                            : `${member.projectIds.length} ${member.projectIds.length === 1 ? "project" : "projects"}`}
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
            onClose={() => setInviteModalOpen(false)}
            onInvite={(input) => {
              const person = createPerson({
                type: "Client contact",
                name: input.name,
                email: input.email,
                clientId: "loom",
                projectIds: input.projectIds,
              });
              inviteTeamMember({ ...input, memberId: person.id });
              setInviteModalOpen(false);
              setToast(`Invitation sent to ${input.email}.`);
            }}
          />
        ) : null}

        {projectMember ? (
          <ProjectAccessModal
            member={projectMember}
            onClose={() => setProjectMember(null)}
            onSave={(projectIds) => {
              updateTeamMemberProjects(projectMember.id, projectIds);
              updatePersonProjectAccess(projectMember.id, projectIds);
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
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (input: { name: string; email: string; role: ClientMembershipRole; projectIds: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientMembershipRole>("Client Member");
  const [projectIds, setProjectIds] = useState<string[]>([clientProjectAccessOptions[0]?.id ?? ""]);

  return (
    <ClientModal
      title="Invite a colleague"
      description="They will receive access to the projects you choose."
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" disabled={!name.trim() || !email.trim()} onClick={() => {
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
        <ProjectAccessChecklist projectIds={projectIds} onChange={setProjectIds} />
      </div>
    </ClientModal>
  );
}

function ProjectAccessModal({
  member,
  onClose,
  onSave,
}: {
  member: ClientTeamMember;
  onClose: () => void;
  onSave: (projectIds: string[]) => void;
}) {
  const [projectIds, setProjectIds] = useState<string[]>(() => [...member.projectIds]);
  return (
    <ClientModal
      title={`Project access for ${member.name}`}
      description="Choose the Client projects this person can open."
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" onClick={() => onSave(projectIds)}>Save access</Button>
        </>
      )}
    >
      <ProjectAccessChecklist projectIds={projectIds} onChange={setProjectIds} />
    </ClientModal>
  );
}

function ProjectAccessChecklist({
  onChange,
  projectIds,
}: {
  onChange: (projectIds: string[]) => void;
  projectIds: string[];
}) {
  const allSelected = useMemo(() => projectIds.length === clientProjectAccessOptions.length, [projectIds]);
  return (
    <fieldset className="account-team-project-checklist">
      <legend className="label-m-semibold">Project access</legend>
      <label className="account-team-project-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => onChange(event.target.checked ? clientProjectAccessOptions.map((project) => project.id) : [])}
        />
        <span><strong className="label-s-semibold">All current projects</strong><small className="label-xs">Give access to every project listed below.</small></span>
      </label>
      <div className="account-team-project-divider label-xs-semibold"><span>Or choose individual projects</span></div>
      <div className="account-team-project-options">
        {clientProjectAccessOptions.map((project) => (
          <label key={project.id}>
            <input
              type="checkbox"
              checked={projectIds.includes(project.id)}
              onChange={(event) => onChange(event.target.checked
                ? [...new Set([...projectIds, project.id])]
                : projectIds.filter((projectId) => projectId !== project.id))}
            />
            <span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.code}</small></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
