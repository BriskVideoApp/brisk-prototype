"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { InvitationStatusBadge, useInvitations, type InvitationStatus } from "@/components/invitations/InvitationContext";
import {
  PeopleAvatar,
  PersonStatusBadge,
  PersonTypeBadge,
  WorkloadDialog,
  formatPersonDate,
} from "@/components/people/PeoplePrimitives";
import {
  EditFreelancerStudioDetailsDialog,
  EditPersonProfileDialog,
  EditTeamStudioDetailsDialog,
  PersonAccessSummary,
  PersonEventsLog,
  PersonHoursSection,
} from "@/components/people/PersonProfilePass2";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import { getWorkloadRollup, hasStudioAdministrationAccess, prototypeStudioPersonId, type Person } from "@/data/people";

type ProfileSection = "Overview" | "Work" | "Hours" | "Skills" | "Access" | "Commercial" | "Notes and activity";
type ProfileDialog = "workload" | "edit" | "archive" | "assign" | "remove-access" | "delete" | null;

export function PersonProfilePage({ personId }: { personId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { deletePerson, people, setPersonStatus, updatePersonIdentity, updatePersonNotes, updatePersonProjectAccess, updatePersonStudioDetails } = usePeople();
  const { getInvitationStatus, openInvitePerson, resendInvitation } = useInvitations();
  const { allPages, selectedRole } = usePrototypeRole();
  const person = people.find((candidate) => candidate.id === personId) ?? null;
  const requestedSection = searchParams.get("section");
  const [section, setSection] = useState<ProfileSection>(() => isProfileSection(requestedSection) ? requestedSection : "Overview");
  const [dialog, setDialog] = useState<ProfileDialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const currentStudioMember = people.find((candidate) => candidate.id === prototypeStudioPersonId) ?? null;
  const isStudioStaff = allPages || (selectedRole === "Studio Staff" && hasStudioAdministrationAccess(currentStudioMember));

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (isProfileSection(requestedSection)) setSection(requestedSection);
  }, [requestedSection]);

  if (!person) {
    return <main className="person-not-found"><h1 className="headings-s-bold">Person not found</h1><p className="paragraph-s">This profile may have been archived or is not part of this prototype Studio.</p><Link className="client-secondary-button label-s-semibold" href="/people">Back to People</Link></main>;
  }

  if (!isStudioStaff) return <PersonProfilePermissionState role={selectedRole} />;

  const sections = getProfileSections(person);
  const activeSection = sections.includes(section) ? section : "Overview";
  const invitationStatus = getInvitationStatus(person);
  const hasSelfManagedFreelancerProfile = person.type === "Freelancer" && invitationStatus === "Accepted";
  const hasSelfManagedTeamProfile = person.type === "Team" && invitationStatus === "Accepted";
  const hasSelfManagedClientProfile = person.type === "Client contact" && invitationStatus === "Accepted";
  const hasSelfManagedProfile = hasSelfManagedTeamProfile || hasSelfManagedFreelancerProfile || hasSelfManagedClientProfile;
  const hasSelfManagedProfessionalProfile = hasSelfManagedTeamProfile || hasSelfManagedFreelancerProfile;
  const rollup = getWorkloadRollup(person);
  const currentProjects = getPersonProjects(person).filter((project) => !["Completed", "Archived"].includes(project.status));

  return (
    <main className="person-profile-page">
      <header className="person-profile-header">
        <div className="person-profile-header-inner">
          <Link className="person-profile-back label-s-semibold" href="/people"><DsIcon name="arrow-left" size={16} /> People</Link>
          <div className="person-profile-heading">
            <div className="person-profile-identity"><PeopleAvatar person={person} size="L" /><div><span className="label-xs-semibold">{person.studioPermission ?? person.clientMembershipRole ?? person.accessRole ?? "No Brisk access"}</span><h1 className="headings-m-bold">{person.name}</h1><p className="label-s">{person.jobTitles.join(", ") || "Production contact"} - {person.location}</p></div></div>
            <div className="person-profile-actions">
              {!hasSelfManagedClientProfile ? <Button size="M" variant="secondary" onClick={() => setDialog("edit")}><span className="people-button-content"><DsIcon name="pencil-simple-ds" size={16} /> {hasSelfManagedProfessionalProfile ? "Edit Studio details" : "Edit profile"}</span></Button> : null}
              {person.type !== "Client contact" && person.type !== "Contact" ? <Button size="M" variant="secondary" onClick={() => setDialog("workload")}>View workload</Button> : null}
              {person.type === "Client contact" && person.clientId ? <Button size="M" variant="secondary" onClick={() => setSection("Access")}>Manage access</Button> : null}
              {person.type !== "Contact" ? <Button size="M" onClick={() => person.type === "Client contact" ? setSection("Access") : setDialog("assign")}><span className="people-button-content"><DsIcon name={person.type === "Client contact" ? "lock" : "plus"} size={16} /> {person.type === "Client contact" ? "Client access" : "Assign project"}</span></Button> : null}
              {person.type !== "Contact" ? <Button size="M" variant="secondary" onClick={() => person.status === "Paused" ? setPersonStatus(person.id, "Active") : setPersonStatus(person.id, "Paused")}>{person.status === "Paused" ? "Restore access" : "Pause access"}</Button> : null}
            </div>
          </div>
        </div>
      </header>

      {person.status === "Archived" ? <section className="person-archive-banner"><DsIcon name="info" size={18} /><span className="label-s">This Person is archived. Projects, comments, files and history are intact.</span><button className="client-text-button label-s-semibold" type="button" onClick={() => setPersonStatus(person.id, "Active")}>Restore person</button></section> : null}
      {person.status === "Paused" ? <section className="person-pause-banner"><DsIcon name="lock" size={18} /><span className="label-s">Access is paused. This profile and all project history remain available to Studio Staff.</span><button className="client-text-button label-s-semibold" type="button" onClick={() => setPersonStatus(person.id, "Active")}>Restore access</button></section> : null}

      <nav className="person-profile-tabs" aria-label="Person profile sections"><div className="person-profile-tabs-inner">{sections.map((item) => <button className={`label-s-semibold ${activeSection === item ? "is-active" : ""}`} type="button" aria-current={activeSection === item ? "page" : undefined} key={item} onClick={() => setSection(item)}>{item}</button>)}</div></nav>

      <div className="person-profile-content">
        {activeSection === "Overview" ? <OverviewSection currentProjects={currentProjects} person={person} rollup={rollup} selfManaged={hasSelfManagedProfile} onActivity={() => setSection("Notes and activity")} onArchive={() => setDialog("archive")} onDelete={() => setDialog("delete")} onWork={() => setSection("Work")} /> : null}
        {activeSection === "Work" ? <WorkSection person={person} /> : null}
        {activeSection === "Hours" ? <PersonHoursSection person={person} /> : null}
        {activeSection === "Skills" ? <SkillsSection person={person} selfManaged={hasSelfManagedProfessionalProfile} /> : null}
        {activeSection === "Access" ? <AccessSection person={person} invitationStatus={invitationStatus} onManage={() => openInvitePerson(getInvitePrefill(person))} onPause={() => setPersonStatus(person.id, person.status === "Paused" ? "Active" : "Paused")} onInvite={() => resendInvitation(person)} onProjectAccessChange={(projectIds) => { updatePersonProjectAccess(person.id, projectIds); setToast("Project access updated"); }} onRemoveAccess={() => setDialog("remove-access")} /> : null}
        {activeSection === "Commercial" ? <CommercialSection person={person} /> : null}
        {activeSection === "Notes and activity" ? <NotesActivitySection person={person} onSave={(notes) => { updatePersonNotes(person.id, notes); setToast("Internal notes saved"); }} /> : null}
      </div>

      {dialog === "workload" ? <WorkloadDialog person={person} onClose={() => setDialog(null)} /> : null}
      {dialog === "edit" ? hasSelfManagedTeamProfile ? (
        <EditTeamStudioDetailsDialog person={person} onClose={() => setDialog(null)} onSave={(update) => { updatePersonStudioDetails(person.id, update); setDialog(null); setToast("Studio details updated"); }} />
      ) : hasSelfManagedFreelancerProfile ? (
        <EditFreelancerStudioDetailsDialog person={person} onClose={() => setDialog(null)} onSave={(update) => { updatePersonStudioDetails(person.id, update); setDialog(null); setToast("Studio details updated"); }} />
      ) : (
        <EditPersonProfileDialog allPeople={people} person={person} onClose={() => setDialog(null)} onSave={(update) => { updatePersonIdentity(person.id, update); setDialog(null); setToast("Profile updated"); }} />
      ) : null}
      {dialog === "archive" ? <ArchivePersonDialog person={person} onClose={() => setDialog(null)} onArchive={() => { setPersonStatus(person.id, "Archived"); setDialog(null); setToast("Person archived"); }} /> : null}
      {dialog === "assign" ? <AssignPersonDialog person={person} onAssign={(projectName) => { setDialog(null); setToast(`${person.name} assigned to ${projectName}`); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "remove-access" ? <RemovePortalAccessDialog person={person} onClose={() => setDialog(null)} onRemove={() => { updatePersonProjectAccess(person.id, []); setPersonStatus(person.id, "Paused"); setDialog(null); setToast("Portal and project access removed"); }} /> : null}
      {dialog === "delete" ? <DeletePersonDialog person={person} onClose={() => setDialog(null)} onDelete={() => { deletePerson(person.id); router.push("/people"); }} /> : null}
      {toast ? <div className="client-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function isProfileSection(value: string | null): value is ProfileSection {
  return value !== null && ["Overview", "Work", "Hours", "Skills", "Access", "Commercial", "Notes and activity"].includes(value);
}

function OverviewSection({ currentProjects, onActivity, onArchive, onDelete, onWork, person, rollup, selfManaged }: { currentProjects: ReturnType<typeof getPersonProjects>; onActivity: () => void; onArchive: () => void; onDelete: () => void; onWork: () => void; person: Person; rollup: ReturnType<typeof getWorkloadRollup>; selfManaged: boolean }) {
  return (
    <section className="person-overview-grid">
      <article className="person-summary-card is-identity"><header><h2 className="headings-xs-bold">Overview</h2><PersonStatusBadge status={person.status} /></header><dl>
        <div><dt className="label-xs">Person type</dt><dd><PersonTypeBadge type={person.type} /></dd></div>
        <div><dt className="label-xs">Job titles</dt><dd className="label-s-semibold">{person.jobTitles.join(", ")}</dd></div>
        <div><dt className="label-xs">Email</dt><dd>{person.email ? <a className="label-s-semibold" href={`mailto:${person.email}`}>{person.email}</a> : <span className="label-s people-muted">Not added</span>}</dd></div>
        <div><dt className="label-xs">Phone</dt><dd className="label-s-semibold">{person.phone || "Not added"}</dd></div>
        <div><dt className="label-xs">Location</dt><dd className="label-s-semibold">{person.location}</dd></div>
        <div><dt className="label-xs">{person.type === "Contact" ? "Brisk access" : person.type === "Client contact" ? "Client role" : person.type === "Team" ? "Studio permission" : "Access role"}</dt><dd className="label-s-semibold">{person.studioPermission ?? person.clientMembershipRole ?? person.accessRole ?? "None"}</dd></div>
        {person.clientId && person.clientName ? <div><dt className="label-xs">Related Client</dt><dd><Link className="label-s-semibold" href={`/clients/${person.clientId}`}>{person.clientName}</Link></dd></div> : null}
      </dl>{selfManaged ? <div className="person-profile-safety"><DsIcon name="info" size={16} /><span className="label-xs">Contact and work details are managed by {person.name} in personal settings.</span></div> : null}</article>

      <article className="person-summary-card is-work"><header><h2 className="headings-xs-bold">Work at a glance</h2><button className="client-text-button label-xs-semibold" type="button" onClick={onWork}>Current work</button></header><div className="person-metrics">
        <span><strong className="headings-s-bold">{currentProjects.length}</strong><small className="label-xs">Active projects</small></span>
        {person.type === "Team" ? <><span><strong className={`headings-s-bold ${rollup.level === "full" ? "is-over" : ""}`}>{rollup.availableHours}h</strong><small className="label-xs">Available hours</small></span><span><strong className="headings-s-bold">{rollup.activeHours}h</strong><small className="label-xs">Booked hours</small></span></> : null}
        {person.type === "Freelancer" ? <><span><strong className="headings-s-bold">{person.workloads.filter((item) => item.assignmentStatus === "Offer sent").length}</strong><small className="label-xs">Open offers</small></span><span><strong className="headings-s-bold">{person.availability}</strong><small className="label-xs">Availability</small></span></> : null}
        {person.type === "Client contact" ? <><span><strong className="headings-s-bold">{person.projectAccessIds.length}</strong><small className="label-xs">Projects shared</small></span><span><strong className="headings-s-bold">Magic link</strong><small className="label-xs">Portal access</small></span></> : null}
      </div>{currentProjects.slice(0, 3).map((project) => <Link className="person-project-summary" href={`/projects/${project.id}`} key={project.id}><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName} - {project.status}</small></span><DsIcon name="caret-right" size={15} /></Link>)}{currentProjects.length === 0 ? <div className="people-inline-empty"><strong className="label-s-semibold">No current projects</strong><span className="label-xs">Assignments and project access will appear here.</span></div> : null}</article>

      <article className="person-summary-card is-activity"><header><h2 className="headings-xs-bold">Latest activity</h2><button className="client-text-button label-xs-semibold" type="button" onClick={onActivity}>View events log</button></header><div className="person-latest-activity"><span><DsIcon name="clock-clockwise" size={18} /></span><div><strong className="label-s-semibold">{person.latestActivity.label}</strong><p className="label-s">{person.latestActivity.detail}</p><small className="label-xs">{formatPersonDate(person.latestActivity.occurredAt)}</small></div></div><div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Private contact details, rates, assessments and notes stay Studio-only.</span></div></article>

      <article className="person-summary-card is-actions"><header><h2 className="headings-xs-bold">Profile actions</h2></header>{person.email ? <a className="person-action-row" href={`mailto:${person.email}`}><DsIcon name="envelope-simple" size={17} /><span><strong className="label-s-semibold">Contact {person.name.split(" ")[0]}</strong><small className="label-xs">Use the email saved on this profile</small></span></a> : <button className="person-action-row" type="button" disabled><DsIcon name="envelope-simple" size={17} /><span><strong className="label-s-semibold">No contact email</strong><small className="label-xs">Add an email to contact this person</small></span></button>}<button className="person-action-row" type="button" onClick={onArchive}><DsIcon name="folder" size={17} /><span><strong className="label-s-semibold">Archive person</strong><small className="label-xs">Remove from active lists but preserve history</small></span></button><button className="person-action-row is-danger" type="button" onClick={onDelete}><DsIcon name="trash-simple" size={17} /><span><strong className="label-s-semibold">Delete incorrect record</strong><small className="label-xs">Reserved for duplicates or records created by mistake</small></span></button></article>
    </section>
  );
}

function WorkSection({ person }: { person: Person }) {
  const rollup = getWorkloadRollup(person);
  const projects = getPersonProjects(person);
  return <section className="person-section-stack"><header className="person-section-header"><div><h2 className="headings-s-bold">Work</h2><p className="paragraph-s">Current projects, project roles, stages, statuses and predicted hours.</p></div>{person.type === "Team" ? <div className="person-capacity-summary"><span><strong className={rollup.level === "full" ? "is-over" : ""}>{rollup.availableHours}h</strong><small>Available</small></span><span><strong>{rollup.activeHours}h</strong><small>Booked</small></span><span><strong>{rollup.potentialHours}h</strong><small>Potential</small></span><span><strong>{person.weeklyCapacityHours}h</strong><small>Weekly capacity</small></span></div> : null}</header>
    {person.type === "Client contact" ? <ClientAccessProjectList person={person} projects={projects} /> : person.workloads.length ? <div className="person-work-table-frame"><table className="person-work-table"><thead><tr><th>Project</th><th>Project role</th><th>Stage</th><th>Status</th><th>Predicted hours</th><th>Assignment</th></tr></thead><tbody>{person.workloads.map((item) => { const project = activeVideoProjects.find((candidate) => candidate.id === item.projectId); if (!project) return null; return <tr key={item.id}><td data-label="Project"><Link href={`/projects/${project.id}`}><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName}</small></Link></td><td data-label="Project role" className="label-s-semibold">{item.projectRole}</td><td data-label="Stage"><span className="person-stage-label label-xs-semibold"><DsIcon name={stageIcon(item.stage)} size={14} />{stageLabels[item.stage]}</span></td><td data-label="Status"><span className={`people-workload-status is-${item.status === "Waiting on Studio" ? "studio" : "client"} label-xs-semibold`}>{item.status}</span></td><td data-label="Predicted hours" className="label-m-semibold">{item.predictedHours}h</td><td data-label="Assignment"><span className="person-assignment-status label-xs-semibold">{item.assignmentStatus}</span></td></tr>; })}</tbody></table></div> : <div className="person-section-empty"><span><DsIcon name="queue" size={28} /></span><h3 className="headings-xs-bold">No current work</h3><p className="paragraph-s">Assigned projects and accepted offers will appear here.</p></div>}
    {person.type !== "Client contact" ? <div className="person-work-footnotes"><article><strong className="label-s-semibold">Queued work</strong><span className="label-xs">{person.workloads.filter((item) => item.assignmentStatus === "Offer sent").length} offers or future assignments</span></article><article><strong className="label-s-semibold">Completed projects</strong><span className="label-xs">{getPersonProjects(person).filter((project) => project.status === "Completed").length} completed in this prototype Studio</span></article><article><strong className="label-s-semibold">Time history</strong><span className="label-xs">Weekly project and Stage entries are available in Hours.</span></article></div> : null}
  </section>;
}

function SkillsSection({ person, selfManaged }: { person: Person; selfManaged: boolean }) {
  const isFreelancer = person.type === "Freelancer";
  const isTeamMember = person.type === "Team";

  return (
    <section className="person-section-stack">
      <header className="person-section-header">
        <div>
          <h2 className="headings-s-bold">Skills</h2>
          <p className="paragraph-s">Structured craft details help producers find the right person quickly.</p>
        </div>
      </header>
      <div className="person-skills-layout">
        <article className="person-detail-card">
          <h3 className="headings-xs-bold">{selfManaged ? `${isFreelancer ? "Freelancer" : "Team Member"}-managed profile` : "Skills and specialties"}</h3>
          <div className="person-tag-list">
            {person.skills.map((skill) => <span className="label-xs-semibold" key={skill}>{skill}</span>)}
            {person.skills.length === 0 ? <span className="label-s people-muted">No skills added</span> : null}
          </div>
          <h3 className="headings-xs-bold">Styles and genres</h3>
          <div className="person-tag-list">
            {person.styles.map((style) => <span className="label-xs-semibold" key={style}>{style}</span>)}
            {person.styles.length === 0 ? <span className="label-s people-muted">No styles added</span> : null}
          </div>
          {selfManaged ? (
            <dl>
              <div><dt className="label-xs">Location and timezone</dt><dd className="label-s-semibold">{person.location} - {person.timezone}</dd></div>
              <div><dt className="label-xs">Availability</dt><dd className="label-s-semibold">{person.availability ?? "Not tracked"}</dd></div>
              <div><dt className="label-xs">Portfolio or reel</dt><dd>{person.portfolioUrl ? <a className="label-s-semibold" href={person.portfolioUrl} target="_blank" rel="noreferrer">Open reel <DsIcon name="arrow-bend-up-right" size={13} /></a> : <span className="label-s people-muted">Not added</span>}</dd></div>
            </dl>
          ) : null}
          {selfManaged ? <div className="person-profile-safety"><DsIcon name="info" size={16} /><span className="label-xs">Managed by {person.name} in personal settings.</span></div> : null}
        </article>

        <article className="person-detail-card">
          <h3 className="headings-xs-bold">{selfManaged ? "Studio record" : "Professional profile"}</h3>
          <dl>
            {isTeamMember ? <div><dt className="label-xs">Department</dt><dd className="label-s-semibold">{person.department || "Not assigned"}</dd></div> : null}
            {isTeamMember ? <div><dt className="label-xs">Weekly capacity</dt><dd className="label-s-semibold">{person.weeklyCapacityHours ? `${person.weeklyCapacityHours} hours` : "Not set"}</dd></div> : null}
            {isTeamMember ? <div><dt className="label-xs">Studio permission</dt><dd className="label-s-semibold">{person.studioPermission ?? "Team Member"}</dd></div> : null}
            <div><dt className="label-xs">Seniority</dt><dd className="label-s-semibold">{person.seniority}</dd></div>
            {!selfManaged ? <div><dt className="label-xs">Location and timezone</dt><dd className="label-s-semibold">{person.location} - {person.timezone}</dd></div> : null}
            {!selfManaged ? <div><dt className="label-xs">Availability</dt><dd className="label-s-semibold">{person.availability ?? "Not tracked"}</dd></div> : null}
            <div><dt className="label-xs">Testing</dt><dd className="label-s-semibold">{person.testingStatus}</dd></div>
            <div><dt className="label-xs">Onboarding</dt><dd className="label-s-semibold">{person.onboardingStatus}</dd></div>
            <div><dt className="label-xs">Agreement</dt><dd className="label-s-semibold">{person.agreementStatus}</dd></div>
            {!selfManaged ? <div><dt className="label-xs">Portfolio or reel</dt><dd>{person.portfolioUrl ? <a className="label-s-semibold" href={person.portfolioUrl} target="_blank" rel="noreferrer">Open reel <DsIcon name="arrow-bend-up-right" size={13} /></a> : <span className="label-s people-muted">Not added</span>}</dd></div> : null}
          </dl>
          {isFreelancer ? <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Classification and contractor checks are managed by Studio Staff.</span></div> : null}
          {isTeamMember ? <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Department, capacity and Studio permission are managed by Studio Owners and Admins.</span></div> : null}
        </article>

        <article className="person-detail-card is-assessment">
          <h3 className="headings-xs-bold">Internal assessment</h3>
          <p className="paragraph-s">{person.notes || "No internal assessment has been added yet."}</p>
          <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">This assessment is visible to Studio Staff only.</span></div>
        </article>
      </div>
    </section>
  );
}

function AccessSection({ invitationStatus, onInvite, onManage, onPause, onProjectAccessChange, onRemoveAccess, person }: { invitationStatus: InvitationStatus; onInvite: () => void; onManage: () => void; onPause: () => void; onProjectAccessChange: (projectIds: string[]) => void; onRemoveAccess: () => void; person: Person }) {
  const projects = getPersonProjects(person);
  return <section className="person-section-stack"><header className="person-section-header"><div><h2 className="headings-s-bold">Access</h2><p className="paragraph-s">Review the relationship, invitation and Client or project access attached to this Person.</p></div><div className="person-section-actions">{invitationStatus !== "Accepted" ? <Button size="M" variant="secondary" onClick={onInvite}>Resend invite</Button> : null}{person.type !== "Team" ? <Button size="M" onClick={onManage}><span className="people-button-content"><DsIcon name="plus" size={16} /> Manage access</span></Button> : null}<Button size="M" variant="secondary" onClick={onPause}>{person.status === "Paused" ? "Restore access" : "Pause access"}</Button>{person.type === "Client contact" ? <button className="client-danger-button label-m-semibold" type="button" onClick={onRemoveAccess}>Remove portal access</button> : null}</div></header><PersonAccessSummary invitationStatus={invitationStatus} person={person} />{person.type !== "Team" ? <ClientAccessProjectList person={person} projects={projects} onRemoveProject={(projectId) => onProjectAccessChange(person.projectAccessIds.filter((id) => id !== projectId))} /> : <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Studio Staff access all Clients and projects in the V1 role model. Granular permissions are not configured here.</span></div>}</section>;
}

function ClientAccessProjectList({ onRemoveProject, person, projects }: { onRemoveProject?: (projectId: string) => void; person: Person; projects: ReturnType<typeof getPersonProjects> }) {
  return <div className="person-access-projects"><header><h3 className="headings-xs-bold">Projects they can access</h3><span className="label-xs-semibold">{projects.length} shared</span></header>{projects.length ? projects.map((project) => <article key={project.id}><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.status} - {project.clientName}</small></span><div className="person-access-project-actions"><Link className="client-text-button label-xs-semibold" href={`/projects/${project.id}`}>Open project</Link>{onRemoveProject && person.projectAccessIds.includes(project.id) ? <button className="client-text-button label-xs-semibold" type="button" onClick={() => onRemoveProject(project.id)}>Remove access</button> : null}</div></article>) : <div className="people-inline-empty"><strong className="label-s-semibold">No project access</strong><span className="label-xs">Use Manage access to choose a Client and project.</span></div>}<div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">{person.name} cannot see internal notes, Studio rates, other Clients or unrelated projects.</span></div></div>;
}

