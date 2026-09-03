"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { formatCostDate, getInvoiceTagClass, InvoiceReviewModal, InvoiceStateBadge, InvoiceTagBadge } from "@/components/costs/CostsPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Project } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { formatCostAmount, type ContractorInvoice, type ContractorOffer, type CostCurrency, type InvoiceTag } from "@/data/costs";
import { hasStudioAdministrationAccess, prototypeStudioPersonId } from "@/data/people";

type ProjectStatusFilter = "all" | Project["status"];
type ReviewState = { invoice: ContractorInvoice; offer: ContractorOffer } | null;

const projectStatusOptions: Array<{ value: ProjectStatusFilter; label: string }> = [
  { value: "all", label: "All project statuses" },
  { value: "Queued", label: "Queued" },
  { value: "In Production", label: "In production" },
  { value: "Completed", label: "Completed" },
  { value: "Paused", label: "Paused" },
  { value: "Archived", label: "Archived" },
];
const invoiceTags: InvoiceTag[] = ["Urgent", "Disputed", "Follow up", "Waiting"];

export function OutstandingInvoicesPage() {
  const router = useRouter();
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const { people } = usePeople();
  const { invoices, markInvoicePaid, offers } = useCostsData();
  const currentStudioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canViewContractorInvoices = selectedRole === "Studio Staff" && hasStudioAdministrationAccess(currentStudioMember);
  const [projectStatus, setProjectStatus] = useState<ProjectStatusFilter>("all");
  const [selectedTags, setSelectedTags] = useState<InvoiceTag[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (hasLoadedRole && !canViewContractorInvoices) router.replace(selectedRole === "Studio Staff" ? "/today" : "/active-videos");
  }, [canViewContractorInvoices, hasLoadedRole, router, selectedRole]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const outstandingInvoices = useMemo(() => invoices.filter((invoiceItem) => invoiceItem.state !== "Paid").map((invoiceItem) => ({
    invoice: invoiceItem,
    offer: offers.find((offerItem) => offerItem.id === invoiceItem.offerId) ?? null,
    project: activeVideoProjects.find((projectItem) => projectItem.id === invoiceItem.projectId) ?? null,
  })).filter((row): row is { invoice: ContractorInvoice; offer: ContractorOffer; project: Project } => Boolean(row.offer && row.project)), [invoices, offers]);
  const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
  const visibleRows = outstandingInvoices.filter(({ invoice, project }) => {
    if (!includeArchived && project.status === "Archived") return false;
    if (projectStatus !== "all" && project.status !== projectStatus) return false;
    if (selectedTags.length && !selectedTags.some((tag) => invoice.tags.includes(tag))) return false;
    return !normalisedQuery || `${project.name} ${project.clientName} ${invoice.contractorName} ${invoice.fileNames.join(" ")}`.toLocaleLowerCase("en-AU").includes(normalisedQuery);
  });
  const approvedRows = visibleRows.filter(({ invoice }) => invoice.state === "Approved");

  if (!hasLoadedRole || !canViewContractorInvoices) return null;

  const toggleTag = (tag: InvoiceTag) => setSelectedTags((current) => current.includes(tag) ? current.filter((candidate) => candidate !== tag) : [...current, tag]);
  const clearFilters = () => {
    setProjectStatus("all");
    setSelectedTags([]);
    setIncludeArchived(false);
    setQuery("");
  };

  return (
    <main className="outstanding-invoices-page">
      <header className="costs-page-header costs-workspace-header">
        <div>
          <span className="costs-kicker label-xs-semibold">WORKSPACE OWNER</span>
          <h1 className="headings-m-bold">Invoices to pay</h1>
          <p className="paragraph-s">Review contractor invoices across projects and record what has been paid.</p>
        </div>
        <label className="costs-search" htmlFor="outstanding-invoice-search"><DsIcon name="search" size={16} /><span className="sr-only">Search invoices to pay</span><input id="outstanding-invoice-search" type="search" value={query} placeholder="Search invoices" onChange={(event) => setQuery(event.target.value)} /></label>
      </header>

      <section className="costs-summary-grid costs-workspace-summary" aria-label="Invoices to pay summary">
        <SummaryCard label="Outstanding" value={formatCurrencyTotals(visibleRows.map(({ invoice }) => ({ amount: invoice.amount, currency: invoice.currency })))} note={`${visibleRows.length} visible ${visibleRows.length === 1 ? "invoice" : "invoices"}`} />
        <SummaryCard label="Ready to pay" value={formatCurrencyTotals(approvedRows.map(({ invoice }) => ({ amount: invoice.amount, currency: invoice.currency })))} note={`${approvedRows.length} approved`} />
        <SummaryCard label="Needs review" value={String(visibleRows.filter(({ invoice }) => invoice.state === "Submitted").length)} note="Submitted invoices" />
      </section>

      <section className="costs-filter-bar" aria-label="Invoice filters">
        <label className="costs-filter-select"><span className="label-xs-semibold">Project status</span><BriskSelect ariaLabel="Filter by project status" clearable={false} searchable={false} options={projectStatusOptions} placeholder="All project statuses" value={projectStatus} onChange={(value) => setProjectStatus((value || "all") as ProjectStatusFilter)} /></label>
        <div className="costs-tag-filters" role="group" aria-label="Filter by tags">
          <span className="label-xs-semibold">Tags</span>
          <div>{invoiceTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return <button className="costs-filter-chip label-s" type="button" aria-pressed={isSelected} key={tag} onClick={() => toggleTag(tag)}>
              <span className={`filter-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? <DsIcon name="check" size={12} /> : null}</span>
              <span className={`tag-option ${getInvoiceTagClass(tag)}`}>{tag}</span>
            </button>;
          })}</div>
        </div>
        <button className={`costs-archive-toggle label-s-semibold ${includeArchived ? "is-active" : ""}`} type="button" aria-pressed={includeArchived} onClick={() => setIncludeArchived((current) => !current)}><span aria-hidden="true">{includeArchived ? <DsIcon name="check" size={12} /> : null}</span>Include archived projects</button>
        {(projectStatus !== "all" || selectedTags.length || includeArchived || query) ? <button className="costs-text-action label-s-semibold" type="button" onClick={clearFilters}>Clear filters</button> : null}
      </section>

      {visibleRows.length ? (
        <section className="costs-table-frame costs-workspace-table-frame" aria-label="Outstanding contractor invoices">
          <table className="costs-table costs-outstanding-table">
            <thead><tr><th>Project</th><th>Contractor</th><th>Invoice</th><th>Total</th><th>Status</th><th>Tags</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{visibleRows.map(({ invoice, offer, project }) => <tr key={invoice.id}>
              <td data-label="Project"><Link href={`/projects/${project.id}/costs`}><strong className="label-s-semibold">{project.name}</strong><small className="label-xs">{project.clientName} - {project.status}</small></Link></td>
              <td data-label="Contractor"><strong className="label-s-semibold">{invoice.contractorName}</strong><small className="label-xs">{offer.role}</small></td>
              <td data-label="Invoice"><strong className="label-s-semibold">{invoice.fileNames[0]}</strong><small className="label-xs">Submitted {formatCostDate(invoice.submittedAt)}</small></td>
              <td data-label="Total"><strong className="label-s-semibold">{formatCostAmount(invoice.amount, invoice.currency)}</strong></td>
              <td data-label="Status"><InvoiceStateBadge state={invoice.state} /></td>
              <td data-label="Tags"><span className="costs-tags">{invoice.tags.map((tag) => <InvoiceTagBadge key={tag} tag={tag} />)}</span></td>
              <td data-label="Actions">{invoice.state === "Submitted" ? <button className="costs-row-action label-s-semibold" type="button" onClick={() => setReviewState({ invoice, offer })}>Review</button> : invoice.state === "Approved" ? <button className="costs-row-action label-s-semibold" type="button" onClick={() => { markInvoicePaid(invoice.id); setToast(`${invoice.fileNames[0]} marked as paid`); }}>Mark paid</button> : <Link className="costs-text-action label-s-semibold" href={`/projects/${project.id}/costs`}>View project costs</Link>}</td>
            </tr>)}</tbody>
          </table>
        </section>
      ) : (
        <section className="costs-empty costs-workspace-empty"><span><DsIcon name="file-text" size={24} /></span><h2 className="headings-xs-bold">No invoices match these filters</h2><p className="paragraph-s">Try another project status or tag.</p><button className="costs-row-action label-s-semibold" type="button" onClick={clearFilters}>Clear filters</button></section>
      )}

      {reviewState ? <InvoiceReviewModal invoiceItem={reviewState.invoice} offerItem={reviewState.offer} onClose={() => setReviewState(null)} onMarkPaid={() => markInvoicePaid(reviewState.invoice.id)} onUpdated={setToast} /> : null}
      {toast ? <div className="costs-toast" role="status"><DsIcon name="check-circle" size={16} /><span className="label-s-semibold">{toast}</span></div> : null}
    </main>
  );
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: string }) {
  return <article className="costs-summary-card"><span className="label-xs-semibold">{label}</span><strong className="headings-s-bold">{value}</strong><small className="label-xs">{note}</small></article>;
}

function formatCurrencyTotals(items: Array<{ amount: number; currency: CostCurrency }>) {
  if (!items.length) return formatCostAmount(0, "AUD");
  const totals = items.reduce<Partial<Record<CostCurrency, number>>>((current, item) => ({ ...current, [item.currency]: (current[item.currency] ?? 0) + item.amount }), {});
  return Object.entries(totals).map(([currency, amount]) => formatCostAmount(amount ?? 0, currency as CostCurrency)).join(" + ");
}
