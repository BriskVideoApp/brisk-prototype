"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
import { BriskTimePicker } from "@/components/shoot/BriskTimePicker";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { ProjectUnavailable } from "@/components/project/CanonicalStageProject";
import { getActiveClientPortalDestination } from "@/components/navigation/prototypeNavigation";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import { deliveryChatHref, deliveryDateParts, deliveryInstant, formatDeliveryDate, getPendingDeliveryProposal } from "@/data/project-delivery";
import { useProjectTiming } from "./ProjectTimingContext";

export function FinalDeliveryPage({ projectId }: { projectId: string }) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { completionRecords } = useProjectCompletion();
  const { getDeliveryAgreement, issues, proposeDeliveryDate, agreeDeliveryDate, hasHydrated: timingReady } = useProjectTiming();
  const router = useRouter();
  const formId = useId();
  const [isProposing, setIsProposing] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const project = state.projects.find((project) => project.id === projectId && project.workspaceId === state.session.activeWorkspaceId);
  if (!hasHydrated || !timingReady) return null;
  if (!project || !canViewProject(viewer, project, state)) return <ProjectUnavailable />;
  const agreement = getDeliveryAgreement(project);
  const issue = issues.filter((entry) => entry.projectId === projectId && !entry.resolvedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const isDelivered = project.status === "Completed" || project.status === "Archived" || Boolean(completionRecords[projectId]);
  const pending = isDelivered ? null : getPendingDeliveryProposal(agreement);
  const isOverdue = !isDelivered && now !== null && Boolean(agreement.agreedDate && Date.parse(agreement.agreedDate) < now);
  const isStaff = viewer?.role === "Studio Staff";
  const canPropose = isStaff && !isDelivered;
  const canAgree = viewer?.role === "Customer" && !isDelivered && canActOnProject(viewer, project, state, "approve");
  const studioName = state.workspaces.find((workspace) => workspace.id === state.session.activeWorkspaceId)?.name ?? "Studio";
  const status = project.status === "Archived" ? "Archived" : isDelivered ? "Delivered" : pending ? "New date proposed" : isOverdue ? "Overdue" : issue ? "Delivery at risk" : agreement.agreedDate ? "Agreed" : "To be agreed";
  const update = isDelivered ? null : pending?.reason ?? (isOverdue ? "Your final video is still outstanding. Please discuss the next step with your producer."
    : issue?.clientUpdate?.reason ?? (issue?.kind === "brief" ? issue.reason : isStaff ? issue?.internalReason : undefined));
  const backHref = viewer?.role === "Customer" ? getActiveClientPortalDestination(state, viewer) ?? "/prototype/scenarios" : "/active-videos";

  function openProposal() {
    const initial = pending?.date ? deliveryDateParts(pending.date) : issue?.suggestedDate
      ? { date: issue.suggestedDate, time: agreement.agreedDate ? deliveryDateParts(agreement.agreedDate).time : "17:00" }
      : agreement.agreedDate ? deliveryDateParts(agreement.agreedDate) : { date: "", time: "17:00" };
    setDate(initial.date); setTime(initial.time); setReason(pending?.reason ?? issue?.reason ?? ""); setError(""); setFeedback(""); setIsProposing(true);
  }

  return <main className="final-delivery-page">
    <nav className="final-delivery-back label-s" aria-label="Delivery navigation"><Link href={backHref}>Back to Videos</Link></nav>
    <section className="final-delivery-panel" aria-labelledby="final-delivery-title">
      <header className="final-delivery-heading">
        <strong className="label-m-semibold">{studioName}</strong>
        <p className="label-s final-delivery-context">{project.clientBadge} · {project.name}</p>
        <div className="final-delivery-title-row"><h1 className="headings-m-bold" id="final-delivery-title">Final delivery</h1>
          <span className={`final-delivery-status label-s-semibold${!isDelivered && (pending || issue) ? " is-warning" : isOverdue ? " is-overdue" : ""}`}>{status}</span></div>
      </header>
      <div className="final-delivery-body">
        <div className="final-delivery-date-row"><div><h2 className="label-m-semibold">Agreed date</h2><p className="label-s">Sydney time</p></div>
          <strong className="label-l-semibold">{formatDeliveryDate(agreement.agreedDate)}</strong></div>
        {update ? <section className="final-delivery-update" aria-labelledby="delivery-update-title">
          <div><h2 className="label-m-semibold" id="delivery-update-title">{isOverdue && !pending ? "Your agreed delivery date has passed" : isStaff && !pending && !issue?.clientUpdate ? "Studio timing review" : "An update from your producer"}</h2>
            <p className="paragraph-m">{update}</p></div></section> : null}
        {pending ? <>
          <div className="final-delivery-date-row"><div><h2 className="label-m-semibold">Proposed new delivery</h2><p className="label-s">{viewer?.role === "Customer" ? "Waiting for your agreement" : "Waiting for Client agreement"}</p></div>
            <strong className="label-l-semibold">{formatDeliveryDate(pending.date)}</strong></div>
          <div className="final-delivery-actions"><Button size="S" variant="secondary" onClick={() => router.push(deliveryChatHref(projectId, pending.id))}>Discuss date</Button>
            {canAgree ? <Button size="S" onClick={() => {
              if (agreeDeliveryDate(projectId, pending.id)) setFeedback("New delivery date agreed. Your previous date is saved in delivery history.");
              else setFeedback("This proposal has changed. Please review the latest date before agreeing.");
            }}>Agree new date</Button> : canPropose ? <Button size="S" variant="secondary" onClick={openProposal}>Change proposal</Button> : null}</div>
          {!canAgree && isStaff ? <p className="final-delivery-note label-s">The Client needs to agree before this replaces the current date.</p> : null}
        </> : <div className="final-delivery-actions"><Button size="S" variant="secondary" onClick={() => router.push(deliveryChatHref(projectId))}>Discuss date</Button>
          {canPropose ? <Button size="S" onClick={openProposal}>Propose new date</Button> : null}</div>}
        <p className="final-delivery-feedback label-s" role="status">{feedback}</p>
        <details className="final-delivery-history"><summary className="label-s">Delivery history</summary>
          <div><p className="label-s">Original agreed date: <strong>{formatDeliveryDate(agreement.originalDate)}</strong></p>
            {agreement.proposals.map((proposal) => <article key={proposal.id} className="label-s">
              <strong>{formatDeliveryDate(proposal.date)} · {proposal.status === "agreed" ? "Agreed" : proposal.status === "superseded" ? "Superseded" : "Proposed"}</strong>
              <p>Proposed by {proposal.proposedBy} on {formatDeliveryDate(proposal.proposedAt)}. {proposal.status === "agreed" ? `Agreed by ${proposal.agreedBy} on ${formatDeliveryDate(proposal.agreedAt)}. Previous date: ${formatDeliveryDate(proposal.previousDate)}.` : proposal.status === "superseded" ? "Replaced by a later proposal." : "The agreed date stays unchanged until the Client agrees."}</p>
              <p>{proposal.reason}</p>
            </article>)}
          </div>
        </details>
      </div>
    </section>
    {isProposing && canPropose ? <EditingDialog title="Propose a new delivery date" description="The agreed date stays in place until the Client agrees." onCancel={() => setIsProposing(false)}
      actions={<><Button size="S" variant="secondary" onClick={() => setIsProposing(false)}>Cancel</Button><Button size="S" type="submit" form={formId}>Send proposal</Button></>}>
      <form className="delivery-proposal-form" id={formId} onSubmit={(event) => {
        event.preventDefault();
        const proposed = deliveryInstant(date, time);
        if (!proposed) { setError("Choose a valid date and time in Sydney."); return; }
        if (!proposeDeliveryDate(projectId, proposed, reason)) { setError("Choose a different date or update the reason before sending."); return; }
        setIsProposing(false); setFeedback("Proposal shared in External Chat. The agreed date stays unchanged until the Client agrees.");
      }}>
        <p className="label-s" tabIndex={-1} data-dialog-autofocus>Current agreed date: <strong>{formatDeliveryDate(agreement.agreedDate)}</strong></p>
        <div className="delivery-proposal-fields"><div><span className="label-m-semibold">Proposed date</span>
          <BriskDatePicker ariaLabel="Proposed date" placeholder="Choose date" variant="field" value={date} onChange={setDate} /></div>
          <div><span className="label-m-semibold">Time (Sydney)</span><BriskTimePicker ariaLabel="Time (Sydney)" value={time} onChange={setTime} /></div></div>
        <Textarea label="Reason for the Client" rows={3} value={reason} required onChange={(event) => setReason(event.target.value)} />
        {error ? <p className="delivery-proposal-error label-s" role="alert">{error}</p> : null}
      </form>
    </EditingDialog> : null}
  </main>;
}
