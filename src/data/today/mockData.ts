import type { TodayTimeEntry } from "@/components/today/types";

export const todayCurrentUserId = "sc";
export const todayReferenceDate = "2026-06-23";

export const todayTimeEntries: TodayTimeEntry[] = [
  {
    id: "today-entry-deel-media",
    projectId: "deel-customer-story",
    personId: todayCurrentUserId,
    stage: "media",
    date: "2026-06-22",
    startMinutes: 540,
    status: "done",
    hours: 1.5,
    note: "Organised selects and transcript notes.",
    createdAt: "2026-06-22T09:00:00+10:00",
  },
  {
    id: "today-entry-hims-edit",
    projectId: "hims-product-education",
    personId: todayCurrentUserId,
    stage: "edit",
    date: "2026-06-23",
    startMinutes: 600,
    status: "done",
    hours: 2,
    note: "Reviewed the sleep series rough cut.",
    createdAt: "2026-06-23T10:00:00+10:00",
  },
  {
    id: "today-entry-hims-unspecified",
    projectId: "hims-product-education",
    personId: todayCurrentUserId,
    date: "2026-06-24",
    startMinutes: 840,
    status: "todo",
    hours: 1.25,
    note: "Needs stage set after review.",
    createdAt: "2026-06-24T14:00:00+10:00",
  },
];
