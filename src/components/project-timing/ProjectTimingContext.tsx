"use client";

import { useTurnaround } from "./TurnaroundContext";
import { deadlineInput } from "@/data/turnaround";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { selectProjectBrief } from "@/data/prototype-state";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import { createTimingMessage, timingMessageId, type ProjectTimingAssessment, type ProjectTimingIssue } from "@/data/project-timing";
import type { ChatChannel, ChatMessage } from "@/components/chat/types";
import type { Project } from "@/components/active-videos/types";
import { briefDeliveryDate, createDeliveryMessages, deliveryAgreementSide, deliveryDateParts, deliveryInstant, getPendingDeliveryProposal, initialDeliveryAgreement, initialVersionDeliveryAgreement, type ProjectDeliveryAgreement, type DeliveryDateChange } from "@/data/project-delivery";

type TimingState = { issues: ProjectTimingIssue[]; readBy: Record<string, string[]>; deliveries: ProjectDeliveryAgreement[]; versionDeliveries: ProjectDeliveryAgreement[] };
type TimingContextValue = {
  hasHydrated: boolean;
  issues: ProjectTimingIssue[];
  messages: ChatMessage[];
  getDeliveryAgreement: (project: Project) => ProjectDeliveryAgreement;
  getVersionDeliveryAgreement: (project: Project, versionId: string, versionName: string, versionDate: string) => ProjectDeliveryAgreement;
  proposeDeliveryDate: (projectId: string, date: string, reason: string) => boolean;
  agreeDeliveryDate: (projectId: string, proposalId: string) => boolean;
  saveDeliveryDate: (projectId: string, date: string, reason: string, expectedDate: string | null) => boolean;
  proposeVersionDeliveryDate: (projectId: string, versionId: string, versionName: string, versionDate: string, date: string, reason: string) => boolean;
  agreeVersionDeliveryDate: (projectId: string, versionId: string, proposalId: string) => boolean;
  saveVersionDeliveryDate: (projectId: string, versionId: string, versionName: string, versionDate: string, date: string, reason: string, expectedDate: string | null) => boolean;
  getBriefAssessment: (projectId: string, requestedDate: string) => ProjectTimingAssessment | null;
  submitBriefTiming: (projectId: string, requestedDate: string, occurredAt: string) => void;
  shareClientUpdate: (issueId: string, reason: string) => boolean;
  markChannelRead: (projectId: string, channel: ChatChannel) => void;
};

const ProjectTimingContext = createContext<TimingContextValue | null>(null);

function readTimingState(key: string): TimingState {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!raw || typeof raw !== "object") return { issues: [], readBy: {}, deliveries: [], versionDeliveries: [] };
    const value = raw as Partial<TimingState>;
    return {
      ...value,
      issues: Array.isArray(value.issues) ? value.issues.filter((issue) => issue && typeof issue.id === "string"
        && typeof issue.projectId === "string" && typeof issue.requestedDate === "string"
        && typeof issue.suggestedDate === "string" && typeof issue.reason === "string"
        && typeof issue.internalReason === "string" && typeof issue.createdAt === "string"
        && (issue.kind === "brief" || issue.kind === "production")) : [],
      readBy: value.readBy && typeof value.readBy === "object" ? value.readBy : {},
      deliveries: Array.isArray(value.deliveries) ? value.deliveries.filter((entry) => entry && typeof entry.projectId === "string"
        && (entry.originalDate === null || typeof entry.originalDate === "string")
        && (entry.agreedDate === null || typeof entry.agreedDate === "string") && Array.isArray(entry.proposals)) : [],
      versionDeliveries: Array.isArray(value.versionDeliveries) ? value.versionDeliveries.filter((entry) => entry
        && typeof entry.projectId === "string" && typeof entry.deliverableId === "string"
        && (entry.agreedDate === null || typeof entry.agreedDate === "string") && Array.isArray(entry.proposals)) : [],
    };
  } catch {
    return { issues: [], readBy: {}, deliveries: [], versionDeliveries: [] };
  }
}

