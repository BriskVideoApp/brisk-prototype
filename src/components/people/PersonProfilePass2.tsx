"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { BriskSelect } from "@/components/form/BriskSelect";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import type {
  Person,
  PersonActivity,
  PersonAvailability,
  PersonProfileUpdate,
  PersonStudioDetailsUpdate,
  StudioPermission,
} from "@/data/people";
import {
  readSharedTimeEntries,
  sharedTimeEntriesEventName,
  type SharedTimeEntry,
} from "@/data/timeEntries/sharedTimeEntries";

const seniorityOptions: ReadonlyArray<{ value: Person["seniority"]; label: string }> = [
  { value: "Junior", label: "Junior" },
  { value: "Mid", label: "Mid" },
  { value: "Senior", label: "Senior" },
];

const availabilityOptions: ReadonlyArray<{ value: PersonAvailability; label: string }> = [
  { value: "Available", label: "Available" },
  { value: "Busy", label: "Busy" },
  { value: "Away", label: "Away" },
];

const testingStatusOptions: ReadonlyArray<{ value: Person["testingStatus"]; label: string }> = [
  { value: "Not required", label: "Not required" },
  { value: "Not started", label: "Not started" },
  { value: "In review", label: "In review" },
  { value: "Complete", label: "Complete" },
];

const onboardingStatusOptions: ReadonlyArray<{ value: Person["onboardingStatus"]; label: string }> = [
  { value: "Not started", label: "Not started" },
  { value: "In progress", label: "In progress" },
  { value: "Complete", label: "Complete" },
];

const agreementStatusOptions: ReadonlyArray<{ value: Person["agreementStatus"]; label: string }> = [
  { value: "Not required", label: "Not required" },
  { value: "Pending", label: "Pending" },
  { value: "Signed", label: "Signed" },
];

const rateTypeOptions: ReadonlyArray<{ value: NonNullable<Person["commercial"]>["rateType"]; label: string }> = [
  { value: "Hourly", label: "Hourly" },
  { value: "Day rate", label: "Day rate" },
];

const studioPermissionOptions: ReadonlyArray<{ value: StudioPermission; label: string }> = [
  { value: "Team Member", label: "Team Member" },
  { value: "Studio Owner", label: "Studio Owner" },
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

type EventCategory = "All" | "Invitation" | "Access" | "Project" | "Profile";

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
  const emailIsValid = person.type === "Contact" && !normalisedEmail ? true : /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalisedEmail);
  const duplicate = normalisedEmail ? allPeople.find((candidate) => candidate.id !== person.id && candidate.email.trim().toLocaleLowerCase("en-AU") === normalisedEmail) : undefined;
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
      availability: person.type === "Client contact" || person.type === "Contact" ? null : availability,
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
      footer={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" onClick={save}>Save profile</Button></>}
    >
      <div className="person-edit-profile-layout">
        <section className="person-avatar-editor" aria-label="Profile image">
          <PeopleAvatar person={{ ...person, avatarUrl, name: name || person.name }} size="L" />
          <div>
            <strong className="label-m-semibold">Profile image</strong>
            <span className="label-xs">Upload a JPG, PNG or WebP image. Initials remain as the fallback.</span>
            <div>
              <Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}><span className="people-button-content"><DsIcon name="upload-simple" size={15} /> Upload image</span></Button>
              {avatarUrl ? <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={() => setAvatarUrl(null)}>Remove</Button> : null}
            </div>
          </div>
          <input className="sr-only" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} />
        </section>

        <section className="person-edit-access-summary">
          <span><strong className="label-xs-semibold">{person.accessRole ?? "No Brisk access"}</strong><small className="label-xs">{profileAccessCopy(person)}</small></span>
          <DsIcon name="lock" size={18} />
        </section>

        <div className="person-edit-form-grid">
          <Input label="Name" value={name} error={attemptedSave && !name.trim()} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" type="email" value={email} error={attemptedSave && (!emailIsValid || Boolean(duplicate))} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Phone" value={phone} placeholder="Add phone number" onChange={(event) => setPhone(event.target.value)} />
          <Input label={person.type === "Client contact" || person.type === "Contact" ? "Role" : "Job titles"} value={jobTitles} hint="Separate multiple titles with commas" onChange={(event) => setJobTitles(event.target.value)} />
          <Input label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <div className="person-edit-select-field"><span className="label-m-semibold">Seniority</span><BriskSelect ariaLabel="Choose seniority" clearable={false} searchable={false} options={seniorityOptions} placeholder="Choose seniority" value={seniority} onChange={(value) => value && setSeniority(value)} /></div>
          {person.type !== "Client contact" && person.type !== "Contact" ? <div className="person-edit-select-field"><span className="label-m-semibold">Availability</span><BriskSelect ariaLabel="Choose availability" clearable={false} searchable={false} options={availabilityOptions} placeholder="Choose availability" value={availability} onChange={(value) => value && setAvailability(value)} /></div> : null}
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

