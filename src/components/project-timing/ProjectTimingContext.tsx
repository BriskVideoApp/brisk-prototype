"use client";

import { useTurnaround } from "./TurnaroundContext";
import { deadlineInput } from "@/data/turnaround";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import { createTimingMessage, timingMessageId, type ProjectTimingAssessment, type ProjectTimingIssue } from "@/data/project-timing";
import type { ChatChannel, ChatMessage } from "@/components/chat/types";
import type { Project } from "@/components/active-videos/types";
import { createDeliveryMessages, getPendingDeliveryProposal, initialDeliveryAgreement, type ProjectDeliveryAgreement } from "@/data/project-delivery";

type TimingState = { issues: ProjectTimingIssue[]; readBy: Record<string, string[]>; deliveries: ProjectDeliveryAgreement[] };
type TimingContextValue = {
  hasHydrated: boolean;
  issues: ProjectTimingIssue[];
  messages: ChatMessage[];
  getDeliveryAgreement: (project: Project) => ProjectDeliveryAgreement;
  proposeDeliveryDate: (projectId: string, date: string, reason: string) => boolean;
  agreeDeliveryDate: (projectId: string, proposalId: string) => boolean;
  getBriefAssessment: (projectId: string, requestedDate: string) => ProjectTimingAssessment | null;
  submitBriefTiming: (projectId: string, requestedDate: string, occurredAt: string) => void;
  shareClientUpdate: (issueId: string, reason: string) => boolean;
  markChannelRead: (projectId: string, channel: ChatChannel) => void;
};

const ProjectTimingContext = createContext<TimingContextValue | null>(null);

function readTimingState(key: string): TimingState {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!raw || typeof raw !== "object") return { issues: [], readBy: {}, deliveries: [] };
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
    };
  } catch {
    return { issues: [], readBy: {}, deliveries: [] };
  }
}

