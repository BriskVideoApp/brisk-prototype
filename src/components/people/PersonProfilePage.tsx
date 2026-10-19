"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { Tabs } from "../../../Brisk DS/src/app/components/Tabs";
import { BriskSelect } from "@/components/form/BriskSelect";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { InvitationStatusBadge, useInvitations, type InvitationStatus } from "@/components/invitations/InvitationContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import {
  PeopleAvatar,
  PersonStatusBadge,
  PersonTypeBadge,
} from "@/components/people/PeoplePrimitives";
import {
  PersonEventsLog,
  PersonHoursSection,
} from "@/components/people/PersonProfilePass2";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import { getWorkloadRollup, hasStudioAdministrationAccess, prototypeStudioPersonId, type Person, type PersonProfileUpdate, type PersonStudioDetailsUpdate, type StudioPermission } from "@/data/people";

type ProfileSection = "Overview" | "Work" | "Hours" | "Skills" | "Access" | "Commercial" | "Notes and activity";
type ProfileDialog = "archive" | "assign" | "remove-access" | "delete" | null;

export function PersonProfilePage({ personId }: { personId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { deletePerson, people, setPersonStatus, updatePersonClientMembershipRole, updatePersonIdentity, updatePersonNotes, updatePersonProjectAccess, updatePersonStudioDetails } = usePeople();
  const { getInvitationStatus, openInvitePerson, resendInvitation } = useInvitations();
  const { studio, updateStaffAccess } = useStudioSettings();
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
  const staffAccess = studio.staffAccess.find((member) => member.personId === person.id);
  const togglePersonAccess = () => {
    const nextStatus = person.status === "Paused" ? "Active" : "Paused";
    setPersonStatus(person.id, nextStatus);
    if (person.type === "Team") {
      updateStaffAccess(studio.staffAccess.map((member) => member.personId === person.id
        ? { ...member, status: nextStatus }
        : member));
    }
  };
  return (
    <main className="person-profile-page">
      <header className="person-profile-header">
        <div className="person-profile-header-inner">
          <Link className="person-profile-back label-s-semibold" href="/people"><DsIcon name="arrow-left" size={16} /> People</Link>
          <div className="person-profile-heading">
            <div className="person-profile-identity"><PeopleAvatar person={person} size="L" /><div><PersonTypeBadge type={person.type} /><h1 className="headings-m-bold">{person.name}</h1></div></div>
            <div className="person-profile-actions">
              {person.type !== "Contact" && person.type !== "Client contact" ? <Button size="M" tooltip="Choose a project, role and hours." onClick={() => setDialog("assign")}><span className="people-button-content"><DsIcon name="plus" size={16} /> Assign project</span></Button> : null}
              {person.type !== "Contact" ? <Button size="M" variant="secondary" tooltip={person.status === "Paused" ? "Let this person use Brisk again." : "Stop access for now. You can restore it."} onClick={togglePersonAccess}>{person.status === "Paused" ? "Restore access" : "Pause access"}</Button> : null}
            </div>
          </div>
        </div>
      </header>

      {person.status === "Archived" ? <section className="person-archive-banner"><DsIcon name="info" size={18} /><span className="label-s">This Person is archived. Projects, comments, files and history are intact.</span><Button size="S" variant="ghost" className="client-text-button" type="button" data-tooltip="Return this person to active lists." aria-description="Return this person to active lists." onClick={() => setPersonStatus(person.id, "Active")}>Restore person</Button></section> : null}
      {person.status === "Paused" ? <section className="person-pause-banner"><DsIcon name="lock" size={18} /><span className="label-s">Access is paused. This profile and all project history remain available to Studio Staff.</span></section> : null}

      <Tabs
        className="person-profile-tabs"
        label="Person profile sections"
        layout="page"
        value={activeSection}
        options={sections.map((item) => ({ value: item, label: item }))}
        onValueChange={setSection}
      >
      <div className="person-profile-content">
        {activeSection === "Overview" ? <div className="person-profile-sections">{person.type !== "Contact" ? <AccessSummarySection person={person} invitationStatus={invitationStatus} hasBillingAccess={staffAccess?.hasBillingAccess ?? false} onStudioUpdate={(update) => { updatePersonStudioDetails(person.id, update); setToast("Studio details updated"); }} onClientRoleChange={(role) => { updatePersonClientMembershipRole(person.id, role); setToast("Client role updated"); }} onBillingAccessChange={(hasBillingAccess) => {
          const nextAccess = studio.staffAccess.some((member) => member.personId === person.id)
            ? studio.staffAccess.map((member) => member.personId === person.id ? { ...member, hasBillingAccess } : member)
            : [...studio.staffAccess, { personId: person.id, status: person.status === "Invited" ? "Pending invite" as const : "Active" as const, hasBillingAccess }];
          updateStaffAccess(nextAccess);
          setToast(hasBillingAccess ? "Billing access granted" : "Billing access removed");
        }} /> : null}<OverviewSection id="overview" person={person} onUpdate={(update) => { updatePersonIdentity(person.id, update); setToast("Profile updated"); }} />{person.type === "Team" || person.type === "Freelancer" ? <StudioRecordSection id="studio-record" person={person} onStudioUpdate={(update) => { updatePersonStudioDetails(person.id, update); setToast("Studio details updated"); }} onSeniorityChange={(seniority) => { updatePersonIdentity(person.id, { seniority }); setToast("Seniority updated"); }} /> : null}<RecordActions person={person} onArchive={() => setDialog("archive")} onDelete={() => setDialog("delete")} /></div> : null}
        {activeSection === "Work" ? <WorkSection person={person} onCapacityChange={(weeklyCapacityHours) => { updatePersonStudioDetails(person.id, { weeklyCapacityHours }); setToast("Weekly capacity updated"); }} /> : null}
        {activeSection === "Hours" ? <PersonHoursSection person={person} /> : null}
        {activeSection === "Skills" ? <SkillsSection id="skills" person={person} onIdentityUpdate={(update) => { updatePersonIdentity(person.id, update); setToast("Profile updated"); }} /> : null}
        {activeSection === "Access" ? person.type !== "Contact" ? <AccessSection id="access" person={person} invitationStatus={invitationStatus} onManage={() => openInvitePerson(getInvitePrefill(person))} onInvite={() => resendInvitation(person)} onProjectAccessChange={(projectIds) => { updatePersonProjectAccess(person.id, projectIds); setToast("Project access updated"); }} onRemoveAccess={() => setDialog("remove-access")} /> : null : null}
        {activeSection === "Commercial" && person.type === "Freelancer" ? <CommercialSection person={person} /> : null}
        {activeSection === "Notes and activity" ? <NotesActivitySection person={person} onSave={(notes) => { updatePersonNotes(person.id, notes); setToast("Internal notes saved"); }} /> : null}
      </div>
      </Tabs>

      {dialog === "archive" ? <ArchivePersonDialog person={person} onClose={() => setDialog(null)} onArchive={() => { setPersonStatus(person.id, "Archived"); setDialog(null); setToast("Person archived"); }} /> : null}
      {dialog === "assign" ? <AssignPersonDialog person={person} onAssign={(projectId) => { setDialog(null); router.push(`/active-videos?project=${encodeURIComponent(projectId)}&section=team&assignPerson=${encodeURIComponent(person.id)}`); }} onClose={() => setDialog(null)} /> : null}
      {dialog === "remove-access" ? <RemovePortalAccessDialog person={person} onClose={() => setDialog(null)} onRemove={() => { updatePersonProjectAccess(person.id, []); setPersonStatus(person.id, "Paused"); setDialog(null); setToast("Portal and project access removed"); }} /> : null}
      {dialog === "delete" ? <DeletePersonDialog person={person} onClose={() => setDialog(null)} onDelete={() => { deletePerson(person.id); router.push("/people"); }} /> : null}
      {toast ? <div className="client-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function isProfileSection(value: string | null): value is ProfileSection {
  return value !== null && ["Overview", "Work", "Hours", "Skills", "Access", "Commercial", "Notes and activity"].includes(value);
}

function getProfileSections(person: Person): ProfileSection[] {
  if (person.type === "Contact") return ["Overview", "Notes and activity"];
  if (person.type === "Client contact") return ["Overview", "Work", "Access", "Notes and activity"];
  if (person.type === "Freelancer") return ["Overview", "Work", "Hours", "Skills", "Access", "Commercial", "Notes and activity"];
  return ["Overview", "Work", "Hours", "Skills", "Notes and activity"];
}

function OverviewSection({ id, onUpdate, person }: { id: string; onUpdate: (update: PersonProfileUpdate) => void; person: Person }) {
  const isProfessional = person.type === "Team" || person.type === "Freelancer";
  return (
    <section id={id} className="person-overview-grid">
      <article className={`person-summary-card is-identity ${!isProfessional ? "is-compact" : ""}`}><header><h2 className="headings-xs-bold">Overview</h2><PersonStatusBadge status={person.status} /></header><dl>
        <div><dt className="label-xs">Name</dt><dd><InlineValue label="Name" value={person.name} onSave={(name) => onUpdate({ name })} /></dd></div>
        <div><dt className="label-xs">Job titles</dt><dd><InlineValue label="Job titles" value={person.jobTitles.join(", ")} onSave={(value) => onUpdate({ jobTitles: value.split(",").map((item) => item.trim()).filter(Boolean) })} /></dd></div>
        <div><dt className="label-xs">Email</dt><dd><InlineValue label="Email" value={person.email} type="email" onSave={(email) => onUpdate({ email })} /></dd></div>
        <div><dt className="label-xs">Phone</dt><dd><InlineValue label="Phone" value={person.phone} onSave={(phone) => onUpdate({ phone })} /></dd></div>
        <div><dt className="label-xs">Location</dt><dd><InlineValue label="Location" value={person.location} onSave={(location) => onUpdate({ location })} /></dd></div>
        {isProfessional ? <><div><dt className="label-xs">Timezone</dt><dd><InlineValue label="Timezone" value={person.timezone} onSave={(timezone) => onUpdate({ timezone })} /></dd></div><div><dt className="label-xs">Availability</dt><dd><InlineChoice label="Availability" value={person.availability ?? "Available"} options={["Available", "Busy", "Away"]} onSave={(value) => onUpdate({ availability: value as Person["availability"] })} /></dd></div><div><dt className="label-xs">Portfolio or reel</dt><dd><InlineValue label="Portfolio or reel" value={person.portfolioUrl} type="url" placeholder="Add a link" onSave={(portfolioUrl) => onUpdate({ portfolioUrl })} display={person.portfolioUrl ? <a className="label-s-semibold" href={person.portfolioUrl} target="_blank" rel="noreferrer">Open reel <DsIcon name="arrow-bend-up-right" size={13} /></a> : <span className="label-s people-muted">Not added</span>} /></dd></div></> : null}
        {person.clientId && person.clientName ? <div><dt className="label-xs">Related Client</dt><dd><Link className="label-s-semibold" href={`/clients/${person.clientId}`}>{person.clientName}</Link></dd></div> : null}
      </dl></article>

    </section>
  );
}

function RecordActions({ onArchive, onDelete, person }: { onArchive: () => void; onDelete: () => void; person: Person }) {
  return <section className="person-record-actions" aria-label="Record actions">
    <h2 className="label-xs-semibold">Record actions</h2>
    {person.status !== "Archived" ? <Button size="S" variant="secondary" className="person-action-row" type="button" data-tooltip="Hide from active lists. Keep their history." aria-description="Hide from active lists. Keep their history." onClick={onArchive}><DsIcon name="folder" size={16} />Archive person</Button> : null}
    <Button size="S" variant="danger" className="person-action-row is-danger" type="button" data-tooltip="Use only for duplicates or mistakes." aria-description="Use only for duplicates or mistakes." onClick={onDelete}><DsIcon name="trash-simple" size={16} />Delete incorrect record</Button>
  </section>;
}

function InlineValue({ display, label, multiline = false, onSave, placeholder, type = "text", value }: { display?: ReactNode; label: string; multiline?: boolean; onSave: (value: string) => void; placeholder?: string; type?: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [editing, value]);
  if (!editing) return <div className="person-inline-value label-s-semibold" role="button" tabIndex={0} aria-label={`Edit ${label}`} data-tooltip={`Edit ${label.toLocaleLowerCase("en-AU")}`} onClick={(event) => { if (!(event.target instanceof Element) || !event.target.closest("a, button")) setEditing(true); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditing(true); } }}>{display ?? <span>{value || "Not added"}</span>}</div>;
  return <div className="person-inline-editor">{multiline ? <textarea aria-label={label} value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} /> : <Input autoComplete="off" label={label} size="S" type={type} value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} />}<div><Button size="S" variant="secondary" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</Button><Button size="S" onClick={() => { onSave(draft.trim()); setEditing(false); }}>Save</Button></div></div>;
}

