"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Project, ProjectDeadline, StageStatus } from "@/components/active-videos/types";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useStoryboard } from "@/components/storyboard/StoryboardContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { canViewProject } from "@/data/prototype-access";
import { selectProjectBrief, selectWorkspaceProjects } from "@/data/prototype-state";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { addWorkingDays, deadlineInput, defaultTurnaround, extraVideoDays, isStudioWaiting, mainVideoSeconds, ruleForStage, type TurnaroundRule } from "@/data/turnaround";

export type StageCycle = {
  id: string; projectId: string; stage: ProductionFlowStageKey; startedAt: string; endedAt: string | null;
  mode: TurnaroundRule["mode"]; revision: boolean; rule: TurnaroundRule; extraDays: number;
  internalDueAt: string | null; clientDueAt: string | null; timezone: string;
};
export type ActiveStageDeadline = { stage: ProductionFlowStageKey; label: string; cycle: StageCycle | null; dueAt: string | null; internalDueAt: string | null };
type Forecast = { suggestedDate: string; reason: string; internalReason: string };
type Value = {
  hasHydrated: boolean; now: number; timezone: string;
  getActiveDeadlines: (project: Project, legacy?: ProjectDeadline) => ActiveStageDeadline[];
  saveDeadline: (project: Project, stage: ProductionFlowStageKey, mode: TurnaroundRule["mode"], internal: string | null, client: string | null) => boolean;
  getForecast: (project: Project) => Forecast | null;
  previewDeadline: (project: Project, stage: ProductionFlowStageKey) => StageCycle;
};
const Context = createContext<Value | null>(null);
const labels: Record<ProductionFlowStageKey, string> = { brief: "Brief", script: "Script", storyboard: "Storyboard", shoot: "Shoot", edit: "Edit", masters: "Masters" };
function read(key: string): StageCycle[] {
  try { const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter((item): item is StageCycle => Boolean(item && typeof item === "object" && "id" in item && "startedAt" in item && "rule" in item)) : []; }
  catch { return []; }
}

