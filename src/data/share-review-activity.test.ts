import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClientStageReviewNotification } from "@/data/notification-inbox";
import {
  appendSharedReviewActivity,
  readSharedReviewActivity,
  sharedReviewActivityStorageKey,
  type SharedReviewActivity,
} from "@/data/share-review-activity";

const key = sharedReviewActivityStorageKey("north-star", "loom-story");
const request: SharedReviewActivity = {
  id: "script-request-1",
  requestId: "script-request-1",
  action: "sent",
  actor: "Tom Evans",
  company: "Loom",
  recipients: ["Jess Taylor"],
  occurredAt: "2026-09-23T10:00:00.000Z",
  scopeKey: "script-v3",
  scopeLabel: "V3 Script",
  stage: "script",
  href: "/projects/loom-story/script?version=script-v3",
  message: "Please review this Script.",
  fingerprint: "script-content-v3",
};

beforeEach(() => window.localStorage.clear());

describe("shared review activity", () => {
  it("keeps requests and reminders for a selected version in order", () => {
    appendSharedReviewActivity(key, request);
    appendSharedReviewActivity(key, {
      ...request,
      id: "script-reminder-1",
      action: "reminded",
      occurredAt: "2026-09-23T11:00:00.000Z",
      message: "A reminder to review the Script.",
    });

    expect(readSharedReviewActivity(key)).toEqual([
      request,
      expect.objectContaining({
        action: "reminded",
        requestId: request.id,
        scopeKey: "script-v3",
      }),
    ]);
  });

  it("notifies the activity view when files are sent", () => {
    const onUpdate = vi.fn();
    window.addEventListener("brisk:shared-review-activity-updated", onUpdate);
    appendSharedReviewActivity(key, {
      ...request,
      id: "media-batch-1",
      requestId: "media-batch-1",
      action: "files-sent",
      stage: "media",
      scopeKey: "file-one,file-two",
      scopeLabel: "2 Media files",
    });

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(readSharedReviewActivity(key)[0]).toMatchObject({ action: "files-sent", stage: "media" });
    window.removeEventListener("brisk:shared-review-activity-updated", onUpdate);
  });

  it("uses the edited review message in the recipient notification", () => {
    const notification = createClientStageReviewNotification({
      projectId: "loom-story",
      projectName: "Customer Story - Healthcare",
      stage: "script",
      versionLabel: "V3",
      actorName: "Tom Evans",
      href: request.href,
      message: "Please review these revised words.",
    });

    expect(notification.copy).toBe("Please review these revised words.");
    expect(notification.href).toBe(request.href);
  });
});
