"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";
import { Tabs } from "../../../Brisk DS/src/app/components/Tabs";
import { BriskSelect } from "@/components/form/BriskSelect";
import type { Project } from "@/components/active-videos/types";
import { ClientPicker, ClientAvatar, ClientModal, ClientStatusBadge } from "@/components/clients/ClientPrimitives";
import { useClients } from "@/components/clients/ClientDataContext";
import { formatRelativeDate, getWithinProjectStatus } from "@/components/clients/ClientsPage";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { InvitationStatusBadge, useInvitations, type InvitationStatus } from "@/components/invitations/InvitationContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { selectClientProjects } from "@/data/prototype-state";
import { getBrandKitCustomer, getBrandKitCustomerForClient } from "@/data/brand-kits";
import { getBrandKitStorageKey, readStoredBrandKit, type StoredBrandKit } from "@/components/brand-kits/BrandKitContext";
import { getDefaultProjectCodePrefix, type Client, type ClientContact } from "@/data/clients";

type ClientProfileSection = "Overview" | "Contacts" | "Brand Kit";
type ProfileModal = "start-project" | "archive" | "edit-project-access" | null;

const profileSections: readonly ClientProfileSection[] = ["Overview", "Contacts", "Brand Kit"];

export function ClientProfilePage({ clientId }: { clientId: string }) {
  const {
    clients,
    archiveClient,
    restoreClient,
    updateClient,
    updateContactAccess,
    updateContactProjects,
  } = useClients();
  const { state, createProject } = usePrototypeState();
  const { people } = usePeople();
  const { getInvitationStatus, openInvitePerson, resendInvitation } = useInvitations();
  const { selectedRole } = usePrototypeRole();
  const searchParams = useSearchParams();
  const client = clients.find((candidate) => candidate.id === clientId) ?? null;
  const requestedSection = searchParams.get("section");
  const [section, setSection] = useState<ClientProfileSection>(isClientProfileSection(requestedSection) ? requestedSection : "Overview");
  const [modal, setModal] = useState<ProfileModal>(searchParams.get("dialog") === "archive" ? "archive" : null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isStudioStaff = selectedRole === "Studio Staff";

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!client) {
    return (
      <main className="client-not-found">
        <h1 className="headings-s-bold">Client not found</h1>
        <p className="paragraph-s">This Client may have been moved or is not part of this prototype Studio.</p>
        <Link className="client-secondary-button label-s-semibold" href="/clients">Back to Clients</Link>
      </main>
    );
  }

  if (!isStudioStaff) {
    return <ClientProfilePermissionState role={selectedRole} />;
  }

  const projects = selectClientProjects(state, state.session.activeWorkspaceId, client.id);
  const selectedContact = client.contacts.find((contact) => contact.id === selectedContactId) ?? null;

  const openInvite = () => openInvitePerson({ role: "Customer", clientId: client.id });
  const portalHref = `/workspaces/${encodeURIComponent(state.session.activeWorkspaceId)}/clients/${encodeURIComponent(client.id)}/portal?studio-preview=1`;
  return (
    <main className="client-profile-page">
      <header className="client-profile-header">
        <div className="client-profile-header-inner">
          <div className="client-profile-breadcrumb">
            <Link className="label-s-semibold" href="/clients"><DsIcon name="arrow-left" size={16} /> Clients</Link>
          </div>
          <div className="client-profile-heading">
            <div className="client-profile-identity">
              <ClientAvatar client={client} size="L" />
              <div>
                <span className="label-xs-semibold">Client</span>
                <h1 className="headings-m-bold">{client.name}</h1>
                <span className="label-s">{client.website || "No website added"}</span>
              </div>
            </div>
            <div className="client-profile-actions">
              <Button size="M" variant="secondary" onClick={openInvite}>Invite teammate</Button>
              <Link className="client-secondary-button label-m-semibold" href={portalHref}>Go to {client.name}&apos;s dashboard</Link>
              <Button size="M" onClick={() => setModal("start-project")}>
                <span className="client-button-content"><DsIcon name="plus" size={16} /> Start project</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {client.status === "Archived" ? (
        <section className="client-archive-banner" role="status">
          <DsIcon name="info" size={18} />
          <span className="label-s">This Client is archived. Projects and files are intact, and portal access is paused.</span>
          <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={() => restoreClient(client.id)}>Restore Client</Button>
        </section>
      ) : null}

      <Tabs
        className="client-profile-tabs"
        label="Client profile sections"
        layout="page"
        value={section}
        options={profileSections.map((item) => ({ value: item, label: item }))}
        onValueChange={setSection}
      >
      <div className="client-profile-content">
        {section === "Overview" ? (
          <OverviewSection
            client={client}
            clients={clients}
            dashboardHref={portalHref}
            projects={projects}
            onArchive={() => setModal("archive")}
            onRestore={() => restoreClient(client.id)}
            onSave={(update) => {
              updateClient(client.id, update);
              setToast("Client details saved");
            }}
          />
        ) : null}
        {section === "Contacts" ? (
          <ContactsSection
            client={client}
            projects={projects}
            onChangeProjects={(contact) => {
              setSelectedContactId(contact.id);
              setModal("edit-project-access");
            }}
            getStatus={(contact) => {
              const person = people.find((candidate) => candidate.id === contact.id || candidate.email.toLocaleLowerCase("en-AU") === contact.email.toLocaleLowerCase("en-AU"));
              return person ? getInvitationStatus(person) : contact.portalAccess === "Invited" ? "Pending" : "Accepted";
            }}
            onResend={(contact) => {
              const person = people.find((candidate) => candidate.id === contact.id || candidate.email.toLocaleLowerCase("en-AU") === contact.email.toLocaleLowerCase("en-AU"));
              if (person) resendInvitation(person);
            }}
            onRemove={(contact) => updateContactAccess(client.id, contact.id, "Paused")}
            onRestore={(contact) => updateContactAccess(client.id, contact.id, "Active")}
          />
        ) : null}
        {section === "Brand Kit" ? <BrandKitSection client={client} /> : null}
      </div>
      </Tabs>

      {modal === "start-project" ? (
        <StartProjectDialog
          initialClient={client}
          onClose={() => setModal(null)}
          onCreate={(projectName, projectClient) => {
            createProject({ clientId: projectClient.id, name: projectName });
            setModal(null);
            setToast(`${projectName} started for ${projectClient.name}`);
          }}
        />
      ) : null}
      {modal === "archive" ? (
        <ArchiveClientDialog
          client={client}
          projectCount={projects.length}
          onClose={() => setModal(null)}
          onArchive={() => {
            archiveClient(client.id);
            setModal(null);
            setToast(`${client.name} archived. Projects and files remain intact.`);
          }}
        />
      ) : null}
      {modal === "edit-project-access" && selectedContact ? (
        <ProjectAccessDialog
          contact={selectedContact}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={(projectIds) => {
            updateContactProjects(client.id, selectedContact.id, projectIds);
            setModal(null);
            setToast(`Project access updated for ${selectedContact.name}`);
          }}
        />
      ) : null}
      {toast ? <div className="client-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} /> {toast}</div> : null}
    </main>
  );
}

function OverviewSection({
  client,
  clients,
  dashboardHref,
  onArchive,
  onRestore,
  onSave,
  projects,
}: {
  client: Client;
  clients: Client[];
  dashboardHref: string;
  onArchive: () => void;
  onRestore: () => void;
  onSave: (update: { name: string; website: string; logoUrl: string | null; projectCodePrefix: string; primaryContactId: string | null }) => void;
  projects: Project[];
}) {
  const activeCount = projects.filter((project) => project.status === "In Production").length;
  const [form, setForm] = useState({
    name: client.name,
    website: client.website,
    logoUrl: client.logoUrl,
    projectCodePrefix: client.projectCodePrefix ?? getDefaultProjectCodePrefix(client.name),
    primaryContactId: client.primaryContactId,
  });
  const codeConflict = clients.some((candidate) => candidate.id !== client.id
    && (candidate.projectCodePrefix ?? getDefaultProjectCodePrefix(candidate.name)) === form.projectCodePrefix);
  const codeError = !/^[a-z]{1,10}$/u.test(form.projectCodePrefix) || codeConflict;
  return (
    <section className="client-overview-grid" aria-label="Client overview">
      <article className="client-summary-card is-identity">
        <header><h2 className="headings-xs-bold">Client details</h2></header>
        <div className="client-overview-details-form">
          <Input label="Client name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Website" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
          <div className="client-field">
            <Input
              label="Client code"
              value={form.projectCodePrefix}
              error={codeError}
              hint={codeConflict
                ? "This code is already used by another Client."
                : !form.projectCodePrefix
                  ? "Enter 1-10 letters."
                  : "Prefix for new project codes. Existing codes stay the same."}
              onChange={(event) => setForm((current) => ({
                ...current,
                projectCodePrefix: event.target.value.toLocaleLowerCase("en-AU").replace(/[^a-z]/gu, "").slice(0, 10),
              }))}
            />
          </div>
          <label className="client-field is-wide"><span className="label-m-semibold">Logo</span><input type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.addEventListener("load", () => setForm((current) => ({ ...current, logoUrl: typeof reader.result === "string" ? reader.result : null })));
            reader.readAsDataURL(file);
          }} /></label>
          <div className="client-field">
            <span className="label-m-semibold">Primary contact</span>
            {client.contacts.length ? (
              <BriskSelect
                ariaLabel="Primary Client contact"
                clearable={false}
                options={client.contacts.map((contact) => ({ value: contact.id, label: contact.name }))}
                placeholder="Choose a contact"
                searchable={false}
                value={form.primaryContactId ?? ""}
                onChange={(primaryContactId) => setForm((current) => ({ ...current, primaryContactId: primaryContactId || null }))}
              />
            ) : <span className="label-s client-muted">Invite a contact to choose one.</span>}
          </div>
          <dl className="client-overview-access-summary">
            <div><dt className="label-xs">Portal status</dt><dd><ClientStatusBadge status={client.portal.status} /></dd></div>
          </dl>
          <Button size="M" disabled={codeError} onClick={() => onSave(form)}>Save changes</Button>
        </div>
      </article>
      <Link className="client-metric-card is-link" href={dashboardHref} aria-label={`Open ${client.name}'s Client dashboard`}>
        <span className="client-metric-icon"><DsIcon name="queue" size={20} /></span>
        <strong className="headings-m-bold">{activeCount}</strong>
        <span className="label-s-semibold">Active {activeCount === 1 ? "project" : "projects"}</span>
        <small className="label-xs">{projects.length} total across this Client</small>
      </Link>
      <article className="client-metric-card">
        <span className="client-metric-icon"><DsIcon name="clock-clockwise" size={20} /></span>
        <strong className="headings-2xs-bold">{formatRelativeDate(client.latestActivity.occurredAt)}</strong>
        <span className="label-s-semibold">{client.latestActivity.label}</span>
        <small className="label-xs">Latest activity</small>
      </article>
      <section className="client-danger-zone client-overview-danger-zone">
        <div><h3 className="headings-2xs-bold">{client.status === "Archived" ? "Restore Client" : "Archive Client"}</h3><p className="paragraph-s">{client.status === "Archived" ? "Restore the Client to the active list and resume portal access." : "Remove the Client from the active list and pause portal access. Projects and files will not be deleted."}</p></div>
        <Button size="S" variant={client.status === "Archived" ? "secondary" : "danger"} type="button" onClick={client.status === "Archived" ? onRestore : onArchive}>{client.status === "Archived" ? "Restore Client" : "Archive Client"}</Button>
      </section>
    </section>
  );
}

