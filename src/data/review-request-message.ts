export type ReviewRequestSenderRole = "Studio Staff" | "Studio Freelancer" | "Customer";

export const defaultReviewRequestMessage = "Please review the {stage} for {project} and share any feedback.";
export const defaultStudioSubmitMessage = "The {stage} and its comments for {project} are ready for you.";

export function getReviewRequestMessageStorageKey({
  workspaceId,
  clientId,
  userId,
  role,
  destination = "customer",
}: {
  workspaceId: string;
  clientId: string | null;
  userId: string;
  role: ReviewRequestSenderRole;
  destination?: "customer" | "studio";
}) {
  const sender = role === "Customer" ? `client:${clientId ?? "current"}`
    : role === "Studio Freelancer" ? `freelancer:${userId}`
      : "studio";
  return `brisk-review-request-message-v1:${workspaceId}:${sender}${destination === "studio" ? ":studio" : ""}`;
}

export function readReviewRequestMessageTemplate(storageKey: string, destination: "customer" | "studio" = "customer") {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored && stored.trim() ? stored.slice(0, 240) : destination === "studio" ? defaultStudioSubmitMessage : defaultReviewRequestMessage;
  } catch {
    return destination === "studio" ? defaultStudioSubmitMessage : defaultReviewRequestMessage;
  }
}

export function formatReviewRequestMessage(template: string, stage: string, project: string) {
  return template.replaceAll("{stage}", stage).replaceAll("{project}", project).trim();
}