function CommercialSection({ person }: { person: Person }) {
  if (!person.commercial) return <div className="person-section-empty"><h2 className="headings-xs-bold">Commercial details are not applicable</h2><p className="paragraph-s">Rates, offers and invoices are available only for freelancers.</p></div>;
  return (
    <section className="person-section-stack">
      <header className="person-section-header">
        <div><h2 className="headings-s-bold">Commercial details</h2><p className="paragraph-s">Studio-only rates, offers, contractor details and invoice history for this freelancer.</p></div>
      </header>
      <div className="person-commercial-grid">
        <article className="person-detail-card"><span className="label-xs">Default {person.commercial.rateType.toLocaleLowerCase("en-AU")}</span><strong className="headings-s-bold">${person.commercial.defaultRate.toLocaleString("en-AU")}</strong><small className="label-xs">AUD - used as the starting point for project offers</small></article>
        <article className="person-detail-card"><span className="label-xs">Current project offers</span><strong className="headings-s-bold">{person.workloads.filter((item) => item.assignmentStatus === "Offer sent").length}</strong><small className="label-xs">Project-specific rates can differ from the default</small></article>
      </div>
      <article className="person-detail-card">
        <h3 className="headings-xs-bold">Contractor details</h3>
        <dl>
          <div><dt className="label-xs">Business or trading name</dt><dd className="label-s-semibold">{person.businessName || "Not added"}</dd></div>
          <div><dt className="label-xs">ABN or tax number</dt><dd className="label-s-semibold">{person.taxNumber || "Not added"}</dd></div>
        </dl>
        <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Supplied by {person.name} and visible only to authorised Studio Staff.</span></div>
      </article>
      <div className="person-invoice-list">
        <header><h3 className="headings-xs-bold">Invoice history</h3></header>
        {person.commercial.invoices.length ? person.commercial.invoices.map((invoice) => <article key={invoice.id}><span><strong className="label-s-semibold">{invoice.label}</strong><small className="label-xs">{invoice.id}</small></span><strong className="label-m-semibold">${invoice.amount.toLocaleString("en-AU")}</strong><span className="person-assignment-status label-xs-semibold">{invoice.status}</span></article>) : <div className="people-inline-empty"><strong className="label-s-semibold">No invoices yet</strong><span className="label-xs">Invoices uploaded for accepted work will appear here.</span></div>}
      </div>
      <div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">Commercial details are hidden from Client contacts and people without permission to see Studio costs.</span></div>
    </section>
  );
}

