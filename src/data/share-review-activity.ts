export type SharedReviewActivity = {
  id: string;
  requestId: string;
  action: "sent" | "reminded" | "updated" | "files-sent" | "completed";
  actor: string;
  company: string;
  recipients: string[];
  occurredAt: string;
  scopeKey: string;
  scopeLabel: string;
  stage: "script" | "shoot" | "storyboard" | "media" | "edit" | "masters";
  href: string;
  message: string;
  fingerprint?: string;
};

export function sharedReviewActivityStorageKey(workspaceId: string, projectId: string) {
  return `brisk-shared-review-activity-v1:${workspaceId}:${projectId}`;
}

export function readSharedReviewActivity(storageKey: string): SharedReviewActivity[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSharedReviewActivity);
  } catch {
    return [];
  }
}

export function appendSharedReviewActivity(storageKey: string, entry: SharedReviewActivity) {
  const next = [...readSharedReviewActivity(storageKey), entry];
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("brisk:shared-review-activity-updated"));
  return next;
}

function isSharedReviewActivity(value: unknown): value is SharedReviewActivity {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string"
    && typeof entry.requestId === "string"
    && typeof entry.actor === "string"
    && typeof entry.company === "string"
    && Array.isArray(entry.recipients)
    && entry.recipients.every((recipient) => typeof recipient === "string")
    && typeof entry.occurredAt === "string"
    && typeof entry.scopeKey === "string"
    && typeof entry.scopeLabel === "string"
    && typeof entry.stage === "string"
    && typeof entry.href === "string"
    && typeof entry.message === "string";
}