function InlineChoice({ label, onSave, options, value }: { label: string; onSave: (value: string) => void; options: string[]; value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [editing, value]);
  if (!editing) return <div className="person-inline-value label-s-semibold" role="button" tabIndex={0} aria-label={`Edit ${label}`} data-tooltip={`Edit ${label.toLocaleLowerCase("en-AU")}`} onClick={() => setEditing(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditing(true); } }}><span>{value}</span></div>;
  return <div className="person-inline-editor"><label className="label-xs" htmlFor={`inline-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</label><BriskSelect<string> ariaLabel={label} clearable={false} placeholder={"Choose an option"} id={`inline-${label.toLowerCase().replaceAll(" ", "-")}`} value={draft} onChange={(value) => setDraft(value)} options={[...options.map((option) => ({ value: option, label: (option) }))]} /><div><Button size="S" variant="secondary" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</Button><Button size="S" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button></div></div>;
}

function AgreementField({ onSave, person }: { onSave: (update: PersonStudioDetailsUpdate) => void; person: Person }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const document = person.agreementDocument;

  function attachPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !file.name.toLocaleLowerCase("en-AU").endsWith(".pdf")) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") onSave({ agreementDocument: { name: file.name, dataUrl: reader.result } });
    });
    reader.readAsDataURL(file);
  }

  return <div className="person-agreement-field">
    <InlineChoice label="Agreement status" value={person.agreementStatus} options={["Not required", "Pending", "Signed"]} onSave={(value) => onSave({ agreementStatus: value as Person["agreementStatus"] })} />
    <input ref={fileInputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={attachPdf} />
    {document ? <div className="person-agreement-file"><a className="label-xs-semibold" href={document.dataUrl} target="_blank" rel="noreferrer">{document.name}</a><div><Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}>Replace PDF</Button><Button size="S" variant="ghost" className="client-text-button" type="button" data-tooltip="Remove the attached PDF." aria-description="Remove the attached PDF." onClick={() => onSave({ agreementDocument: null })}>Remove</Button></div></div> : <Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}>Attach PDF</Button>}
  </div>;
}

const studioPermissionOptions: ReadonlyArray<{ value: StudioPermission; label: string }> = [
  { value: "Team Member", label: "Team Member" },
  { value: "Studio Owner", label: "Studio Owner" },
];

const seniorityOptions: ReadonlyArray<{ value: Person["seniority"]; label: string }> = [
  { value: "Senior", label: "Senior" },
  { value: "Mid", label: "Mid" },
  { value: "Junior", label: "Junior" },
];

const onboardingOptions: ReadonlyArray<{ value: Person["onboardingStatus"]; label: string }> = [
  { value: "Not started", label: "Not started" },
  { value: "In progress", label: "In progress" },
  { value: "Complete", label: "Complete" },
];

const styleGenreOptions = [
  "Brand film",
  "Cinematic",
  "Commercial",
  "Customer story",
  "Documentary",
  "Explainer",
  "Illustration-led",
  "Interview",
  "Invisible VFX",
  "Live action",
  "Playful",
  "Product",
  "Social",
].map((value) => ({ value, label: value }));

const skillOptions = [
  "2D animation",
  "After Effects",
  "Animation",
  "Character animation",
  "Client management",
  "Colour grading",
  "Colour review",
  "Commercial strategy",
  "Compositing",
  "Conform",
  "Creative direction",
  "Cinematography",
  "Call sheets",
  "DaVinci Resolve",
  "Dialogue edit",
  "Drone",
  "Editing",
  "Gimbal",
  "Lighting",
  "Mixing",
  "Motion graphics",
  "Motion design",
  "Premiere Pro",
  "Producing",
  "Rotoscoping",
  "Scheduling",
  "Sound design",
  "Story structure",
  "Illustration",
  "Cleanup",
].map((value) => ({ value, label: value }));

function includeExistingOptions(options: Array<{ value: string; label: string }>, values: string[]) {
  const knownValues = new Set(options.map((option) => option.value));
  return [...options, ...values.filter((value) => !knownValues.has(value)).map((value) => ({ value, label: value }))];
}

function StudioPermissionDropdown({ onChange, value }: { onChange: (value: StudioPermission) => void; value: StudioPermission }) {
  return <BriskSelect
    ariaLabel="Studio permission"
    tooltip="Change what this person can access."
    className="person-inline-role-select"
    clearable={false}
    searchable={false}
    value={value}
    options={studioPermissionOptions}
    placeholder="Choose a role"
    triggerClassName="person-inline-role-select-trigger"
    onChange={(nextValue) => { if (nextValue) onChange(nextValue); }}
  />;
}

function SeniorityDropdown({ onChange, value }: { onChange: (value: Person["seniority"]) => void; value: Person["seniority"] }) {
  return <BriskSelect
    ariaLabel="Seniority"
    className="person-inline-role-select"
    clearable={false}
    searchable={false}
    value={value}
    options={seniorityOptions}
    placeholder="Choose seniority"
    triggerClassName="person-inline-role-select-trigger"
    onChange={(nextValue) => { if (nextValue) onChange(nextValue); }}
  />;
}

function OnboardingDropdown({ onChange, value }: { onChange: (value: Person["onboardingStatus"]) => void; value: Person["onboardingStatus"] }) {
  return <BriskSelect
    ariaLabel="Onboarding"
    tooltip="Track whether they have finished joining."
    className="person-inline-role-select"
    clearable={false}
    searchable={false}
    value={value}
    options={onboardingOptions}
    placeholder="Choose onboarding status"
    triggerClassName="person-inline-role-select-trigger"
    onChange={(nextValue) => { if (nextValue) onChange(nextValue); }}
  />;
}

function WeeklyCapacityField({ onSave, value }: { onSave: (value: number | null) => void; value: number | null }) {
  const inputId = "person-weekly-capacity";
  const [draft, setDraft] = useState(value?.toString() ?? "");
  useEffect(() => setDraft(value?.toString() ?? ""), [value]);
  function saveDraft() {
    const nextValue = draft.trim() ? Number(draft) : null;
    if (nextValue === null || (Number.isFinite(nextValue) && nextValue >= 0)) {
      if (nextValue !== value) onSave(nextValue);
      setDraft(nextValue?.toString() ?? "");
    } else {
      setDraft(value?.toString() ?? "");
    }
  }
  return <div className="person-capacity-inline" onBlur={saveDraft}><label className="sr-only" htmlFor={inputId}>Weekly capacity in hours per week</label><Input id={inputId} size="S" type="number" value={draft} placeholder="Not set" onChange={(event) => setDraft(event.target.value)} /><span className="label-xs">hours / week</span></div>;
}

function WorkSection({ onCapacityChange, person }: { onCapacityChange: (weeklyCapacityHours: number | null) => void; person: Person }) {
  const rollup = getWorkloadRollup(person);
  const projects = getPersonProjects(person);
  return <section className="person-section-stack"><header className="person-section-header"><div><h2 className="headings-s-bold">Work</h2><p className="paragraph-s">Current projects, project roles, stages, statuses and predicted hours.</p></div>{person.type === "Team" ? <div className="person-capacity-summary"><span tabIndex={0} data-tooltip="Weekly hours left after booked work." aria-description="Weekly hours left after booked work."><strong className={rollup.level === "full" ? "is-over" : ""}>{rollup.availableHours}h</strong><small>Available</small></span><span tabIndex={0} data-tooltip="Hours planned for active work." aria-description="Hours planned for active work."><strong>{rollup.activeHours}h</strong><small>Booked</small></span><span tabIndex={0} data-tooltip="Hours waiting on the Client." aria-description="Hours waiting on the Client."><strong>{rollup.potentialHours}h</strong><small>Potential</small></span><span tabIndex={0} data-tooltip="Set their working hours for each week." aria-description="Set their working hours for each week."><WeeklyCapacityField value={person.weeklyCapacityHours} onSave={onCapacityChange} /><small>Weekly capacity</small></span></div> : null}</header>
    {person.type === "Client contact" ? <ClientAccessProjectList person={person} projects={projects} /> : person.workloads.length ? <div className="person-work-table-frame"><table className="person-work-table"><thead><tr><th>Project</th><th>Project role</th><th>Stage</th><th>Status</th><th>Predicted hours</th><th>Assignment</th></tr></thead><tbody>{person.workloads.map((item) => { const project = activeVideoProjects.find((candidate) => candidate.id === item.projectId); if (!project) return null; return <tr key={item.id}><td data-label="Project"><Link href={`/projects/${project.id}`}><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName}</small></Link></td><td data-label="Project role" className="label-s-semibold">{item.projectRole}</td><td data-label="Stage"><span className="person-stage-label label-xs-semibold"><DsIcon name={stageIcon(item.stage)} size={14} />{stageLabels[item.stage]}</span></td><td data-label="Status"><span className={`people-workload-status is-${item.status === "Waiting on Studio" ? "studio" : "client"} label-xs-semibold`}>{item.status}</span></td><td data-label="Predicted hours" className="label-m-semibold">{item.predictedHours}h</td><td data-label="Assignment"><span className="person-assignment-status label-xs-semibold">{item.assignmentStatus}</span></td></tr>; })}</tbody></table></div> : <div className="person-section-empty"><span><DsIcon name="queue" size={28} /></span><h3 className="headings-xs-bold">No current work</h3><p className="paragraph-s">Assigned projects and accepted offers will appear here.</p></div>}
  </section>;
}

function SkillsSection({ id, onIdentityUpdate, person }: { id: string; onIdentityUpdate: (update: PersonProfileUpdate) => void; person: Person }) {
  return (
    <section id={id} className="person-section-stack">
      <header className="person-section-header">
        <div><h2 className="headings-s-bold">Skills and specialties</h2><p className="paragraph-s">Choose the skills and styles that help match this person to the right work.</p></div>
      </header>
      <article className="person-detail-card person-skills-card">
          <div className="person-skills-field"><h3 className="headings-2xs-bold">Skills</h3>
          <BriskSelect
            ariaLabel="Skills"
            tooltip="Choose the skills they use on projects."
            className="person-tag-multiselect"
            clearLabel="Clear skills"
            multiple
            options={includeExistingOptions(skillOptions, person.skills)}
            placeholder="Select skills"
            searchable
            selectionLabel={(selected) => `${selected.length} skills selected`}
            triggerClassName="person-inline-multiselect-trigger"
            triggerContent={<span className="person-tag-list">{person.skills.length ? person.skills.map((skill) => <span className="label-xs-semibold" key={skill}>{skill}</span>) : <span className="label-s people-muted">No skills added</span>}</span>}
            value={person.skills}
            onChange={(skills) => onIdentityUpdate({ skills })}
          />
          </div>
          <div className="person-skills-field"><h3 className="headings-2xs-bold">Styles and genres</h3>
          <BriskSelect
            ariaLabel="Styles and genres"
            tooltip="Choose the types of videos they make."
            className="person-tag-multiselect"
            clearLabel="Clear styles and genres"
            multiple
            options={includeExistingOptions(styleGenreOptions, person.styles)}
            placeholder="Select styles and genres"
            searchable={false}
            selectionLabel={(selected) => `${selected.length} styles selected`}
            triggerClassName="person-inline-multiselect-trigger"
            triggerContent={<span className="person-tag-list">{person.styles.length ? person.styles.map((style) => <span className="label-xs-semibold" key={style}>{style}</span>) : <span className="label-s people-muted">No styles added</span>}</span>}
            value={person.styles}
            onChange={(styles) => onIdentityUpdate({ styles })}
          />
          </div>
      </article>
    </section>
  );
}

function StudioRecordSection({ id, onStudioUpdate, onSeniorityChange, person }: { id: string; onStudioUpdate: (update: PersonStudioDetailsUpdate) => void; onSeniorityChange: (seniority: Person["seniority"]) => void; person: Person }) {
  return <section id={id} className="person-detail-card person-studio-record-card"><h2 className="headings-xs-bold">Studio details</h2><dl><div><dt className="label-xs">Seniority</dt><dd><SeniorityDropdown value={person.seniority} onChange={onSeniorityChange} /></dd></div><div><dt className="label-xs">Onboarding</dt><dd><OnboardingDropdown value={person.onboardingStatus} onChange={(onboardingStatus) => onStudioUpdate({ onboardingStatus })} /></dd></div><div><dt className="label-xs">Agreement</dt><dd><AgreementField person={person} onSave={onStudioUpdate} /></dd></div></dl></section>;
}

function AccessSummarySection({ hasBillingAccess, invitationStatus, onBillingAccessChange, onClientRoleChange, onStudioUpdate, person }: { hasBillingAccess: boolean; invitationStatus: InvitationStatus; onBillingAccessChange: (hasBillingAccess: boolean) => void; onClientRoleChange: (role: "Client Admin" | "Client Member") => void; onStudioUpdate: (update: PersonStudioDetailsUpdate) => void; person: Person }) {
  const projects = getPersonProjects(person);
  const isClientContact = person.type === "Client contact";
  return <section className={`person-access-at-glance person-summary-card ${person.type === "Team" ? "has-billing" : ""}`}><header className="person-access-summary-header"><h2 className="headings-xs-bold">Access</h2><span aria-label={`Invitation status: ${invitationStatus}`} className={`invitation-status is-${invitationStatus.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{invitationStatus}</span></header><div className="person-access-summary-inline"><div className="person-access-role"><span className="label-xs">Role</span>{person.type === "Team" ? <StudioPermissionDropdown value={person.studioPermission ?? "Team Member"} onChange={(value) => onStudioUpdate({ studioPermission: value })} /> : isClientContact ? <InlineChoice label="Client role" value={person.clientMembershipRole ?? "Client Member"} options={["Client Admin", "Client Member"]} onSave={(value) => onClientRoleChange(value as "Client Admin" | "Client Member")} /> : <strong className="label-s-semibold">{person.accessRole ?? "No role"}</strong>}{person.type !== "Team" && !isClientContact ? <span className="label-xs">{projects.length} {projects.length === 1 ? "project" : "projects"}</span> : null}</div></div>{person.type === "Team" ? <div className="person-studio-access is-compact"><span className="label-xs">Billing access</span><div><strong className="label-s-semibold">{hasBillingAccess ? "On" : "Off"}</strong><Button size="S" variant="secondary" tooltip={hasBillingAccess ? "Stop this person managing Studio billing." : "Let this person manage Studio billing."} onClick={() => onBillingAccessChange(!hasBillingAccess)}>{hasBillingAccess ? "Turn off" : "Turn on"}</Button></div></div> : null}</section>;
}

function AccessSection({ id, invitationStatus, onInvite, onManage, onProjectAccessChange, onRemoveAccess, person }: { id: string; invitationStatus: InvitationStatus; onInvite: () => void; onManage: () => void; onProjectAccessChange: (projectIds: string[]) => void; onRemoveAccess: () => void; person: Person }) {
  const projects = getPersonProjects(person);
  const isClientContact = person.type === "Client contact";
  return <section id={id} className="person-section-stack"><header className="person-section-header"><div><h2 className="headings-s-bold">Access</h2><p className="paragraph-s">Manage invitations and the projects this Person can access.</p></div><div className="person-section-actions">{invitationStatus !== "Accepted" ? <Button size="M" variant="secondary" tooltip="Send another invitation email." onClick={onInvite}>Resend invite</Button> : null}{person.type !== "Team" ? <Button size="M" tooltip="Choose which projects they can open." onClick={onManage}><span className="people-button-content"><DsIcon name="plus" size={16} /> Manage access</span></Button> : null}{isClientContact ? <Button size="S" variant="danger" className="client-danger-button" type="button" data-tooltip="Stop access to the Client portal and projects." aria-description="Stop access to the Client portal and projects." onClick={onRemoveAccess}>Remove portal access</Button> : null}</div></header>{isClientContact || person.type === "Freelancer" ? <ClientAccessProjectList person={person} projects={projects} onRemoveProject={(projectId) => onProjectAccessChange(person.projectAccessIds.filter((id) => id !== projectId))} /> : <p className="paragraph-s">Studio role and billing access are shown on the Overview tab.</p>}</section>;
}

function ClientAccessProjectList({ onRemoveProject, person, projects }: { onRemoveProject?: (projectId: string) => void; person: Person; projects: ReturnType<typeof getPersonProjects> }) {
  return <div className="person-access-projects"><header><h3 className="headings-xs-bold">Projects they can access</h3><span className="label-xs-semibold">{projects.length} shared</span></header>{projects.length ? projects.map((project) => <article key={project.id}><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.status} - {project.clientName}</small></span><div className="person-access-project-actions"><Link className="client-text-button label-xs-semibold" href={`/projects/${project.id}`}>Open project</Link>{onRemoveProject && person.projectAccessIds.includes(project.id) ? <Button size="S" variant="ghost" className="client-text-button" type="button" data-tooltip="Stop access to this project." aria-description="Stop access to this project." onClick={() => onRemoveProject(project.id)}>Remove access</Button> : null}</div></article>) : <div className="people-inline-empty"><strong className="label-s-semibold">No project access</strong><span className="label-xs">Use Manage access to choose a Client and project.</span></div>}<div className="person-profile-safety"><DsIcon name="lock" size={16} /><span className="label-xs">{person.name} cannot see internal notes, Studio rates, other Clients or unrelated projects.</span></div></div>;
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
  return <section className="person-notes-layout"><article className="person-detail-card"><h2 className="headings-xs-bold">Internal notes</h2><Textarea aria-label="Internal notes" rows={2} value={notes} placeholder="Add internal notes…" onChange={(event) => setNotes(event.target.value)} /><div className="person-note-actions"><span className="label-xs"><DsIcon name="lock" size={14} /> Never shown to this person</span><Button size="M" tooltip="Save for Studio Staff only." onClick={() => onSave(notes)}>Save notes</Button></div></article><PersonEventsLog person={person} /></section>;
}