function NotesActivitySection({ onSave, person }: { onSave: (notes: string) => void; person: Person }) {
  const [notes, setNotes] = useState(person.notes);
  return <section className="person-notes-layout"><article className="person-detail-card"><h2 className="headings-xs-bold">Internal notes</h2><p className="paragraph-s">Capture nuance that does not belong in structured skills or access settings.</p><textarea value={notes} placeholder="Add internal notes…" onChange={(event) => setNotes(event.target.value)} /><div className="person-note-actions"><span className="label-xs"><DsIcon name="lock" size={14} /> Never shown in a Client portal or to this person</span><Button size="M" onClick={() => onSave(notes)}>Save notes</Button></div></article><PersonEventsLog person={person} /></section>;
}

function ArchivePersonDialog({ onArchive, onClose, person }: { onArchive: () => void; onClose: () => void; person: Person }) {
  return <ClientModal title={`Archive ${person.name}?`} description="This removes the person from active lists and assignment pickers." onClose={onClose} footer={<><Button size="M" variant="secondary" onClick={onClose}>Keep person active</Button><button className="client-danger-button label-m-semibold" type="button" onClick={onArchive}>Archive person</button></>}><div className="people-archive-confirmation"><DsIcon name="alert-triangle" size={22} /><div><strong className="label-m-semibold">Project history will not be deleted</strong><p className="paragraph-s">Projects, comments, approvals, files, invoices and activity remain intact. Studio Staff can restore this Person later.</p></div></div></ClientModal>;
}

