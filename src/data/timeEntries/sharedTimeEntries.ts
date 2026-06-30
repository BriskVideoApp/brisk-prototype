import type { TimeEntry } from "@/components/active-videos/types";
import type { TodayTimeEntry } from "@/components/today/types";

export type SharedTimeEntry = {
  id: string;
  projectId: string;
  roleSlotId: string;
  personId: string;
  stageId: TimeEntry["stageId"];
  date: string;
  startMinutes: number;
  hours: number;
  note: string;
  loggedAt: string;
  createdAt: string;
};

export const sharedTimeEntriesStorageKey = "brisk-shared-time-entries-v1";
export const sharedTimeEntriesEventName = "brisk:shared-time-entries";

export function readSharedTimeEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedEntries = window.localStorage.getItem(sharedTimeEntriesStorageKey);
    return storedEntries ? (JSON.parse(storedEntries) as SharedTimeEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendSharedTimeEntry(entry: SharedTimeEntry) {
  const entries = [...readSharedTimeEntries(), entry];
  window.localStorage.setItem(sharedTimeEntriesStorageKey, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(sharedTimeEntriesEventName, { detail: entries }));
  return entries;
}

export function toProjectTimeEntry(entry: SharedTimeEntry): TimeEntry {
  return {
    id: entry.id,
    roleSlotId: entry.roleSlotId,
    personId: entry.personId,
    stageId: entry.stageId,
    hours: entry.hours,
    note: entry.note,
    loggedAt: entry.loggedAt,
  };
}

export function toTodayTimeEntry(entry: SharedTimeEntry): TodayTimeEntry {
  return {
    id: entry.id,
    projectId: entry.projectId,
    personId: entry.personId,
    stage: entry.stageId,
    date: entry.date,
    startMinutes: entry.startMinutes,
    status: "done",
    hours: entry.hours,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

