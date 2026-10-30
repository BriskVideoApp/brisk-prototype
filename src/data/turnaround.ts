import type { StageStatus } from "@/components/active-videos/types";
import type { ProductionFlowStageKey } from "@/data/production-flow";

export type TurnaroundStage = "script" | "storyboard" | "edit" | "animation" | "masters";
export type TurnaroundRule = { mode: "automatic" | "dates"; internalDays: number; clientDays: number; revisionDays: number };
export type StudioTurnaround = {
  shared: TurnaroundRule;
  extraDaysPerMinute: number;
  includedRevisionRounds: number | null;
  overrides: Partial<Record<TurnaroundStage, TurnaroundRule>>;
};
export const turnaroundStages: readonly TurnaroundStage[] = ["script", "storyboard", "edit", "animation", "masters"];
export const turnaroundLabels: Record<TurnaroundStage, string> = { script: "Script", storyboard: "Storyboard", edit: "Edit", animation: "Animation", masters: "Masters" };
export const defaultTurnaround: StudioTurnaround = {
  shared: { mode: "automatic", internalDays: 2, clientDays: 3, revisionDays: 2 },
  extraDaysPerMinute: 1, includedRevisionRounds: null, overrides: {},
};
export function cloneTurnaround(value: StudioTurnaround = defaultTurnaround): StudioTurnaround {
  return { ...value, shared: { ...value.shared }, overrides: Object.fromEntries(Object.entries(value.overrides).map(([key, rule]) => [key, { ...rule }])) };
}
export function ruleForStage(settings: StudioTurnaround, stage: ProductionFlowStageKey, animation: boolean): TurnaroundRule {
  const key = stage === "edit" && animation ? "animation" : stage;
  return { ...(settings.overrides[key as TurnaroundStage] ?? settings.shared) };
}
export function isStudioWaiting(status: StageStatus, studioName: string): boolean {
  return status.state === "in_progress" || status.state === "waiting" && status.assignedTo === studioName;
}
export function extraVideoDays(seconds: number | undefined, daysPerMinute: number): number {
  // Tom's allowance: ten seconds beyond each minute, first WIP only.
  return Math.ceil(Math.max(0, (seconds ?? 60) - 70) / 60) * daysPerMinute;
}
export function validRule(rule: TurnaroundRule) {
  return [rule.internalDays, rule.clientDays, rule.revisionDays].every((value) => Number.isInteger(value) && value >= 1)
    && rule.clientDays >= rule.internalDays;
}

type WallParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
function parts(instant: Date | number, timeZone: string): WallParts {
  const fields = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const get = (key: string) => Number(fields.find((field) => field.type === key)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}
function wallEpoch(value: WallParts) { return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second); }
function instantForWall(value: WallParts, timeZone: string): string | null {
  const target = wallEpoch(value);
  let instant = target;
  for (let step = 0; step < 4; step += 1) instant += target - wallEpoch(parts(instant, timeZone));
  return wallEpoch(parts(instant, timeZone)) === target ? new Date(instant).toISOString() : null;
}
export function localDeadline(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || hour > 23 || minute > 59) return null;
  return instantForWall({ year, month, day, hour, minute, second: 0 }, timeZone);
}
export function deadlineInput(instant: string | null | undefined, timeZone: string): string {
  if (!instant || !Number.isFinite(Date.parse(instant))) return "";
  const value = parts(new Date(instant), timeZone);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}`;
}
export function addWorkingDays(instant: string, days: number, timeZone: string): string {
  const local = parts(new Date(instant), timeZone);
  const calendar = new Date(Date.UTC(local.year, local.month - 1, local.day));
  for (let remaining = days; remaining > 0;) {
    calendar.setUTCDate(calendar.getUTCDate() + 1);
    if (calendar.getUTCDay() !== 0 && calendar.getUTCDay() !== 6) remaining -= 1;
  }
  return instantForWall({ ...local, year: calendar.getUTCFullYear(), month: calendar.getUTCMonth() + 1, day: calendar.getUTCDate() }, timeZone)
    ?? new Date(calendar.getTime()).toISOString();
}
export function formatStageDeadline(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(instant));
}
export function countdown(instant: string, now: number, timeZone: string) {
  if (Date.parse(instant) < now) return "Overdue";
  const start = parts(now, timeZone); const end = parts(new Date(instant), timeZone);
  const day = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const until = Date.UTC(end.year, end.month - 1, end.day);
  let days = 0;
  while (day.getTime() < until) { day.setUTCDate(day.getUTCDate() + 1); if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) days += 1; }
  return days ? `${days} working ${days === 1 ? "day" : "days"} left` : "Due today";
}

/** Main-video Brief duration, including custom minutes/seconds; cutdowns have separate scope. */
export function mainVideoSeconds(deliverables: string | undefined, fallback: number): number {
  try {
    const rows: unknown = JSON.parse(deliverables || "[]");
    if (!Array.isArray(rows)) return fallback;
    const row = rows.find((entry: unknown) => Boolean(entry && typeof entry === "object" && "isMain" in entry && entry.isMain)) ?? rows[0];
    if (!row || typeof row !== "object" || !("duration" in row) || typeof row.duration !== "string") return fallback;
    if (row.duration === "Custom") {
      const minutes = "customMinutes" in row ? Number(row.customMinutes || 0) : 0;
      const seconds = "customSeconds" in row ? Number(row.customSeconds || 0) : 0;
      const total = minutes * 60 + seconds;
      return Number.isFinite(total) && total > 0 ? total : fallback;
    }
    const match = /^(?:(\d+)m)?\s*(?:(\d+)s)?$/u.exec(row.duration);
    const total = match ? Number(match[1] || 0) * 60 + Number(match[2] || 0) : 0;
    return total > 0 ? total : fallback;
  } catch { return fallback; }
}