export function ProjectTimingProvider({ children }: { children: ReactNode }) {
  const { state: prototypeState, hasHydrated } = usePrototypeState();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const viewer = usePrototypeViewer();
  const { completionRecords } = useProjectCompletion();
  const { getProjectStages, hasHydrated: stagesReady } = useProjectStageStatus();
  const turnaround = useTurnaround();
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const storageKey = `brisk-timing-warnings-v1:${prototypeState.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState<TimingState>({ issues: [], readBy: {}, deliveries: [], versionDeliveries: [] });
  const savedRef = useRef(saved);

  useEffect(() => {
    if (!hasHydrated || !hasLoadedScenario) return;
    const next = readTimingState(storageKey);
    savedRef.current = next; setSaved(next); setLoadedKey(storageKey);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const latest = readTimingState(storageKey);
      savedRef.current = latest; setSaved(latest);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [hasHydrated, hasLoadedScenario, storageKey]);

  const commit = useCallback((update: (current: TimingState) => TimingState) => {
    if (loadedKey !== storageKey) return false;
    const latest = readTimingState(storageKey);
    const local = savedRef.current;
    const current: TimingState = {
      ...local,
      issues: [...new Map([...local.issues, ...latest.issues].map((issue) => [issue.id, issue])).values()],
      deliveries: [...new Map([...local.deliveries, ...latest.deliveries].map((entry) => [entry.projectId, entry])).values()],
      versionDeliveries: [...new Map([...local.versionDeliveries, ...latest.versionDeliveries].map((entry) => [`${entry.projectId}:${entry.deliverableId}`, entry])).values()],
      readBy: Object.fromEntries([...new Set([...Object.keys(local.readBy), ...Object.keys(latest.readBy)])]
        .map((id) => [id, [...new Set([...(local.readBy[id] ?? []), ...(latest.readBy[id] ?? [])])]])),
    };
    const next = update(current);
    if (next === current) { savedRef.current = current; setSaved(current); return false; }
    savedRef.current = next; setSaved(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { /* Keep the current-session review available without browser persistence. */ }
    return true;
  }, [loadedKey, storageKey]);

  // Adopt the date from already-submitted legacy Briefs without changing any
  // existing deadline, proposal date, author or agreement history.
  useEffect(() => {
    if (loadedKey !== storageKey || !stagesReady) return;
    const initialDates = prototypeState.projects.flatMap((project) => {
      const existing = saved.deliveries.find((entry) => entry.projectId === project.id) ?? initialDeliveryAgreement(project);
      if (project.workspaceId !== prototypeState.session.activeWorkspaceId || existing.agreedDate || project.status === "Completed"
        || project.status === "Archived" || completionRecords[project.id]) return [];
      const submitted = saved.issues.filter((issue) => issue.projectId === project.id && issue.kind === "brief")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      const brief = selectProjectBrief(prototypeState, project.id);
      const date = deliveryInstant(submitted?.requestedDate ?? (brief && getProjectStages(project).brief.state === "done" ? briefDeliveryDate(brief.fields) : ""), "17:00");
      return date ? [{ project, date }] : [];
    });
    if (!initialDates.length) return;
    commit((current) => {
      const deliveries = [...current.deliveries];
      for (const { project, date } of initialDates) {
        const index = deliveries.findIndex((entry) => entry.projectId === project.id);
        const previous = deliveries[index] ?? initialDeliveryAgreement(project);
        if (previous.agreedDate) continue;
        const next = { ...previous, originalDate: date, agreedDate: date,
          proposals: previous.proposals.map((proposal) => proposal.status === "pending" && proposal.previousDate === null ? { ...proposal, previousDate: date } : proposal) };
        if (index < 0) deliveries.push(next); else deliveries[index] = next;
      }
      return { ...current, deliveries };
    });
  }, [commit, completionRecords, getProjectStages, loadedKey, prototypeState, saved.deliveries, saved.issues, stagesReady, storageKey]);

  const allIssues = useMemo(() => {
    if (loadedKey !== storageKey || !turnaround.hasHydrated) return [];
    const byId = new Map(saved.issues.map((issue) => [issue.id, issue]));
    for (const project of prototypeState.projects.filter((entry) => entry.workspaceId === prototypeState.session.activeWorkspaceId)) {
      const forecast = turnaround.getForecast(project);
      const agreement = saved.deliveries.find((entry) => entry.projectId === project.id) ?? initialDeliveryAgreement(project);
      const requested = deadlineInput(agreement.agreedDate, turnaround.timezone).slice(0, 10);
      const complete = project.status === "Completed" || project.status === "Archived" || Boolean(completionRecords[project.id]);
      const atRisk = Boolean(!complete && forecast && requested
        && (forecast.suggestedDate > requested || Date.parse(agreement.agreedDate!) < turnaround.now));
      const previous = saved.issues.filter((issue) => issue.projectId === project.id);
      for (const issue of previous) {
        // A missing forecast (for example while paused) is not evidence of recovery.
        if (!issue.resolvedAt && (complete || issue.kind === "production" && forecast && !atRisk)) {
          byId.set(issue.id, { ...issue, resolvedAt: new Date(turnaround.now).toISOString() });
        }
      }
      if (!atRisk || !forecast) continue;
      // Keep the reviewed message unchanged while this incident remains active.
      if (previous.some((issue) => !issue.resolvedAt && issue.requestedDate === requested)) continue;
      const active = turnaround.getActiveDeadlines(project);
      const cycleKey = active.map((entry) => entry.cycle?.id ?? entry.stage).join("-");
      const resolutions = previous.filter((issue) => issue.kind === "production").map((issue) => issue.resolvedAt).filter((value): value is string => Boolean(value)).sort();
      const lastResolution = resolutions.at(-1);
      const id = `risk-live-${project.id}-${requested}-${cycleKey}${lastResolution ? `-after-${resolutions.length}-${lastResolution}` : ""}`;
      byId.set(id, { id, projectId: project.id, kind: "production",
        requestedDate: requested, suggestedDate: forecast.suggestedDate, reason: forecast.reason, internalReason: forecast.internalReason,
        createdAt: [...active.map((entry) => entry.cycle?.startedAt), lastResolution].filter((value): value is string => Boolean(value)).sort().at(-1) ?? sessionStartedAt,
        clientUpdate: null, resolvedAt: null });
    }
    return [...byId.values()];
  }, [completionRecords, loadedKey, prototypeState, saved.deliveries, saved.issues, sessionStartedAt, storageKey, turnaround]);

  useEffect(() => {
    const resolved = new Map(allIssues.filter((issue) => issue.resolvedAt
      && saved.issues.some((entry) => entry.id === issue.id && !entry.resolvedAt)).map((issue) => [issue.id, issue.resolvedAt]));
    if (!resolved.size) return;
    commit((current) => ({ ...current, issues: current.issues.map((issue) => !issue.resolvedAt && resolved.has(issue.id)
      ? { ...issue, resolvedAt: resolved.get(issue.id)! } : issue) }));
  }, [allIssues, commit, saved.issues]);

  const issues = useMemo(() => allIssues.filter((issue) => {
    const project = prototypeState.projects.find((entry) => entry.id === issue.projectId);
    return Boolean(project && canViewProject(viewer, project, prototypeState)
      && (viewer?.role !== "Customer" || issue.kind === "brief" || issue.clientUpdate));
  }), [allIssues, prototypeState, viewer]);

  const timingMessages = useMemo(() => issues.flatMap((issue) => {
    const channels: ChatChannel[] = issue.kind === "brief" ? ["external"]
      : viewer?.role === "Customer" ? ["external"] : issue.clientUpdate ? ["internal", "external"] : ["internal"];
    return channels.map((channel) => createTimingMessage(issue, channel, saved.readBy[timingMessageId(issue.id, channel)] ?? []));
  }), [issues, saved.readBy, viewer?.role]);

  const visibleDeliveries = useMemo(() => saved.deliveries.filter((entry) => {
    const project = prototypeState.projects.find((project) => project.id === entry.projectId);
    return Boolean(project && canViewProject(viewer, project, prototypeState));
  }), [prototypeState, saved.deliveries, viewer]);
  const visibleVersionDeliveries = useMemo(() => saved.versionDeliveries.filter((entry) => {
    const project = prototypeState.projects.find((project) => project.id === entry.projectId);
    if (!project || !canViewProject(viewer, project, prototypeState)) return false;
    const brief = selectProjectBrief(prototypeState, project.id);
    try { return Boolean(brief && JSON.parse(brief.fields.deliverables.value || "[]").some((row: { id?: string }) => row.id === entry.deliverableId)); }
    catch { return false; }
  }), [prototypeState, saved.versionDeliveries, viewer]);
  const messages = useMemo(() => [...timingMessages,
    ...[...visibleDeliveries, ...visibleVersionDeliveries].flatMap((agreement) => {
      const project = prototypeState.projects.find((entry) => entry.id === agreement.projectId);
      const complete = project?.status === "Completed" || project?.status === "Archived" || Boolean(completionRecords[agreement.projectId]);
      return createDeliveryMessages(agreement, saved.readBy, complete);
    })],
  [completionRecords, prototypeState.projects, saved.readBy, timingMessages, visibleDeliveries, visibleVersionDeliveries]);

  const getDeliveryAgreement = useCallback((project: Project) =>
    visibleDeliveries.find((entry) => entry.projectId === project.id) ?? initialDeliveryAgreement(project), [visibleDeliveries]);

  const getVersionDeliveryAgreement = useCallback((project: Project, versionId: string, versionName: string, versionDate: string) =>
    saved.versionDeliveries.find((entry) => entry.projectId === project.id && entry.deliverableId === versionId)
      ?? initialVersionDeliveryAgreement(project.id, versionId, versionName, versionDate), [saved.versionDeliveries]);

  const proposeDeliveryDate = useCallback((projectId: string, date: string, reason: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!viewer || (viewer.role !== "Studio Staff" && viewer.role !== "Customer") || !project || project.status === "Completed" || project.status === "Archived" || completionRecords[projectId] || !canActOnProject(viewer, project, prototypeState, "approve")
      || !Number.isFinite(Date.parse(date))) return false;
    const proposedAt = new Date().toISOString();
    const proposedByRole = viewer.role;
    return commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId) ?? initialDeliveryAgreement(project);
      const pending = getPendingDeliveryProposal(agreement);
      if (viewer.role === "Customer" && !agreement.agreedDate) return current;
      if (Date.parse(date) === Date.parse(agreement.agreedDate ?? "") || (pending && Date.parse(pending.date) === Date.parse(date) && pending.reason === reason.trim())) return current;
      const proposal = { id: crypto.randomUUID(), date, previousDate: agreement.agreedDate, reason: reason.trim(),
        proposedAt, proposedBy: viewer.name, proposedById: viewer.id, proposedByRole, status: "pending" as const,
        agreedAt: null, agreedBy: null, agreedById: null };
      return { ...current, deliveries: [...current.deliveries.filter((entry) => entry.projectId !== projectId), {
        ...agreement, proposals: [...agreement.proposals.map((entry) => entry.status === "pending"
          ? { ...entry, status: "superseded" as const } : entry), proposal],
      }] };
    });
  }, [commit, completionRecords, prototypeState, viewer]);

  const agreeDeliveryDate = useCallback((projectId: string, proposalId: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!viewer || !project || project.status === "Completed" || project.status === "Archived" || completionRecords[projectId] || !canActOnProject(viewer, project, prototypeState, "approve")) return false;
    const agreedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId);
      const pending = agreement && getPendingDeliveryProposal(agreement);
      if (!agreement || !pending || pending.id !== proposalId || pending.previousDate !== agreement.agreedDate || viewer.role !== deliveryAgreementSide(pending)) return current;
      const resolved = new Map([...allIssues, ...current.issues].map((issue) => [issue.id, issue.projectId === projectId
        ? { ...issue, resolvedAt: issue.resolvedAt ?? agreedAt } : issue]));
      return { ...current, issues: [...resolved.values()], deliveries: current.deliveries.map((entry) => entry.projectId !== projectId ? entry : {
        ...entry, agreedDate: pending.date, proposals: entry.proposals.map((proposal) => proposal.id !== proposalId ? proposal : {
          ...proposal, status: "agreed" as const, agreedAt, agreedBy: viewer.name, agreedById: viewer.id,
        }),
      }) };
    });
  }, [allIssues, commit, completionRecords, prototypeState, viewer]);

  const saveDeliveryDate = useCallback((projectId: string, date: string, reason: string, expectedDate: string | null) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (viewer?.role !== "Studio Staff" || !project || project.status === "Completed" || project.status === "Archived"
      || completionRecords[projectId] || !canActOnProject(viewer, project, prototypeState, "approve") || !Number.isFinite(Date.parse(date))) return false;
    const changedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId) ?? initialDeliveryAgreement(project);
      if (agreement.agreedDate !== expectedDate || Date.parse(date) === Date.parse(agreement.agreedDate ?? "")) return current;
      const change: DeliveryDateChange = { id: crypto.randomUUID(), date, previousDate: agreement.agreedDate,
        changedAt, changedBy: viewer.name, changedById: viewer.id, source: "studio", reason: reason.trim() };
      return { ...current,
        issues: [...new Map([...allIssues, ...current.issues].map((issue) => [issue.id, issue.projectId === projectId
          ? { ...issue, resolvedAt: issue.resolvedAt ?? changedAt } : issue])).values()],
        deliveries: [...current.deliveries.filter((entry) => entry.projectId !== projectId), {
          ...agreement, originalDate: agreement.originalDate ?? date, agreedDate: date, changes: [...(agreement.changes ?? []), change],
          proposals: agreement.proposals.map((proposal) => proposal.status === "pending" ? { ...proposal, status: "superseded" as const } : proposal),
        }],
      };
    });
  }, [allIssues, commit, completionRecords, prototypeState, viewer]);

  const proposeVersionDeliveryDate = useCallback((projectId: string, versionId: string, versionName: string,
    versionDate: string, date: string, reason: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!viewer || (viewer.role !== "Studio Staff" && viewer.role !== "Customer") || !project
      || project.status === "Completed" || project.status === "Archived" || completionRecords[projectId]
      || !canActOnProject(viewer, project, prototypeState, "approve") || !Number.isFinite(Date.parse(date))) return false;
    const proposedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.versionDeliveries.find((entry) => entry.projectId === projectId && entry.deliverableId === versionId)
        ?? initialVersionDeliveryAgreement(projectId, versionId, versionName, versionDate);
      if (viewer.role === "Customer" && !agreement.agreedDate) return current;
      const pending = getPendingDeliveryProposal(agreement);
      if (date === agreement.agreedDate || pending && pending.date === date && pending.reason === reason.trim()) return current;
      const proposal = { id: crypto.randomUUID(), date, previousDate: agreement.agreedDate, reason: reason.trim(),
        proposedAt, proposedBy: viewer.name, proposedById: viewer.id, proposedByRole: viewer.role === "Customer" ? "Customer" as const : "Studio Staff" as const,
        status: "pending" as const, agreedAt: null, agreedBy: null, agreedById: null };
      return { ...current, versionDeliveries: [...current.versionDeliveries.filter((entry) => entry.projectId !== projectId || entry.deliverableId !== versionId), {
        ...agreement, deliverableName: versionName, proposals: [...agreement.proposals.map((entry) => entry.status === "pending"
          ? { ...entry, status: "superseded" as const } : entry), proposal],
      }] };
    });
  }, [commit, completionRecords, prototypeState, viewer]);

  const agreeVersionDeliveryDate = useCallback((projectId: string, versionId: string, proposalId: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!viewer || !project || project.status === "Completed" || project.status === "Archived" || completionRecords[projectId]
      || !canActOnProject(viewer, project, prototypeState, "approve")) return false;
    const agreedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.versionDeliveries.find((entry) => entry.projectId === projectId && entry.deliverableId === versionId);
      const pending = agreement && getPendingDeliveryProposal(agreement);
      if (!agreement || !pending || pending.id !== proposalId || pending.previousDate !== agreement.agreedDate
        || viewer.role !== deliveryAgreementSide(pending)) return current;
      return { ...current, versionDeliveries: current.versionDeliveries.map((entry) => entry !== agreement ? entry : {
        ...entry, agreedDate: pending.date, proposals: entry.proposals.map((proposal) => proposal.id !== proposalId ? proposal : {
          ...proposal, status: "agreed" as const, agreedAt, agreedBy: viewer.name, agreedById: viewer.id,
        }),
      }) };
    });
  }, [commit, completionRecords, prototypeState, viewer]);

  const saveVersionDeliveryDate = useCallback((projectId: string, versionId: string, versionName: string,
    versionDate: string, date: string, reason: string, expectedDate: string | null) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (viewer?.role !== "Studio Staff" || !project || project.status === "Completed" || project.status === "Archived"
      || completionRecords[projectId] || !canActOnProject(viewer, project, prototypeState, "approve")
      || !Number.isFinite(Date.parse(date))) return false;
    const changedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.versionDeliveries.find((entry) => entry.projectId === projectId && entry.deliverableId === versionId)
        ?? initialVersionDeliveryAgreement(projectId, versionId, versionName, versionDate);
      if (agreement.agreedDate !== expectedDate || date === agreement.agreedDate) return current;
      const change: DeliveryDateChange = { id: crypto.randomUUID(), date, previousDate: agreement.agreedDate,
        changedAt, changedBy: viewer.name, changedById: viewer.id, source: "studio", reason: reason.trim() };
      return { ...current, versionDeliveries: [...current.versionDeliveries.filter((entry) => entry.projectId !== projectId || entry.deliverableId !== versionId), {
        ...agreement, deliverableName: versionName, originalDate: agreement.originalDate ?? date, agreedDate: date,
        changes: [...(agreement.changes ?? []), change], proposals: agreement.proposals.map((proposal) => proposal.status === "pending"
          ? { ...proposal, status: "superseded" as const } : proposal),
      }] };
    });
  }, [commit, completionRecords, prototypeState, viewer]);

  const getBriefAssessment = useCallback((projectId: string, requestedDate: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!project || !canViewProject(viewer, project, prototypeState)) return null;
    const forecast = turnaround.getForecast(project);
    return /^\d{4}-\d{2}-\d{2}$/u.test(requestedDate) && forecast && requestedDate < forecast.suggestedDate ? {
      ...forecast, projectId, assessedAt: new Date(turnaround.now).toISOString(), referenceFinalDate: requestedDate, productionRisk: false,
    } : null;
  }, [prototypeState, turnaround, viewer]);

  const submitBriefTiming = useCallback((projectId: string, requestedDate: string, occurredAt: string) => {
    const assessment = getBriefAssessment(projectId, requestedDate);
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (!project || project.status === "Completed" || project.status === "Archived" || completionRecords[projectId] || !canActOnProject(viewer, project, prototypeState, "send")) return;
    const existingDate = (savedRef.current.deliveries.find((entry) => entry.projectId === projectId) ?? initialDeliveryAgreement(project)).agreedDate;
    if (existingDate && deliveryDateParts(existingDate).date !== requestedDate) return;
    const issue: ProjectTimingIssue | null = assessment ? {
      id: `brief-${projectId}-${requestedDate}-${assessment.suggestedDate}`, projectId, kind: "brief", requestedDate,
      suggestedDate: assessment.suggestedDate, reason: assessment.reason, internalReason: assessment.reason,
      createdAt: occurredAt, clientUpdate: null, resolvedAt: null,
    } : null;
    commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId) ?? initialDeliveryAgreement(project);
      const date = deliveryInstant(requestedDate, "17:00");
      if (agreement.agreedDate && deliveryDateParts(agreement.agreedDate).date !== requestedDate) return current;
      // A sent/approved Brief establishes the first deadline, never a later override.
      const initialDate = !agreement.agreedDate && date;
      const change: DeliveryDateChange | null = initialDate && viewer ? {
        id: crypto.randomUUID(), date: initialDate, previousDate: null, source: "brief", reason: "",
        changedAt: occurredAt, changedBy: viewer.name, changedById: viewer.id,
      } : null;
      const existing = issue && current.issues.find((entry) => entry.projectId === projectId && entry.kind === "brief"
        && entry.requestedDate === requestedDate && entry.suggestedDate === issue.suggestedDate && !entry.resolvedAt);
      const updated = current.issues.map((entry) => entry.projectId === projectId && entry.kind === "brief" && !entry.resolvedAt && entry.id !== existing?.id
        ? { ...entry, resolvedAt: occurredAt } : entry);
      if (issue && !existing) updated.push(current.issues.some((entry) => entry.id === issue.id)
        ? { ...issue, id: `${issue.id}-${crypto.randomUUID()}` } : issue);
      return { ...current, issues: updated, deliveries: change ? [...current.deliveries.filter((entry) => entry.projectId !== projectId), {
        ...agreement, originalDate: change.date, agreedDate: change.date, changes: [...(agreement.changes ?? []), change],
        proposals: agreement.proposals.map((proposal) => proposal.status === "pending" && proposal.previousDate === null
          ? { ...proposal, previousDate: change.date } : proposal),
      }] : current.deliveries };
    });
  }, [commit, completionRecords, getBriefAssessment, prototypeState, viewer]);

  const shareClientUpdate = useCallback((issueId: string, reason: string) => {
    const issue = issues.find((entry) => entry.id === issueId);
    if (viewer?.role !== "Studio Staff" || !issue || issue.resolvedAt || issue.kind !== "production" || issue.clientUpdate || !reason.trim()) return false;
    const updated = { ...issue, clientUpdate: { reason: reason.trim(), sharedAt: new Date().toISOString(), reviewedBy: viewer.name } };
    return commit((current) => current.issues.find((entry) => entry.id === issueId)?.clientUpdate ? current
      : { ...current, issues: [...current.issues.filter((entry) => entry.id !== issueId), updated] });
  }, [commit, issues, viewer]);

  const markChannelRead = useCallback((projectId: string, channel: ChatChannel) => {
    if (!viewer) return;
    const ids = messages.filter((message) => message.projectId === projectId && message.channel === channel
      && !message.readBy.includes(viewer.chatUserId)).map((message) => message.id);
    if (!ids.length) return;
    commit((current) => ({ ...current, readBy: { ...current.readBy,
      ...Object.fromEntries(ids.map((id) => [id, [...new Set([...(current.readBy[id] ?? []), viewer.chatUserId])]])),
    } }));
  }, [commit, messages, viewer]);

  return <ProjectTimingContext.Provider value={{ hasHydrated: loadedKey === storageKey, issues, messages,
    getBriefAssessment, submitBriefTiming, shareClientUpdate, markChannelRead,
    getDeliveryAgreement, proposeDeliveryDate, agreeDeliveryDate, saveDeliveryDate,
    getVersionDeliveryAgreement, proposeVersionDeliveryDate, agreeVersionDeliveryDate, saveVersionDeliveryDate }}>{children}</ProjectTimingContext.Provider>;
}

export function useProjectTiming() {
  const value = useContext(ProjectTimingContext);
  if (!value) throw new Error("useProjectTiming must be used within ProjectTimingProvider");
  return value;
}