function ArchivePersonDialog({ onArchive, onClose, person }: { onArchive: () => void; onClose: () => void; person: Person }) {
  return <ConfirmationDialog title={`Archive ${person.name}?`} description="This removes the person from active lists and assignment pickers." cancelLabel="Keep person active" confirmLabel="Archive person" tone="danger" onCancel={onClose} onConfirm={onArchive}>
    <p><strong>Project history will not be deleted.</strong> Projects, comments, approvals, files, invoices and activity remain intact. Studio Staff can restore this Person later.</p>
  </ConfirmationDialog>;
}

function RemovePortalAccessDialog({ onClose, onRemove, person }: { onClose: () => void; onRemove: () => void; person: Person }) {
  return <ConfirmationDialog title={`Remove ${person.name}'s portal access?`} description="This is different from temporarily pausing access." cancelLabel="Keep access" confirmLabel="Remove portal access" tone="danger" onCancel={onClose} onConfirm={onRemove}>
    <p><strong>Project access will be removed.</strong> The Person profile, comments, approvals, files and history remain intact. Studio Staff can invite this contact again later.</p>
  </ConfirmationDialog>;
}

function DeletePersonDialog({ onClose, onDelete, person }: { onClose: () => void; onDelete: () => void; person: Person }) {
  const [confirmation, setConfirmation] = useState("");
  return <ConfirmationDialog title={`Delete ${person.name}'s Person record?`} description="Use this only for a duplicate or a record created by mistake." expanded tone="danger" confirmLabel="Delete incorrect record" confirmDisabled={confirmation.trim() !== person.name} onCancel={onClose} onConfirm={onDelete}>
    <p><strong>Audit history will be retained.</strong> Existing project history, comments, approvals and files remain in those projects. The incorrect directory identity and current access relationships will be removed.</p>
    <label><span className="label-s-semibold">Type {person.name} to confirm</span><input data-confirmation-autofocus autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
  </ConfirmationDialog>;
}

