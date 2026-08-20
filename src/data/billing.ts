export type BillingFrequency = "monthly" | "annual";
export type BillingPlanId = "starter" | "professional" | "business" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "overdue" | "cancelling";

export const billingCurrency = {
  code: "USD",
  locale: "en-US",
  symbol: "$",
} as const;

export type BillingPlanLimit = {
  label: string;
  value: number | null;
};

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  target: string;
  selfService: boolean;
  pricing: {
    monthlyUsd: number | null;
    annualEffectiveMonthlyUsd: number | null;
    annualTotalUsd: number | null;
    customLabel?: string;
    typicalMonthlyRange?: {
      minimum: number;
      maximum: number;
    };
  };
  limits: {
    users: BillingPlanLimit;
    activeProjects: BillingPlanLimit;
    storage: BillingPlanLimit;
  };
  clientPortal: {
    access: string;
    collaboration: string;
    branding: readonly string[];
  };
  trial: {
    label: string;
    days: number | null;
    cardRequired: boolean | null;
  };
  support: string;
  onboarding?: string;
  featureIntroduction: string;
  features: readonly string[];
  actionLabel: string;
};

// Pricing and currency are provisional pending final commercial approval.
export const billingPlans: readonly BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    target: "Solo creators and freelancers",
    selfService: true,
    pricing: {
      monthlyUsd: 49,
      annualEffectiveMonthlyUsd: 39,
      annualTotalUsd: 468,
    },
    limits: {
      users: { label: "1 account owner + 2 collaborators", value: 3 },
      activeProjects: { label: "3", value: 3 },
      storage: { label: "100 GB", value: 100 },
    },
    clientPortal: {
      access: "Unlimited Client collaborators",
      collaboration: "Review, comment and approve",
      branding: ["Studio name and logo", "Standard Brisk portal styling", "Small Powered by Brisk footer"],
    },
    trial: { label: "14 days, no card required", days: 14, cardRequired: false },
    support: "Email support, 48-hour response",
    featureIntroduction: "Core features",
    features: [
      "Client briefing",
      "Script development",
      "Basic storyboarding",
      "Client review, comments and approval",
      "Project timeline",
      "File sharing",
      "Mobile access",
    ],
    actionLabel: "Choose Starter",
  },
  {
    id: "professional",
    name: "Professional",
    target: "Small production companies and boutique agencies",
    selfService: true,
    pricing: {
      monthlyUsd: 249,
      annualEffectiveMonthlyUsd: 199,
      annualTotalUsd: 2388,
    },
    limits: {
      users: { label: "10", value: 10 },
      activeProjects: { label: "15", value: 15 },
      storage: { label: "500 GB", value: 500 },
    },
    clientPortal: {
      access: "Unlimited Client collaborators",
      collaboration: "Review, comment and approve",
      branding: ["Studio logo", "Studio primary colour", "Custom branding", "Small Powered by Brisk footer"],
    },
    trial: { label: "14 days", days: 14, cardRequired: false },
    support: "Email and chat, 24-hour response",
    onboarding: "Onboarding assistance included",
    featureIntroduction: "Includes Starter features plus",
    features: [
      "Advanced storyboarding",
      "Project cost estimation",
      "Resource management",
      "Time tracking",
      "Workflow automation",
      "Custom branding",
      "Version control",
      "Advanced reporting",
    ],
    actionLabel: "Choose Professional",
  },
  {
    id: "business",
    name: "Business",
    target: "Mid-sized production companies and agencies",
    selfService: true,
    pricing: {
      monthlyUsd: 599,
      annualEffectiveMonthlyUsd: 499,
      annualTotalUsd: 5988,
    },
    limits: {
      users: { label: "25", value: 25 },
      activeProjects: { label: "Unlimited", value: null },
      storage: { label: "2 TB", value: 2000 },
    },
    clientPortal: {
      access: "Unlimited Client collaborators",
      collaboration: "Review, comment and approve",
      branding: ["Fully white-labelled Client portal", "No Brisk branding or footer"],
    },
    trial: { label: "30 days", days: 30, cardRequired: null },
    support: "Priority support, 12-hour response",
    onboarding: "Dedicated onboarding",
    featureIntroduction: "Includes Professional features plus",
    features: [
      "Portfolio management",
      "Advanced analytics",
      "Business intelligence",
      "Resource-pool management",
      "Custom workflows",
      "API access",
      "White-label Client portal",
      "Priority rendering",
      "Quarterly business reviews",
    ],
    actionLabel: "Choose Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    target: "Large production companies, agencies and corporate teams",
    selfService: false,
    pricing: {
      monthlyUsd: null,
      annualEffectiveMonthlyUsd: null,
      annualTotalUsd: null,
      customLabel: "Custom",
      typicalMonthlyRange: { minimum: 1500, maximum: 5000 },
    },
    limits: {
      users: { label: "Unlimited", value: null },
      activeProjects: { label: "Unlimited", value: null },
      storage: { label: "Custom, normally 5 TB+", value: null },
    },
    clientPortal: {
      access: "Unlimited Client collaborators",
      collaboration: "Review, comment and approve",
      branding: ["Business white-label treatment", "Custom domain", "Enterprise portal configuration"],
    },
    trial: { label: "Sales-led onboarding", days: null, cardRequired: null },
    support: "Dedicated account manager and custom service-level agreement",
    onboarding: "Sales-led onboarding",
    featureIntroduction: "Includes Business features plus",
    features: [
      "Single Sign-On",
      "SAML authentication",
      "Advanced security and compliance",
      "Custom data-retention settings",
      "Dedicated account manager",
      "Custom service-level agreement",
      "Audit logging",
      "Custom integrations",
      "Migration assistance",
      "Training",
      "Optional dedicated infrastructure",
    ],
    actionLabel: "Contact sales",
  },
] as const;

