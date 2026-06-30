import type { StageKey } from "@/components/active-videos/types";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";
export type TodayEntryStatus = "todo" | "done";

export type TodayProjectCard = {
  id: string;
  projectId: string;
  projectName: string;
  clientBadge: string;
  deadlineAt: string;
  isCritical: boolean;
  assignedHours: number;
  loggedHours: number;
  currentUserId: string;
};

export type TodayTimeEntry = {
  id: string;
  projectId: string;
  personId: string;
  stage?: StageKey;
  date: string;
  startMinutes: number;
  status?: TodayEntryStatus;
  hours: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type WeekDay = {
  date: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
};
