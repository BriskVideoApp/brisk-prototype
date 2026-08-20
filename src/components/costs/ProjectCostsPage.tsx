"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { useCostsData } from "@/components/costs/CostsDataContext";
import {
  CreateOfferModal,
  formatCostDate,
  InvoiceReviewModal,
  InvoiceStateSelect,
  OfferStateSelect,
} from "@/components/costs/CostsPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  formatCostAmount,
  invoiceDiffersFromOffer,
  type ContractorInvoice,
  type ContractorInvoiceState,
  type ContractorOffer,
  type ContractorOfferState,
  type CostCurrency,
} from "@/data/costs";

type ReviewState = { forceApproval?: boolean; invoice: ContractorInvoice; step: "review" | "forward" | "send-back" } | null;

export function ProjectCostsPage({ project }: { project: Project }) {
  const router = useRouter();
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const { invoices, markInvoicePaid, offers, resetInvoiceToSubmitted, setOfferState } = useCostsData();
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [offerToRevoke, setOfferToRevoke] = useState<ContractorOffer | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const projectOffers = useMemo(() => offers.filter((offerItem) => offerItem.projectId === project.id), [offers, project.id]);
  const projectInvoices = useMemo(() => invoices.filter((invoiceItem) => invoiceItem.projectId === project.id), [invoices, project.id]);
  const acceptedOffers = projectOffers.filter((offerItem) => offerItem.state === "Accepted");
  const outstandingInvoices = projectInvoices.filter((invoiceItem) => invoiceItem.state !== "Paid");

  useEffect(() => {
    if (hasLoadedRole && selectedRole !== "Studio Staff") router.replace("/active-videos");
  }, [hasLoadedRole, router, selectedRole]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!hasLoadedRole || selectedRole !== "Studio Staff") return null;

  const changeOfferState = (offerItem: ContractorOffer, state: ContractorOfferState) => {
    if (state === offerItem.state) return;
    if (state === "Revoked") {
      setOfferToRevoke(offerItem);
      return;
    }
    setOfferState(offerItem.id, state);
    setToast(`${offerItem.contractorName}'s offer changed to ${state.toLocaleLowerCase("en-AU")}`);
  };

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
            <p className="paragraph-s">Contractor offers and invoices for {project.name}.</p>
          </div>
          <Button size="M" onClick={() => setIsCreatingOffer(true)}><DsIcon name="plus" size={16} />Create offer</Button>
        </header>

        <section className="costs-summary-grid" aria-label="Project cost summary">
          <SummaryCard label="Total contractor cost" value={formatCurrencyTotals(acceptedOffers.map((offerItem) => ({ amount: offerItem.agreedRate, currency: offerItem.currency })))} note={`${acceptedOffers.length} accepted ${acceptedOffers.length === 1 ? "offer" : "offers"}`} />
          <SummaryCard label="Amount awaiting payment" value={formatCurrencyTotals(outstandingInvoices.map((invoiceItem) => ({ amount: invoiceItem.amount, currency: invoiceItem.currency })))} note={`${outstandingInvoices.length} unpaid ${outstandingInvoices.length === 1 ? "invoice" : "invoices"}`} />
          <SummaryCard label="Invoices" value={String(projectInvoices.length)} note={`${projectInvoices.filter((invoiceItem) => invoiceItem.state === "Approved").length} ready to pay`} />
        </section>

        <section className="costs-section" aria-labelledby="project-offers-heading">
          <header className="costs-section-header">
            <div><h2 className="headings-xs-bold" id="project-offers-heading">Contractor offers <span className="costs-heading-count">({projectOffers.length})</span></h2><p className="paragraph-s">Every offer stays linked to this project and contractor.</p></div>
          </header>
          {projectOffers.length ? (
            <div className="costs-table-frame">
              <table className="costs-table costs-offers-table">
                <thead><tr><th>Contractor</th><th>Role</th><th>Agreed rate</th><th>Created</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{projectOffers.map((offerItem) => <tr key={offerItem.id}>
                  <td data-label="Contractor"><Link href={`/people/${offerItem.contractorId}`}><strong className="label-s-semibold">{offerItem.contractorName}</strong></Link></td>
                  <td data-label="Role" className="label-s">{offerItem.role}</td>
                  <td data-label="Agreed rate"><strong className="label-s-semibold">{formatCostAmount(offerItem.agreedRate, offerItem.currency)}</strong><small className="label-xs">{offerItem.currency}</small></td>
                  <td data-label="Created" className="label-s">{formatCostDate(offerItem.createdAt)}</td>
                  <td data-label="Status"><OfferStateSelect offerItem={offerItem} onChange={(state) => changeOfferState(offerItem, state)} /></td>
                  <td data-label="Actions" />
                </tr>)}</tbody>
              </table>
            </div>
          ) : (
            <CostsEmptyState title="No contractor offers yet" body="Create an offer to agree a project rate with a contractor." action="Create offer" onAction={() => setIsCreatingOffer(true)} />
          )}
        </section>

        <section className="costs-section" aria-labelledby="project-invoices-heading">
          <header className="costs-section-header">
            <div><h2 className="headings-xs-bold" id="project-invoices-heading">Contractor invoices <span className="costs-heading-count">({projectInvoices.length})</span></h2><p className="paragraph-s">Review submitted PDFs, approve or send them back, then record payment.</p></div>
          </header>
          {projectInvoices.length ? (
            <div className="costs-table-frame">
              <table className="costs-table costs-invoices-table">
                <thead><tr><th>Invoice</th><th>Contractor</th><th>Total</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
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
                    <td data-label="Invoice"><strong className="label-s-semibold">{invoiceItem.fileNames[0]}</strong><small className="label-xs">{invoiceItem.fileNames.length} {invoiceItem.fileNames.length === 1 ? "PDF" : "PDFs"}{mismatch ? " - differs from offer" : ""}</small></td>
                    <td data-label="Contractor"><Link href={`/people/${invoiceItem.contractorId}`} onClick={(event) => event.stopPropagation()}><strong className="label-s-semibold">{invoiceItem.contractorName}</strong><small className="label-xs">{offerItem.role}</small></Link></td>
                    <td data-label="Total"><strong className="label-s-semibold">{formatCostAmount(invoiceItem.amount, invoiceItem.currency)}</strong>{mismatch ? <span className="costs-mismatch label-xs-semibold"><DsIcon name="alert-triangle" size={14} />Check difference</span> : null}</td>
                    <td data-label="Submitted" className="label-s">{formatCostDate(invoiceItem.submittedAt)}</td>
                    <td data-label="Status" onClick={(event) => event.stopPropagation()}><InvoiceStateSelect invoiceItem={invoiceItem} onChange={(state) => changeInvoiceState(invoiceItem, state)} />{invoiceItem.forwardedTo?.length ? <small className="label-xs">Forwarded to {invoiceItem.forwardedTo.join(", ")}</small> : null}</td>
                    <td data-label="Actions"><InvoiceActions invoiceItem={invoiceItem} onOpenReview={openInvoice} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : (
            <CostsEmptyState title="No invoices submitted" body="Contractors can upload invoice PDFs from My jobs after accepting an offer." />
          )}
        </section>
      </section>

      {isCreatingOffer ? <CreateOfferModal projectId={project.id} onClose={() => setIsCreatingOffer(false)} onCreated={(offerItem) => { setIsCreatingOffer(false); setToast(`Offer sent to ${offerItem.contractorName}`); }} /> : null}
      {offerToRevoke ? <RevokeOfferModal offerItem={offerToRevoke} onClose={() => setOfferToRevoke(null)} onConfirm={() => { setOfferState(offerToRevoke.id, "Revoked"); setOfferToRevoke(null); setToast(`Offer revoked for ${offerToRevoke.contractorName}`); }} /> : null}
      {reviewState ? <InvoiceReviewModal forceApproval={reviewState.forceApproval} initialStep={reviewState.step} invoiceItem={reviewState.invoice} offerItem={projectOffers.find((offerItem) => offerItem.id === reviewState.invoice.offerId) as ContractorOffer} onClose={() => setReviewState(null)} onMarkPaid={() => markInvoicePaid(reviewState.invoice.id)} onUpdated={setToast} /> : null}
      {toast ? <div className="costs-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function InvoiceActions({ invoiceItem, onOpenReview }: { invoiceItem: ContractorInvoice; onOpenReview: () => void }) {
  const label = invoiceItem.state === "Submitted" ? "Review invoice" : invoiceItem.state === "Approved" ? "Manage invoice" : "View details";
  return <button className={`costs-row-action label-s-semibold ${invoiceItem.state === "Submitted" ? "is-primary" : ""}`} type="button" onClick={(event) => { event.stopPropagation(); onOpenReview(); }}>{label}</button>;
}

function RevokeOfferModal({ offerItem, onClose, onConfirm }: { offerItem: ContractorOffer; onClose: () => void; onConfirm: () => void }) {
  return <ClientModal className="billing-confirmation-modal" title={`Revoke offer to ${offerItem.contractorName}?`} onClose={onClose} footer={<><Button size="M" variant="secondary" onClick={onClose}>Keep offer</Button><button className="client-danger-button label-m-semibold" type="button" onClick={onConfirm}>Revoke offer</button></>}>
    <p className="paragraph-s">{offerItem.contractorName} will no longer be able to accept this offer.</p>
  </ClientModal>;
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: string }) {
  return <article className="costs-summary-card"><span className="label-xs-semibold">{label}</span><strong className="headings-s-bold">{value}</strong><small className="label-xs">{note}</small></article>;
}

function CostsEmptyState({ action, body, onAction, title }: { action?: string; body: string; onAction?: () => void; title: string }) {
  return <div className="costs-empty"><span><DsIcon name="file-text" size={24} /></span><h3 className="headings-xs-bold">{title}</h3><p className="paragraph-s">{body}</p>{action && onAction ? <Button size="M" onClick={onAction}>{action}</Button> : null}</div>;
}

function formatCurrencyTotals(items: Array<{ amount: number; currency: CostCurrency }>) {
  if (!items.length) return formatCostAmount(0, "AUD");
  const totals = items.reduce<Partial<Record<CostCurrency, number>>>((current, item) => ({ ...current, [item.currency]: (current[item.currency] ?? 0) + item.amount }), {});
  return Object.entries(totals).map(([currency, amount]) => formatCostAmount(amount ?? 0, currency as CostCurrency)).join(" + ");
}
