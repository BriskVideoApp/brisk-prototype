"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import type { InvitationStatus } from "@/data/invitations";
import type { Person, PersonActivity, PersonAvailability, PersonProfileUpdate } from "@/data/people";
import {
  readSharedTimeEntries,
  sharedTimeEntriesEventName,
  type SharedTimeEntry,
} from "@/data/timeEntries/sharedTimeEntries";

const seniorityOptions: ReadonlyArray<{ value: Person["seniority"]; label: string }> = [
  { value: "Emerging", label: "Emerging" },
  { value: "Midweight", label: "Midweight" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
];

const availabilityOptions: ReadonlyArray<{ value: PersonAvailability; label: string }> = [
  { value: "Available", label: "Available" },
  { value: "Busy", label: "Busy" },
  { value: "Away", label: "Away" },
];

type PersonTimeEntry = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  stageId: SharedTimeEntry["stageId"];
  hours: number;
  note: string;
  loggedAt: string;
};

type EventCategory = "All" | "Invitation" | "Access" | "Project" | "Time" | "Profile";

type PersonEvent = {
  id: string;
  category: Exclude<EventCategory, "All">;
  label: string;
  detail: string;
  occurredAt: string;
  projectId?: string;
  projectName?: string;
  stageLabel?: string;
};

export function EditPersonProfileDialog({
  allPeople,
  onClose,
  onSave,
  person,
}: {
  allPeople: Person[];
  onClose: () => void;
  onSave: (update: PersonProfileUpdate) => void;
  person: Person;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email);
  const [phone, setPhone] = useState(person.phone);
  const [jobTitles, setJobTitles] = useState(person.jobTitles.join(", "));
  const [skills, setSkills] = useState(person.skills.join(", "));
  const [styles, setStyles] = useState(person.styles.join(", "));
  const [seniority, setSeniority] = useState<Person["seniority"]>(person.seniority);
  const [location, setLocation] = useState(person.location);
  const [timezone, setTimezone] = useState(person.timezone);
  const [availability, setAvailability] = useState<PersonAvailability>(person.availability ?? "Available");
  const [weeklyCapacity, setWeeklyCapacity] = useState(String(person.weeklyCapacityHours ?? 40));
  const [portfolioUrl, setPortfolioUrl] = useState(person.portfolioUrl);
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const normalisedEmail = email.trim().toLocaleLowerCase("en-AU");
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalisedEmail);
  const duplicate = allPeople.find((candidate) => candidate.id !== person.id && candidate.email.trim().toLocaleLowerCase("en-AU") === normalisedEmail);
  const canSave = Boolean(name.trim() && emailIsValid && !duplicate);

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setAvatarUrl(reader.result);
    });
    reader.readAsDataURL(file);
  };

  const save = () => {
    setAttemptedSave(true);
    if (!canSave) return;
    onSave({
      name: name.trim(),
      avatarUrl,
      email: normalisedEmail,
      phone: phone.trim(),
      jobTitles: toList(jobTitles),
      skills: toList(skills),
      styles: toList(styles),
      seniority,
      location: location.trim() || "Location not added",
      timezone: timezone.trim() || "UTC",
      availability: person.type === "Client contact" ? null : availability,
      weeklyCapacityHours: person.type === "Team" ? Math.max(1, Number(weeklyCapacity) || 40) : null,
      portfolioUrl: portfolioUrl.trim(),
    });
  };

  return (
    <ClientModal
      className="person-edit-modal"
      title={`Edit ${person.name}`}
      description="Update profile details. Role and access are managed separately."
      onClose={onClose}
      footer={<><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button><Button size="M" onClick={save}>Save profile</Button></>}
    >
      <div className="person-edit-profile-layout">
        <section className="person-avatar-editor" aria-label="Profile image">
          <PeopleAvatar person={{ ...person, avatarUrl, name: name || person.name }} size="L" />
          <div>
            <strong className="label-m-semibold">Profile image</strong>
            <span className="label-xs">Upload a JPG, PNG or WebP image. Initials remain as the fallback.</span>
            <div>
              <Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}><span className="people-button-content"><DsIcon name="upload-simple" size={15} /> Upload image</span></Button>
              {avatarUrl ? <button className="client-text-button label-xs-semibold" type="button" onClick={() => setAvatarUrl(null)}>Remove</button> : null}
            </div>
          </div>
          <input className="sr-only" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} />
        </section>

        <section className="person-edit-access-summary">
          <span><strong className="label-xs-semibold">{person.accessRole}</strong><small className="label-xs">{profileAccessCopy(person)}</small></span>
          <DsIcon name="lock" size={18} />
        </section>

        <div className="person-edit-form-grid">
          <Input label="Name" value={name} error={attemptedSave && !name.trim()} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" type="email" value={email} error={attemptedSave && (!emailIsValid || Boolean(duplicate))} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Phone" value={phone} placeholder="Add phone number" onChange={(event) => setPhone(event.target.value)} />
          <Input label={person.type === "Client contact" ? "Role" : "Job titles"} value={jobTitles} hint="Separate multiple titles with commas" onChange={(event) => setJobTitles(event.target.value)} />
          <Input label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <div className="person-edit-select-field"><span className="label-m-semibold">Seniority</span><BriskSelect ariaLabel="Choose seniority" clearable={false} searchable={false} options={seniorityOptions} placeholder="Choose seniority" value={seniority} onChange={(value) => value && setSeniority(value)} /></div>
          {person.type !== "Client contact" ? <div className="person-edit-select-field"><span className="label-m-semibold">Availability</span><BriskSelect ariaLabel="Choose availability" clearable={false} searchable={false} options={availabilityOptions} placeholder="Choose availability" value={availability} onChange={(value) => value && setAvailability(value)} /></div> : null}
          {person.type === "Team" ? <Input label="Weekly capacity" type="number" value={weeklyCapacity} hint="Hours per week" onChange={(event) => setWeeklyCapacity(event.target.value)} /> : null}
          {person.type !== "Client contact" ? <Input label="Portfolio or reel" type="url" value={portfolioUrl} placeholder="https://" onChange={(event) => setPortfolioUrl(event.target.value)} /> : null}
          <div className="person-edit-wide"><Input label="Skills and specialties" value={skills} hint="Separate skills with commas" onChange={(event) => setSkills(event.target.value)} /></div>
          <div className="person-edit-wide"><Input label="Styles and genres" value={styles} hint="Separate styles with commas" onChange={(event) => setStyles(event.target.value)} /></div>
        </div>

        {attemptedSave && duplicate ? <p className="person-edit-error label-xs" role="alert">{duplicate.name} already uses this email. Open their existing profile instead.</p> : null}
        {attemptedSave && !emailIsValid ? <p className="person-edit-error label-xs" role="alert">Enter a valid email address.</p> : null}
      </div>
    </ClientModal>
  );
}