export function ProjectTimingProvider({ children }: { children: ReactNode }) {
  const { state: prototypeState, hasHydrated } = usePrototypeState();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const viewer = usePrototypeViewer();
  const turnaround = useTurnaround();
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const storageKey = `brisk-timing-warnings-v1:${prototypeState.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState<TimingState>({ issues: [], readBy: {}, deliveries: [] });
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

  const allIssues = useMemo(() => {
    if (loadedKey !== storageKey || !turnaround.hasHydrated) return [];
    const dynamic: ProjectTimingIssue[] = [];
    for (const project of prototypeState.projects.filter((entry) => entry.workspaceId === prototypeState.session.activeWorkspaceId)) {
      const forecast = turnaround.getForecast(project);
      const agreement = saved.deliveries.find((entry) => entry.projectId === project.id) ?? initialDeliveryAgreement(project);
      const requested = deadlineInput(agreement.agreedDate, turnaround.timezone).slice(0, 10);
      if (!forecast || !requested || forecast.suggestedDate <= requested && Date.parse(agreement.agreedDate!) >= turnaround.now) continue;
      const active = turnaround.getActiveDeadlines(project);
      const cycleKey = active.map((entry) => entry.cycle?.id ?? entry.stage).join("-");
      dynamic.push({ id: `risk-live-${project.id}-${requested}-${cycleKey}`, projectId: project.id, kind: "production",
        requestedDate: requested, suggestedDate: forecast.suggestedDate, reason: forecast.reason, internalReason: forecast.internalReason,
        createdAt: active.map((entry) => entry.cycle?.startedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? sessionStartedAt,
        clientUpdate: null, resolvedAt: null });
    }
    const byId = new Map(dynamic.map((issue) => [issue.id, issue]));
    // Producer-reviewed external updates are saved snapshots, not silently rewritten forecasts.
    saved.issues.forEach((issue) => byId.set(issue.id, issue));
    return [...byId.values()];
  }, [loadedKey, prototypeState, saved.deliveries, saved.issues, sessionStartedAt, storageKey, turnaround]);

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
  const messages = useMemo(() => [...timingMessages,
    ...visibleDeliveries.flatMap((agreement) => createDeliveryMessages(agreement, saved.readBy))],
  [saved.readBy, timingMessages, visibleDeliveries]);

  const getDeliveryAgreement = useCallback((project: Project) =>
    visibleDeliveries.find((entry) => entry.projectId === project.id) ?? initialDeliveryAgreement(project), [visibleDeliveries]);

  const proposeDeliveryDate = useCallback((projectId: string, date: string, reason: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (viewer?.role !== "Studio Staff" || !project || project.status === "Completed" || project.status === "Archived" || !canViewProject(viewer, project, prototypeState)
      || !Number.isFinite(Date.parse(date)) || !reason.trim()) return false;
    const proposedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId) ?? initialDeliveryAgreement(project);
      const pending = getPendingDeliveryProposal(agreement);
      if (Date.parse(date) === Date.parse(agreement.agreedDate ?? "") || (pending && Date.parse(pending.date) === Date.parse(date) && pending.reason === reason.trim())) return current;
      const proposal = { id: crypto.randomUUID(), date, previousDate: agreement.agreedDate, reason: reason.trim(),
        proposedAt, proposedBy: viewer.name, proposedById: viewer.id, status: "pending" as const,
        agreedAt: null, agreedBy: null, agreedById: null };
      return { ...current, deliveries: [...current.deliveries.filter((entry) => entry.projectId !== projectId), {
        ...agreement, proposals: [...agreement.proposals.map((entry) => entry.status === "pending"
          ? { ...entry, status: "superseded" as const } : entry), proposal],
      }] };
    });
  }, [commit, prototypeState, viewer]);

  const agreeDeliveryDate = useCallback((projectId: string, proposalId: string) => {
    const project = prototypeState.projects.find((entry) => entry.id === projectId);
    if (viewer?.role !== "Customer" || !project || project.status === "Completed" || project.status === "Archived" || !canActOnProject(viewer, project, prototypeState, "approve")) return false;
    const agreedAt = new Date().toISOString();
    return commit((current) => {
      const agreement = current.deliveries.find((entry) => entry.projectId === projectId);
      const pending = agreement && getPendingDeliveryProposal(agreement);
      if (!agreement || !pending || pending.id !== proposalId || pending.previousDate !== agreement.agreedDate) return current;
      const resolved = new Map([...allIssues, ...current.issues].map((issue) => [issue.id, issue.projectId === projectId
        ? { ...issue, resolvedAt: agreedAt } : issue]));
      return { ...current, issues: [...resolved.values()], deliveries: current.deliveries.map((entry) => entry.projectId !== projectId ? entry : {
        ...entry, agreedDate: pending.date, proposals: entry.proposals.map((proposal) => proposal.id !== proposalId ? proposal : {
          ...proposal, status: "agreed" as const, agreedAt, agreedBy: viewer.name, agreedById: viewer.id,
        }),
      }) };
    });
  }, [allIssues, commit, prototypeState, viewer]);

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
    if (!assessment || !project || !canViewProject(viewer, project, prototypeState)) return;
    const issue: ProjectTimingIssue = {
      id: `brief-${projectId}-${requestedDate}-${assessment.suggestedDate}`, projectId, kind: "brief", requestedDate,
      suggestedDate: assessment.suggestedDate, reason: assessment.reason, internalReason: assessment.reason,
      createdAt: occurredAt, clientUpdate: null, resolvedAt: null,
    };
    commit((current) => current.issues.some((entry) => entry.id === issue.id) ? current
      : { ...current, issues: [...current.issues, issue] });
  }, [commit, getBriefAssessment, prototypeState, viewer]);

  const shareClientUpdate = useCallback((issueId: string, reason: string) => {
    const issue = issues.find((entry) => entry.id === issueId);
    if (viewer?.role !== "Studio Staff" || !issue || issue.kind !== "production" || issue.clientUpdate || !reason.trim()) return false;
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
    getDeliveryAgreement, proposeDeliveryDate, agreeDeliveryDate }}>{children}</ProjectTimingContext.Provider>;
}

export function useProjectTiming() {
  const value = useContext(ProjectTimingContext);
  if (!value) throw new Error("useProjectTiming must be used within ProjectTimingProvider");
  return value;
}
