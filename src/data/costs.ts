export type CostCurrency = "AUD" | "USD" | "NZD" | "GBP";

export type ContractorOfferState = "Pending" | "Accepted" | "Declined" | "Revoked";

export type ContractorInvoiceState = "Submitted" | "Approved" | "Sent back" | "Paid";

export type InvoiceTag = "Urgent" | "Disputed" | "Follow up" | "Waiting";

export type ContractorOffer = {
  id: string;
  projectId: string;
  contractorId: string;
  contractorName: string;
  role: string;
  agreedRate: number;
  currency: CostCurrency;
  state: ContractorOfferState;
  createdAt: string;
  respondedAt?: string;
};

export type ContractorInvoice = {
  id: string;
  offerId: string;
  projectId: string;
  contractorId: string;
  contractorName: string;
  fileNames: string[];
  amount: number;
  currency: CostCurrency;
  state: ContractorInvoiceState;
  submittedAt: string;
  contractorNote?: string;
  approvalNote?: string;
  sendBackReason?: string;
  approvedAt?: string;
  paidAt?: string;
  forwardedTo?: string[];
  forwardedAt?: string;
  tags: InvoiceTag[];
};

export type InvoiceForwardingDestination = {
  id: "xero" | "hubdoc" | "accounts";
  label: string;
  email: string;
};

export const invoiceForwardingDestinations: readonly InvoiceForwardingDestination[] = [
  { id: "xero", label: "Xero bills", email: "bills@northstarfilms.xero.com" },
  { id: "hubdoc", label: "Hubdoc", email: "northstar@app.hubdoc.com" },
  { id: "accounts", label: "Accounts", email: "accounts@northstarfilms.com" },
] as const;

export const initialContractorOffers: ContractorOffer[] = [
  offer("offer-loom-jl", "loom-launch-film", "jl", "Jordan Lee", "Shooter", 950, "AUD", "Pending", "2026-08-18T09:20:00+10:00"),
  offer("offer-loom-ct", "loom-launch-film", "ct", "Chris Taylor", "Editor", 1800, "AUD", "Accepted", "2026-08-01T10:00:00+10:00", "2026-08-02T08:45:00+10:00"),
  offer("offer-loom-ak", "loom-launch-film", "ak", "Aisha Khan", "Colourist", 880, "AUD", "Accepted", "2026-08-03T14:10:00+10:00", "2026-08-03T15:02:00+10:00"),
  offer("offer-deel-jl", "deel-customer-story", "jl", "Jordan Lee", "Shooter", 1140, "AUD", "Accepted", "2026-07-23T11:20:00+10:00", "2026-07-23T13:15:00+10:00"),
  offer("offer-hims-ed", "hims-product-education", "ed", "Emma Davis", "Animator", 920, "AUD", "Accepted", "2026-07-28T09:30:00+10:00", "2026-07-28T11:10:00+10:00"),
  offer("offer-notion-ct", "notion-workflows", "ct", "Chris Taylor", "Editor", 2040, "USD", "Accepted", "2026-07-02T15:00:00+10:00", "2026-07-03T08:30:00+10:00"),
  offer("offer-openai-ak", "openai-partner-update", "ak", "Aisha Khan", "Colourist", 1760, "AUD", "Accepted", "2026-06-20T10:25:00+10:00", "2026-06-20T11:00:00+10:00"),
  offer("offer-posthog-ak", "posthog-onboarding", "ak", "Aisha Khan", "Colourist", 1320, "AUD", "Accepted", "2026-05-10T09:45:00+10:00", "2026-05-10T10:20:00+10:00"),
  offer("offer-ramp-jl", "ramp-finance-recap", "jl", "Jordan Lee", "Shooter", 950, "AUD", "Revoked", "2026-08-08T12:00:00+10:00", "2026-08-09T13:40:00+10:00"),
  offer("offer-canva-ed", "canva-brand-refresh", "ed", "Emma Davis", "Animator", 1600, "AUD", "Pending", "2026-08-17T15:10:00+10:00"),
  offer("offer-linear-jl", "linear-roadmap-film", "jl", "Jordan Lee", "Shooter", 2280, "AUD", "Accepted", "2026-07-10T10:15:00+10:00", "2026-07-10T12:40:00+10:00"),
  offer("offer-figma-np", "figma-config-highlights", "np", "Nina Patel", "VFX Artist", 1800, "NZD", "Accepted", "2026-05-22T08:55:00+10:00", "2026-05-22T11:20:00+10:00"),
];