export function PersonHoursSection({ person }: { person: Person }) {
  const entries = usePersonTimeEntries(person.id);
  const latestEntryDate = entries[0]?.loggedAt.slice(0, 10) ?? "2026-08-18";
  const latestWeek = getWeekStart(latestEntryDate);
  const [weekStart, setWeekStart] = useState(latestWeek);

  useEffect(() => {
    if (entries.length === 0) return;
    setWeekStart(latestWeek);
  }, [person.id, latestWeek, entries.length]);

  const weekEnd = addDays(weekStart, 6);
  const weekEntries = entries.filter((entry) => {
    const date = entry.loggedAt.slice(0, 10);
    return date >= weekStart && date <= weekEnd;
  });
  const totalHours = weekEntries.reduce((total, entry) => total + entry.hours, 0);
  const projectCount = new Set(weekEntries.map((entry) => entry.projectId)).size;
  const groupedEntries = groupByDate(weekEntries);

  return (
    <section className="person-section-stack">
      <header className="person-section-header">
        <div><h2 className="headings-s-bold">Logged hours</h2><p className="paragraph-s">A weekly history of time recorded against projects and Stages.</p></div>
        <div className="person-week-controls" aria-label="Choose week">
          <button type="button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><DsIcon name="caret-left" size={15} /></button>
          <strong className="label-s-semibold">{formatWeekRange(weekStart, weekEnd)}</strong>
          <button type="button" aria-label="Next week" disabled={weekStart >= latestWeek} onClick={() => setWeekStart(addDays(weekStart, 7))}><DsIcon name="caret-right" size={15} /></button>
        </div>
      </header>

      <div className="person-hours-summary">
        <span><strong className="headings-s-bold">{formatHours(totalHours)}</strong><small className="label-xs">Logged this week</small></span>
        <span><strong className="headings-s-bold">{projectCount}</strong><small className="label-xs">{projectCount === 1 ? "Project" : "Projects"}</small></span>
        <span><strong className="headings-s-bold">{weekEntries.length}</strong><small className="label-xs">Time entries</small></span>
      </div>

      {person.type === "Freelancer" ? <div className="people-info-block"><DsIcon name="info" size={18} /><p className="label-s">Time is operational history for both hourly and flat-rate work. It does not change the agreed payment automatically.</p></div> : null}

      {groupedEntries.length ? <div className="person-hours-history">{groupedEntries.map(([date, dateEntries]) => <section key={date}><header><strong className="label-m-semibold">{formatEventDate(date)}</strong><span className="label-xs-semibold">{formatHours(dateEntries.reduce((total, entry) => total + entry.hours, 0))}</span></header>{dateEntries.map((entry) => <article key={entry.id}><span className="person-event-icon is-time"><DsIcon name="clock-clockwise" size={16} /></span><div><Link className="label-s-semibold" href={`/projects/${entry.projectId}`}>{entry.projectName}</Link><small className="label-xs">{entry.clientName} - {stageLabels[entry.stageId]}</small><p className="label-s">{entry.note || "Time logged"}</p></div><strong className="label-m-semibold">{formatHours(entry.hours)}</strong></article>)}</section>)}</div> : <div className="person-section-empty is-bordered"><span><DsIcon name="clock-clockwise" size={28} /></span><h3 className="headings-xs-bold">No hours logged this week</h3><p className="paragraph-s">Choose another week to review earlier time entries.</p>{weekStart !== latestWeek ? <Button size="M" onClick={() => setWeekStart(latestWeek)}>Show latest week</Button> : null}</div>}
    </section>
  );
}

