import Link from "next/link";
import type { ChatRole } from "@/components/chat/types";
import { NotificationSemanticState } from "@/components/notifications/NotificationSemanticState";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getVisibleProjectActivity } from "@/data/project-history";

const stageLabels = {
  brief: "Brief",
  script: "Script",
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
  const activity = getVisibleProjectActivity(projectId, role, { freelancerHasProjectAccess });
  const entries = activity.entries.filter(
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
