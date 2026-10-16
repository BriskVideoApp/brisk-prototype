import type { ReviewComment, ReviewVersionStatus } from "./types";

export function isOverallComment(comment: ReviewComment) {
  return typeof comment.timecodeSeconds !== "number";
}

export function hasTimecode(comment: ReviewComment): comment is ReviewComment & { timecodeSeconds: number } {
  return typeof comment.timecodeSeconds === "number";
}

export function formatVersionStatus(status: ReviewVersionStatus) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "changes_requested") {
    return "Changes requested";
  }

  return "In review";
}

export function formatTime(totalSeconds: number) {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
