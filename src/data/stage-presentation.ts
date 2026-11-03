import type { StageStatus } from "@/components/active-videos/types";

// Recorded responsibility takes precedence over the legacy state-to-company mapping.
export function getStagePresentationState(status: StageStatus, studioName: string, clientName: string): StageStatus["state"] {
  if (status.state === "waiting" || status.state === "in_progress") {
    if (status.assignedTo === clientName) return "waiting";
    if (status.assignedTo === studioName) return "in_progress";
  }
  return status.state;
}
