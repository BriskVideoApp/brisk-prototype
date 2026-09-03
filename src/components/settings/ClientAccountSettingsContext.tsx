"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cloneClientAccountSettings,
  initialClientAccountSettings,
  type ClientAccountSettings,
  type ClientAuthenticationMethod,
  type ClientCompanyDetails,
  type ClientMembershipRole,
  type ClientPersonalProfile,
} from "@/data/client-account-settings";
import { useClientBilling } from "@/components/settings/ClientBillingContext";

type ClientBillingAvailability = "available" | "managed-externally" | "setup-required" | "no-access";

export type ClientAccountAccess = {
  role: ClientMembershipRole;
  canAccessBilling: boolean;
  billingAvailability: ClientBillingAvailability;
  authenticationMethod: ClientAuthenticationMethod;
};

type InviteClientMemberInput = {
  memberId?: string;
  name: string;
  email: string;
  role: ClientMembershipRole;
  projectIds: string[];
};

type ClientAccountSettingsContextValue = {
  account: ClientAccountSettings;
  access: ClientAccountAccess;
  buildHref: (pathname: string) => string;
  saveProfile: (profile: ClientPersonalProfile) => void;
  saveCompany: (company: ClientCompanyDetails) => void;
  inviteTeamMember: (input: InviteClientMemberInput) => void;
  resendInvitation: (memberId: string) => void;
  cancelInvitation: (memberId: string) => void;
  removeTeamMember: (memberId: string) => void;
  updateTeamMemberRole: (memberId: string, role: ClientMembershipRole) => void;
  updateTeamMemberProjects: (memberId: string, projectIds: string[]) => void;
  markInvoicePaid: (invoiceId: string) => void;
};

const ClientAccountSettingsContext = createContext<ClientAccountSettingsContextValue | null>(null);
const clientAccountStorageKey = "brisk-client-account-settings-v1";
const previewParameterNames = ["client-role", "billing", "auth"] as const;

