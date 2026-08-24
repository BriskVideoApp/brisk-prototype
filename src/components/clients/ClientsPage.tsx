"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import type { Project, StageKey } from "@/components/active-videos/types";
import { stageOrder } from "@/components/active-videos/StageProgress";
import { useClients } from "@/components/clients/ClientDataContext";
import { AddClientDialog, ClientAvatar, ClientStatusBadge } from "@/components/clients/ClientPrimitives";
import type { ClientStatus } from "@/data/clients";

type StatusFilter = "All" | ClientStatus;
type SortOption = "activity" | "name";

const clientViews: readonly StatusFilter[] = ["All", "Active", "Inactive", "Archived"];

const sortOptions = [
  { value: "activity", label: "Latest activity" },
  { value: "name", label: "Name" },
] as const;

export function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients } = useClients();
  const { selectedRole } = usePrototypeRole();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Active");
  const [sort, setSort] = useState<SortOption>("activity");
  const requestedDialog = searchParams.get("dialog");
  const [isAddClientOpen, setIsAddClientOpen] = useState(requestedDialog === "add" || requestedDialog === "duplicate");
  const canManageClients = selectedRole === "Studio Staff";
  const isEmptyPreview = searchParams.get("demo") === "empty" || searchParams.get("preview") === "empty";
  const isNoResultsPreview = searchParams.get("preview") === "no-results";

  const visibleClients = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
    if (isEmptyPreview || isNoResultsPreview) return [];
    return clients
      .filter((client) => status === "All" || client.status === status)
      .filter((client) => !normalisedQuery || `${client.name} ${client.website} ${client.type}`.toLocaleLowerCase("en-AU").includes(normalisedQuery))
      .sort((left, right) => sort === "name"
        ? left.name.localeCompare(right.name, "en-AU")
        : right.latestActivity.occurredAt.localeCompare(left.latestActivity.occurredAt));
  }, [clients, isEmptyPreview, isNoResultsPreview, query, sort, status]);

  if (!canManageClients) {
    return <ClientsPermissionState role={selectedRole} />;
  }

  return (
    <main className="clients-page">
      <header className="clients-page-header">
        <div className="clients-page-header-inner">
          <div>
            <span className="label-xs-semibold">Studio workspace</span>
            <h1 className="headings-m-bold">Clients</h1>
            <p className="paragraph-s">Manage every Client, their projects, Brand Kit and private portal access.</p>
          </div>
          <Button size="M" onClick={() => setIsAddClientOpen(true)}>
            <span className="client-button-content"><DsIcon name="plus" size={16} /> Add Client</span>
          </Button>
        </div>
      </header>

      <nav className="clients-view-tabs" aria-label="Client views">
        <div className="clients-view-tabs-inner">
          {clientViews.map((item) => (
            <button
              className={`label-s-semibold ${status === item ? "is-active" : ""}`}
              type="button"
              aria-current={status === item ? "page" : undefined}
              key={item}
              onClick={() => setStatus(item)}
            >
              {item}
              <span className="label-xs">{countClientView(clients, item)}</span>
            </button>
          ))}
        </div>
      </nav>

      <section className="clients-controls" aria-label="Client list controls">
        <div className="clients-controls-inner">
          <label className="clients-search" htmlFor="clients-search">
            <DsIcon name="search" size={16} />
            <span className="sr-only">Search Clients</span>
            <input id="clients-search" type="search" value={query} placeholder="Search Clients" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="clients-control-select">
            <span className="label-xs-semibold">Sort by</span>
            <BriskSelect
              ariaLabel="Sort Clients"
              clearable={false}
              searchable={false}
              options={sortOptions}
              placeholder="Sort by"
              value={sort}
              onChange={(value) => setSort((value || "activity") as SortOption)}
            />
          </div>
          <span className="clients-result-count label-s">{visibleClients.length} {visibleClients.length === 1 ? "Client" : "Clients"}</span>
        </div>
      </section>

      {visibleClients.length > 0 ? (
        <section className="clients-table-frame" aria-label="Clients list">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Current projects</th>
                <th>Primary Client contact</th>
                <th>Latest activity</th>
                <th>Portal</th>
                <th><span className="sr-only">Open Client</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => {
                const projects = activeVideoProjects.filter((project) => project.clientId === client.id);
                const activeProjects = projects.filter((project) => !["Completed", "Archived"].includes(project.status));
                const primaryContact = client.contacts.find((contact) => contact.id === client.primaryContactId) ?? null;

                return (
                  <tr key={client.id}>
                    <td data-label="Client">
                      <Link className="client-name-cell" href={`/clients/${client.id}`}>
                        <ClientAvatar client={client} />
                        <span>
                          <strong className="label-m-semibold">{client.name}</strong>
                          <small className="label-xs">{client.type}{client.website ? ` - ${client.website}` : ""}</small>
                        </span>
                      </Link>
                    </td>
                    <td data-label="Current projects">
                      <div className="client-project-summary">
                        <span className="label-xs-semibold">{activeProjects.length} active</span>
                        {activeProjects.slice(0, 2).map((project) => <ProjectAtGlance key={project.id} project={project} />)}
                        {activeProjects.length === 0 ? <span className="label-xs">No active projects</span> : null}
                      </div>
                    </td>
                    <td data-label="Primary Client contact">
                      {primaryContact ? (
                        <span className="client-contact-cell">
                          <strong className="label-s-semibold">{primaryContact.name}</strong>
                          <small className="label-xs">{primaryContact.email}</small>
                        </span>
                      ) : <span className="label-s client-muted">No primary contact</span>}
                    </td>
                    <td data-label="Latest activity">
                      <span className="client-activity-cell">
                        <strong className="label-s-semibold">{client.latestActivity.label}</strong>
                        <small className="label-xs">{formatRelativeDate(client.latestActivity.occurredAt)}</small>
                      </span>
                    </td>
                    <td data-label="Portal"><ClientStatusBadge status={client.portal.status} /></td>
                    <td data-label="Open Client">
                      <Link className="client-row-open" href={`/clients/${client.id}`} aria-label={`Open ${client.name}`}>
                        <DsIcon name="caret-right" size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="clients-empty-state">
          <span><DsIcon name="users-three" size={28} /></span>
          {!isEmptyPreview && clients.length > 0 && (isNoResultsPreview || query.trim() || status !== "All") ? (
            <>
              <h2 className="headings-xs-bold">No Clients match these controls.</h2>
              <p className="paragraph-s">Try a different search or show all Client statuses.</p>
              <Button size="M" variant="secondary" onClick={() => {
                setQuery("");
                setStatus("All");
                const url = new URL(window.location.href);
                url.searchParams.delete("preview");
                router.replace(`${url.pathname}${url.search}`);
              }}>Clear controls</Button>
            </>
          ) : (
            <>
              <h2 className="headings-xs-bold">Add your first Client</h2>
              <p className="paragraph-s">Add a Client to start a video and prepare their private portal.</p>
              <Button size="M" onClick={() => setIsAddClientOpen(true)}>Add Client</Button>
            </>
          )}
        </section>
      )}

      {isAddClientOpen ? (
        <AddClientDialog
          initialName={requestedDialog === "duplicate" ? "Canva" : ""}
          showDuplicateOnOpen={requestedDialog === "duplicate"}
          onClose={() => setIsAddClientOpen(false)}
          onCreated={(client) => {
            setIsAddClientOpen(false);
            router.push(`/clients/${client.id}`);
          }}
        />
      ) : null}
    </main>
  );
}

function countClientView(clients: ReturnType<typeof useClients>["clients"], view: StatusFilter) {
  return clients.filter((client) => view === "All" || client.status === view).length;
}

function ProjectAtGlance({ project }: { project: Project }) {
  const currentStage = getCurrentProjectStage(project);
  const stage = stageOrder.find((candidate) => candidate.key === currentStage) ?? stageOrder[0];

  return (
    <span className="client-project-glance">
      <span className={`client-project-stage is-${project.stages[currentStage].state}`}><DsIcon name={stage.icon} size={13} /></span>
      <span>
        <strong className="label-xs-semibold">{project.name}</strong>
        <small className="label-xs">{stage.label} - {getWithinProjectStatus(project)}</small>
      </span>
    </span>
  );
}

export function getCurrentProjectStage(project: Project): StageKey {
  return stageOrder.find((stage) => ["in_progress", "waiting"].includes(project.stages[stage.key].state))?.key
    ?? [...stageOrder].reverse().find((stage) => project.stages[stage.key].state === "done")?.key
    ?? "brief";
}

export function getWithinProjectStatus(project: Project) {
  const state = project.stages[getCurrentProjectStage(project)].state;
  if (state === "waiting") return "Waiting on client";
  if (state === "in_progress") return "Waiting on Studio";
  if (state === "done") return "Approved";
  return "Not started";
}

export function formatRelativeDate(value: string) {
  const date = new Date(value);
  const reference = new Date("2026-08-13T12:00:00+10:00");
  const days = Math.max(0, Math.round((reference.getTime() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function ClientsPermissionState({ role }: { role: "Studio Freelancer" | "Customer" | "Studio Staff" }) {
  const isCustomer = role === "Customer";
  return (
    <main className="clients-permission-state">
      <span><DsIcon name={isCustomer ? "lock" : "users-three"} size={28} /></span>
      <h1 className="headings-s-bold">{isCustomer ? "Your work lives in your Client portal" : "The full Clients area is for Studio Staff"}</h1>
      <p className="paragraph-s">
        {isCustomer
          ? "Your portal shows only your projects, Briefs, reviews, approvals, deliverables and messages."
          : "Freelancers see the Client details needed for projects they have been invited to, but cannot browse every Client in the Studio."}
      </p>
      <Link className="client-secondary-button label-s-semibold" href={isCustomer ? "/customer-dashboard" : "/active-videos"}>
        {isCustomer ? "Open Client portal" : "Back to invited projects"}
      </Link>
    </main>
  );
}