function RemovePortalAccessDialog({ onClose, onRemove, person }: { onClose: () => void; onRemove: () => void; person: Person }) {
  return <ClientModal title={`Remove ${person.name}'s portal access?`} description="This is different from temporarily pausing access." onClose={onClose} footer={<><Button size="M" variant="secondary" onClick={onClose}>Keep access</Button><button className="client-danger-button label-m-semibold" type="button" onClick={onRemove}>Remove portal access</button></>}><div className="people-archive-confirmation"><DsIcon name="lock" size={22} /><div><strong className="label-m-semibold">Project access will be removed</strong><p className="paragraph-s">The Person profile, comments, approvals, files and history remain intact. Studio Staff can invite this contact again later.</p></div></div></ClientModal>;
}

function DeletePersonDialog({ onClose, onDelete, person }: { onClose: () => void; onDelete: () => void; person: Person }) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation.trim() === person.name;
  return <ClientModal title={`Delete ${person.name}'s Person record?`} description="Use this only for a duplicate or a record created by mistake." onClose={onClose} footer={<><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><button className="client-danger-button label-m-semibold" type="button" disabled={!canDelete} onClick={onDelete}>Delete incorrect record</button></>}><div className="people-delete-confirmation"><div className="people-archive-confirmation"><DsIcon name="alert-triangle" size={22} /><div><strong className="label-m-semibold">Audit history will be retained</strong><p className="paragraph-s">Existing project history, comments, approvals and files remain in those projects. The incorrect directory identity and current access relationships will be removed.</p></div></div><label className="people-field"><span className="label-m-semibold">Type {person.name} to confirm</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></div></ClientModal>;
}