function AssignPersonDialog({ onAssign, onClose, person }: { onAssign: (projectId: string) => void; onClose: () => void; person: Person }) {
  const projects = activeVideoProjects.filter((project) => !["Completed", "Archived"].includes(project.status));
  return <ClientModal title={`Assign ${person.name}`} description="Choose a project, then select their role and hours in the project Team panel." onClose={onClose} footer={<Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>}><div className="person-assign-list">{projects.map((project) => <button type="button" key={project.id} onClick={() => onAssign(project.id)}><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName} - {project.status}</small></span><DsIcon name="plus" size={16} /></button>)}</div></ClientModal>;
}

function PersonProfilePermissionState({ role }: { role: "Studio Staff" | "Studio Freelancer" | "Customer" }) {
  const isCustomer = role === "Customer";
  const isTeamMember = role === "Studio Staff";
  return <main className="people-permission-state"><span><DsIcon name="lock" size={28} /></span><h1 className="headings-s-bold">{isCustomer ? "This Studio profile is private" : isTeamMember ? "This profile is restricted" : "This profile is outside your invited projects"}</h1><p className="paragraph-s">{isCustomer ? "Customers can see permitted collaborators in their Client portal, but cannot browse Studio profiles, rates or internal notes." : isTeamMember ? "Only Studio Owners can browse personal details, access, capacity and internal notes." : "Studio Freelancers can see only people needed for projects they can access. Ask the Studio producer if you need this profile."}</p><Link className="client-secondary-button label-s-semibold" href={isCustomer ? "/customer-dashboard" : isTeamMember ? "/today" : "/active-videos"}>{isCustomer ? "Open Client portal" : isTeamMember ? "Back to To Do" : "Back to invited projects"}</Link></main>;
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