function ContactsSection({
  client,
  getStatus,
  onChangeProjects,
  onRemove,
  onResend,
  onRestore,
  projects,
}: {
  client: Client;
  getStatus: (contact: ClientContact) => InvitationStatus;
  onChangeProjects: (contact: ClientContact) => void;
  onRemove: (contact: ClientContact) => void;
  onResend: (contact: ClientContact) => void;
  onRestore: (contact: ClientContact) => void;
  projects: Project[];
}) {
  return (
    <section className="client-section-stack" aria-labelledby="client-contacts-heading">
      <header className="client-section-header">
        <div><h2 className="headings-s-bold" id="client-contacts-heading">Client contacts</h2><p className="paragraph-s">Client contacts use a secure magic link. They never need a password.</p></div>
      </header>
      {client.contacts.length > 0 ? (
        <div className="client-contact-list">
          {client.contacts.map((contact) => {
            const accessibleProjects = projects.filter((project) => contact.projectIds.includes(project.id));
            const invitationStatus = getStatus(contact);
            return (
              <article className="client-contact-row" key={contact.id}>
                <span className="client-person-avatar label-s-semibold">{contact.name.split(/\s+/u).map((word) => word.charAt(0)).slice(0, 2).join("")}</span>
                <Link className="client-contact-identity" href={`/people/${contact.id}`}><strong className="label-m-semibold">{contact.name}</strong><span className="label-s">{contact.email}</span></Link>
                <div><span className="label-xs">Invitation</span><InvitationStatusBadge status={invitationStatus} />{invitationStatus !== "Accepted" ? <small className="label-xs">{invitationStatus === "Pending" ? "Waiting for them to join." : "Invite expired. Send a new one."}</small> : null}</div>
                <div><span className="label-xs">Last active</span><strong className="label-s-semibold">{contact.lastActive ? formatRelativeDate(contact.lastActive) : "Not yet"}</strong></div>
                <div className="client-contact-projects"><span className="label-xs">Projects they can access</span><strong className="label-s-semibold">{accessibleProjects.length ? accessibleProjects.map((project) => project.name).join(", ") : "None selected"}</strong></div>
                <div className="client-contact-actions">
                  {invitationStatus !== "Accepted" ? <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={() => onResend(contact)}>Resend invite</Button> : null}
                  <Button size="S" variant="secondary" className="client-secondary-button" type="button" onClick={() => onChangeProjects(contact)}>Change project access</Button>
                  {contact.portalAccess === "Paused" ? (
                    <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={() => onRestore(contact)}>Restore portal access</Button>
                  ) : (
                    <Button size="S" variant="danger" className="client-danger-text-button" type="button" onClick={() => onRemove(contact)}>Remove portal access</Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="client-section-empty"><span><DsIcon name="envelope-simple" size={28} /></span><h3 className="headings-xs-bold">No Client contacts yet</h3><p className="paragraph-s">The Client and portal can exist without a contact. Use Invite Client above when you are ready to share work.</p></div>
      )}
    </section>
  );
}

function BrandKitSection({ client }: { client: Client }) {
  const { state } = usePrototypeState();
  const [savedKit, setSavedKit] = useState<StoredBrandKit | null>(null);
  useEffect(() => {
    setSavedKit(readStoredBrandKit(getBrandKitStorageKey(state.session.activeWorkspaceId, client.id)));
  }, [client.id, state.session.activeWorkspaceId]);
  const seededKit = client.defaultBrandKitSlug ? getBrandKitCustomer(client.defaultBrandKitSlug) : null;
  const brandKit = seededKit ?? (savedKit?.profile || savedKit?.subBrands.length
    ? { ...getBrandKitCustomerForClient(client), lastUpdated: "Just now" }
    : null);
  return (
    <section className="client-section-stack" aria-labelledby="client-brand-kit-heading">
      <header className="client-section-header">
        <div><h2 className="headings-s-bold" id="client-brand-kit-heading">Brand Kit</h2><p className="paragraph-s">Use the existing Brand Kit for logos, colours and production-ready brand assets.</p></div>
        {brandKit ? <Link className="client-primary-link label-m-semibold" href={`/brand-kits/${brandKit.slug}`}>Open Brand Kit</Link> : null}
      </header>
      {brandKit ? (
        <article className="client-brand-kit-card">
          <div className="client-brand-kit-visual">
            <ClientAvatar client={client} size="L" />
            <span className="client-brand-swatch is-primary" />
            <span className="client-brand-swatch is-secondary" />
            <span className="client-brand-type headings-xs-bold">Aa</span>
          </div>
          <div>
            <span className="label-xs-semibold">{seededKit ? "Default for new projects" : "Client Brand Kit"}</span>
            <h3 className="headings-xs-bold">{brandKit.name} Brand Kit</h3>
            <p className="paragraph-s">Logos, colours, fonts, imagery, voice and brand guidelines stay managed in one Brand Kit.</p>
            <div><ClientStatusBadge status="Active" /><span className="label-xs">Updated {brandKit.lastUpdated}</span></div>
          </div>
          <div className="client-brand-kit-actions">
            <span className="label-xs"><DsIcon name="check-circle" size={14} /> {seededKit ? "Default Brand Kit selected" : "Brand Kit started"}</span>
          </div>
        </article>
      ) : (
        <div className="client-section-empty is-brand-kit"><img src="/brisk-visuals/brand-kit-empty-state-purple-shadow.png" alt="" /><h3 className="headings-xs-bold">No Brand Kit yet</h3><p className="paragraph-s">Add logos, colours and brand assets, then choose this as the default for new projects.</p><Link className="client-primary-link label-m-semibold" href={`/brand-kits/${client.id}`}>Add Brand Kit</Link></div>
      )}
    </section>
  );
}

function StartProjectDialog({ initialClient, onClose, onCreate }: { initialClient: Client; onClose: () => void; onCreate: (name: string, client: Client) => void }) {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState(initialClient);
  return (
    <ClientModal title="Start project" description="Every project has one primary Client. You can select an existing Client or add one without leaving this flow." onClose={onClose} footer={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" variant="primary"  type="button" disabled={!projectName.trim()} onClick={() => onCreate(projectName.trim(), client)}>Create project</Button></>}>
      <div className="client-form-grid"><Input wrapperClassName="is-wide" label="Project name" autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} /><div className="is-wide"><ClientPicker value={client.id} onChange={setClient} /></div></div>
    </ClientModal>
  );
}

function ArchiveClientDialog({ client, onArchive, onClose, projectCount }: { client: Client; onArchive: () => void; onClose: () => void; projectCount: number }) {
  return <ConfirmationDialog title={`Archive ${client.name}?`} description="This removes the Client from the active list and pauses portal access." cancelLabel="Keep Client active" confirmLabel="Archive Client" tone="danger" onCancel={onClose} onConfirm={onArchive}>
    <p><strong>Projects and files will not be deleted.</strong> All {projectCount} connected {projectCount === 1 ? "project" : "projects"}, files, Brand Kit assets and messages remain intact. Studio Staff can restore this Client later.</p>
  </ConfirmationDialog>;
}

function ProjectAccessDialog({ contact, onClose, onSave, projects }: { contact: ClientContact; onClose: () => void; onSave: (projectIds: string[]) => void; projects: Project[] }) {
  const [projectIds, setProjectIds] = useState(contact.projectIds);
  return (
    <ClientModal title="Change project access" description={`Choose which ${contact.name} can open in the Client portal.`} onClose={onClose} footer={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" onClick={() => onSave(projectIds)}>Save access</Button></>}>
      <div className="client-access-list">
        {projects.map((project) => (
          <Checkbox
            wrapperClassName="client-access-option"
            key={project.id}
            checked={projectIds.includes(project.id)}
            onChange={(checked) => setProjectIds((current) => checked
              ? [...current, project.id]
              : current.filter((id) => id !== project.id))}
            label={<span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.status} - {getWithinProjectStatus(project)}</small></span>}
          />
        ))}
        {projects.length === 0 ? <p className="paragraph-s">There are no projects to share yet.</p> : null}
      </div>
    </ClientModal>
  );
}

function ClientProfilePermissionState({ role }: { role: "Studio Staff" | "Studio Freelancer" | "Customer" }) {
  const isFreelancer = role === "Studio Freelancer";
  return (
    <main className="clients-permission-state"><span><DsIcon name="lock" size={28} /></span><h1 className="headings-s-bold">{isFreelancer ? "This Client profile is not part of your invited projects" : "This Client is not available in your portal"}</h1><p className="paragraph-s">{isFreelancer ? "Studio Freelancers can see only the Client details needed for projects they are invited to. Ask the Studio producer if you need access." : "Clients can open only their own portal and the projects the Studio has shared with them."}</p><Link className="client-secondary-button label-s-semibold" href={isFreelancer ? "/active-videos" : "/customer-dashboard"}>{isFreelancer ? "Back to invited projects" : "Open your Client portal"}</Link></main>
  );
}

function isClientProfileSection(value: string | null): value is ClientProfileSection {
  return value !== null && profileSections.includes(value as ClientProfileSection);
}
