"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { useClients } from "@/components/clients/ClientDataContext";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import {
  getPersonInitials,
  getWorkloadRollup,
  type Person,
  type PersonStatus,
  type PersonType,
} from "@/data/people";

export function PeopleAvatar({ person, size = "M" }: { person: Pick<Person, "avatarUrl" | "name" | "type">; size?: "S" | "M" | "L" }) {
  return <span className={`people-avatar is-${size.toLocaleLowerCase("en-AU")} is-${slug(person.type)} label-s-semibold`} aria-label={`${person.name} avatar`}>{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : getPersonInitials(person.name)}</span>;
}

export function PersonTypeBadge({ type }: { type: PersonType }) {
  const label = type === "Team" ? "Studio Staff" : type === "Freelancer" ? "Studio Freelancer" : type === "Client contact" ? "Customer" : "Contact";
  return <span className={`people-type-badge is-${slug(type)} label-xs-semibold`}>{label}</span>;
}

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  return <span className={`people-status-badge is-${slug(status)} label-xs-semibold`}>{status}</span>;
}

export function CapacityButton({ onClick, person }: { onClick: () => void; person: Person }) {
  const rollup = getWorkloadRollup(person);

  if (person.type === "Client contact" || person.type === "Contact") return <span className="label-s people-muted">Not applicable</span>;

  if (person.type === "Freelancer") {
    return (
      <button className="people-availability-button" type="button" onClick={onClick}>
        <strong className="label-s-semibold">{person.availability ?? "Available"}</strong>
        <small className="label-xs">{person.workloads.length} current {person.workloads.length === 1 ? "project" : "projects"}</small>
      </button>
    );
  }

  return (
    <button className={`people-capacity-button is-${rollup.level}`} type="button" onClick={onClick} aria-label={`View ${person.name}'s workload - ${rollup.label}`}>
      <strong className="label-s-semibold">{rollup.availableHours}h available</strong>
      <small className="label-xs">{rollup.activeHours}/{person.weeklyCapacityHours ?? 0}h booked · +{rollup.potentialHours}h potential</small>
      <span className={`people-capacity-status is-${rollup.level} label-xs-semibold`}><span aria-hidden="true" />{rollup.label}</span>
    </button>
  );
}