export function PersonEventsLog({ person }: { person: Person }) {
  const timeEntries = usePersonTimeEntries(person.id);
  const [category, setCategory] = useState<EventCategory>("All");
  const events = useMemo(() => makePersonEvents(person.activity, timeEntries), [person.activity, timeEntries]);
  const visibleEvents = category === "All" ? events : events.filter((event) => event.category === category);
  const groupedEvents = groupEventsByDate(visibleEvents);
  const categoryOptions: ReadonlyArray<{ value: EventCategory; label: string }> = [
    { value: "All", label: "All activity" },
    { value: "Invitation", label: "Invitations" },
    { value: "Access", label: "Access" },
    { value: "Project", label: "Project work" },
    { value: "Time", label: "Logged time" },
    { value: "Profile", label: "Profile changes" },
  ];

  return (
    <div className="person-events-log">
      <header><div><h2 className="headings-xs-bold">Events log</h2><p className="paragraph-s">Invitations, access changes, project work and profile history.</p></div><div className="person-event-filter"><BriskSelect ariaLabel="Filter events" clearable={false} searchable={false} options={categoryOptions} placeholder="Filter events" value={category} onChange={(value) => value && setCategory(value)} /></div></header>
      {groupedEvents.length ? groupedEvents.map(([date, dateEvents]) => <section className="person-event-day" key={date}><h3 className="label-m-semibold">{formatEventDate(date)}</h3><div>{dateEvents.map((event) => <article key={event.id}><span className={`person-event-icon is-${event.category.toLocaleLowerCase("en-AU")}`}><DsIcon name={eventIcon(event.category)} size={16} /></span><div><div className="person-event-title"><strong className="label-s-semibold">{event.label}</strong><span className="label-xs-semibold">{event.category}</span></div><p className="label-s">{event.detail}</p>{event.projectId && event.projectName ? <Link className="label-xs-semibold" href={`/projects/${event.projectId}`}>{event.projectName}{event.stageLabel ? ` - ${event.stageLabel}` : ""}</Link> : null}<small className="label-xs">{formatEventTime(event.occurredAt)}</small></div></article>)}</div></section>) : <div className="people-inline-empty"><strong className="label-s-semibold">No matching activity</strong><span className="label-xs">Choose another event type.</span></div>}
    </div>
  );
}

