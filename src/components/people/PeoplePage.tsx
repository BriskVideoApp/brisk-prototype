"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { FilterButton, FilterGroup } from "../../../Brisk DS/src/app/components/FilterGroup";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { InvitationStatusBadge, useInvitations, type InvitationStatus } from "@/components/invitations/InvitationContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import {
  CapacityButton,
  PeopleAvatar,
  PersonTypeBadge,
  WorkloadDialog,
  formatPersonDate,
} from "@/components/people/PeoplePrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { getWorkloadRollup, hasStudioAdministrationAccess, prototypeStudioPersonId, type Person } from "@/data/people";

type PeopleView = "All" | "Studio Staff" | "Studio Freelancers" | "Clients" | "Archived";
type SortOption = "activity" | "name" | "workload" | "availability";
type PeopleColumnId = "person" | "relationship" | "role" | "work" | "capacity" | "invitation" | "activity" | "profile" | "company";
type PeopleColumn = { id: PeopleColumnId; label: string };
const peopleViews: readonly PeopleView[] = ["All", "Studio Staff", "Studio Freelancers", "Clients", "Archived"];

const sortOptions = [
  { value: "activity", label: "Latest activity" },
  { value: "name", label: "Name" },
  { value: "workload", label: "Workload" },
  { value: "availability", label: "Availability" },
] as const;

