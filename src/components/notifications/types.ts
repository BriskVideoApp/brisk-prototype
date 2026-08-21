import type { NotificationEventKey } from "@/data/notification-registry";

export type NotificationSemanticState =
  | "success"
  | "warning"
  | "failure"
  | "information";

export type NotificationSemanticLabel =
  | "Completed"
  | "Approved"
  | "Changed"
  | "Needs attention"
  | "Failed"
  | "Cancelled"
  | "Update";

export type ProjectSystemPostData = {
  eventKey: NotificationEventKey;
  canonicalEventId: string;
  presentation: "actionable" | "passive";
  state: NotificationSemanticState;
  label: NotificationSemanticLabel;
  title: string;
  copy: string;
  href: string | null;
  ctaLabel?: string;
  groupedCount?: number;
  thumbnailUrl?: string;
};