function AssignPersonDialog({ onAssign, onClose, person }: { onAssign: (projectName: string) => void; onClose: () => void; person: Person }) {
  const projects = activeVideoProjects.filter((project) => !["Completed", "Archived"].includes(project.status));
  return <ClientModal title={`Assign ${person.name}`} description="Choose a project. Project role, Stage access and predicted hours are set in the project Team panel." onClose={onClose} footer={<Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>}><div className="person-assign-list">{projects.map((project) => <button type="button" key={project.id} onClick={() => onAssign(project.name)}><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName} - {project.status}</small></span><DsIcon name="plus" size={16} /></button>)}</div></ClientModal>;
}

function PersonProfilePermissionState({ role }: { role: "Studio Staff" | "Studio Freelancer" | "Customer" }) {
  const isCustomer = role === "Customer";
  const isTeamMember = role === "Studio Staff";
  return <main className="people-permission-state"><span><DsIcon name="lock" size={28} /></span><h1 className="headings-s-bold">{isCustomer ? "This Studio profile is private" : isTeamMember ? "This profile is restricted" : "This profile is outside your invited projects"}</h1><p className="paragraph-s">{isCustomer ? "Customers can see permitted collaborators in their Client portal, but cannot browse Studio profiles, rates or internal notes." : isTeamMember ? "Only Studio Owners and Admins can browse personal details, access, capacity and internal notes." : "Studio Freelancers can see only people needed for projects they can access. Ask the Studio producer if you need this profile."}</p><Link className="client-secondary-button label-s-semibold" href={isCustomer ? "/customer-dashboard" : isTeamMember ? "/today" : "/active-videos"}>{isCustomer ? "Open Client portal" : isTeamMember ? "Back to Today" : "Back to invited projects"}</Link></main>;
}