export function PeoplePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewState = searchParams.get("preview");
  const { people } = usePeople();
  const { getInvitationStatus, openInvitePerson, resendInvitation } = useInvitations();
  const { studio, updateStaffAccess } = useStudioSettings();
  const { selectedRole } = usePrototypeRole();
  const [view, setView] = useState<PeopleView>(() => getPeopleView(searchParams.get("view")));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("activity");
  const [openedInviteFromQuery, setOpenedInviteFromQuery] = useState(false);
  const [workloadPerson, setWorkloadPerson] = useState<Person | null>(null);
  const currentStudioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canBrowsePeople = selectedRole === "Studio Staff" && hasStudioAdministrationAccess(currentStudioMember);
  const columns = getPeopleColumns(view);
  const visibleSortOptions = view === "Clients" || view === "Archived"
    ? sortOptions.filter((option) => option.value === "activity" || option.value === "name")
    : sortOptions;
  const inviteFromPeople = () => {
    const inviteRole = view === "Studio Staff"
      ? "Studio Staff"
      : view === "Studio Freelancers"
        ? "Studio Freelancer"
        : view === "Clients"
          ? "Customer"
          : undefined;
    if (inviteRole !== "Studio Staff") {
      openInvitePerson(inviteRole ? { role: inviteRole } : {});
      return;
    }
    openInvitePerson({ role: "Studio Staff" }, (person, submission) => {
      if (submission.role !== "Studio Staff") return;
      if (studio.staffAccess.some((member) => member.personId === person.id)) return;
      updateStaffAccess([
        ...studio.staffAccess,
        { personId: person.id, status: "Pending invite", hasBillingAccess: false },
      ]);
    });
  };
  const changeView = (nextView: PeopleView) => {
    setView(nextView);
    if (nextView === "Clients" || nextView === "Archived") setSort("activity");
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === "All") params.delete("view");
    else params.set("view", nextView);
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };

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
          <div><h1 className="headings-m-bold">People</h1><p className="paragraph-s">Manage Filmmakers, Client contacts and production contacts in one directory.</p></div>
          <div className="people-page-actions">
            <Button size="M" onClick={inviteFromPeople}><span className="people-button-content"><DsIcon name="plus" size={16} /> {getInviteButtonLabel(view)}</span></Button>
          </div>
        </div>
      </header>

      <div className="people-view-tabs">
        <FilterGroup className="people-view-tabs-inner" aria-label="People views">
          {peopleViews.map((item) => (
            <FilterButton selected={view === item} count={countView(people, item)} type="button" key={item} onClick={() => changeView(item)}>
              {item}
            </FilterButton>
          ))}
        </FilterGroup>
      </div>

      <section className="people-controls" aria-label="People directory controls">
        <div className="people-controls-inner">
          <label className="people-search" htmlFor="people-search"><DsIcon name="search" size={16} /><span className="sr-only">Search people</span><input id="people-search" type="search" value={query} placeholder="Search by name or email" onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="people-sort-control"><span className="label-xs-semibold">Sort by</span><BriskSelect ariaLabel="Sort people" clearable={false} searchable={false} options={visibleSortOptions} placeholder="Sort by" value={sort} onChange={(value) => setSort((value || "activity") as SortOption)} /></div>
          <span className="people-result-count label-s">{visiblePeople.length} {visiblePeople.length === 1 ? "person" : "people"}</span>
        </div>
      </section>

      {visiblePeople.length ? (
        <section className="people-table-frame" aria-label="People directory">
          <table className={`people-table people-table-${view.toLocaleLowerCase("en-AU").replaceAll(" ", "-")}`}>
            <thead><tr>{columns.map((column) => <th data-column={column.id} key={column.id}>{column.id === "profile" ? <span className="sr-only">View person details</span> : column.label}</th>)}</tr></thead>
            <tbody>
              {visiblePeople.map((person) => {
                const currentProjects = getCurrentProjects(person);
                const invitationStatus = getInvitationStatus(person);
                return (
                  <tr key={person.id}>
                    {columns.map((column) => <td data-column={column.id} data-label={column.label} key={column.id} onClick={(event) => {
                      if (event.target instanceof Element && event.target.closest("a, button, input, select")) return;
                      if (column.id === "capacity") {
                        setWorkloadPerson(person);
                        return;
                      }
                      router.push(peopleProfileHref(person, column.id));
                    }}>{renderPeopleCell({ column, person, view, currentProjects, invitationStatus, studioBillingAccess: Boolean(studio.staffAccess.find((member) => member.personId === person.id)?.hasBillingAccess), onResend: () => resendInvitation(person), onWorkload: () => setWorkloadPerson(person) })}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : <PeopleEmptyState hasControls={previewState === "no-results" || Boolean(query.trim())} onInvite={inviteFromPeople} onClear={() => { setQuery(""); const url = new URL(window.location.href); url.searchParams.delete("preview"); router.replace(`${url.pathname}${url.search}`); }} view={view} />}

      {workloadPerson ? <WorkloadDialog person={workloadPerson} onClose={() => setWorkloadPerson(null)} /> : null}
    </main>
  );
}

function PeopleEmptyState({ hasControls, onClear, onInvite, view }: { hasControls: boolean; onClear: () => void; onInvite: () => void; view: PeopleView }) {
  const copy = view === "Studio Freelancers"
    ? { title: "No Studio Freelancers", body: "Studio Freelancers you invite to projects will appear here.", action: "Invite Studio Freelancer" }
    : view === "Clients"
      ? { title: "No Clients", body: "Clients will appear here when you invite someone to a Client portal.", action: "Invite Client" }
      : view === "Archived"
        ? { title: "No archived people", body: "Archived profiles will stay here with their project history intact.", action: "Invite person" }
        : { title: "No people yet", body: "Filmmakers, Clients and production contacts will appear here.", action: "Invite person" };
  return <section className="people-empty-state"><span><DsIcon name="users-three" size={28} /></span><h2 className="headings-xs-bold">{hasControls ? "No people match this search" : copy.title}</h2><p className="paragraph-s">{hasControls ? "Try a different name or email address." : copy.body}</p>{hasControls ? <Button size="M" variant="secondary" onClick={onClear}>Clear search</Button> : <Button size="M" onClick={onInvite}>{copy.action}</Button>}</section>;
}

function PeoplePermissionState({ role }: { role: "Studio Staff" | "Studio Freelancer" | "Customer" }) {
  const isCustomer = role === "Customer";
  const isTeamMember = role === "Studio Staff";
  return <main className="people-permission-state"><span><DsIcon name="lock" size={28} /></span><h1 className="headings-s-bold">{isCustomer ? "The Studio People directory is private" : isTeamMember ? "The People directory is restricted" : "The full People directory is for Studio Staff"}</h1><p className="paragraph-s">{isCustomer ? "Customers can see only permitted collaborators inside their Client portal. Other Clients, private contact details and internal notes stay hidden." : isTeamMember ? "Only Studio Owners can browse personal details, access, capacity and internal notes." : "Studio Freelancers can see only the people and Client information needed for projects they can access. Ask the Studio producer if you need something else."}</p><Link className="client-secondary-button label-s-semibold" href={isCustomer ? "/customer-dashboard" : isTeamMember ? "/today" : "/active-videos"}>{isCustomer ? "Open Client portal" : isTeamMember ? "Back to To Do" : "Back to invited projects"}</Link></main>;
}

function matchesView(person: Person, view: PeopleView) {
  if (view === "Archived") return person.status === "Archived";
  if (person.status === "Archived") return false;
  if (view === "Studio Staff") return person.type === "Team";
  if (view === "Studio Freelancers") return person.type === "Freelancer";
  if (view === "Clients") return person.type === "Client contact";
  return true;
}

function countView(people: Person[], view: PeopleView) {
  return people.filter((person) => matchesView(person, view)).length;
}

function getPeopleColumns(view: PeopleView): PeopleColumn[] {
  return [
    { id: "person", label: "Person" },
    view === "Clients" ? { id: "company", label: "Client" } : { id: "relationship", label: "Type" },
    { id: "role", label: "Role" },
    { id: "work", label: view === "Clients" ? "Projects shared" : view === "Archived" ? "Projects" : "Current work" },
    ...(view === "Studio Staff" ? [{ id: "capacity" as const, label: "Capacity" }] : []),
    { id: "invitation", label: view === "Clients" ? "Portal access" : "Access" },
    { id: "activity", label: "Latest activity" },
    { id: "profile", label: "Open profile" },
  ];
}

function renderPeopleCell({ column, person, view, currentProjects, invitationStatus, studioBillingAccess, onResend, onWorkload }: {
  column: PeopleColumn;
  person: Person;
  view: PeopleView;
  currentProjects: ReturnType<typeof getCurrentProjects>;
  invitationStatus: InvitationStatus;
  studioBillingAccess: boolean;
  onResend: () => void;
  onWorkload: () => void;
}) {
  const projectDescriptor = view === "Clients" ? "shared" : view === "Archived" ? "" : "active ";
  const projectCount = `${currentProjects.length} ${projectDescriptor ? `${projectDescriptor} ` : ""}${currentProjects.length === 1 ? "project" : "projects"}`;
  if (column.id === "person") return <Link className="people-name-cell" href={peopleProfileHref(person, column.id)}><PeopleAvatar person={person} /><span><strong className="label-m-semibold">{person.name}</strong><small className="label-xs">{person.email || "No email added"}</small></span></Link>;
  if (column.id === "relationship") return <div className="people-relationship-cell"><Link className="people-profile-link" href={peopleProfileHref(person, column.id)} aria-label={`Open ${person.name}'s overview`}><PersonTypeBadge type={person.type} /></Link>{person.clientId && person.clientName ? <Link className="label-xs-semibold" href={`/clients/${person.clientId}`}>{person.clientName}</Link> : <Link className="people-profile-link label-xs" href={peopleProfileHref(person, column.id)}>{person.type === "Team" ? "North Star Films" : person.location}</Link>}</div>;
  if (column.id === "company") return person.clientId && person.clientName
    ? <Link className="label-s-semibold people-company-link" href={`/clients/${person.clientId}`}>{person.clientName}</Link>
    : <span className="label-s people-muted">Company not linked</span>;
  if (column.id === "role") return <Link className="people-role-cell people-profile-link" href={peopleProfileHref(person, column.id)}><strong className="label-s-semibold">{person.jobTitles.join(", ") || "Role not added"}</strong>{person.type === "Team" ? null : <small className="label-xs">{person.skills.slice(0, 2).join(" - ") || "Skills not added"}</small>}</Link>;
  if (column.id === "capacity") return <CapacityButton person={person} onClick={onWorkload} compact />;
  if (column.id === "work" && view === "Studio Staff") return (
    <div className="people-current-work is-project-list">
      {currentProjects.length === 0 ? (
        <Link className="people-profile-link label-xs people-muted" href={peopleProfileHref(person, column.id)}>No active projects</Link>
      ) : currentProjects.slice(0, 2).map((project) => (
        <Link className="people-project-entry label-xs" href={`/projects/${project.id}`} key={project.id} title={`${project.clientName} · ${project.name}`}>
          <span className="people-project-client">{project.clientName} · </span>
          <span className="people-project-title label-xs-semibold">{project.name}</span>
        </Link>
      ))}
      {currentProjects.length > 2 ? <Link className="people-profile-link label-xs people-muted" href={peopleProfileHref(person, column.id)} aria-label={`+${currentProjects.length - 2} more active projects for ${person.name} - view all ${currentProjects.length}`}>+{currentProjects.length - 2} more</Link> : null}
    </div>
  );
  if (column.id === "work") return <div className="people-current-work"><Link className="people-profile-link label-xs-semibold" href={peopleProfileHref(person, column.id)}>{projectCount}</Link>{currentProjects.slice(0, 2).map((project) => <Link className="label-xs" href={`/projects/${project.id}`} key={project.id}>{project.name}</Link>)}{currentProjects.length === 0 ? <Link className="people-profile-link label-xs people-muted" href={peopleProfileHref(person, column.id)}>{view === "Clients" ? "No projects shared" : "No current work"}</Link> : null}{view !== "Archived" && (person.type === "Team" || person.type === "Freelancer") ? <CapacityButton person={person} onClick={onWorkload} /> : null}</div>;
  if (column.id === "activity") return <Link className="people-activity-cell people-profile-link" href={peopleProfileHref(person, column.id)}><strong className="label-s-semibold">{person.latestActivity.label}</strong><small className="label-xs">{formatPersonDate(person.latestActivity.occurredAt)}</small></Link>;
  if (column.id === "invitation") return <div className="people-invitation-cell"><Link className="people-invitation-link people-profile-link" href={peopleProfileHref(person, column.id)}>{person.type === "Contact" ? <><strong className="label-s-semibold">No Brisk access</strong><small className="label-xs">Production contact only.</small></> : <><InvitationStatusBadge status={invitationStatus} /><small className="label-xs">{invitationStatus === "Pending" ? (view === "Clients" ? "Portal invite sent." : "Invite sent - waiting for them to join.") : invitationStatus === "Expired" ? "This invite has expired. Send a new one to continue." : view === "Clients" ? "Portal access is active." : "They have joined Brisk."}</small></>}</Link>{person.type !== "Contact" && invitationStatus !== "Accepted" ? <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={onResend}>Resend invite</Button> : null}{view === "Studio Staff" && person.type === "Team" ? <div className="people-billing-cell"><strong className="label-xs-semibold">Billing: {studioBillingAccess ? "Admin" : "No access"}</strong><Link className="client-text-button label-xs-semibold" href={peopleProfileHref(person, "invitation")}>Manage</Link></div> : null}</div>;
  return <Link className="people-row-open" href={peopleProfileHref(person, column.id)} aria-label={`Open ${person.name}'s full profile`}><DsIcon name="caret-right" size={16} /></Link>;
}

function peopleProfileHref(person: Person, column: PeopleColumnId) {
  const section = column === "activity" ? "Notes and activity"
    : column === "work" && person.type !== "Contact" ? "Work"
      : column === "invitation" && (person.type === "Freelancer" || person.type === "Client contact") ? "Access"
        : "Overview";
  return section === "Overview" ? `/people/${person.id}` : `/people/${person.id}?section=${encodeURIComponent(section)}`;
}

function getPeopleView(value: string | null): PeopleView {
  if (value === "Customers") return "Clients";
  return peopleViews.find((view) => view === value) ?? "All";
}

function getInviteButtonLabel(view: PeopleView) {
  if (view === "Studio Staff") return "Invite Studio Staff";
  if (view === "Studio Freelancers") return "Invite Studio Freelancer";
  if (view === "Clients") return "Invite Client";
  return "Invite person";
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
  if (person.type === "Client contact" || person.type === "Contact") return 4;
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
