"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChatRole } from "@/components/chat/types";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { NotificationSemanticState } from "@/components/notifications/NotificationSemanticState";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getVisibleProjectActivity } from "@/data/project-history";
import { readSharedReviewActivity, sharedReviewActivityStorageKey } from "@/data/share-review-activity";

const stageLabels = {
  brief: "Brief",
  script: "Script",
  storyboard: "Storyboard",
  shoot: "Shoot",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Sydney",
});

export function ProjectLatestActionsList({
  projectId,
  role,
  freelancerHasProjectAccess = true,
}: {
  projectId: string;
  role: ChatRole;
  freelancerHasProjectAccess?: boolean;
}) {
  const { state } = usePrototypeState();
  const [reviewActivity, setReviewActivity] = useState<Array<ReturnType<typeof readReviewActivity>[number] | ReturnType<typeof readSharedActivity>[number]>>([]);
  const workspaceId = state.session.activeWorkspaceId;

  useEffect(() => {
    const refresh = () => setReviewActivity([
      ...readReviewActivity(workspaceId, projectId, "brief"),
      ...readReviewActivity(workspaceId, projectId, "masters"),
      ...readSharedActivity(workspaceId, projectId),
    ]);
    refresh();
    window.addEventListener("brisk:brief-activity-updated", refresh);
    window.addEventListener("brisk:masters-activity-updated", refresh);
    window.addEventListener("brisk:shared-review-activity-updated", refresh);
    return () => {
      window.removeEventListener("brisk:brief-activity-updated", refresh);
      window.removeEventListener("brisk:masters-activity-updated", refresh);
      window.removeEventListener("brisk:shared-review-activity-updated", refresh);
    };
  }, [projectId, workspaceId]);

  const activity = getVisibleProjectActivity(projectId, role, { freelancerHasProjectAccess });
  const entries = [...activity.entries, ...(role === "Studio Freelancer" && !freelancerHasProjectAccess ? [] : reviewActivity)]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).filter(
    (entry): entry is typeof entry & { href: string } => entry.href !== null,
  );

  if (entries.length === 0) {
    return (
      <div className="project-detail-latest-actions-empty">
        <span className="project-detail-latest-actions-empty-icon">
          <DsIcon name="clock-clockwise" size={20} />
        </span>
        <strong className="label-s-semibold">No actions to show</strong>
        <p className="label-s">
          Actions will appear here when work moves through production.
        </p>
      </div>
    );
  }

  return (
    <>
      <ol className="project-detail-latest-actions-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              className="project-detail-latest-action"
              href={entry.href}
              aria-label={`${entry.action}: ${entry.entityLabel}`}
            >
              <span className="project-detail-latest-action-topline">
                <NotificationSemanticState state={entry.state} label={entry.label} compact />
                <time className="label-xs" dateTime={entry.occurredAt} title={entry.occurredAt}>
                  {dateFormatter.format(new Date(entry.occurredAt))}
                </time>
              </span>
              <strong className="label-s-semibold">{entry.action}</strong>
              <span className="project-detail-latest-action-detail label-s">{entry.detail}</span>
              <span className="project-detail-latest-action-meta label-xs">
                <span>{entry.entityLabel}</span>
                {entry.stage ? <span>{stageLabels[entry.stage]}</span> : null}
                {entry.activityOnly ? <span>Activity only</span> : null}
              </span>
              <span className="project-detail-latest-action-open">
                <DsIcon name="caret-right" size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {activity.hasPermissionFilteredEntries ? (
        <p className="project-detail-latest-actions-filtered label-xs">
          <DsIcon name="eye-slash" size={14} />
          Some Studio-only or commercial actions are hidden.
        </p>
      ) : null}
    </>
  );
}

function readSharedActivity(workspaceId: string, projectId: string) {
  return readSharedReviewActivity(sharedReviewActivityStorageKey(workspaceId, projectId)).map((entry) => {
    const action = entry.action === "reminded"
      ? `${entry.actor} reminded ${entry.company} to review ${entry.scopeLabel}.`
      : entry.action === "updated"
        ? `${entry.actor} sent the updated ${entry.scopeLabel} to ${entry.company}.`
        : entry.action === "files-sent"
          ? `${entry.actor} sent ${entry.scopeLabel} to ${entry.company}.`
          : entry.action === "completed"
            ? `${entry.actor} completed the video.`
            : `${entry.actor} submitted ${entry.scopeLabel} to ${entry.company}.`;
    return {
      id: entry.id,
      href: entry.href.startsWith(`/projects/${projectId}`) ? entry.href : `/projects/${projectId}/stages/${entry.stage}`,
      action,
      detail: [entry.recipients.length ? `Notified ${entry.recipients.join(", ")}.` : "No one was directly notified.", entry.message].filter(Boolean).join(" "),
      entityLabel: entry.scopeLabel,
      stage: entry.stage,
      occurredAt: entry.occurredAt,
      state: "information" as const,
      label: "Update" as const,
      activityOnly: false as const,
    };
  });
}

function readReviewActivity(workspaceId: string, projectId: string, stage: "brief" | "masters") {
  try {
    const storageKey = stage === "brief"
      ? `brisk-brief-action-audit-v1:${workspaceId}:${projectId}`
      : `brisk-masters-review-audit-v1:${workspaceId}:${projectId}`;
    const stored = window.localStorage.getItem(storageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((raw): Array<{
      id: string;
      href: string;
      action: string;
      detail: string;
      entityLabel: string;
      stage: "brief" | "masters";
      occurredAt: string;
      state: "information";
      label: "Update";
      activityOnly: false;
    }> => {
      if (!raw || typeof raw !== "object") return [];
      const entry = raw as Record<string, unknown>;
      if (!["sent", "reminded", "updated"].includes(String(entry.action)) || typeof entry.id !== "string" || typeof entry.actor !== "string" || typeof entry.company !== "string" || typeof entry.occurredAt !== "string") return [];
      const scopeLabel = stage === "masters" && typeof entry.scopeLabel === "string" ? entry.scopeLabel : "Brief";
      const action = entry.action === "reminded"
        ? `${entry.actor} reminded ${entry.company} to review ${scopeLabel}.`
        : entry.action === "updated"
          ? `${entry.actor} sent the updated ${scopeLabel} to ${entry.company}.`
          : `${entry.actor} submitted ${scopeLabel} to ${entry.company}.`;
      const recipients = Array.isArray(entry.recipients) ? entry.recipients.filter((name): name is string => typeof name === "string") : [];
      return [{
        id: entry.id,
        href: stage === "masters" && typeof entry.href === "string" && entry.href.startsWith(`/projects/${projectId}/stages/masters`)
          ? entry.href
          : `/projects/${projectId}/stages/${stage}`,
        action,
        detail: [recipients.length ? `Sent to ${recipients.join(", ")}.` : "", typeof entry.message === "string" ? entry.message : ""].filter(Boolean).join(" "),
        entityLabel: scopeLabel,
        stage,
        occurredAt: entry.occurredAt,
        state: "information",
        label: "Update",
        activityOnly: false,
      }];
    });
  } catch {
    return [];
  }
}