export type BillingAddOn = {
  id: "additional-storage" | "additional-user";
  name: string;
  monthlyPriceUsd: number;
  priceUnit?: string;
  description: string;
  availablePlanIds: readonly BillingPlanId[];
  includedPlanIds?: readonly BillingPlanId[];
  requiredPlanLabel?: string;
};

export const billingAddOns: readonly BillingAddOn[] = [
  {
    id: "additional-storage",
    name: "Additional storage",
    monthlyPriceUsd: 25,
    priceUnit: "per 100 GB",
    description: "Add storage to the Studio's shared allowance.",
    availablePlanIds: ["starter", "professional", "business"],
  },
  {
    id: "additional-user",
    name: "Additional Studio Staff user",
    monthlyPriceUsd: 20,
    description: "Add one Studio Staff user to your Professional or Business plan.",
    availablePlanIds: ["professional", "business"],
    requiredPlanLabel: "Professional",
  },
] as const;

export type BillingUsage = {
  studioStaff: number;
  activeProjects: number;
  storageGb: number;
};

export const billingUsageFixtures = {
  standard: { studioStaff: 6, activeProjects: 9, storageGb: 310 },
  approachingLimit: { studioStaff: 6, activeProjects: 14, storageGb: 420 },
} satisfies Record<string, BillingUsage>;

export type SubscriptionFixture = {
  planId: BillingPlanId;
  status: SubscriptionStatus;
  billingFrequency: BillingFrequency;
  canManageBilling: boolean;
  nextRenewal: string;
  effectiveDate: string;
  trialDaysRemaining?: number;
  trialEndDate?: string;
  usage: BillingUsage;
};

const activeSubscription: SubscriptionFixture = {
  planId: "professional",
  status: "active",
  billingFrequency: "monthly",
  canManageBilling: true,
  nextRenewal: "12 September 2026",
  effectiveDate: "12 September 2026",
  usage: billingUsageFixtures.approachingLimit,
};

export const subscriptionFixtures = {
  active: activeSubscription,
  trial: {
    ...activeSubscription,
    status: "trial",
    nextRenewal: "27 August 2026",
    effectiveDate: "27 August 2026",
    trialDaysRemaining: 8,
    trialEndDate: "27 August 2026",
  },
  overdue: { ...activeSubscription, status: "overdue" },
  cancelling: { ...activeSubscription, status: "cancelling" },
  noPermission: { ...activeSubscription, canManageBilling: false },
  usageApproachingLimit: {
    ...activeSubscription,
    usage: billingUsageFixtures.approachingLimit,
  },
} satisfies Record<string, SubscriptionFixture>;

export type BillingPreviewState = keyof typeof subscriptionFixtures;

export const billingPreviewAliases: Readonly<Record<string, BillingPreviewState>> = {
  active: "active",
  trial: "trial",
  overdue: "overdue",
  cancelling: "cancelling",
  "no-permission": "noPermission",
  "empty-invoices": "active",
  "usage-limit": "usageApproachingLimit",
};

export function formatBillingAmount(amount: number, fractionDigits = 0) {
  const formattedAmount = amount.toLocaleString(billingCurrency.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${billingCurrency.symbol}${formattedAmount} ${billingCurrency.code}`;
}

export function formatBillingMonthlyPrice(amount: number, unit?: string) {
  return `${formatBillingAmount(amount)}/month${unit ? ` ${unit}` : ""}`;
}

export function formatBillingAnnualPrice(effectiveMonthly: number, annualTotal: number) {
  return `${formatBillingAmount(effectiveMonthly)}/month, billed as ${billingCurrency.symbol}${annualTotal.toLocaleString(billingCurrency.locale)} annually`;
}

export function formatBillingPlanPrice(plan: BillingPlan, billingFrequency: BillingFrequency) {
  if (!plan.selfService) return plan.pricing.customLabel ?? "Custom";
  if (billingFrequency === "annual" && plan.pricing.annualEffectiveMonthlyUsd !== null && plan.pricing.annualTotalUsd !== null) {
    return formatBillingAnnualPrice(plan.pricing.annualEffectiveMonthlyUsd, plan.pricing.annualTotalUsd);
  }
  return formatBillingMonthlyPrice(plan.pricing.monthlyUsd ?? 0);
}

export function formatBillingAddOnPrice(addOn: BillingAddOn) {
  return formatBillingMonthlyPrice(addOn.monthlyPriceUsd, addOn.priceUnit);
}

export function formatBillingTypicalRange(plan: BillingPlan) {
  const range = plan.pricing.typicalMonthlyRange;
  if (!range) return null;
  const minimum = `${billingCurrency.symbol}${range.minimum.toLocaleString(billingCurrency.locale)}`;
  const maximum = `${billingCurrency.symbol}${range.maximum.toLocaleString(billingCurrency.locale)}`;
  return `${minimum}-${maximum} ${billingCurrency.code}/month`;
}

export function getBillingPlan(planId: BillingPlanId) {
  const plan = billingPlans.find((candidate) => candidate.id === planId);
  if (!plan) throw new Error(`Unknown billing plan: ${planId}`);
  return plan;
}