export function ClientAccountSettingsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { billingSettings } = useClientBilling();
  const [account, setAccount] = useState<ClientAccountSettings>(() => cloneClientAccountSettings(initialClientAccountSettings));

  useEffect(() => {
    const storedAccount = readStoredClientAccountSettings();
    if (storedAccount) setAccount(storedAccount);
  }, []);

  const previewQuery = useMemo(() => {
    const previewParams = new URLSearchParams();
    previewParameterNames.forEach((name) => {
      const value = searchParams.get(name);
      if (value) previewParams.set(name, value);
    });
    return previewParams.toString();
  }, [searchParams]);

  const access = useMemo<ClientAccountAccess>(() => {
    const billingAvailability = resolveBillingAvailability(
      searchParams.get("billing") !== "hidden",
      billingSettings.method,
      billingSettings.stripeStatus,
    );
    return {
      role: searchParams.get("client-role") === "member" ? "Client Member" : "Client Admin",
      canAccessBilling: billingAvailability === "available",
      billingAvailability,
      authenticationMethod: resolveAuthenticationMethod(searchParams.get("auth")),
    };
  }, [billingSettings, searchParams]);

  const buildHref = useCallback((pathname: string) => (
    previewQuery ? `${pathname}?${previewQuery}` : pathname
  ), [previewQuery]);

  const commitAccount = useCallback((update: (current: ClientAccountSettings) => ClientAccountSettings) => {
    setAccount((current) => {
      const nextAccount = update(current);
      window.localStorage.setItem(clientAccountStorageKey, JSON.stringify(nextAccount));
      return nextAccount;
    });
  }, []);

  const saveProfile = useCallback((profile: ClientPersonalProfile) => {
    commitAccount((current) => ({ ...current, profile: { ...profile } }));
  }, [commitAccount]);

  const saveCompany = useCallback((company: ClientCompanyDetails) => {
    commitAccount((current) => ({ ...current, company: { ...company } }));
  }, [commitAccount]);

  const inviteTeamMember = useCallback((input: InviteClientMemberInput) => {
    commitAccount((current) => {
      const nextMember = {
        id: input.memberId ?? `client-invite-${Date.now()}`,
        name: input.name,
        email: input.email,
        role: input.role,
        status: "Pending invitation" as const,
        projectIds: [...input.projectIds],
        avatarUrl: null,
        invitationSentAt: "Just now",
      };
      return { ...current, team: [...current.team, nextMember] };
    });
  }, [commitAccount]);

  const resendInvitation = useCallback((memberId: string) => {
    commitAccount((current) => ({
      ...current,
      team: current.team.map((member) => (
        member.id === memberId ? { ...member, invitationSentAt: "Just now" } : member
      )),
    }));
  }, [commitAccount]);

  const cancelInvitation = useCallback((memberId: string) => {
    commitAccount((current) => ({
      ...current,
      team: current.team.filter((member) => member.id !== memberId),
    }));
  }, [commitAccount]);

  const removeTeamMember = useCallback((memberId: string) => {
    commitAccount((current) => ({
      ...current,
      team: current.team.filter((member) => member.id !== memberId),
    }));
  }, [commitAccount]);

  const updateTeamMemberRole = useCallback((memberId: string, role: ClientMembershipRole) => {
    commitAccount((current) => ({
      ...current,
      team: current.team.map((member) => member.id === memberId ? { ...member, role } : member),
    }));
  }, [commitAccount]);

  const updateTeamMemberProjects = useCallback((memberId: string, projectIds: string[]) => {
    commitAccount((current) => ({
      ...current,
      team: current.team.map((member) => (
        member.id === memberId ? { ...member, projectIds: [...projectIds] } : member
      )),
    }));
  }, [commitAccount]);

  const markInvoicePaid = useCallback((invoiceId: string) => {
    commitAccount((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? {
        ...invoice,
        status: "Paid",
        paidOn: "21 Aug 2026",
        receiptAvailable: true,
      } : invoice),
    }));
  }, [commitAccount]);

  const value = useMemo<ClientAccountSettingsContextValue>(() => ({
    account,
    access,
    buildHref,
    saveProfile,
    saveCompany,
    inviteTeamMember,
    resendInvitation,
    cancelInvitation,
    removeTeamMember,
    updateTeamMemberRole,
    updateTeamMemberProjects,
    markInvoicePaid,
  }), [
    access,
    account,
    buildHref,
    cancelInvitation,
    inviteTeamMember,
    markInvoicePaid,
    removeTeamMember,
    resendInvitation,
    saveCompany,
    saveProfile,
    updateTeamMemberProjects,
    updateTeamMemberRole,
  ]);

  return <ClientAccountSettingsContext.Provider value={value}>{children}</ClientAccountSettingsContext.Provider>;
}

export function useClientAccountSettings() {
  const context = useContext(ClientAccountSettingsContext);
  if (!context) throw new Error("useClientAccountSettings must be used within ClientAccountSettingsProvider");
  return context;
}

function resolveAuthenticationMethod(value: string | null): ClientAuthenticationMethod {
  if (value === "magic-link" || value === "google" || value === "microsoft") return value;
  return "password";
}

function resolveBillingAvailability(
  hasBillingAccess: boolean,
  method: import("@/data/client-billing").ClientBillingMethod,
  stripeStatus: import("@/data/client-billing").StripeConnectionStatus,
): ClientBillingAvailability {
  if (!hasBillingAccess) return "no-access";
  if (method === "independent") return "managed-externally";
  if (method === "stripe" && stripeStatus === "connected") return "available";
  return "setup-required";
}

function readStoredClientAccountSettings() {
  try {
    const storedValue = window.localStorage.getItem(clientAccountStorageKey);
    if (!storedValue) return null;
    const storedAccount = JSON.parse(storedValue) as Partial<ClientAccountSettings>;
    if (!storedAccount.profile || !storedAccount.company || !Array.isArray(storedAccount.team) || !Array.isArray(storedAccount.invoices)) {
      throw new Error("Stored Client account settings are incomplete");
    }
    return cloneClientAccountSettings({
      ...(storedAccount as ClientAccountSettings),
      profile: {
        ...initialClientAccountSettings.profile,
        ...storedAccount.profile,
      },
      invoices: storedAccount.invoices.map((invoice) => ({
        ...invoice,
        status: (invoice.status as string) === "Outstanding" ? "Unpaid" : invoice.status,
      })),
    });
  } catch {
    window.localStorage.removeItem(clientAccountStorageKey);
    return null;
  }
}
