"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectSystemPost } from "@/components/notifications/ProjectSystemPost";
import type { ChatMessage } from "@/components/chat/types";
import { formatTimingDate } from "@/data/project-timing";
import { useProjectTiming } from "./ProjectTimingContext";
import { useDeadlineDialog } from "./DeadlineDialogContext";

export function ProjectTimingPost({ message, highlighted, onNavigate }: {
  message: ChatMessage; highlighted: boolean; onNavigate?: () => void;
}) {
  const { issues } = useProjectTiming();
  const openDeadline = useDeadlineDialog();
  const params = useSearchParams();
  const router = useRouter();
  const opened = useRef<string | null>(null);
  const post = message.projectUpdate;
  const issue = issues.find((entry) => post?.kind === "event" && entry.id === post.timingIssueId);
  useEffect(() => {
    if (!issue || params.get("timing") !== issue.id || params.get("message") !== message.id || opened.current === issue.id) return;
    opened.current = issue.id;
    openDeadline(issue.projectId);
    const next = new URLSearchParams(params.toString()); next.delete("timing");
    router.replace(`/chat?${next.toString()}`, { scroll: false });
  }, [issue, message.id, openDeadline, params, router]);
  if (post?.kind !== "event" || !issue) return null;
  const reason = message.channel === "internal" ? issue.internalReason : issue.clientUpdate?.reason ?? issue.reason;
  return <ProjectSystemPost post={post} channel={message.channel} createdAt={message.createdAt}
    messageId={message.id} highlighted={highlighted} onAction={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openDeadline(issue.projectId); onNavigate?.();
    }}>
    {!issue.resolvedAt ? <div className="timing-post-summary">
      <dl className="timing-post-dates">
        <div><dt className="label-xs">Requested delivery</dt><dd className="label-m-semibold">{formatTimingDate(issue.requestedDate)}</dd></div>
        <div><dt className="label-xs">Suggested delivery</dt><dd className="label-m-semibold">{formatTimingDate(issue.suggestedDate)}</dd></div>
      </dl>
      <p className="label-s">{reason}</p>
    </div> : null}
  </ProjectSystemPost>;
}
