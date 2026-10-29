"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { useBriskAi } from "./BriskAiContext";
import type { AskInsight } from "@/data/ask-brisk";
import { appendStoredProjectChatMessage } from "@/components/chat/chat-persistence";

export function ApprovalReminderReview({ insight, onCancel }: { insight: AskInsight; onCancel: () => void }) {
  const { model } = useBriskAi();
  const project = model.projects.find((entry) => entry.id === insight.projectId);
  const stage = project?.assistantStages.find((entry) => entry.key === insight.reviewStage);
  const client = model.state.clients.find((entry) => entry.id === project?.clientId && entry.workspaceId === model.viewer?.workspaceId);
  const recipients = client?.contacts.filter((contact) => contact.portalAccess !== "Paused" && project?.clientMemberIds.includes(contact.id)) ?? [];
  const initialVersion = useRef(stage?.status.reviewVersion);
  const [body, setBody] = useState(`Hi ${recipients.map((contact) => contact.name.split(" ")[0]).join(" and ") || project?.clientName || "team"}, could you please review the ${stage?.label ?? "Stage"}${stage?.status.reviewVersion ? ` ${stage.status.reviewVersion}` : ""} for ${project?.name ?? "this project"}? Please leave your feedback or approve it when you are ready. Thank you.`);
  const [sentId, setSentId] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const [error, setError] = useState("");
  const canSend = model.viewer?.role === "Studio Staff" && project?.status === "In Production"
    && stage?.status.state === "waiting" && stage.status.assignedTo === project.clientName && recipients.length > 0
    && stage.status.reviewVersion === initialVersion.current;
  function send() {
    if (!canSend || !body.trim() || !project || !model.viewer || sendingRef.current || sentId) return;
    sendingRef.current = true;
    const id = `ask-brisk-reminder-${crypto.randomUUID()}`;
    const sent = appendStoredProjectChatMessage(model.viewer.workspaceId, {
      id, projectId: project.id, channel: "external", threadId: null, senderId: model.viewer.chatUserId,
      senderSystem: null, senderRole: "team", body: `${body.trim()}\n\nPrototype reminder - no external message was sent.`,
      attachments: [], reactions: [], sourceChannel: "brisk", createdAt: new Date().toISOString(), editedAt: null,
      deletedAt: null, readBy: [model.viewer.chatUserId], mentions: [],
    });
    if (sent) setSentId(id);
    else { sendingRef.current = false; setError("This browser could not save the simulated reminder. Your draft is still here."); }
  }
  return <section className="ask-brisk-reminder" aria-label="Review approval reminder">
    <h2 className="headings-2xs-bold">{sentId ? "Reminder posted in the prototype" : "Review approval reminder"}</h2>
    <p className="paragraph-s">{project?.name} · {stage?.label}{initialVersion.current ? ` ${initialVersion.current}` : ""}</p>
    {sentId ? <>
      <p className="paragraph-s" role="status">The simulated reminder is in Client-visible Project Chat. No email or external message was sent.</p>
      <Link className="label-s-semibold" href={`/chat?project=${encodeURIComponent(insight.projectId)}&message=${sentId}`}>View reminder in Project Chat</Link>
      <Button size="S" variant="secondary" onClick={onCancel}>Done</Button>
    </> : <>
      <p className="paragraph-s"><strong>Client contacts:</strong> {recipients.map((contact) => contact.name).join(", ") || "No active Client contacts assigned"}</p>
      <p className="paragraph-s">Destination: Client-visible Project Chat. Project Filmmakers can also read this conversation.</p>
      <Textarea label="Reminder message" rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
      {!canSend ? <p className="paragraph-s" role="status">This review or its recipients have changed, or a Client review is not pending. Check the source before preparing another reminder.</p> : null}
      {error ? <p className="paragraph-s" role="status">{error}</p> : null}
      <p className="paragraph-s">Prototype only. Posting adds a simulated message for review.</p>
      <div className="ask-brisk-actions"><Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="S" disabled={!canSend || !body.trim()} onClick={send}>Post reminder (demo)</Button></div>
    </>}
  </section>;
}