export function EditFreelancerStudioDetailsDialog({
  onClose,
  onSave,
  person,
}: {
  onClose: () => void;
  onSave: (update: PersonStudioDetailsUpdate) => void;
  person: Person;
}) {
  const [seniority, setSeniority] = useState<Person["seniority"]>(person.seniority);
  const [testingStatus, setTestingStatus] = useState<Person["testingStatus"]>(person.testingStatus);
  const [onboardingStatus, setOnboardingStatus] = useState<Person["onboardingStatus"]>(person.onboardingStatus);
  const [agreementStatus, setAgreementStatus] = useState<Person["agreementStatus"]>(person.agreementStatus);
  const [rateType, setRateType] = useState<NonNullable<Person["commercial"]>["rateType"]>(person.commercial?.rateType ?? "Day rate");
  const [defaultRate, setDefaultRate] = useState(String(person.commercial?.defaultRate ?? 0));

  const save = () => {
    onSave({
      seniority,
      testingStatus,
      onboardingStatus,
      agreementStatus,
      rateType,
      defaultRate: Math.max(0, Number(defaultRate) || 0),
    });
  };

  return (
    <ClientModal
      className="person-edit-modal"
      title={`Edit Studio details for ${person.name}`}
      description="Manage the Studio’s classification, contractor checks and default offer rate. Personal and professional details are managed by the Freelancer."
      onClose={onClose}
      footer={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" onClick={save}>Save Studio details</Button></>}
    >
      <div className="person-edit-profile-layout">
        <section className="person-edit-access-summary">
          <span><strong className="label-xs-semibold">Freelancer-managed profile</strong><small className="label-xs">Contact details, skills, availability and portfolio stay synced from personal settings.</small></span>
          <DsIcon name="lock" size={18} />
        </section>

        <div className="person-edit-form-grid">
          <div className="person-edit-select-field"><span className="label-m-semibold">Studio seniority</span><BriskSelect ariaLabel="Choose Studio seniority" clearable={false} searchable={false} options={seniorityOptions} placeholder="Choose seniority" value={seniority} onChange={(value) => value && setSeniority(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Testing</span><BriskSelect ariaLabel="Choose testing status" clearable={false} searchable={false} options={testingStatusOptions} placeholder="Choose status" value={testingStatus} onChange={(value) => value && setTestingStatus(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Onboarding</span><BriskSelect ariaLabel="Choose onboarding status" clearable={false} searchable={false} options={onboardingStatusOptions} placeholder="Choose status" value={onboardingStatus} onChange={(value) => value && setOnboardingStatus(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Agreement</span><BriskSelect ariaLabel="Choose agreement status" clearable={false} searchable={false} options={agreementStatusOptions} placeholder="Choose status" value={agreementStatus} onChange={(value) => value && setAgreementStatus(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Rate type</span><BriskSelect ariaLabel="Choose rate type" clearable={false} searchable={false} options={rateTypeOptions} placeholder="Choose rate type" value={rateType} onChange={(value) => value && setRateType(value)} /></div>
          <Input label="Default rate" type="number" hint="AUD - starting point for project offers" value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} />
        </div>
      </div>
    </ClientModal>
  );
}

export function EditTeamStudioDetailsDialog({
  onClose,
  onSave,
  person,
}: {
  onClose: () => void;
  onSave: (update: PersonStudioDetailsUpdate) => void;
  person: Person;
}) {
  const [department, setDepartment] = useState(person.department ?? "");
  const [weeklyCapacity, setWeeklyCapacity] = useState(String(person.weeklyCapacityHours ?? 40));
  const [studioPermission, setStudioPermission] = useState<StudioPermission>(person.studioPermission ?? "Team Member");
  const [seniority, setSeniority] = useState<Person["seniority"]>(person.seniority);
  const [onboardingStatus, setOnboardingStatus] = useState<Person["onboardingStatus"]>(person.onboardingStatus);

  const save = () => {
    onSave({
      department: department.trim() || null,
      weeklyCapacityHours: Math.max(1, Number(weeklyCapacity) || 40),
      studioPermission,
      seniority,
      onboardingStatus,
    });
  };

  return (
    <ClientModal
      className="person-edit-modal"
      title={`Edit Studio details for ${person.name}`}
      description="Manage this person’s place in the Studio. Their contact and professional details stay synced from personal settings."
      onClose={onClose}
      footer={<><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" onClick={save}>Save Studio details</Button></>}
    >
      <div className="person-edit-profile-layout">
        <section className="person-edit-access-summary">
          <span><strong className="label-xs-semibold">Team Member-managed profile</strong><small className="label-xs">Contact details, skills, availability and portfolio stay synced from personal settings.</small></span>
          <DsIcon name="lock" size={18} />
        </section>

        <div className="person-edit-form-grid">
          <Input label="Department" value={department} placeholder="Add department" onChange={(event) => setDepartment(event.target.value)} />
          <Input label="Weekly capacity" type="number" value={weeklyCapacity} hint="Hours per week" onChange={(event) => setWeeklyCapacity(event.target.value)} />
          <div className="person-edit-select-field"><span className="label-m-semibold">Studio permission</span><BriskSelect ariaLabel="Choose Studio permission" clearable={false} searchable={false} options={studioPermissionOptions} placeholder="Choose permission" value={studioPermission} onChange={(value) => value && setStudioPermission(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Studio seniority</span><BriskSelect ariaLabel="Choose Studio seniority" clearable={false} searchable={false} options={seniorityOptions} placeholder="Choose seniority" value={seniority} onChange={(value) => value && setSeniority(value)} /></div>
          <div className="person-edit-select-field"><span className="label-m-semibold">Onboarding</span><BriskSelect ariaLabel="Choose onboarding status" clearable={false} searchable={false} options={onboardingStatusOptions} placeholder="Choose status" value={onboardingStatus} onChange={(value) => value && setOnboardingStatus(value)} /></div>
        </div>
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
          <button type="button" aria-label="Previous week" aria-description="Show logged hours for the previous week." data-tooltip="Show the previous week's hours." onClick={() => setWeekStart(addDays(weekStart, -7))}><DsIcon name="caret-left" size={15} /></button>
          <strong className="label-s-semibold">{formatWeekRange(weekStart, weekEnd)}</strong>
          <button type="button" aria-label="Next week" aria-description="Show logged hours for the next week." data-tooltip="Show the next week's hours." disabled={weekStart >= latestWeek} onClick={() => setWeekStart(addDays(weekStart, 7))}><DsIcon name="caret-right" size={15} /></button>
        </div>
      </header>

      <div className="person-hours-summary">
        <span tabIndex={0} data-tooltip="Total hours recorded for the selected week." aria-description="Total hours recorded for the selected week."><strong className="headings-s-bold">{formatHours(totalHours)}</strong><small className="label-xs">Logged this week</small></span>
        <span tabIndex={0} data-tooltip="Projects with logged time in the selected week." aria-description="Projects with logged time in the selected week."><strong className="headings-s-bold">{projectCount}</strong><small className="label-xs">{projectCount === 1 ? "Project" : "Projects"}</small></span>
        <span tabIndex={0} data-tooltip="Separate time entries for the selected week." aria-description="Separate time entries for the selected week."><strong className="headings-s-bold">{weekEntries.length}</strong><small className="label-xs">Time entries</small></span>
      </div>

      {person.type === "Freelancer" ? <div className="people-info-block"><DsIcon name="info" size={18} /><p className="label-s">Time is operational history for both hourly and flat-rate work. It does not change the agreed payment automatically.</p></div> : null}

      {groupedEntries.length ? <div className="person-hours-history">{groupedEntries.map(([date, dateEntries]) => <section key={date}><header><strong className="label-m-semibold">{formatEventDate(date)}</strong><span className="label-xs-semibold">{formatHours(dateEntries.reduce((total, entry) => total + entry.hours, 0))}</span></header>{dateEntries.map((entry) => <article key={entry.id}><span className="person-event-icon is-time"><DsIcon name="clock-clockwise" size={16} /></span><div><Link className="label-s-semibold" href={`/projects/${entry.projectId}`}>{entry.projectName}</Link><small className="label-xs">{entry.clientName} - {stageLabels[entry.stageId]}</small><p className="label-s">{entry.note || "Time logged"}</p></div><strong className="label-m-semibold">{formatHours(entry.hours)}</strong></article>)}</section>)}</div> : <div className="person-section-empty is-bordered"><span><DsIcon name="clock-clockwise" size={28} /></span><h3 className="headings-xs-bold">No hours logged this week</h3><p className="paragraph-s">Choose another week to review earlier time entries.</p>{weekStart !== latestWeek ? <Button size="M" tooltip="Return to the most recent logged week." onClick={() => setWeekStart(latestWeek)}>Show latest week</Button> : null}</div>}
    </section>
  );
}

export function PersonEventsLog({ person }: { person: Person }) {
  const [category, setCategory] = useState<EventCategory>("All");
  const events = useMemo(() => makePersonEvents(person.activity), [person.activity]);
  const visibleEvents = category === "All" ? events : events.filter((event) => event.category === category);
  const categoryOptions: ReadonlyArray<{ value: EventCategory; label: string }> = [
    { value: "All", label: "All activity" },
    { value: "Invitation", label: "Invitations" },
    { value: "Access", label: "Access" },
    { value: "Project", label: "Project work" },
    { value: "Profile", label: "Profile changes" },
  ];

  return (
    <div className="person-events-log">
      <header><h2 className="headings-xs-bold">Events log</h2><div className="person-event-filter"><BriskSelect ariaLabel="Filter events" tooltip="Show one type of activity." clearable={false} searchable={false} options={categoryOptions} placeholder="Filter events" value={category} onChange={(value) => value && setCategory(value)} /></div></header>
      {visibleEvents.length ? <div className="person-events-list">{visibleEvents.map((event) => <PersonEventRow event={event} key={event.id} />)}</div> : <div className="people-inline-empty"><strong className="label-s-semibold">No matching activity</strong><span className="label-xs">Choose another event type.</span></div>}
    </div>
  );
}

function PersonEventRow({ event }: { event: PersonEvent }) {
  const copy = <>
    <span className="notification-inbox-item-title-row"><strong className="label-s-semibold">{event.label}</strong></span>
    <span className="notification-inbox-item-body label-s">{event.detail}</span>
    <span className="notification-inbox-item-meta label-xs">{[event.category, event.projectName, event.stageLabel].filter(Boolean).join(" · ")} · <time dateTime={event.occurredAt}>{formatEventTimestamp(event.occurredAt)}</time></span>
  </>;

  return <article className={`notification-inbox-item is-${personEventTone(event)}`}>
    {event.projectId ? <Link className="notification-inbox-item-main-link" href={`/projects/${event.projectId}`}>{copy}</Link> : <div className="notification-inbox-item-main-link is-static">{copy}</div>}
  </article>;
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

function makePersonEvents(activity: PersonActivity[]): PersonEvent[] {
  return activity.map((event): PersonEvent => ({ ...event, category: inferEventCategory(event) }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function inferEventCategory(event: PersonActivity): PersonEvent["category"] {
  const copy = `${event.label} ${event.detail}`.toLocaleLowerCase("en-AU");
  if (copy.includes("invite") || copy.includes("invitation")) return "Invitation";
  if (copy.includes("access") || copy.includes("portal")) return "Access";
  if (copy.includes("profile") || copy.includes("person added") || copy.includes("person archived")) return "Profile";
  return "Project";
}

function personEventTone(event: PersonEvent) {
  const label = event.label.toLocaleLowerCase("en-AU");
  if (/(failed|rejected|deleted)/u.test(label)) return "failure";
  if (/(paused|overdue)/u.test(label)) return "warning";
  if (/(approved|accepted|completed|restored)/u.test(label)) return "success";
  return "information";
}

function profileAccessCopy(person: Person) {
  if (person.type === "Team") return person.studioPermission === "Team Member"
    ? "Full Studio workspace access without Studio settings."
    : "Full Studio workspace and Studio settings access.";
  if (person.type === "Freelancer") return "Access is limited to selected Clients and projects.";
  if (person.type === "Contact") return "This production contact has not been invited to Brisk.";
  return "Access is limited to one Client company and selected projects.";
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

function formatEventTimestamp(date: string) {
  return new Date(date).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/\.?0+$/u, "")}h`;
}