function getProfileSections(person: Person): ProfileSection[] {
  if (person.type === "Contact") return ["Overview", "Notes and activity"];
  if (person.type === "Client contact") return ["Overview", "Work", "Access", "Notes and activity"];
  if (person.type === "Freelancer") return ["Overview", "Work", "Hours", "Skills", "Access", "Commercial", "Notes and activity"];
  return ["Overview", "Work", "Hours", "Skills", "Access", "Notes and activity"];
}

function getPersonProjects(person: Person) {
  const ids = person.type === "Team"
    ? person.workloads.map((item) => item.projectId)
    : [...person.projectAccessIds, ...person.workloads.map((item) => item.projectId)];
  return activeVideoProjects.filter((project) => ids.includes(project.id));
}

function getInvitePrefill(person: Person) {
  const projectIds = [...new Set([...person.projectAccessIds, ...person.workloads.map((workload) => workload.projectId)])];
  const clientIds = [...new Set([
    ...(person.clientId ? [person.clientId] : []),
    ...projectIds.map((projectId) => activeVideoProjects.find((project) => project.id === projectId)?.clientId).filter((clientId): clientId is string => Boolean(clientId)),
  ])];
  return {
    role: person.accessRole ?? undefined,
    email: person.email,
    name: person.name,
    jobTitle: person.jobTitles[0],
    clientIds,
    projectIds,
  };
}

function stageIcon(stage: Person["workloads"][number]["stage"]) {
  return stage === "brief" ? "clipboard-text" : stage === "script" ? "pen-nib" : stage === "shoot" ? "video-camera-ds" : stage === "media" ? "image-square" : stage === "edit" ? "stage-edit" : "film-strip";
}