export function TurnaroundProvider({ children }: { children: ReactNode }) {
  const { state, hasHydrated } = usePrototypeState();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const { studio, hasHydrated: settingsReady } = useStudioSettings();
  const { getProjectStages, hasHydrated: stagesReady } = useProjectStageStatus();
  const { getStoryboardStatus, hasHydrated: storyboardReady } = useStoryboard();
  const { getProjectFlow } = useProjectFlow();
  const { completionRecords } = useProjectCompletion();
  const viewer = usePrototypeViewer();
  const key = `brisk-stage-cycles-v1:${state.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}`;
  const [loaded, setLoaded] = useState<string | null>(null);
  const [cycles, setCycles] = useState<StageCycle[]>([]);
  const cyclesRef = useRef(cycles);
  const previous = useRef<{ key: string; states: Record<string, StageStatus> } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const settings = studio.production.turnaround ?? defaultTurnaround;
  const timezone = studio.details.timezone;
  const ready = loaded === key && hasHydrated && hasLoadedScenario && stagesReady && storyboardReady && settingsReady;
  useEffect(() => {
    if (!hasHydrated || !hasLoadedScenario) return;
    const next = read(key); cyclesRef.current = next; setCycles(next); setLoaded(key); previous.current = null;
    const sync = (event: StorageEvent) => { if (event.key === key) { const value = read(key); cyclesRef.current = value; setCycles(value); } };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [hasHydrated, hasLoadedScenario, key]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  const commit = useCallback((update: (current: StageCycle[]) => StageCycle[]) => {
    const current = [...new Map([...cyclesRef.current, ...read(key)].map((cycle) => [cycle.id, cycle])).values()];
    const next = update(current); cyclesRef.current = next; setCycles(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep current-session changes if storage is unavailable. */ }
  }, [key]);
  const currentStatuses = useCallback((project: Project) => {
    if (project.status === "Completed" || project.status === "Archived" || completionRecords[project.id]) return [];
    const stages = getProjectStages(project);
    return getProjectFlow(project).stages.map((stage) => ({ stage, status: stage === "storyboard" ? getStoryboardStatus(project.id) : stages[stage] }));
  }, [completionRecords, getProjectFlow, getProjectStages, getStoryboardStatus]);
  const createCycle = useCallback((project: Project, stage: ProductionFlowStageKey, revision: boolean, startedAt: string): StageCycle => {
    const rule = ruleForStage(settings, stage, getProjectFlow(project).postProductionTerm === "animation");
    const extraDays = !revision && stage === "edit" ? extraVideoDays(mainVideoSeconds(selectProjectBrief(state, project.id)?.fields.deliverables.value, project.videoLengthSeconds), settings.extraDaysPerMinute) : 0;
    return { id: crypto.randomUUID(), projectId: project.id, stage, startedAt, endedAt: null, mode: rule.mode, revision, rule, extraDays, timezone,
      internalDueAt: rule.mode === "automatic" && !revision ? addWorkingDays(startedAt, rule.internalDays + extraDays, timezone) : null,
      clientDueAt: rule.mode === "automatic" ? addWorkingDays(startedAt, revision ? rule.revisionDays : rule.clientDays + extraDays, timezone) : null };
  }, [getProjectFlow, settings, state, timezone]);

  useEffect(() => {
    if (!ready) return;
    const projects = selectWorkspaceProjects(state, state.session.activeWorkspaceId);
    const states: Record<string, StageStatus> = {};
    projects.forEach((project) => currentStatuses(project).forEach(({ stage, status }) => { states[`${project.id}:${stage}`] = status; }));
    const before = previous.current;
    previous.current = { key, states };
    // Existing mock and saved states have no trustworthy start time. Opening the app never starts or rewrites a timer.
    if (!before || before.key !== key) return;
    const instant = new Date().toISOString();
    const starts: StageCycle[] = [];
    const ends = new Set<string>();
    for (const [id, status] of Object.entries(states)) {
      if (!isStudioWaiting(status, studio.details.name) || isStudioWaiting(before.states[id] ?? { state: "not_started" }, studio.details.name)) continue;
      const project = projects.find((entry) => id.startsWith(`${entry.id}:`));
      const stage = id.slice(id.lastIndexOf(":") + 1) as ProductionFlowStageKey;
      if (project) starts.push(createCycle(project, stage, (before.states[id]?.state === "waiting" || before.states[id]?.state === "done") || cyclesRef.current.some((cycle) => cycle.projectId === project.id && cycle.stage === stage), instant));
    }
    Object.entries(before.states).forEach(([id, status]) => {
      if (isStudioWaiting(status, studio.details.name) && (!states[id] || !isStudioWaiting(states[id], studio.details.name))) ends.add(id);
    });
    if (starts.length || ends.size) commit((current) => [...current.map((cycle) => !cycle.endedAt && ends.has(`${cycle.projectId}:${cycle.stage}`) ? { ...cycle, endedAt: instant } : cycle), ...starts]);
  }, [commit, createCycle, currentStatuses, key, ready, state, studio.details.name]);

  const getActiveDeadlines = useCallback((project: Project, legacy = project.deadline): ActiveStageDeadline[] => {
    return currentStatuses(project).filter(({ status }) => isStudioWaiting(status, studio.details.name)).map(({ stage }) => {
      const cycle = [...cycles].reverse().find((entry) => entry.projectId === project.id && entry.stage === stage && !entry.endedAt) ?? null;
      return { stage, label: stage === "edit" && getProjectFlow(project).postProductionTerm === "animation" ? "Animation" : labels[stage], cycle,
        dueAt: cycle ? cycle.clientDueAt : legacy?.stage === stage ? legacy.dueAt ?? null : null,
        internalDueAt: cycle?.internalDueAt ?? null };
    });
  }, [currentStatuses, cycles, getProjectFlow, studio.details.name]);
  const previewDeadline = useCallback((project: Project, stage: ProductionFlowStageKey) => {
    const existing = getActiveDeadlines(project).find((entry) => entry.stage === stage)?.cycle;
    const cycle = createCycle(project, stage, existing?.revision ?? false, existing?.startedAt ?? new Date(now).toISOString());
    return { ...cycle, mode: "automatic" as const,
      internalDueAt: cycle.revision ? null : addWorkingDays(cycle.startedAt, cycle.rule.internalDays + cycle.extraDays, timezone),
      clientDueAt: addWorkingDays(cycle.startedAt, cycle.revision ? cycle.rule.revisionDays : cycle.rule.clientDays + cycle.extraDays, timezone) };

  }, [createCycle, getActiveDeadlines, now, timezone]);
  const saveDeadline = useCallback((project: Project, stage: ProductionFlowStageKey, mode: TurnaroundRule["mode"], internal: string | null, client: string | null) => {
    const scoped = state.projects.find((entry) => entry.id === project.id);
    if (!ready || viewer?.role !== "Studio Staff" || !scoped || !canViewProject(viewer, scoped, state) || project.status === "Paused"
      || !getActiveDeadlines(project).some((entry) => entry.stage === stage)
      || mode === "dates" && (!client || !Number.isFinite(Date.parse(client)) || internal && (!Number.isFinite(Date.parse(internal)) || internal > client))) return false;
    const existing = getActiveDeadlines(project).find((entry) => entry.stage === stage)?.cycle;
    const next = createCycle(project, stage, existing?.revision ?? false, existing?.startedAt ?? new Date().toISOString());
    next.id = existing?.id ?? next.id; next.mode = mode;
    if (mode === "dates") { next.internalDueAt = internal; next.clientDueAt = client; }
    else {
      next.internalDueAt = next.revision ? null : addWorkingDays(next.startedAt, next.rule.internalDays + next.extraDays, timezone);
      next.clientDueAt = addWorkingDays(next.startedAt, next.revision ? next.rule.revisionDays : next.rule.clientDays + next.extraDays, timezone);
    }
    commit((current) => [...current.filter((entry) => entry.id !== next.id), next]);
    setNow(Date.now()); return true;
  }, [commit, createCycle, getActiveDeadlines, ready, state, timezone, viewer]);

  const getForecast = useCallback((project: Project): Forecast | null => {
    if (!ready || project.status === "Completed" || project.status === "Archived" || project.status === "Paused" || completionRecords[project.id]) return null;
    const entries = currentStatuses(project).filter(({ stage, status }) => stage !== "brief" && stage !== "shoot" && status.state !== "done");
    if (!entries.length) return null;
    let cursor = new Date(now).toISOString();
    const active = getActiveDeadlines(project);
    const descriptions: string[] = [];
    for (const { stage, status } of entries) {
      const label = stage === "edit" && getProjectFlow(project).postProductionTerm === "animation" ? "Animation" : labels[stage];
      const rule = ruleForStage(settings, stage, getProjectFlow(project).postProductionTerm === "animation");
      const saved = active.find((entry) => entry.stage === stage);
      if (saved?.dueAt && Date.parse(saved.dueAt) >= now) { cursor = new Date(Math.max(Date.parse(cursor), Date.parse(saved.dueAt))).toISOString(); descriptions.push(`${label}: current deadline`); continue; }
      if (rule.mode === "dates" && !saved?.dueAt) return null;
      const revision = status.state === "waiting" || saved?.cycle?.revision;
      const days = revision ? rule.revisionDays : rule.clientDays + (stage === "edit" ? extraVideoDays(mainVideoSeconds(selectProjectBrief(state, project.id)?.fields.deliverables.value, project.videoLengthSeconds), settings.extraDaysPerMinute) : 0);
      cursor = addWorkingDays(cursor, days, timezone); descriptions.push(`${label}: ${days} working days`);
    }
    const readiness = currentStatuses(project).some(({ stage, status }) => stage === "shoot" && status.state !== "done");
    const assumptions = `${readiness ? "Assumes filming and footage are ready to start. " : ""}Client review time may extend delivery. Your producer will confirm the date.`;
    return { suggestedDate: deadlineInput(cursor, timezone).slice(0, 10), reason: `We suggest allowing a little more time to finish your video. ${assumptions}`, internalReason: `${descriptions.join("; ")}. ${assumptions}` };
  }, [completionRecords, currentStatuses, getActiveDeadlines, getProjectFlow, now, ready, settings, state, timezone]);
  const value = useMemo<Value>(() => ({ hasHydrated: ready, now, timezone, getActiveDeadlines, saveDeadline, getForecast, previewDeadline }), [ready, now, timezone, getActiveDeadlines, saveDeadline, getForecast, previewDeadline]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTurnaround() { const value = useContext(Context); if (!value) throw new Error("useTurnaround must be used within TurnaroundProvider"); return value; }
