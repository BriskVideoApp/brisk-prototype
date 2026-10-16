"use client";

import {
  ClientInvoicesPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";

export function ClientInvoicesPage() {
  const { account } = useClientAccountSettings();
  const invoices = account.invoices;

  return (
    <ClientSettingsAccessBoundary requireBilling>
      <ClientInvoicesPageShell>
        <section className="account-invoices-section" aria-label="Invoice history">
          <p className="paragraph-s">See what is due and paid. Contact your Studio about a payment.</p>
          <div className="account-invoice-table-frame">
            <table className="account-invoice-table">
              <thead><tr><th>Invoice</th><th>Project</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td data-label="Invoice"><strong className="label-s-semibold">{invoice.number}</strong></td>
                    <td data-label="Project" className="label-s-semibold">{invoice.projectName}</td>
                    <td data-label="Issued" className="label-s">{invoice.issuedOn}</td>
                    <td data-label="Due" className="label-s">{invoice.dueOn}</td>
                    <td data-label="Amount" className="label-s-semibold">{new Intl.NumberFormat("en-AU", { style: "currency", currency: invoice.currency, maximumFractionDigits: 0 }).format(invoice.amountInCents / 100)}</td>
                    <td data-label="Status"><span className={`account-settings-status-badge label-xs-semibold ${invoice.status === "Paid" ? "is-active" : "is-pending"}`}>{invoice.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </ClientInvoicesPageShell>
    </ClientSettingsAccessBoundary>
  );
}
