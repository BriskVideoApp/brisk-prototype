"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { InvitationStatusBadge, useInvitations } from "@/components/invitations/InvitationContext";
import {
  ActivityDialog,
  AddPersonDialog,
  CapacityButton,
  PeopleAvatar,
  PersonTypeBadge,
  WorkloadDialog,
  formatPersonDate,
} from "@/components/people/PeoplePrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { getWorkloadRollup, type Person } from "@/data/people";

type PeopleView = "All" | "Studio Staff" | "Studio Freelancers" | "Customers" | "Archived";
type SortOption = "activity" | "name" | "workload" | "availability";
const peopleViews: readonly PeopleView[] = ["All", "Studio Staff", "Studio Freelancers", "Customers", "Archived"];

const sortOptions = [
  { value: "activity", label: "Latest activity" },
  { value: "name", label: "Name" },
  { value: "workload", label: "Workload" },
  { value: "availability", label: "Availability" },
] as const;

export function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewState = searchParams.get("preview");
  const { people } = usePeople();
  const { getInvitationStatus, openInvitePerson, resendInvitation } = useInvitations();
  const { allPages, selectedRole } = usePrototypeRole();
  const [view, setView] = useState<PeopleView>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("activity");
  const [isAddOpen, setIsAddOpen] = useState(searchParams.get("dialog") === "add");
  const [openedInviteFromQuery, setOpenedInviteFromQuery] = useState(false);
  const [workloadPerson, setWorkloadPerson] = useState<Person | null>(null);
  const [activityPerson, setActivityPerson] = useState<Person | null>(null);
  const canBrowsePeople = allPages || selectedRole === "Studio Staff";

  useEffect(() => {
    if (searchParams.get("dialog") !== "invite" || openedInviteFromQuery) return;
    setOpenedInviteFromQuery(true);
    openInvitePerson();
  }, [openInvitePerson, openedInviteFromQuery, searchParams]);

  const visiblePeople = useMemo(() => {
    if (previewState === "empty" || previewState === "no-results") return [];
    const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
    return people
      .filter((person) => matchesView(person, view))
      .filter((person) => !normalisedQuery || `${person.name} ${person.email} ${person.jobTitles.join(" ")} ${person.skills.join(" ")} ${person.clientName ?? ""}`.toLocaleLowerCase("en-AU").includes(normalisedQuery))
      .sort((left, right) => comparePeople(left, right, sort));
  }, [people, previewState, query, sort, view]);

  if (!canBrowsePeople) return <PeoplePermissionState role={selectedRole} />;

  return (
    <main className="people-page">
      <header className="people-page-header">
        <div className="people-page-header-inner">
          <div><span className="label-xs-semibold">Studio workspace</span><h1 className="headings-m-bold">People</h1><p className="paragraph-s">Manage Studio Staff, Studio Freelancers and Customers in one directory.</p></div>
          <div className="people-page-actions">
            <Button size="M" variant="secondary" onClick={() => setIsAddOpen(true)}>Add profile</Button>
            <Button size="M" onClick={() => openInvitePerson()}><span className="people-button-content"><DsIcon name="plus" size={16} /> Invite person</span></Button>
          </div>
        </div>
      </header>

      <nav className="people-view-tabs" aria-label="People views">
        <div className="people-view-tabs-inner">
          {peopleViews.map((item) => <button className={`label-s-semibold ${view === item ? "is-active" : ""}`} type="button" aria-current={view === item ? "page" : undefined} key={item} onClick={() => setView(item)}>{item}<span className="label-xs">{countView(people, item)}</span></button>)}
        </div>
      </nav>

      <section className="people-controls" aria-label="People directory controls">
        <div className="people-controls-inner">
          <label className="people-search" htmlFor="people-search"><DsIcon name="search" size={16} /><span className="sr-only">Search people</span><input id="people-search" type="search" value={query} placeholder="Search by name or email" onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="people-sort-control"><span className="label-xs-semibold">Sort by</span><BriskSelect ariaLabel="Sort people" clearable={false} searchable={false} options={sortOptions} placeholder="Sort by" value={sort} onChange={(value) => setSort((value || "activity") as SortOption)} /></div>
          <span className="people-result-count label-s">{visiblePeople.length} {visiblePeople.length === 1 ? "person" : "people"}</span>
        </div>
      </section>

      {visiblePeople.length ? (
        <section className="people-table-frame" aria-label="People directory">
          <table className="people-table">
            <thead><tr><th>Person</th><th>Relationship</th><th>Role and specialty</th><th>Current work</th><th>Capacity or availability</th><th>Latest activity</th><th>Invitation</th><th><span className="sr-only">Open profile</span></th></tr></thead>
            <tbody>
              {visiblePeople.map((person) => {
                const currentProjects = getCurrentProjects(person);
                const invitationStatus = getInvitationStatus(person);
                return (
                  <tr key={person.id}>
                    <td data-label="Person"><Link className="people-name-cell" href={`/people/${person.id}`}><PeopleAvatar person={person} /><span><strong className="label-m-semibold">{person.name}</strong><small className="label-xs">{person.email || "No email added"}</small></span></Link></td>
                    <td data-label="Relationship"><div className="people-relationship-cell"><PersonTypeBadge type={person.type} />{person.clientId && person.clientName ? <Link className="label-xs-semibold" href={`/clients/${person.clientId}`}>{person.clientName}</Link> : <small className="label-xs">{person.type === "Team" ? "Northstar Films" : person.location}</small>}</div></td>
                    <td data-label="Role and specialty"><div className="people-role-cell"><strong className="label-s-semibold">{person.jobTitles.join(", ")}</strong><small className="label-xs">{person.skills.slice(0, 2).join(" - ") || "Skills not added"}</small></div></td>
                    <td data-label="Current work"><div className="people-current-work"><strong className="label-xs-semibold">{currentProjects.length} active {currentProjects.length === 1 ? "project" : "projects"}</strong>{currentProjects.slice(0, 2).map((project) => <Link className="label-xs" href={`/projects/${project.id}`} key={project.id}>{project.name}</Link>)}{currentProjects.length === 0 ? <span className="label-xs people-muted">No current work</span> : null}</div></td>
                    <td data-label="Capacity or availability"><CapacityButton person={person} onClick={() => setWorkloadPerson(person)} /></td>
                    <td data-label="Latest activity"><button className="people-activity-button" type="button" onClick={() => setActivityPerson(person)}><strong className="label-s-semibold">{person.latestActivity.label}</strong><small className="label-xs">{formatPersonDate(person.latestActivity.occurredAt)}</small></button></td>
                    <td data-label="Invitation"><div className="people-invitation-cell"><InvitationStatusBadge status={invitationStatus} /><small className="label-xs">{invitationStatus === "Pending" ? "Invite sent - waiting for them to join." : invitationStatus === "Expired" ? "This invite has expired. Send a new one to continue." : "They have joined Brisk."}</small>{invitationStatus !== "Accepted" ? <button className="client-text-button label-xs-semibold" type="button" onClick={() => resendInvitation(person)}>Resend invite</button> : null}</div></td>
                    <td data-label="Open profile"><Link className="people-row-open" href={`/people/${person.id}`} aria-label={`Open ${person.name}`}><DsIcon name="caret-right" size={16} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : <PeopleEmptyState hasControls={previewState === "no-results" || Boolean(query.trim())} onInvite={() => openInvitePerson()} onClear={() => { setQuery(""); const url = new URL(window.location.href); url.searchParams.delete("preview"); router.replace(`${url.pathname}${url.search}`); }} view={view} />}

      {isAddOpen ? <AddPersonDialog onClose={() => setIsAddOpen(false)} onOpenPerson={(person) => { setIsAddOpen(false); router.push(`/people/${person.id}`); }} /> : null}
      {workloadPerson ? <WorkloadDialog person={workloadPerson} onClose={() => setWorkloadPerson(null)} /> : null}
      {activityPerson ? <ActivityDialog person={activityPerson} onClose={() => setActivityPerson(null)} /> : null}
    </main>
  );
}

function PeopleEmptyState({ hasControls, onClear, onInvite, view }: { hasControls: boolean; onClear: () => void; onInvite: () => void; view: PeopleView }) {
  const copy = view === "Studio Freelancers"
    ? { title: "No Studio Freelancers", body: "Studio Freelancers you invite to projects will appear here.", action: "Invite Studio Freelancer" }
    : view === "Customers"
      ? { title: "No Customers", body: "Customers will appear here when you invite someone to a Client portal.", action: "Invite Customer" }
      : view === "Archived"
        ? { title: "No archived people", body: "Archived profiles will stay here with their project history intact.", action: "Invite person" }
        : { title: "No people yet", body: "Studio Staff, Studio Freelancers and Customers will appear here.", action: "Invite person" };
  return <section className="people-empty-state"><span><DsIcon name="users-three" size={28} /></span><h2 className="headings-xs-bold">{hasControls ? "No people match this search" : copy.title}</h2><p className="paragraph-s">{hasControls ? "Try a different name or email address." : copy.body}</p>{hasControls ? <Button size="M" variant="secondary" onClick={onClear}>Clear search</Button> : <Button size="M" onClick={onInvite}>{copy.action}</Button>}</section>;
}

function PeoplePermissionState({ role }: { role: "Studio Staff" | "Studio Freelancer" | "Customer" }) {
  const isCustomer = role === "Customer";
  return <main className="people-permission-state"><span><DsIcon name="lock" size={28} /></span><h1 className="headings-s-bold">{isCustomer ? "The Studio People directory is private" : "The full People directory is for Studio Staff"}</h1><p className="paragraph-s">{isCustomer ? "Customers can see only permitted collaborators inside their Client portal. Other Clients, private contact details and internal notes stay hidden." : "Studio Freelancers can see only the people and Client information needed for projects they can access. Ask the Studio producer if you need something else."}</p><Link className="client-secondary-button label-s-semibold" href={isCustomer ? "/customer-dashboard" : "/active-videos"}>{isCustomer ? "Open Client portal" : "Back to invited projects"}</Link></main>;
}

function matchesView(person: Person, view: PeopleView) {
  if (view === "Archived") return person.status === "Archived";
  if (person.status === "Archived") return false;
  if (view === "Studio Staff") return person.type === "Team";
  if (view === "Studio Freelancers") return person.type === "Freelancer";
  if (view === "Customers") return person.type === "Client contact";
  return true;
}

function countView(people: Person[], view: PeopleView) {
  return people.filter((person) => matchesView(person, view)).length;
}

function comparePeople(left: Person, right: Person, sort: SortOption) {
  if (sort === "name") return left.name.localeCompare(right.name, "en-AU");
  if (sort === "workload") return totalWorkload(right) - totalWorkload(left) || left.name.localeCompare(right.name, "en-AU");
  if (sort === "availability") return availabilityScore(left) - availabilityScore(right) || left.name.localeCompare(right.name, "en-AU");
  return right.latestActivity.occurredAt.localeCompare(left.latestActivity.occurredAt);
}

function totalWorkload(person: Person) {
  const rollup = getWorkloadRollup(person);
  return rollup.activeHours + rollup.potentialHours;
}

function availabilityScore(person: Person) {
  if (person.type === "Client contact") return 4;
  if (person.type === "Freelancer") return person.availability === "Available" ? 0 : person.availability === "Busy" ? 2 : 3;
  const rollup = getWorkloadRollup(person);
  if (rollup.level === "full") return 3;
  return rollup.level === "near" ? 2 : 0;
}

function getCurrentProjects(person: Person) {
  const projectIds = person.type === "Team"
    ? person.workloads.map((item) => item.projectId)
    : [...person.projectAccessIds, ...person.workloads.map((item) => item.projectId)];
  return activeVideoProjects.filter((project) => projectIds.includes(project.id) && !["Completed", "Archived"].includes(project.status));
}
