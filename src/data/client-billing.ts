export type ClientBillingMethod = "unselected" | "stripe" | "independent";
export type StripeConnectionStatus = "not-connected" | "connected" | "action-required" | "disconnected";

export type ClientBillingOption = {
  id: "stripe" | "independent";
  title: string;
  description: string;
  points: readonly string[];
  actionLabel: string;
};

export const clientBillingOptions: readonly ClientBillingOption[] = [
  {
    id: "stripe",
    title: "Bill through Stripe",
    description: "Connect your Studio’s Stripe account. Stripe handles subscriptions, invoices, payments and billing details.",
    points: [
      "One-off and recurring payments",
      "Stripe-hosted checkout",
      "Invoices and receipts",
      "Clients can manage payment details securely",
      "Funds paid directly to your Studio",
    ],
    actionLabel: "Connect Stripe",
  },
  {
    id: "independent",
    title: "Handle billing independently",
    description: "Use your preferred invoicing, accounting and payment tools. Nothing needs to be set up in Brisk.",
    points: [
      "Use Xero, MYOB, QuickBooks or another system",
      "Accept bank transfers or other payment methods",
      "Track and reconcile payments outside Brisk",
      "No billing information stored in Brisk",
    ],
    actionLabel: "Manage billing outside Brisk",
  },
] as const;

export type StripeAccountDetails = {
  businessName: string;
  accountEmail: string;
};

export const stripeAccountFixture: StripeAccountDetails = {
  businessName: "ChopChop Film Pty Ltd",
  accountEmail: "finance@chopchop.film",
};

export type ClientBillingFixture = {
  method: ClientBillingMethod;
  stripeStatus: StripeConnectionStatus;
  canManageClientBilling: boolean;
};

const connectedFixture: ClientBillingFixture = {
  method: "stripe",
  stripeStatus: "connected",
  canManageClientBilling: true,
};

export const clientBillingFixtures = {
  unselected: {
    method: "unselected",
    stripeStatus: "not-connected",
    canManageClientBilling: true,
  },
  independent: {
    method: "independent",
    stripeStatus: "not-connected",
    canManageClientBilling: true,
  },
  stripeConnected: connectedFixture,
  stripeActionRequired: {
    method: "stripe",
    stripeStatus: "action-required",
    canManageClientBilling: true,
  },
  stripeDisconnected: {
    method: "unselected",
    stripeStatus: "disconnected",
    canManageClientBilling: true,
  },
  noPermission: {
    ...connectedFixture,
    canManageClientBilling: false,
  },
} satisfies Record<string, ClientBillingFixture>;

export type ClientBillingPreviewState = keyof typeof clientBillingFixtures;

export const clientBillingPreviewAliases: Readonly<Record<string, ClientBillingPreviewState>> = {
  unselected: "unselected",
  independent: "independent",
  "stripe-connected": "stripeConnected",
  "stripe-action-required": "stripeActionRequired",
  "stripe-disconnected": "stripeDisconnected",
  "no-permission": "noPermission",
};
