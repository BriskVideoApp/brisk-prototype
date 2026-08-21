"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { NotificationSemanticState } from "@/components/notifications/NotificationSemanticState";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  emailDeliveryCases,
  emailSuppressionDecisions,
  getEmailDeliveryCase,
  type EmailDeliveryAttempt,
  type EmailDeliveryAttemptStatus,
  type EmailDeliveryCase,
  type EmailDeliveryCaseState,
  type EmailDeliveryFilter,
  type EmailReminderState,
} from "@/data/email-delivery";

const filters = [
  { id: "all", label: "All" },
  { id: "reviews", label: "Review requests" },
  { id: "reminders", label: "Reminders" },
  { id: "failures", label: "Failures" },
] as const satisfies readonly { id: EmailDeliveryFilter; label: string }[];

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Sydney",
});

export function EmailDeliveryPage() {
  const { selectedRole } = usePrototypeRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDelivery = getEmailDeliveryCase(searchParams.get("delivery"));
  const [filter, setFilter] = useState<EmailDeliveryFilter>("all");
  const [retryRequestedFor, setRetryRequestedFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const visibleCases = useMemo(
    () => emailDeliveryCases
      .filter((deliveryCase) => matchesFilter(deliveryCase, filter))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)),
    [filter],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (selectedRole !== "Studio Staff") {
    return (
      <main className="email-delivery-permission-state">
        <span className="email-delivery-permission-icon"><DsIcon name="lock" size={28} /></span>
        <span className="label-xs-semibold">Development QA only</span>
        <h1 className="headings-s-bold">Delivery diagnostics are hidden in this role preview</h1>
        <p className="paragraph-s">This local fixture console is not part of Brisk V1. Switch the prototype to Studio Staff only when testing delivery behaviour.</p>
        <Link className="notifications-primary-link label-s-semibold" href="/notifications">Open your notifications</Link>
      </main>
    );
  }

  const selectDelivery = (deliveryCase: EmailDeliveryCase) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("delivery", deliveryCase.id);
    router.replace(`/notifications/delivery?${nextParams.toString()}`);
  };

  const requestRetry = () => {
    setRetryRequestedFor(selectedDelivery.id);
    setToast("Retry requested. The canonical event and inbox item were retained.");
  };

  return (
    <main className="email-delivery-page" aria-label="Development-only email delivery diagnostics">
      <header className="email-delivery-header">
        <div className="email-delivery-header-inner">
          <div>
            <span className="label-xs-semibold">DEVELOPMENT QA ONLY</span>
            <h1 className="headings-m-bold">Email delivery diagnostics</h1>
            <p className="paragraph-s">Local fixtures for checking transactional delivery behaviour. This is not a V1 product surface.</p>
          </div>
          <Link className="email-delivery-back-link label-s-semibold" href="/notifications">
            <DsIcon name="arrow-left" size={16} />
            Notifications
          </Link>
        </div>
      </header>

      <div className="email-delivery-content">
        <section className="email-delivery-policy" aria-label="Development-only fixture notice">
          <span className="email-delivery-policy-icon"><DsIcon name="envelope-simple" size={22} /></span>
          <div>
            <strong className="label-m-semibold">Diagnostic fixture console</strong>
            <p className="paragraph-s">Available in local development only. Product users see simple contextual email states, never provider or deduplication details.</p>
          </div>
          <div className="email-delivery-policy-channels">
            <span className="label-xs-semibold"><DsIcon name="lock" size={14} />Local only</span>
            <span className="label-xs-semibold"><DsIcon name="eye-slash" size={14} />Not user-facing</span>
          </div>
        </section>

        <section className="email-delivery-summary" aria-label="Delivery summary">
          <SummaryCard label="Delivery families" value={emailDeliveryCases.length} detail="One per event and recipient" icon="envelope-simple" />
          <SummaryCard label="Delivered" value={emailDeliveryCases.filter((item) => item.state === "delivered" || item.state === "action-completed").length} detail="Provider-confirmed" icon="check-circle" />
          <SummaryCard label="Reminder due" value={emailDeliveryCases.filter((item) => item.state === "reminder-due").length} detail="Action still open" icon="clock-clockwise" />
          <SummaryCard label="Needs attention" value={emailDeliveryCases.filter((item) => item.state === "failed").length} detail="Retries exhausted" icon="alert-triangle" />
        </section>

        <nav className="email-delivery-filters" aria-label="Email delivery filters">
          {filters.map((item) => {
            const count = emailDeliveryCases.filter((deliveryCase) => matchesFilter(deliveryCase, item.id)).length;
            return (
              <button
                className={`label-s-semibold ${filter === item.id ? "is-active" : ""}`}
                type="button"
                aria-current={filter === item.id ? "page" : undefined}
                key={item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}<span className="label-xs">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="email-delivery-workspace">
          <section className="email-delivery-list-panel" aria-label="Email delivery requests">
            <div className="email-delivery-list-heading">
              <h2 className="headings-xs-bold">Delivery families</h2>
              <span className="label-xs">Newest first</span>
            </div>
            <div className="email-delivery-list">
              {visibleCases.map((deliveryCase) => (
                <button
                  className={`email-delivery-row ${selectedDelivery.id === deliveryCase.id ? "is-selected" : ""}`}
                  type="button"
                  key={deliveryCase.id}
                  onClick={() => selectDelivery(deliveryCase)}
                >
                  <DeliveryState state={deliveryCase.state} compact />
                  <span className="email-delivery-row-copy">
                    <strong className="label-s-semibold">{deliveryCase.subject}</strong>
                    <span className="label-xs">{deliveryCase.recipient.name} · {deliveryCase.project?.code ?? "Workspace"}</span>
                    <time className="label-xs" dateTime={deliveryCase.occurredAt}>{dateFormatter.format(new Date(deliveryCase.occurredAt))}</time>
                  </span>
                  <span className="email-delivery-row-attempts label-xs-semibold">{getAttemptCount(deliveryCase, retryRequestedFor)} attempt{getAttemptCount(deliveryCase, retryRequestedFor) === 1 ? "" : "s"}</span>
                  <DsIcon name="caret-right" size={16} />
                </button>
              ))}
            </div>
          </section>

          <DeliveryDetail
            deliveryCase={selectedDelivery}
            retryRequested={retryRequestedFor === selectedDelivery.id}
            onRetry={requestRetry}
          />
        </div>

        <section className="email-delivery-suppression" aria-labelledby="email-suppression-heading">
          <div className="email-delivery-section-heading">
            <div>
              <span className="label-xs-semibold">SUPPRESSION</span>
              <h2 className="headings-xs-bold" id="email-suppression-heading">Email that was intentionally not requested</h2>
            </div>
            <span className="email-delivery-boundary label-xs-semibold">Reply ingestion stays in Chat connectors</span>
          </div>
          <div className="email-delivery-suppression-list">
            {emailSuppressionDecisions.map((decision) => (
              <article key={decision.id}>
                <span className="email-delivery-suppression-icon"><DsIcon name="eye-slash" size={16} /></span>
                <span><strong className="label-s-semibold">{decision.event}</strong><small className="label-xs">{decision.reason}</small></span>
                <span className="label-xs-semibold">{decision.outcome}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      {toast ? <div className="email-delivery-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </main>
  );
}

function DeliveryDetail({
  deliveryCase,
  retryRequested,
  onRetry,
}: {
  deliveryCase: EmailDeliveryCase;
  retryRequested: boolean;
  onRetry: () => void;
}) {
  const primaryRequest = deliveryCase.requests[0];
  const attempts: readonly EmailDeliveryAttempt[] = retryRequested
    ? [...primaryRequest.attempts, {
        id: `${primaryRequest.id}-retry-preview`,
        attemptNumber: primaryRequest.attempts.length + 1,
        status: "requested",
        requestedAt: "2026-08-20T17:35:00+10:00",
        resolvedAt: null,
        providerReference: null,
        failureReason: null,
      }]
    : primaryRequest.attempts;

  return (
    <aside className="email-delivery-detail" aria-label={`Delivery details for ${deliveryCase.subject}`}>
      <header className="email-delivery-detail-header">
        <div>
          <DeliveryState state={retryRequested ? "reminder-due" : deliveryCase.state} />
          <h2 className="headings-xs-bold">{deliveryCase.subject}</h2>
          <p className="label-s">{deliveryCase.recipient.name} · {primaryRequest.destination}</p>
        </div>
        {deliveryCase.state === "failed" ? (
          <Button size="M" variant="secondary" onClick={retryRequested ? undefined : onRetry}>
            <span className="notifications-button-content"><DsIcon name="arrows-clockwise" size={16} />{retryRequested ? "Retry requested" : "Retry email"}</span>
          </Button>
        ) : null}
      </header>

      <section className="email-delivery-outcome-pair" aria-labelledby="delivery-outcome-heading">
        <h3 className="label-m-semibold" id="delivery-outcome-heading">One event, separate outcomes</h3>
        <div>
          <article><span><DsIcon name="bell" size={18} /></span><small className="label-xs">In-app outcome</small><strong className="label-s-semibold">{deliveryCase.inAppOutcome}</strong></article>
          <article><span><DsIcon name="envelope-simple" size={18} /></span><small className="label-xs">Email outcome</small><strong className="label-s-semibold">One delivery request</strong></article>
        </div>
        <p className="label-xs"><DsIcon name="link" size={14} />Canonical event {deliveryCase.canonicalEventId}</p>
      </section>

      <section className="email-delivery-detail-section">
        <div className="email-delivery-detail-section-heading">
          <h3 className="label-m-semibold">Safe request</h3>
          <span className="label-xs-semibold">{deliveryCase.privacy}</span>
        </div>
        <dl className="email-delivery-request-meta">
          <div><dt className="label-xs">Template</dt><dd className="label-s-semibold">{primaryRequest.templateKey} · v{primaryRequest.templateVersion}</dd></div>
          <div><dt className="label-xs">Idempotency</dt><dd className="label-xs">{primaryRequest.idempotencyKey}</dd></div>
        </dl>
        <dl className="email-delivery-safe-payload">
          {deliveryCase.safePayload.map((field) => <div key={field.label}><dt className="label-xs">{field.label}</dt><dd className="label-s-semibold">{field.value}</dd></div>)}
        </dl>
      </section>

      <section className="email-delivery-detail-section">
        <div className="email-delivery-detail-section-heading">
          <h3 className="label-m-semibold">Provider attempts</h3>
          <span className="label-xs-semibold">{attempts.length} total</span>
        </div>
        <ol className="email-delivery-attempts">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <span className={`email-delivery-attempt-marker is-${attempt.status}`}><DsIcon name={getAttemptIcon(attempt.status)} size={14} /></span>
              <span>
                <strong className="label-s-semibold">Attempt {attempt.attemptNumber} · {formatAttemptStatus(attempt.status)}</strong>
                <small className="label-xs">Requested {dateFormatter.format(new Date(attempt.requestedAt))}{attempt.resolvedAt ? ` · Resolved ${dateFormatter.format(new Date(attempt.resolvedAt))}` : ""}</small>
                {attempt.providerReference ? <small className="label-xs">Provider reference {attempt.providerReference}</small> : null}
                {attempt.failureReason ? <small className="label-xs is-failure">{attempt.failureReason}</small> : null}
              </span>
            </li>
          ))}
        </ol>
        <div className="email-delivery-dedupe-note">
          <DsIcon name="checks" size={16} />
          <span className="label-xs">{deliveryCase.canonicalEventId} remains one event. {deliveryCase.failureInboxItemId ? `Failure outcome ${deliveryCase.failureInboxItemId} remains one inbox item.` : "No extra inbox item was created."}</span>
        </div>
      </section>

      {deliveryCase.reminders.length ? (
        <section className="email-delivery-detail-section">
          <div className="email-delivery-detail-section-heading"><h3 className="label-m-semibold">Reminder plan</h3><span className="label-xs-semibold">24h + optional 48h</span></div>
          <ol className="email-delivery-reminders">
            {deliveryCase.reminders.map((reminder) => (
              <li key={reminder.id}>
                <span className={`email-delivery-reminder-state is-${reminder.state}`}><DsIcon name={getReminderIcon(reminder.state)} size={15} /></span>
                <span><strong className="label-s-semibold">{reminder.label}</strong><small className="label-xs">{dateFormatter.format(new Date(reminder.scheduledFor))} · {formatReminderState(reminder.state)}</small><small className="label-xs">{reminder.reason}</small></span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {deliveryCase.grouping ? (
        <section className="email-delivery-detail-section">
          <div className="email-delivery-detail-section-heading"><h3 className="label-m-semibold">Grouped summary</h3><span className="label-xs-semibold">{deliveryCase.grouping.windowMinutes || "One"}{deliveryCase.grouping.windowMinutes ? " min" : " workflow"}</span></div>
          <p className="label-s">{deliveryCase.grouping.label} · {deliveryCase.grouping.groupedCount} source updates</p>
          <ul className="email-delivery-previews">
            {deliveryCase.grouping.previews.slice(0, 2).map((preview) => <li className="label-xs" key={preview}>{preview}</li>)}
          </ul>
          {deliveryCase.grouping.groupedCount > 2 ? <span className="email-delivery-more label-xs-semibold">+ {deliveryCase.grouping.groupedCount - 2} more</span> : null}
        </section>
      ) : null}

      <section className="email-delivery-policy-decisions">
        <p className="label-xs"><DsIcon name="clock-clockwise" size={14} /><span><strong>Quiet hours</strong>{deliveryCase.quietHoursDecision}</span></p>
        <p className="label-xs"><DsIcon name="bell" size={14} /><span><strong>Project mute</strong>{deliveryCase.projectMuteDecision}</span></p>
      </section>
    </aside>
  );
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: "envelope-simple" | "check-circle" | "clock-clockwise" | "alert-triangle" }) {
  return <article><span className="email-delivery-summary-icon"><DsIcon name={icon} size={18} /></span><span><small className="label-xs">{label}</small><strong className="headings-xs-bold">{value}</strong><small className="label-xs">{detail}</small></span></article>;
}

function DeliveryState({ state, compact = false }: { state: EmailDeliveryCaseState; compact?: boolean }) {
  const semantic = state === "failed"
    ? { state: "failure" as const, label: "Failed" as const, copy: "Retries exhausted" }
    : state === "reminder-due"
      ? { state: "warning" as const, label: "Needs attention" as const, copy: "Reminder due" }
      : { state: "success" as const, label: "Completed" as const, copy: state === "action-completed" ? "Action completed" : "Delivered" };

  return <span className="email-delivery-state"><NotificationSemanticState state={semantic.state} label={semantic.label} compact={compact} /><small className="label-xs">{semantic.copy}</small></span>;
}

function matchesFilter(deliveryCase: EmailDeliveryCase, filter: EmailDeliveryFilter) {
  if (filter === "reviews") return deliveryCase.eventKey === "stage.review_requested";
  if (filter === "reminders") return deliveryCase.reminders.length > 0;
  if (filter === "failures") return deliveryCase.state === "failed";
  return true;
}

function getAttemptCount(deliveryCase: EmailDeliveryCase, retryRequestedFor: string | null) {
  return deliveryCase.requests.reduce((total, request) => total + request.attempts.length, 0) + (retryRequestedFor === deliveryCase.id ? 1 : 0);
}

function getAttemptIcon(status: EmailDeliveryAttemptStatus) {
  if (status === "delivered") return "check-circle" as const;
  if (status === "failed" || status === "bounced") return "x-close-cross" as const;
  if (status === "sent") return "paper-plane-tilt" as const;
  return "clock-clockwise" as const;
}

function formatAttemptStatus(status: EmailDeliveryAttemptStatus) {
  if (status === "bounced") return "Bounced";
  if (status === "failed") return "Failed";
  if (status === "delivered") return "Delivered";
  if (status === "sent") return "Sent";
  return "Requested";
}

function getReminderIcon(state: EmailReminderState) {
  if (state === "scheduled") return "clock-clockwise" as const;
  if (state === "sent") return "paper-plane-tilt" as const;
  return "check-circle" as const;
}

function formatReminderState(state: EmailReminderState) {
  if (state === "scheduled") return "Scheduled";
  if (state === "sent") return "Sent";
  if (state === "stopped-action-completed") return "Stopped after action completed";
  return "Not requested";
}
