"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { StageKey } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import {
  freelancerPreviewViewer,
  getFreelancerEngagements,
  type FreelancerEngagement,
} from "@/data/freelancer-videos";
import { getDemoProjectDestination, type DemoProjectExperience } from "@/data/projects";
import {
  appendSharedTimeEntry,
  readSharedTimeEntries,
  sharedTimeEntriesEventName,
  type SharedTimeEntry,
} from "@/data/timeEntries/sharedTimeEntries";

const freelancerTodayDate = "2026-08-18";

const stageIcons: Record<StageKey, DsIconName> = {
  brief: "clipboard-text",
  script: "pen-nib",
  shoot: "video-camera-ds",
  media: "image-square",
  edit: "stage-edit",
  masters: "film-strip",
};

const experienceByStage: Record<StageKey, DemoProjectExperience> = {
  brief: "brief",
  script: "script",
  shoot: "shoot",
  media: "media",
  edit: "edit",
  masters: "masters",
};

export function FreelancerTodayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sharedEntries, setSharedEntries] = useState<SharedTimeEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const engagements = useMemo(
    () => getFreelancerEngagements(activeVideoProjects, freelancerPreviewViewer.id),
    [],
  );
  const accepted = engagements.filter((engagement) => engagement.invitationStatus === "accepted");
  const currentWork = accepted.filter((engagement) => !["Completed", "Archived"].includes(engagement.project.status));
  const completed = accepted.filter((engagement) => engagement.project.status === "Completed").slice(0, 3);
  const offers = engagements.filter((engagement) => engagement.invitationStatus === "invited" || engagement.invitationStatus === "seen");
  const waiting = currentWork.filter((engagement) => getProjectWaitingLabel(engagement));
  const selectedProjectId = searchParams.get("project");
  const selectedEngagement = accepted.find((engagement) => engagement.project.id === selectedProjectId) ?? currentWork[0] ?? accepted[0] ?? null;
  const requestedStage = searchParams.get("stage") as StageKey | null;
  const selectedStage = requestedStage && selectedEngagement?.stages.includes(requestedStage)
    ? requestedStage
    : selectedEngagement ? getPrimaryAssignedStage(selectedEngagement) : null;
  const isLogFormOpen = searchParams.get("log") === "1" && Boolean(selectedEngagement && selectedStage);
  const todayEntries = sharedEntries.filter((entry) => entry.personId === freelancerPreviewViewer.id && entry.date === freelancerTodayDate);
  const loggedToday = todayEntries.reduce((total, entry) => total + entry.hours, 0);

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

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const closeLogForm = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("log");
    nextParams.delete("project");
    nextParams.delete("stage");
    router.replace(nextParams.size ? `/today?${nextParams.toString()}` : "/today");
  };

  return (
    <main className="freelancer-today-page">
      <header className="freelancer-today-header">
        <div>
          <span className="label-xs-semibold">{freelancerPreviewViewer.name} - Freelancer</span>
          <p className="label-s-semibold">{formatLongDate(freelancerTodayDate)}</p>
          <h1 className="headings-m-bold">Today</h1>
        </div>
        <div className="freelancer-today-summary" aria-label="Today summary">
          <span><strong className="headings-xs-bold">{currentWork.length}</strong><small className="label-xs">Current videos</small></span>
          <span><strong className="headings-xs-bold">{waiting.length}</strong><small className="label-xs">Waiting</small></span>
          <span><strong className="headings-xs-bold">{formatHours(loggedToday)}</strong><small className="label-xs">Logged today</small></span>
        </div>
      </header>

      <div className="freelancer-today-content">
        <section className="freelancer-today-primary" aria-labelledby="freelancer-my-day">
          <header className="freelancer-today-section-header">
            <div><span className="label-xs-semibold">My work</span><h2 className="headings-s-bold" id="freelancer-my-day">Your day</h2></div>
            <Link className="freelancer-today-secondary-action label-s-semibold" href="/active-videos">Open all videos</Link>
          </header>
          {currentWork.length ? (
            <div className="freelancer-today-work-list">
              {currentWork.map((engagement) => <FreelancerWorkCard engagement={engagement} key={engagement.id} />)}
            </div>
          ) : (
            <FreelancerTodayEmpty title="No active work today" body="Accepted project work will appear here when a Studio assigns it to you." action="Open offers" href="/active-videos" />
          )}
        </section>

        <aside className="freelancer-today-side">
          <section className="freelancer-today-panel" aria-labelledby="time-today">
            <header><div><span className="label-xs-semibold">Time</span><h2 className="headings-xs-bold" id="time-today">Logged today</h2></div><strong className="headings-s-bold">{formatHours(loggedToday)}</strong></header>
            {todayEntries.length ? <div className="freelancer-today-time-list">{todayEntries.map((entry) => { const engagement = accepted.find((candidate) => candidate.project.id === entry.projectId); return <article key={entry.id}><span><strong className="label-s-semibold">{engagement?.project.name ?? "Project time"}</strong><small className="label-xs">{stageLabels[entry.stageId]}{entry.note ? ` - ${entry.note}` : ""}</small></span><strong className="label-m-semibold">{formatHours(entry.hours)}</strong></article>; })}</div> : <p className="paragraph-s freelancer-today-muted">No time logged yet today.</p>}
            {selectedEngagement && selectedStage ? <Link className="freelancer-today-primary-action label-s-semibold" href={makeLogHref(selectedEngagement, selectedStage)}>{selectedEngagement.paymentBasis === "hourly" ? "Log hours" : "Log time - optional"}</Link> : null}
          </section>

          <section className="freelancer-today-panel" aria-labelledby="waiting-today">
            <header><div><span className="label-xs-semibold">Projects</span><h2 className="headings-xs-bold" id="waiting-today">Waiting</h2></div><strong className="headings-s-bold">{waiting.length}</strong></header>
            {waiting.length ? <div className="freelancer-today-simple-list">{waiting.map((engagement) => <article key={engagement.id}><span className="freelancer-today-status-icon"><DsIcon name="clock-clockwise" size={16} /></span><span><strong className="label-s-semibold">{engagement.project.name}</strong><small className="label-xs">{getProjectWaitingLabel(engagement)}</small></span></article>)}</div> : <p className="paragraph-s freelancer-today-muted">Nothing is waiting on the Studio or Client.</p>}
          </section>

          <section className="freelancer-today-panel" aria-labelledby="offers-today">
            <header><div><span className="label-xs-semibold">Invitations</span><h2 className="headings-xs-bold" id="offers-today">New offers</h2></div><strong className="headings-s-bold">{offers.length}</strong></header>
            {offers.length ? <div className="freelancer-today-simple-list">{offers.slice(0, 2).map((engagement) => <article key={engagement.id}><span className="freelancer-today-status-icon is-offer"><DsIcon name="queue" size={16} /></span><span><strong className="label-s-semibold">{engagement.project.name}</strong><small className="label-xs">{engagement.roleLabel} - {getPaymentCopy(engagement)}</small></span></article>)}</div> : <p className="paragraph-s freelancer-today-muted">No new offers.</p>}
            <Link className="freelancer-today-text-action label-s-semibold" href="/active-videos">Review offers</Link>
          </section>
        </aside>
      </div>

      {completed.length ? <section className="freelancer-today-completed"><header className="freelancer-today-section-header"><div><span className="label-xs-semibold">History</span><h2 className="headings-xs-bold">Recently completed</h2></div></header><div>{completed.map((engagement) => <article key={engagement.id}><span className="freelancer-today-complete-icon"><DsIcon name="check" size={16} /></span><span><strong className="label-s-semibold">{engagement.project.name}</strong><small className="label-xs">{engagement.roleLabel} - ready for invoicing</small></span><Link className="freelancer-today-text-action label-s-semibold" href="/active-videos">View video</Link></article>)}</div></section> : null}

      {isLogFormOpen && selectedEngagement && selectedStage ? <FreelancerTimeDialog engagement={selectedEngagement} initialStage={selectedStage} onClose={closeLogForm} onSave={(entry) => { appendSharedTimeEntry(entry); setSharedEntries(readSharedTimeEntries()); closeLogForm(); setToast(`${formatHours(entry.hours)} logged to ${selectedEngagement.project.name}`); }} /> : null}
      {toast ? <div className="freelancer-today-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function FreelancerWorkCard({ engagement }: { engagement: FreelancerEngagement }) {
  const stage = getPrimaryAssignedStage(engagement);
  const stageState = engagement.project.stages[stage].state;
  const destination = getDemoProjectDestination(engagement.project.id, experienceByStage[stage]);
  return <article className="freelancer-today-work-card"><div className="freelancer-today-stage-icon" aria-hidden="true"><DsIcon name={stageIcons[stage]} size={22} /></div><div className="freelancer-today-work-copy"><span className="label-xs-semibold">{engagement.project.clientBadge} - {engagement.roleLabel}</span><h3 className="headings-xs-bold">{engagement.project.name}</h3><div className="freelancer-today-work-meta"><span className={`freelancer-today-state is-${stageState} label-xs-semibold`}>{getStageStateCopy(engagement, stage)}</span><span className="label-xs">Due {formatShortDate(engagement.project.deadlineAt)}</span><span className="label-xs">{getPaymentCopy(engagement)}</span></div></div><div className="freelancer-today-work-actions">{destination ? <Link className="freelancer-today-secondary-action label-s-semibold" href={destination.href}>{stageState === "done" ? `Review ${stageLabels[stage]}` : `Open ${stageLabels[stage]}`}</Link> : <span className="freelancer-today-disabled-action label-xs">Demo not available</span>}<Link className="freelancer-today-primary-action label-s-semibold" href={makeLogHref(engagement, stage)}>{engagement.paymentBasis === "hourly" ? "Log hours" : "Log time - optional"}</Link></div></article>;
}

function FreelancerTimeDialog({ engagement, initialStage, onClose, onSave }: { engagement: FreelancerEngagement; initialStage: StageKey; onClose: () => void; onSave: (entry: SharedTimeEntry) => void }) {
  const [date, setDate] = useState(freelancerTodayDate);
  const [stage, setStage] = useState<StageKey>(initialStage);
  const [hours, setHours] = useState("1");
  const [note, setNote] = useState("");
  const parsedHours = Number.parseFloat(hours);
  const canSave = Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24;
  return <div className="freelancer-time-dialog-backdrop" role="presentation" onClick={onClose}><section className="freelancer-time-dialog" role="dialog" aria-modal="true" aria-labelledby="freelancer-log-time-title" onClick={(event) => event.stopPropagation()}><header><div><span className="label-xs-semibold">{engagement.project.clientBadge} - {engagement.roleLabel}</span><h2 className="headings-s-bold" id="freelancer-log-time-title">{engagement.paymentBasis === "hourly" ? "Log hours" : "Log time"}</h2><p className="paragraph-s">{engagement.project.name}</p></div><button type="button" aria-label="Close time entry" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header><div className="freelancer-time-guidance"><DsIcon name="info" size={16} /><span className="label-xs">{engagement.paymentBasis === "hourly" ? "Time logging is required for this hourly engagement." : "Time logging is optional. Your flat-rate payment will not change."}</span></div><div className="freelancer-time-fields"><label><span className="label-s-semibold">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span className="label-s-semibold">Stage</span><select value={stage} onChange={(event) => setStage(event.target.value as StageKey)}>{engagement.stages.map((assignedStage) => <option value={assignedStage} key={assignedStage}>{stageLabels[assignedStage]}</option>)}</select></label><label><span className="label-s-semibold">Hours</span><input min="0.25" max="24" step="0.25" type="number" value={hours} onChange={(event) => setHours(event.target.value)} /></label><label className="is-wide"><span className="label-s-semibold">Note</span><textarea placeholder="What did you work on?" value={note} onChange={(event) => setNote(event.target.value)} /></label></div><footer><Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>{canSave ? <Button size="M" onClick={() => onSave({ id: `freelancer-time-${Date.now()}`, projectId: engagement.project.id, roleSlotId: engagement.roleSlotId, personId: freelancerPreviewViewer.id, stageId: stage, date, startMinutes: 0, hours: parsedHours, note: note.trim(), loggedAt: `${date}T17:00:00+10:00`, createdAt: new Date().toISOString() })}>Save time</Button> : <button className="freelancer-time-disabled-save label-m-semibold" type="button" disabled>Save time</button>}</footer></section></div>;
}

function FreelancerTodayEmpty({ action, body, href, title }: { action: string; body: string; href: string; title: string }) {
  return <div className="freelancer-today-empty"><span><DsIcon name="check-circle" size={24} /></span><h3 className="headings-xs-bold">{title}</h3><p className="paragraph-s">{body}</p><Link className="freelancer-today-primary-action label-s-semibold" href={href}>{action}</Link></div>;
}

function getPrimaryAssignedStage(engagement: FreelancerEngagement) {
  return engagement.stages.find((stage) => engagement.project.stages[stage].state !== "done") ?? engagement.stages.at(-1) ?? "brief";
}

function getStageStateCopy(engagement: FreelancerEngagement, stage: StageKey) {
  const state = engagement.project.stages[stage].state;
  if (state === "done") return `${stageLabels[stage]} complete`;
  if (state === "waiting") return "Waiting on Client";
  if (state === "in_progress") return "Waiting on Studio";
  return "Not started";
}

function getProjectWaitingLabel(engagement: FreelancerEngagement) {
  const waitingStage = Object.entries(engagement.project.stages).find(([, status]) => status.state === "waiting");
  return waitingStage ? `${stageLabels[waitingStage[0] as StageKey]} waiting on Client` : null;
}

function getPaymentCopy(engagement: FreelancerEngagement) {
  if (engagement.paymentBasis === "flat") return engagement.flatRate ? `${formatCurrency(engagement.flatRate)} flat rate` : "Flat rate";
  return engagement.hourlyRate ? `$${engagement.hourlyRate}/hour` : "Hourly";
}

function makeLogHref(engagement: FreelancerEngagement, stage: StageKey) {
  return `/today?log=1&project=${encodeURIComponent(engagement.project.id)}&stage=${stage}`;
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(date));
}

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "")}h`;
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}
