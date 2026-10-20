"use client";

import Link from "next/link";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Project } from "@/components/active-videos/types";
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
  const label = type === "Team" ? "Studio Staff" : type === "Freelancer" ? "Studio Freelancer" : type === "Client contact" ? "Client" : "Production contact";
  return <span className={`people-type-badge is-${slug(type)} label-xs-semibold`}>{label}</span>;
}

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  return <span className={`people-status-badge is-${slug(status)} label-xs-semibold`}>{status}</span>;
}

/** One project-entry presentation for People and Client contact rows. */
export function PeopleProjectLinks({ projects, emptyLabel, emptyHref, moreLabel, limit = 2 }: {
  projects: readonly Pick<Project, "id" | "name" | "clientName">[];
  emptyLabel: string;
  emptyHref?: string;
  moreLabel?: string;
  limit?: number;
}) {
  return <div className="people-current-work is-project-list">
    {projects.length === 0 ? (
      emptyHref
        ? <Link className="people-profile-link label-xs people-muted" href={emptyHref}>{emptyLabel}</Link>
        : <span className="label-xs people-muted">{emptyLabel}</span>
    ) : projects.slice(0, limit).map((project) => (
      <Link className="people-project-entry label-xs" href={`/projects/${project.id}`} key={project.id} title={`${project.clientName} · ${project.name}`}>
        <span className="people-project-client">{project.clientName} · </span>
        <span className="people-project-title label-xs-semibold">{project.name}</span>
      </Link>
    ))}
    {projects.length > limit && emptyHref ? <Link className="people-profile-link label-xs people-muted" href={emptyHref} aria-label={moreLabel}>+{projects.length - limit} more</Link> : null}
  </div>;
}

export function CapacityButton({ onClick, person, compact = false }: { onClick: () => void; person: Person; compact?: boolean }) {
  const rollup = getWorkloadRollup(person);
  const headline = compact && rollup.isOverCapacity
    ? `${rollup.overbookedHours}h over capacity`
    : `${rollup.availableHours}h available`;
  const compactSummary = `${headline}, ${rollup.activeHours}/${person.weeklyCapacityHours ?? 0}h booked${rollup.potentialHours > 0 ? `, ${rollup.potentialHours}h awaiting Client` : ""}${rollup.level === "near" ? ", Near capacity" : ""}`;

  if (person.type === "Client contact" || person.type === "Contact") return <span className="label-s people-muted">Not applicable</span>;

  if (person.type === "Freelancer") {
    return (
      <button className={`people-availability-button${compact ? " is-compact" : ""}`} type="button" onClick={onClick} aria-label={`View ${person.name}'s workload - ${person.availability ?? "Available"}, ${person.workloads.length} current ${person.workloads.length === 1 ? "project" : "projects"}`}>
        <strong className="label-s-semibold">{person.availability ?? "Available"}</strong>
        <small className="label-xs">{person.workloads.length} current {person.workloads.length === 1 ? "project" : "projects"}</small>
      </button>
    );
  }

  return (
    <button className={`people-capacity-button is-${rollup.level}${compact ? " is-compact" : ""}`} type="button" onClick={onClick} aria-label={`View ${person.name}'s workload - ${compact ? compactSummary : rollup.label}`}>
      <strong className="label-s-semibold">{headline}</strong>
      {compact ? (
        <>
          <small className="label-xs">{rollup.activeHours}/{person.weeklyCapacityHours ?? 0}h booked</small>
          {rollup.potentialHours > 0 ? <small className="label-xs">{rollup.potentialHours}h awaiting Client</small> : null}
          {rollup.level === "near" ? <span className="people-capacity-status is-near label-xs-semibold">Near capacity</span> : null}
        </>
      ) : (
        <>
          <small className="label-xs">{rollup.activeHours}/{person.weeklyCapacityHours ?? 0}h booked · +{rollup.potentialHours}h potential</small>
          <span className={`people-capacity-status is-${rollup.level} label-xs-semibold`}><span aria-hidden="true" />{rollup.label}</span>
        </>
      )}
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
      footer={<Button size="S" variant="secondary" onClick={onClose}>Close</Button>}
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