export function WorkloadDialog({ onClose, person }: { onClose: () => void; person: Person }) {
  const rollup = getWorkloadRollup(person);
  const sortedWorkloads = [...person.workloads].sort((left, right) => {
    const statusDifference = Number(left.status === "Waiting on Client") - Number(right.status === "Waiting on Client");
    return statusDifference || right.predictedHours - left.predictedHours;
  });

  return (
    <ClientModal
      title={`${person.name}'s workload`}
      description="Current project work, ordered by what the Studio can act on first."
      onClose={onClose}
      footer={<Button size="M" variant="secondary" onClick={onClose}>Close</Button>}
    >
      {person.type === "Team" ? (
        <div className="people-workload-rollup">
          <span><strong className={`headings-xs-bold ${rollup.level === "full" ? "is-over" : ""}`}>{rollup.availableHours}h</strong><small className="label-xs">Available hours</small></span>
          <span><strong className="headings-xs-bold">{rollup.activeHours}h</strong><small className="label-xs">Booked hours</small></span>
          <span><strong className="headings-xs-bold">{rollup.potentialHours}h</strong><small className="label-xs">Potential hours</small></span>
          <span><strong className="headings-xs-bold">{person.weeklyCapacityHours ?? 0}h</strong><small className="label-xs">Weekly capacity</small></span>
        </div>
      ) : (
        <div className="people-info-block"><DsIcon name="info" size={18} /><p className="label-s">Freelancer hours describe accepted work and offers. They do not count against internal Team capacity.</p></div>
      )}

      {sortedWorkloads.length ? (
        <div className="people-workload-list">
          {sortedWorkloads.map((item) => {
            const project = activeVideoProjects.find((candidate) => candidate.id === item.projectId);
            if (!project) return null;
            return (
              <article className="people-workload-row" key={item.id}>
                <span className={`people-stage-mark is-${item.status === "Waiting on Studio" ? "studio" : "client"}`}><DsIcon name={stageIcon(item.stage)} size={15} /></span>
                <div>
                  <Link className="label-s-semibold" href={`/projects/${project.id}`}>{project.name}</Link>
                  <small className="label-xs">{project.clientName} - {item.projectRole} - {item.assignmentStatus}</small>
                </div>
                <span><small className="label-xs">Stage</small><strong className="label-s-semibold">{stageLabels[item.stage]}</strong></span>
                <span className={`people-workload-status is-${item.status === "Waiting on Studio" ? "studio" : "client"} label-xs-semibold`}>{item.status}</span>
                <strong className="label-m-semibold">{item.predictedHours}h</strong>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="people-inline-empty"><strong className="label-s-semibold">No current workload</strong><span className="label-xs">New assignments and accepted offers will appear here.</span></div>
      )}
      {person.type === "Team" ? <p className="people-rollup-note label-xs">Booked hours are predicted work waiting on the Studio. Available hours are what remains this week. Near capacity begins at 75%. Potential work waiting on the Client is shown separately.</p> : null}
    </ClientModal>
  );
}

export function ActivityDialog({ onClose, person }: { onClose: () => void; person: Person }) {
  return (
    <ClientModal title={`${person.name}'s activity`} description="A filtered view of system history for this person." onClose={onClose} footer={<Button size="M" variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="people-activity-list">
        {person.activity.map((event) => (
          <article key={event.id}>
            <span><DsIcon name="clock-clockwise" size={16} /></span>
            <div><strong className="label-s-semibold">{event.label}</strong><p className="label-s">{event.detail}</p><small className="label-xs">{formatPersonDate(event.occurredAt)}</small></div>
          </article>
        ))}
      </div>
    </ClientModal>
  );
}

export function AddPersonDialog({ initialType = "Team", onClose, onOpenPerson }: { initialType?: Exclude<PersonType, "Client contact"> | "Client contact"; onClose: () => void; onOpenPerson: (person: Person) => void }) {
  const { clients } = useClients();
  const { createPerson, people, setPersonStatus } = usePeople();
  const activeClients = clients.filter((client) => client.status !== "Archived");
  const [type, setType] = useState<PersonType>(initialType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [rate, setRate] = useState("800");
  const [inviteNow, setInviteNow] = useState(true);
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? "");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [duplicate, setDuplicate] = useState<{ person: Person; reason: "email" | "name" } | null>(null);
  const [created, setCreated] = useState<Person | null>(null);
  const availableProjects = activeVideoProjects.filter((project) => project.clientId === clientId && project.status !== "Archived");
  const needsEmail = type === "Client contact" || (type !== "Contact" && inviteNow);
  const canCreate = Boolean(name.trim() && (!needsEmail || email.trim()) && (type !== "Client contact" || clientId));

  const resetWarnings = () => setDuplicate(null);
  const createPersonRecord = () => {
    const person = type === "Client contact"
      ? createPerson({ type, name, email, clientId, projectIds })
      : createPerson({
          type,
          name,
          email,
          jobTitle,
          weeklyCapacityHours: Number(capacity) || 40,
          skills: skills.split(",").map((item) => item.trim()).filter(Boolean),
          location,
          defaultRate: Number(rate) || 800,
          inviteNow: type === "Contact" ? false : inviteNow,
        });
    setCreated(person);
  };
  const submit = () => {
    if (!canCreate) return;
    const normalisedEmail = email.trim().toLocaleLowerCase("en-AU");
    const normalisedName = name.trim().toLocaleLowerCase("en-AU");
    const emailMatch = normalisedEmail ? people.find((person) => person.email.toLocaleLowerCase("en-AU") === normalisedEmail) : undefined;
    const nameMatch = normalisedName ? people.find((person) => person.name.trim().toLocaleLowerCase("en-AU") === normalisedName) : undefined;
    const match = emailMatch ?? nameMatch;
    if (match) {
      setDuplicate({ person: match, reason: emailMatch ? "email" : "name" });
      return;
    }
    createPersonRecord();
  };

  if (created) {
    return (
      <ClientModal
        title={`${created.name} added`}
        description="The Person record is ready. Choose what you want to do next."
        onClose={onClose}
        footer={<><Button size="M" variant="secondary" onClick={onClose}>Done</Button><Button size="M" onClick={() => onOpenPerson(created)}>Open profile</Button></>}
      >
        <div className="people-created-person">
          <PeopleAvatar person={created} size="L" />
          <div><strong className="headings-xs-bold">{created.name}</strong><span className="label-s">{created.type} - {created.jobTitles.join(", ")}</span><PersonStatusBadge status={created.status} /></div>
        </div>
        <div className="people-next-actions">
          {created.status !== "Invited" && created.email ? <button type="button" onClick={() => { setPersonStatus(created.id, "Invited"); setCreated({ ...created, status: "Invited" }); }}><DsIcon name="envelope-simple" size={18} /><span><strong className="label-s-semibold">Invite to Brisk</strong><small className="label-xs">Send access to {created.email}</small></span></button> : null}
          <Link href={created.workloads[0] ? `/projects/${created.workloads[0].projectId}` : "/active-videos"}><DsIcon name="plus" size={18} /><span><strong className="label-s-semibold">Assign to a project</strong><small className="label-xs">Choose a project role and predicted hours</small></span></Link>
          <button type="button" onClick={() => onOpenPerson(created)}><DsIcon name="pencil-simple-ds" size={18} /><span><strong className="label-s-semibold">Add profile details</strong><small className="label-xs">Complete skills, availability and notes</small></span></button>
        </div>
      </ClientModal>
    );
  }

  return (
    <ClientModal
      title="Add person"
      description="Create one Person record for a Filmmaker, Client or production contact."
      onClose={onClose}
      footer={<><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><button className="client-primary-button label-m-semibold" type="button" disabled={!canCreate} onClick={submit}>Create person</button></>}
    >
      <fieldset className="people-type-choice">
        <legend className="label-m-semibold">Person type</legend>
        <div>
          {(["Team", "Freelancer", "Client contact", "Contact"] as const).map((option) => (
            <label className={type === option ? "is-selected" : ""} key={option}>
              <input type="radio" name="person-type" value={option} checked={type === option} onChange={() => { setType(option); resetWarnings(); }} />
              <span><strong className="label-s-semibold">{option === "Team" ? "Team member" : option}</strong><small className="label-xs">{option === "Team" ? "Internal Studio staff" : option === "Freelancer" ? "External contractor" : option === "Client contact" ? "Human connected to a Client" : "Talent or another production contact"}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="people-form-grid">
        <label className="people-field"><span className="label-m-semibold">Name <small className="label-xs">Required</small></span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); resetWarnings(); }} /></label>
        <label className="people-field"><span className="label-m-semibold">Email <small className="label-xs">{needsEmail ? "Required" : "Optional"}</small></span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); resetWarnings(); }} /></label>

        {type === "Team" ? <>
          <label className="people-field"><span className="label-m-semibold">Job title</span><input value={jobTitle} placeholder="Producer, Editor, Shooter" onChange={(event) => setJobTitle(event.target.value)} /></label>
          <label className="people-field"><span className="label-m-semibold">Weekly capacity</span><input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
        </> : null}

        {type === "Freelancer" ? <>
          <label className="people-field"><span className="label-m-semibold">Primary job title</span><input value={jobTitle} placeholder="Editor, Director of Photography" onChange={(event) => setJobTitle(event.target.value)} /></label>
          <label className="people-field"><span className="label-m-semibold">Skills</span><input value={skills} placeholder="Editing, motion design" onChange={(event) => setSkills(event.target.value)} /></label>
          <label className="people-field"><span className="label-m-semibold">Location</span><input value={location} placeholder="Sydney, NSW" onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="people-field"><span className="label-m-semibold">Default day rate <small className="label-xs">AUD</small></span><input type="number" min="0" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
        </> : null}

        {type === "Contact" ? <label className="people-field"><span className="label-m-semibold">Role <small className="label-xs">Optional</small></span><input value={jobTitle} placeholder="For example, interviewee or talent" onChange={(event) => setJobTitle(event.target.value)} /></label> : null}

        {type === "Client contact" ? <>
          <div className="people-field"><span className="label-m-semibold">Related Client</span><BriskSelect ariaLabel="Choose related Client" clearable={false} options={activeClients.map((client) => ({ value: client.id, label: client.name }))} placeholder="Choose Client" searchable value={clientId} onChange={(value) => { setClientId(value); setProjectIds([]); }} /></div>
          <fieldset className="people-project-access"><legend className="label-m-semibold">Project access</legend>{availableProjects.length ? availableProjects.map((project) => <label key={project.id}><input type="checkbox" checked={projectIds.includes(project.id)} onChange={(event) => setProjectIds((current) => event.target.checked ? [...current, project.id] : current.filter((id) => id !== project.id))} /><span><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.status}</small></span></label>) : <span className="label-s people-muted">No projects are available for this Client yet.</span>}</fieldset>
        </> : null}

        {type !== "Client contact" && type !== "Contact" ? <label className="people-invite-option"><input type="checkbox" checked={inviteNow} onChange={(event) => setInviteNow(event.target.checked)} /><span><strong className="label-s-semibold">Invite to Brisk now</strong><small className="label-xs">Turn this off to create the profile before sending access.</small></span></label> : null}
      </div>

      {duplicate ? (
        <section className="people-duplicate-warning">
          <DsIcon name="alert-triangle" size={20} />
          <div><strong className="label-m-semibold">{duplicate.reason === "email" ? `This email already belongs to ${duplicate.person.name}` : `${duplicate.person.name} already has a Person profile`}</strong><span className="label-s">{duplicate.reason === "email" ? "Brisk will not create a duplicate Person record." : "Check the existing profile before confirming this is a different person."}</span><div><Button size="S" variant="secondary" onClick={() => onOpenPerson(duplicate.person)}>Use existing person</Button>{duplicate.reason === "name" ? <button className="client-text-button label-s-semibold" type="button" onClick={createPersonRecord}>Confirm separate person</button> : <Link className="client-text-button label-s-semibold" href={type === "Client contact" && clientId ? `/clients/${clientId}?section=Contacts` : "/active-videos"}>Add Client or project relationship</Link>}</div></div>
        </section>
      ) : null}
    </ClientModal>
  );
}

export function formatPersonDate(value: string) {
  const date = new Date(value);
  const reference = new Date("2026-08-13T12:00:00+10:00");
  const hours = Math.max(0, Math.floor((reference.getTime() - date.getTime()) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function stageIcon(stage: keyof typeof stageLabels) {
  return stage === "brief" ? "clipboard-text" : stage === "script" ? "pen-nib" : stage === "shoot" ? "video-camera-ds" : stage === "media" ? "image-square" : stage === "edit" ? "stage-edit" : "film-strip";
}

function slug(value: string) {
  return value.toLocaleLowerCase("en-AU").replace(/\s+/gu, "-");
}
