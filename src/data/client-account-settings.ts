export type ClientMembershipRole = "Client Admin" | "Client Member";

export type ClientAuthenticationMethod = "password" | "magic-link" | "google" | "microsoft";

export type PersonalProfile = {
  fullName: string;
  signInEmail: string;
  phoneNumber: string;
  photoUrl: string | null;
  timezone: string;
};

export type ClientPersonalProfile = PersonalProfile;

export type ClientCompanyDetails = {
  name: string;
  logoUrl: string | null;
  mainContact: string;
  billingEmail: string;
  address: string;
  country: string;
  timezone: string;
};

export type ClientProjectAccess = {
  id: string;
  code: string;
  name: string;
};

export type ClientTeamMemberStatus = "Active" | "Pending invitation";

export type ClientTeamMember = {
  id: string;
  name: string;
  email: string;
  role: ClientMembershipRole;
  status: ClientTeamMemberStatus;
  projectIds: string[];
  avatarUrl: string | null;
  invitationSentAt?: string;
};

export type ClientInvoiceStatus = "Unpaid" | "Paid";

export type ClientInvoice = {
  id: string;
  number: string;
  projectName: string;
  issuedOn: string;
  dueOn: string;
  amountInCents: number;
  currency: "AUD";
  status: ClientInvoiceStatus;
  paidOn?: string;
  receiptAvailable: boolean;
};

export type ClientAccountSettings = {
  profile: ClientPersonalProfile;
  company: ClientCompanyDetails;
  team: ClientTeamMember[];
  invoices: ClientInvoice[];
};

export const clientProjectAccessOptions: readonly ClientProjectAccess[] = [
  { id: "loom-launch-film", code: "LOOM-24", name: "Launch Film - Sales Narrative" },
  { id: "loom-ai-launch", code: "LOOM-25", name: "Loom AI Product Launch" },
  { id: "loom-customer-stories", code: "LOOM-26", name: "Customer Stories Series" },
  { id: "loom-brand-refresh", code: "LOOM-27", name: "Brand Refresh Film" },
] as const;

export const initialClientAccountSettings: ClientAccountSettings = {
  profile: {
    fullName: "Jess Taylor",
    signInEmail: "jess@loom.com",
    phoneNumber: "+61 412 555 820",
    photoUrl: null,
    timezone: "Australia/Sydney",
  },
  company: {
    name: "Loom",
    logoUrl: null,
    mainContact: "Jess Taylor",
    billingEmail: "accounts@loom.com",
    address: "Level 5, 11 York Street, Sydney NSW 2000",
    country: "Australia",
    timezone: "Australia/Sydney",
  },
  team: [
    {
      id: "client-jess",
      name: "Jess Taylor",
      email: "jess@loom.com",
      role: "Client Admin",
      status: "Active",
      projectIds: clientProjectAccessOptions.map((project) => project.id),
      avatarUrl: null,
    },
    {
      id: "client-sarah",
      name: "Sarah Kim",
      email: "sarah@loom.com",
      role: "Client Member",
      status: "Active",
      projectIds: ["loom-launch-film", "loom-ai-launch"],
      avatarUrl: null,
    },
    {
      id: "client-daniel",
      name: "Daniel Ortiz",
      email: "daniel@loom.com",
      role: "Client Member",
      status: "Pending invitation",
      projectIds: ["loom-customer-stories"],
      avatarUrl: null,
      invitationSentAt: "20 Aug 2026",
    },
  ],
  invoices: [
    {
      id: "invoice-1048",
      number: "INV-1048",
      projectName: "Loom AI Product Launch",
      issuedOn: "15 Aug 2026",
      dueOn: "29 Aug 2026",
      amountInCents: 1265000,
      currency: "AUD",
      status: "Unpaid",
      receiptAvailable: false,
    },
    {
      id: "invoice-1045",
      number: "INV-1045",
      projectName: "Customer Stories Series",
      issuedOn: "7 Aug 2026",
      dueOn: "21 Aug 2026",
      amountInCents: 480000,
      currency: "AUD",
      status: "Unpaid",
      receiptAvailable: false,
    },
    {
      id: "invoice-1041",
      number: "INV-1041",
      projectName: "Launch Film - Sales Narrative",
      issuedOn: "24 Jul 2026",
      dueOn: "7 Aug 2026",
      amountInCents: 845000,
      currency: "AUD",
      status: "Paid",
      paidOn: "5 Aug 2026",
      receiptAvailable: true,
    },
    {
      id: "invoice-1037",
      number: "INV-1037",
      projectName: "Brand Refresh Film",
      issuedOn: "3 Jul 2026",
      dueOn: "17 Jul 2026",
      amountInCents: 620000,
      currency: "AUD",
      status: "Paid",
      paidOn: "14 Jul 2026",
      receiptAvailable: true,
    },
    {
      id: "invoice-1032",
      number: "INV-1032",
      projectName: "Product Demo Series",
      issuedOn: "12 Jun 2026",
      dueOn: "26 Jun 2026",
      amountInCents: 392000,
      currency: "AUD",
      status: "Paid",
      paidOn: "23 Jun 2026",
      receiptAvailable: true,
    },
    {
      id: "invoice-1028",
      number: "INV-1028",
      projectName: "Loom HQ Culture Film",
      issuedOn: "15 May 2026",
      dueOn: "29 May 2026",
      amountInCents: 710000,
      currency: "AUD",
      status: "Paid",
      paidOn: "27 May 2026",
      receiptAvailable: true,
    },
  ],
};

export function cloneClientAccountSettings(settings: ClientAccountSettings): ClientAccountSettings {
  return {
    profile: { ...settings.profile },
    company: { ...settings.company },
    team: settings.team.map((member) => ({ ...member, projectIds: [...member.projectIds] })),
    invoices: settings.invoices.map((invoice) => ({ ...invoice })),
  };
}

export function getAuthenticationMethodLabel(method: ClientAuthenticationMethod) {
  if (method === "magic-link") return "Email magic link";
  if (method === "google") return "Google";
  if (method === "microsoft") return "Microsoft";
  return "Password";
}