export const initialContractorInvoices: ContractorInvoice[] = [
  invoice("invoice-loom-ct", "offer-loom-ct", "loom-launch-film", "ct", "Chris Taylor", ["CT-3142-edit-services.pdf"], 1950, "AUD", "Submitted", "2026-08-18T16:20:00+10:00", ["Waiting"], "Includes the additional social cut requested after the offer was accepted."),
  invoice("invoice-loom-ak", "offer-loom-ak", "loom-launch-film", "ak", "Aisha Khan", ["AK-091-colour.pdf"], 880, "AUD", "Approved", "2026-08-16T13:10:00+10:00", ["Urgent"]),
  invoice("invoice-deel-jl", "offer-deel-jl", "deel-customer-story", "jl", "Jordan Lee", ["JL-1042-shoot.pdf", "JL-1042-expenses.pdf"], 1140, "AUD", "Submitted", "2026-08-18T11:05:00+10:00", ["Follow up"]),
  invoice("invoice-hims-ed", "offer-hims-ed", "hims-product-education", "ed", "Emma Davis", ["ED-508-animation.pdf"], 980, "USD", "Submitted", "2026-08-17T09:30:00+10:00", ["Disputed"], "Invoice includes an extra export pass and was issued in USD."),
  {
    ...invoice("invoice-notion-ct", "offer-notion-ct", "notion-workflows", "ct", "Chris Taylor", ["CT-208-edit.pdf"], 2140, "USD", "Sent back", "2026-08-14T15:40:00+10:00", ["Disputed"]),
    sendBackReason: "Please separate the approved edit rate from the additional captioning work.",
  },
  invoice("invoice-openai-ak", "offer-openai-ak", "openai-partner-update", "ak", "Aisha Khan", ["AK-088-colour.pdf"], 1760, "AUD", "Approved", "2026-08-12T12:10:00+10:00", ["Urgent"]),
  invoice("invoice-posthog-ak", "offer-posthog-ak", "posthog-onboarding", "ak", "Aisha Khan", ["AK-077-colour.pdf"], 1320, "AUD", "Submitted", "2026-08-10T10:45:00+10:00", ["Follow up"]),
  {
    ...invoice("invoice-figma-np", "offer-figma-np", "figma-config-highlights", "np", "Nina Patel", ["NP-402-vfx.pdf"], 1800, "NZD", "Paid", "2026-07-20T09:20:00+10:00", []),
    approvedAt: "2026-07-21T10:00:00+10:00",
    paidAt: "2026-07-22T14:15:00+10:00",
  },
];

export function invoiceDiffersFromOffer(invoiceItem: ContractorInvoice, offerItem: ContractorOffer) {
  return invoiceItem.amount !== offerItem.agreedRate || invoiceItem.currency !== offerItem.currency;
}

export function formatCostAmount(amount: number, currency: CostCurrency) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function offer(
  id: string,
  projectId: string,
  contractorId: string,
  contractorName: string,
  role: string,
  agreedRate: number,
  currency: CostCurrency,
  state: ContractorOfferState,
  createdAt: string,
  respondedAt?: string,
): ContractorOffer {
  return { id, projectId, contractorId, contractorName, role, agreedRate, currency, state, createdAt, respondedAt };
}

function invoice(
  id: string,
  offerId: string,
  projectId: string,
  contractorId: string,
  contractorName: string,
  fileNames: string[],
  amount: number,
  currency: CostCurrency,
  state: ContractorInvoiceState,
  submittedAt: string,
  tags: InvoiceTag[],
  contractorNote?: string,
): ContractorInvoice {
  return { id, offerId, projectId, contractorId, contractorName, fileNames, amount, currency, state, submittedAt, tags, contractorNote };
}
