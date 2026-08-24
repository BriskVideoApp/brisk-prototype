"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import {
  ClientInvoicesPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ClientInvoice, ClientInvoiceStatus } from "@/data/client-account-settings";

type InvoiceFilter = "All" | ClientInvoiceStatus;

const invoiceFilters: readonly InvoiceFilter[] = ["All", "Unpaid", "Paid"];

export function ClientInvoicesPage() {
  const { account, markInvoicePaid } = useClientAccountSettings();
  const [filter, setFilter] = useState<InvoiceFilter>("All");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const selectedInvoice = account.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  const checkoutInvoice = account.invoices.find((invoice) => invoice.id === checkoutInvoiceId) ?? null;
  const visibleInvoices = useMemo(() => account.invoices.filter((invoice) => (
    filter === "All" || invoice.status === filter
  )), [account.invoices, filter]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const continueToStripe = () => {
    if (!checkoutInvoice) return;
    markInvoicePaid(checkoutInvoice.id);
    setCheckoutInvoiceId(null);
    setToast(`${checkoutInvoice.number} was marked paid in this prototype.`);
  };

  const managePaymentDetails = () => {
    setToast("Stripe payment details would open here.");
  };

  return (
    <ClientSettingsAccessBoundary requireBilling>
      <ClientInvoicesPageShell>
        <section className="account-invoices-section" aria-label="Invoices">
          <div className="account-invoice-toolbar">
            <Button size="S" variant="secondary" onClick={managePaymentDetails}>Manage payment details</Button>
          </div>

          <div className="account-settings-info-block account-invoice-security-note">
            <DsIcon name="lock" size={18} />
            <p className="paragraph-s">These invoices come from North Star Films’ Stripe account. Stripe handles payments and card details.</p>
          </div>

          <div className="account-invoice-filter" role="group" aria-label="Filter invoices">
            {invoiceFilters.map((option) => (
              <button
                className={`label-s-semibold ${filter === option ? "is-active" : ""}`}
                type="button"
                aria-pressed={filter === option}
                key={option}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="account-invoice-table-frame">
            <table className="account-invoice-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Project</th>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td data-label="Invoice">
                      <button className="account-invoice-number label-s-semibold" type="button" onClick={() => setSelectedInvoiceId(invoice.id)}>
                        {invoice.number}
                      </button>
                      <small className="label-xs">Issued {invoice.issuedOn}</small>
                    </td>
                    <td data-label="Project"><span className="label-s-semibold">{invoice.projectName}</span></td>
                    <td data-label="Due"><span className="label-s">{invoice.dueOn}</span></td>
                    <td data-label="Amount"><strong className="label-m-semibold">{formatInvoiceAmount(invoice)}</strong></td>
                    <td data-label="Status">
                      <span className={`account-invoice-status is-${invoice.status.toLocaleLowerCase("en-AU")} label-xs-semibold`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td data-label="Open">
                      <button className="account-invoice-open" type="button" aria-label={`Open ${invoice.number}`} onClick={() => setSelectedInvoiceId(invoice.id)}>
                        <DsIcon name="caret-right" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedInvoice ? (
          <InvoiceDetailsModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoiceId(null)}
            onDownload={(kind) => {
              downloadInvoiceDocument(selectedInvoice, kind);
              setToast(`${kind === "receipt" ? "Receipt" : "Invoice"} download started.`);
            }}
            onPay={() => {
              setSelectedInvoiceId(null);
              setCheckoutInvoiceId(selectedInvoice.id);
            }}
          />
        ) : null}

        {checkoutInvoice ? (
          <ClientModal
            title={`Pay ${checkoutInvoice.number}`}
            description="Continue to Stripe to pay securely."
            onClose={() => setCheckoutInvoiceId(null)}
            footer={(
              <>
                <Button size="M" variant="secondary" onClick={() => setCheckoutInvoiceId(null)}>Cancel</Button>
                <Button size="M" onClick={continueToStripe}>Continue to Stripe</Button>
              </>
            )}
          >
            <div className="account-invoice-checkout-summary">
              <span><DsIcon name="lock" size={20} /></span>
              <div>
                <strong className="headings-xs-bold">{formatInvoiceAmount(checkoutInvoice)}</strong>
                <p className="paragraph-s">{checkoutInvoice.projectName}</p>
              </div>
            </div>
          </ClientModal>
        ) : null}

        {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
      </ClientInvoicesPageShell>
    </ClientSettingsAccessBoundary>
  );
}

function InvoiceDetailsModal({
  invoice,
  onClose,
  onDownload,
  onPay,
}: {
  invoice: ClientInvoice;
  onClose: () => void;
  onDownload: (kind: "invoice" | "receipt") => void;
  onPay: () => void;
}) {
  return (
    <ClientModal
      title={invoice.number}
      description={invoice.projectName}
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={() => onDownload("invoice")}>Download invoice</Button>
          {invoice.status === "Paid" && invoice.receiptAvailable ? (
            <Button size="M" variant="secondary" onClick={() => onDownload("receipt")}>Download receipt</Button>
          ) : null}
          {invoice.status === "Unpaid" ? <Button size="M" onClick={onPay}>Pay with Stripe</Button> : null}
        </>
      )}
    >
      <dl className="account-invoice-details">
        <div><dt className="label-xs">Amount</dt><dd className="headings-xs-bold">{formatInvoiceAmount(invoice)}</dd></div>
        <div><dt className="label-xs">Status</dt><dd><span className={`account-invoice-status is-${invoice.status.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{invoice.status}</span></dd></div>
        <div><dt className="label-xs">Issued</dt><dd className="label-m-semibold">{invoice.issuedOn}</dd></div>
        <div><dt className="label-xs">Due</dt><dd className="label-m-semibold">{invoice.dueOn}</dd></div>
        {invoice.paidOn ? <div><dt className="label-xs">Paid</dt><dd className="label-m-semibold">{invoice.paidOn}</dd></div> : null}
      </dl>
    </ClientModal>
  );
}

function formatInvoiceAmount(invoice: ClientInvoice) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: invoice.currency,
    minimumFractionDigits: 2,
  }).format(invoice.amountInCents / 100);
}

function downloadInvoiceDocument(invoice: ClientInvoice, kind: "invoice" | "receipt") {
  const lines = [
    kind === "receipt" ? `Receipt for ${invoice.number}` : `Invoice ${invoice.number}`,
    `Project: ${invoice.projectName}`,
    `Amount: ${formatInvoiceAmount(invoice)}`,
    `Issued: ${invoice.issuedOn}`,
    `Due: ${invoice.dueOn}`,
    `Status: ${invoice.status}`,
    ...(invoice.paidOn ? [`Paid: ${invoice.paidOn}`] : []),
    "Issued by North Star Films.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.number.toLocaleLowerCase("en-AU")}-${kind}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
