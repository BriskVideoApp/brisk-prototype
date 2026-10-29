"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { ProjectSystemPost } from "@/components/notifications/ProjectSystemPost";
import type { ChatMessage } from "@/components/chat/types";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { formatTimingDate } from "@/data/project-timing";
import { deliveryHref } from "@/data/project-delivery";
import { useProjectTiming } from "./ProjectTimingContext";

export function ProjectTimingPost({ message, highlighted, onNavigate }: {
  message: ChatMessage;
  highlighted: boolean;
  onNavigate?: () => void;
}) {
  const { issues, shareClientUpdate } = useProjectTiming();
  const viewer = usePrototypeViewer();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [clientCopy, setClientCopy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const post = message.projectUpdate;
  const issue = issues.find((entry) => post?.kind === "event" && entry.id === post.timingIssueId);
  if (post?.kind !== "event" || !issue) return null;
  if (issue.resolvedAt) return <ProjectSystemPost post={post} channel={message.channel} createdAt={message.createdAt}
    messageId={message.id} highlighted={highlighted} onAction={(event) => {
      if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.();
    }} />;
  const isLinkedReview = searchParams.get("timing") === issue.id && searchParams.get("message") === message.id;
  const canShare = viewer?.role === "Studio Staff" && issue.kind === "production" && !issue.clientUpdate;
  const reason = message.channel === "internal" ? issue.internalReason : issue.clientUpdate?.reason ?? issue.reason;

  function close() {
    setIsOpen(false); setClientCopy(null);
    if (isLinkedReview) {
      const params = new URLSearchParams(searchParams.toString()); params.delete("timing");
      router.replace(`/chat?${params.toString()}`, { scroll: false });
    }
  }

  return <>
    <ProjectSystemPost post={post} channel={message.channel} createdAt={message.createdAt}
      messageId={message.id} highlighted={highlighted} onAction={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); setIsOpen(true); setFeedback("");
      }}>
      <div className="timing-post-summary">
        <dl className="timing-post-dates">
          <div><dt className="label-xs">Requested delivery</dt><dd className="label-m-semibold">{formatTimingDate(issue.requestedDate)}</dd></div>
          <div><dt className="label-xs">Suggested delivery</dt><dd className="label-m-semibold">{formatTimingDate(issue.suggestedDate)}</dd></div>
        </dl>
        <p className="label-s">{reason}</p>
      </div>
    </ProjectSystemPost>
    {(isOpen || isLinkedReview) ? <EditingDialog title="Review delivery date" onCancel={close}
      description="The suggested date is an estimate. Your agreed delivery date stays unchanged."
      actions={<>
        <Button size="S" variant="secondary" onClick={close}>{canShare ? "Cancel" : "Close"}</Button>
        {canShare ? <Button size="S" disabled={!(clientCopy ?? issue.reason).trim()} onClick={() => {
          if (shareClientUpdate(issue.id, clientCopy ?? issue.reason)) setFeedback("Shared in External Chat. Timing still needs agreement.");
        }}>Share with Client</Button> : null}
      </>}>
      <div className="timing-review-content">
        <dl className="timing-review-dates">
          <div><dt className="label-s">Requested delivery</dt><dd className="label-s-semibold">{formatTimingDate(issue.requestedDate)}</dd></div>
          <div><dt className="label-s">Suggested delivery</dt><dd className="label-s-semibold">{formatTimingDate(issue.suggestedDate)}</dd></div>
        </dl>
        <section className="timing-review-reason">
          <h3 className="label-s-semibold">Why this date?</h3>
          <p className="paragraph-s">{reason}</p>
        </section>
        {canShare ? <Textarea label="Client update" value={clientCopy ?? issue.reason} rows={3}
          hint="Only this message and the dates above will appear in External Chat."
          onChange={(event) => setClientCopy(event.target.value)} /> : null}
        {issue.clientUpdate && viewer?.role !== "Customer" ? <p className="label-s">Shared with the Client after review by {issue.clientUpdate.reviewedBy}.</p> : null}
        <p className="label-s timing-review-note">Your agreed date stays in place until the Client agrees to a new one.</p>
        <Link className="timing-review-deadline-link label-s-semibold"
          href={deliveryHref(issue.projectId)}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            setIsOpen(false); onNavigate?.();
          }}>View final delivery</Link>
        <p className="label-s timing-review-feedback" role="status">{feedback}</p>
      </div>
    </EditingDialog> : null}
  </>;
}
