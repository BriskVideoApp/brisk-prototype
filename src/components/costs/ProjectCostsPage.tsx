"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/components/active-videos/types";
import { useCostsData } from "@/components/costs/CostsDataContext";
import {
  formatCostDate,
  InvoiceReviewModal,
  InvoiceStateSelect,
  OfferStateBadge,
} from "@/components/costs/CostsPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  invoiceDiffersFromOffer,
  type ContractorInvoice,
  type ContractorInvoiceState,
  type ContractorOffer,
  type CostCurrency,
} from "@/data/costs";

type ReviewState = { forceApproval?: boolean; invoice: ContractorInvoice; step: "review" | "forward" | "send-back" } | null;

export function ProjectCostsPage({ project }: { project: Project }) {
  const router = useRouter();
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const { invoices, markInvoicePaid, offers, resetInvoiceToSubmitted } = useCostsData();
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const projectOffers = useMemo(() => offers.filter((offerItem) => offerItem.projectId === project.id), [offers, project.id]);
  const projectInvoices = useMemo(() => invoices.filter((invoiceItem) => invoiceItem.projectId === project.id), [invoices, project.id]);
  const acceptedOffers = projectOffers.filter((offerItem) => offerItem.state === "Accepted");
  const readyToPayInvoices = projectInvoices.filter((invoiceItem) => invoiceItem.state === "Approved");
  const fallbackCurrency = acceptedOffers[0]?.currency ?? projectInvoices[0]?.currency ?? "AUD";

  useEffect(() => {
    if (hasLoadedRole && selectedRole !== "Studio Staff") router.replace("/active-videos");
  }, [hasLoadedRole, router, selectedRole]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!hasLoadedRole || selectedRole !== "Studio Staff") return null;

  const changeInvoiceState = (invoiceItem: ContractorInvoice, state: ContractorInvoiceState) => {
    if (state === invoiceItem.state) return;
    if (state === "Approved") {
      setReviewState({ forceApproval: true, invoice: invoiceItem, step: "review" });
      return;
    }
    if (state === "Sent back") {
      setReviewState({ invoice: invoiceItem, step: "send-back" });
      return;
    }
    if (state === "Paid") markInvoicePaid(invoiceItem.id);
    else resetInvoiceToSubmitted(invoiceItem.id);
    setToast(`${invoiceItem.fileNames[0]} changed to ${state.toLocaleLowerCase("en-AU")}`);
  };

  return (
    <main className="project-costs-shell">
      <ProjectStageHeader activeUtility="costs" project={project} />
      <section className="project-costs-content" aria-labelledby="project-costs-heading">
        <header className="costs-page-header">
          <div>
            <span className="costs-kicker label-xs-semibold">PROJECT</span>
            <h1 className="headings-m-bold" id="project-costs-heading">Costs</h1>
            <p className="paragraph-s">See what you agreed to pay, review invoices and mark them as paid.</p>
          </div>
          <Link className="costs-text-action label-s-semibold" href={`/projects/${project.id}`}>Manage offers</Link>
        </header>

        <section className="costs-summary-grid" aria-label="Project cost summary">
          <SummaryCard
            label="Agreed cost"
            value={formatCurrencyTotals(acceptedOffers.map((offerItem) => ({ amount: offerItem.agreedRate, currency: offerItem.currency })), fallbackCurrency)}
            note={`${acceptedOffers.length} accepted ${acceptedOffers.length === 1 ? "offer" : "offers"}`}
          />
          <SummaryCard
            label="Invoice received"
            value={formatCurrencyTotals(projectInvoices.map((invoiceItem) => ({ amount: invoiceItem.amount, currency: invoiceItem.currency })), fallbackCurrency)}
            note={describeInvoiceVariance(acceptedOffers, projectInvoices)}
          />
          <SummaryCard
            label="Ready to pay"
            value={formatCurrencyTotals(readyToPayInvoices.map((invoiceItem) => ({ amount: invoiceItem.amount, currency: invoiceItem.currency })), fallbackCurrency)}
            note={readyToPayInvoices.length ? `${readyToPayInvoices.length} approved ${readyToPayInvoices.length === 1 ? "invoice" : "invoices"}` : "No approved invoices"}
          />
        </section>

        <section className="costs-section" aria-labelledby="project-offers-heading">
          <header className="costs-section-header">
            <div>
              <h2 className="headings-xs-bold" id="project-offers-heading">Agreed costs</h2>
              <p className="paragraph-s">Accepted offers for this project. Manage offers from the Team panel.</p>
            </div>
          </header>
          {acceptedOffers.length ? (
            <div className="costs-table-frame">
              <table className="costs-table costs-offers-table">
                <thead><tr><th>Contractor</th><th>Role</th><th>Agreed amount</th><th>Accepted on</th><th>Status</th></tr></thead>
                <tbody>{acceptedOffers.map((offerItem) => <tr key={offerItem.id}>
                  <td data-label="Contractor"><Link href={`/people/${offerItem.contractorId}`}><strong className="label-s-semibold">{offerItem.contractorName}</strong></Link></td>
                  <td data-label="Role" className="label-s">{offerItem.role}</td>
                  <td data-label="Agreed amount"><strong className="label-s-semibold">{formatCostCodeAmount(offerItem.agreedRate, offerItem.currency)}</strong></td>
                  <td data-label="Accepted on" className="label-s">{formatCostDate(offerItem.respondedAt ?? offerItem.createdAt)}</td>
                  <td data-label="Status"><OfferStateBadge state={offerItem.state} /></td>
                </tr>)}</tbody>
              </table>
            </div>
          ) : (
            <CostsEmptyState
              title="No contractor costs yet"
              body="Assign a Freelancer and send an offer from the video's Team panel."
              action="Open Team panel"
              actionHref={`/projects/${project.id}`}
            />
          )}
        </section>

        <section className="costs-section" aria-labelledby="project-invoices-heading">
          <header className="costs-section-header">
            <div>
              <h2 className="headings-xs-bold" id="project-invoices-heading">Contractor invoices</h2>
              <p className="paragraph-s">Compare each invoice with the agreed cost. Approve it, send it back or mark it as paid.</p>
            </div>
          </header>
          {projectInvoices.length ? (
            <div className="costs-table-frame">
              <table className="costs-table costs-invoices-table">
                <thead><tr><th>Invoice</th><th>Contractor</th><th>Invoice amount</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{projectInvoices.map((invoiceItem) => {
                  const offerItem = projectOffers.find((candidate) => candidate.id === invoiceItem.offerId);
                  if (!offerItem) return null;
                  const mismatch = invoiceDiffersFromOffer(invoiceItem, offerItem);
                  const openInvoice = () => setReviewState({ invoice: invoiceItem, step: "review" });
                  return <tr
                    className="costs-invoice-row"
                    key={invoiceItem.id}
                    tabIndex={0}
                    aria-label={`Open ${invoiceItem.fileNames[0]}`}
                    onClick={openInvoice}
                    onKeyDown={(event) => {
                      if (event.currentTarget !== event.target || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      openInvoice();
                    }}
                  >
                    <td data-label="Invoice"><strong className="label-s-semibold">{invoiceItem.fileNames[0]}</strong>{invoiceItem.fileNames.length > 1 ? <small className="label-xs">{invoiceItem.fileNames.length} PDFs</small> : null}</td>
                    <td data-label="Contractor"><Link href={`/people/${invoiceItem.contractorId}`} onClick={(event) => event.stopPropagation()}><strong className="label-s-semibold">{invoiceItem.contractorName}</strong></Link></td>
                    <td data-label="Invoice amount"><strong className="label-s-semibold">{formatCostCodeAmount(invoiceItem.amount, invoiceItem.currency)}</strong>{mismatch ? <span className="costs-mismatch label-xs-semibold"><DsIcon name="alert-triangle" size={14} />{describeInvoiceDifference(invoiceItem, offerItem)}</span> : null}</td>
                    <td data-label="Received" className="label-s">{formatCostDate(invoiceItem.submittedAt)}</td>
                    <td data-label="Status" onClick={(event) => event.stopPropagation()}><InvoiceStateSelect invoiceItem={invoiceItem} onChange={(state) => changeInvoiceState(invoiceItem, state)} />{invoiceItem.forwardedTo?.length ? <small className="label-xs">Forwarded to {invoiceItem.forwardedTo.join(", ")}</small> : null}</td>
                    <td data-label="Actions"><InvoiceActions invoiceItem={invoiceItem} onOpenReview={openInvoice} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : (
            <CostsEmptyState title="No invoices yet" body="Accepted Freelancers can upload invoices for this project." />
          )}
        </section>
      </section>

      {reviewState ? <InvoiceReviewModal forceApproval={reviewState.forceApproval} initialStep={reviewState.step} invoiceItem={reviewState.invoice} offerItem={projectOffers.find((offerItem) => offerItem.id === reviewState.invoice.offerId) as ContractorOffer} onClose={() => setReviewState(null)} onMarkPaid={() => markInvoicePaid(reviewState.invoice.id)} onUpdated={setToast} /> : null}
      {toast ? <div className="costs-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function InvoiceActions({ invoiceItem, onOpenReview }: { invoiceItem: ContractorInvoice; onOpenReview: () => void }) {
  const label = invoiceItem.state === "Approved" ? "Manage invoice" : "Review invoice";
  return <button className={`costs-row-action label-s-semibold ${invoiceItem.state === "Submitted" ? "is-primary" : ""}`} type="button" onClick={(event) => { event.stopPropagation(); onOpenReview(); }}>{label}</button>;
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: string }) {
  return <article className="costs-summary-card"><span className="label-xs-semibold">{label}</span><strong className="headings-s-bold">{value}</strong><small className="label-xs">{note}</small></article>;
}

function CostsEmptyState({ action, actionHref, body, title }: { action?: string; actionHref?: string; body: string; title: string }) {
  return <div className="costs-empty"><span><DsIcon name="file-text" size={24} /></span><h3 className="headings-xs-bold">{title}</h3><p className="paragraph-s">{body}</p>{action && actionHref ? <Link className="costs-row-action is-primary label-s-semibold" href={actionHref}>{action}</Link> : null}</div>;
}

function formatCostCodeAmount(amount: number, currency: CostCurrency) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function formatCurrencyTotals(items: Array<{ amount: number; currency: CostCurrency }>, fallbackCurrency: CostCurrency) {
  if (!items.length) return formatCostCodeAmount(0, fallbackCurrency);
  const totals = items.reduce<Partial<Record<CostCurrency, number>>>((current, item) => ({ ...current, [item.currency]: (current[item.currency] ?? 0) + item.amount }), {});
  return Object.entries(totals).map(([currency, amount]) => formatCostCodeAmount(amount ?? 0, currency as CostCurrency)).join(" + ");
}

function describeInvoiceVariance(offers: ContractorOffer[], invoices: ContractorInvoice[]) {
  if (!invoices.length) return "No invoices yet";
  const agreedTotals = getCurrencyTotals(offers.map((offerItem) => ({ amount: offerItem.agreedRate, currency: offerItem.currency })));
  const invoiceTotals = getCurrencyTotals(invoices.map((invoiceItem) => ({ amount: invoiceItem.amount, currency: invoiceItem.currency })));
  const currencies = Array.from(new Set([...Object.keys(agreedTotals), ...Object.keys(invoiceTotals)])) as CostCurrency[];
  if (currencies.length !== 1) return "Compared with accepted offers";
  const currency = currencies[0];
  const difference = (invoiceTotals[currency] ?? 0) - (agreedTotals[currency] ?? 0);
  if (difference > 0) return `${formatCostCodeAmount(difference, currency)} more than agreed`;
  if (difference < 0) return `${formatCostCodeAmount(Math.abs(difference), currency)} less than agreed`;
  return "Matches the agreed cost";
}

function describeInvoiceDifference(invoiceItem: ContractorInvoice, offerItem: ContractorOffer) {
  if (invoiceItem.currency !== offerItem.currency) return `${invoiceItem.currency} instead of ${offerItem.currency}`;
  const difference = invoiceItem.amount - offerItem.agreedRate;
  if (difference > 0) return `${formatCostCodeAmount(difference, invoiceItem.currency)} more than agreed`;
  return `${formatCostCodeAmount(Math.abs(difference), invoiceItem.currency)} less than agreed`;
}

function getCurrencyTotals(items: Array<{ amount: number; currency: CostCurrency }>) {
  return items.reduce<Partial<Record<CostCurrency, number>>>((current, item) => ({ ...current, [item.currency]: (current[item.currency] ?? 0) + item.amount }), {});
}
