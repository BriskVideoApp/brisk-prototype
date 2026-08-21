import Link from "next/link";
import type { ChatChannel } from "@/components/chat/types";
import { NotificationSemanticState } from "@/components/notifications/NotificationSemanticState";
import type { ProjectSystemPostData } from "@/components/notifications/types";
import { DsIcon } from "@/components/video-review/DsIcon";
import { formatRelativeTime } from "@/components/chat/chat-utils";

export function ProjectSystemPost({
  post,
  channel,
  createdAt,
  messageId,
  highlighted = false,
}: {
  post: ProjectSystemPostData;
  channel: ChatChannel;
  createdAt: string;
  messageId: string;
  highlighted?: boolean;
}) {
  if (post.presentation === "passive") {
    const passiveContent = (
      <>
        <NotificationSemanticState state={post.state} label={post.label} compact />
        <span className="project-system-post-passive-copy">
          <strong className="label-s-semibold">{post.title}</strong>
          <span className="label-s">{post.copy}</span>
        </span>
        {post.groupedCount ? (
          <span className="project-system-post-grouped label-xs-semibold">
            {post.groupedCount} Stages together
          </span>
        ) : null}
        <time className="label-xs" dateTime={createdAt} title={createdAt}>
          {formatRelativeTime(createdAt)}
        </time>
        <span className={`project-system-post-audience ${channel} label-xs-semibold`}>
          {channel === "internal" ? "Internal" : "External"}
        </span>
        {post.href ? <DsIcon name="caret-right" size={16} /> : null}
      </>
    );

    return (
      <article
        className={`project-system-post passive ${post.state} ${channel} ${highlighted ? "highlighted" : ""}`}
        id={`chat-message-${messageId}`}
      >
        {post.href ? (
          <Link
            className="project-system-post-passive-link"
            href={post.href}
            aria-label={`${post.title}: ${post.copy}`}
          >
            {passiveContent}
          </Link>
        ) : (
          <div className="project-system-post-passive-link is-static">{passiveContent}</div>
        )}
      </article>
    );
  }

  return (
    <article
      className={`project-system-post actionable ${post.state} ${channel} ${highlighted ? "highlighted" : ""}`}
      id={`chat-message-${messageId}`}
    >
      <div className="project-system-post-header">
        <NotificationSemanticState state={post.state} label={post.label} compact />
        <span className={`project-system-post-audience ${channel} label-xs-semibold`}>
          {channel === "internal" ? "Internal" : "External"}
        </span>
      </div>

      <div className={`project-system-post-content ${post.thumbnailUrl ? "with-thumbnail" : ""}`}>
        {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" /> : null}
        <div className="project-system-post-copy">
          <div className="project-system-post-title-row">
            <strong className="label-s-semibold">{post.title}</strong>
            {post.groupedCount ? (
              <span className="project-system-post-grouped label-xs-semibold">
                {post.groupedCount} Stages together
              </span>
            ) : null}
          </div>
          <p className="label-s">{post.copy}</p>
          <time className="label-xs" dateTime={createdAt} title={createdAt}>
            {formatRelativeTime(createdAt)}
          </time>
        </div>
      </div>

      {post.href && post.ctaLabel ? (
        <Link className="project-system-post-link label-s-semibold" href={post.href}>
          {post.ctaLabel}
          <DsIcon name="caret-right" size={16} />
        </Link>
      ) : null}
    </article>
  );
}