export function PersonAccessSummary({ invitationStatus, person }: { invitationStatus: InvitationStatus; person: Person }) {
  const projectIds = unique([...person.projectAccessIds, ...person.workloads.map((workload) => workload.projectId)]);
  const projects = activeVideoProjects.filter((project) => projectIds.includes(project.id));
  const clients = unique(projects.map((project) => project.clientName));
  return <div className="person-access-summary-grid"><article className="person-detail-card"><span className="label-xs">Relationship</span><strong className="headings-xs-bold">{person.accessRole}</strong><p className="paragraph-s">{profileAccessCopy(person)}</p></article><article className="person-detail-card"><span className="label-xs">Invitation</span><div className="person-access-status"><span className={`invitation-status is-${invitationStatus.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{invitationStatus}</span><strong className="label-s-semibold">{person.email}</strong></div><p className="paragraph-s">{invitationCopy(invitationStatus)}</p></article><article className="person-detail-card"><span className="label-xs">Current access</span><strong className="headings-xs-bold">{person.type === "Team" ? "Whole Studio" : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}</strong><p className="paragraph-s">{person.type === "Team" ? "All Clients and projects in V1." : clients.length ? clients.join(", ") : "No Client or project access yet."}</p></article></div>;
}

function usePersonTimeEntries(personId: string) {
  const staticEntries = useMemo(() => getStaticPersonTimeEntries(personId), [personId]);
  const [sharedEntries, setSharedEntries] = useState<SharedTimeEntry[]>([]);

  useEffect(() => {
    const syncEntries = () => setSharedEntries(readSharedTimeEntries());
    syncEntries();
    window.addEventListener(sharedTimeEntriesEventName, syncEntries);
    window.addEventListener("storage", syncEntries);
    return () => {
      window.removeEventListener(sharedTimeEntriesEventName, syncEntries);
      window.removeEventListener("storage", syncEntries);
    };
  }, []);

  return useMemo(() => {
    const dynamicEntries = sharedEntries
      .filter((entry) => entry.personId === personId)
      .map(toPersonTimeEntry);
    const entriesById = new Map([...staticEntries, ...dynamicEntries].map((entry) => [entry.id, entry]));
    return [...entriesById.values()].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
  }, [personId, sharedEntries, staticEntries]);
}

function getStaticPersonTimeEntries(personId: string): PersonTimeEntry[] {
  return activeVideoProjects.flatMap((project) => project.timeEntries
    .filter((entry) => entry.personId === personId)
    .map((entry) => ({
      ...entry,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
    })));
}

function toPersonTimeEntry(entry: SharedTimeEntry): PersonTimeEntry {
  const project = activeVideoProjects.find((candidate) => candidate.id === entry.projectId);
  return {
    id: entry.id,
    projectId: entry.projectId,
    projectName: project?.name ?? "Project time",
    clientName: project?.clientName ?? "Client",
    stageId: entry.stageId,
    hours: entry.hours,
    note: entry.note,
    loggedAt: entry.loggedAt,
  };
}

function makePersonEvents(activity: PersonActivity[], timeEntries: PersonTimeEntry[]): PersonEvent[] {
  const profileEvents = activity.map((event): PersonEvent => ({ ...event, category: inferEventCategory(event) }));
  const timeEvents = timeEntries.map((entry): PersonEvent => ({
    id: `time-${entry.id}`,
    category: "Time",
    label: `${formatHours(entry.hours)} logged`,
    detail: entry.note || "Time logged against project work",
    occurredAt: entry.loggedAt,
    projectId: entry.projectId,
    projectName: entry.projectName,
    stageLabel: stageLabels[entry.stageId],
  }));
  return [...profileEvents, ...timeEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function inferEventCategory(event: PersonActivity): PersonEvent["category"] {
  const copy = `${event.label} ${event.detail}`.toLocaleLowerCase("en-AU");
  if (copy.includes("invite") || copy.includes("invitation")) return "Invitation";
  if (copy.includes("access") || copy.includes("portal")) return "Access";
  if (copy.includes("profile") || copy.includes("person added") || copy.includes("person archived")) return "Profile";
  return "Project";
}

function eventIcon(category: PersonEvent["category"]): DsIconName {
  if (category === "Invitation") return "envelope-simple";
  if (category === "Access") return "lock";
  if (category === "Time") return "clock-clockwise";
  if (category === "Profile") return "pencil-simple-ds";
  return "queue";
}

function profileAccessCopy(person: Person) {
  if (person.type === "Team") return "Full Studio workspace access is automatic in V1.";
  if (person.type === "Freelancer") return "Access is limited to selected Clients and projects.";
  return "Access is limited to one Client company and selected projects.";
}

function invitationCopy(status: InvitationStatus) {
  if (status === "Pending") return "Invite sent - waiting for them to join.";
  if (status === "Expired") return "This invite has expired and can be resent.";
  return "They have accepted their Brisk invitation.";
}

function toList(value: string) {
  return unique(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function groupByDate(entries: PersonTimeEntry[]) {
  const grouped = new Map<string, PersonTimeEntry[]>();
  entries.forEach((entry) => {
    const date = entry.loggedAt.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), entry]);
  });
  return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left));
}

function groupEventsByDate(events: PersonEvent[]) {
  const grouped = new Map<string, PersonEvent[]>();
  events.forEach((event) => {
    const date = event.occurredAt.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), event]);
  });
  return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left));
}

function getWeekStart(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const daysSinceMonday = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - daysSinceMonday);
  return toIsoDate(value);
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return toIsoDate(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekRange(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const startCopy = startDate.toLocaleDateString("en-AU", { day: "numeric", ...(sameMonth ? {} : { month: "short" }) });
  const endCopy = endDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return `${startCopy} - ${endCopy}`;
}

function formatEventDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatEventTime(date: string) {
  return new Date(date).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/\.?0+$/u, "")}h`;
}
