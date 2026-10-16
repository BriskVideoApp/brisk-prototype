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
  type ClientMembershipRole,
  type ClientPersonalProfile,
} from "@/data/client-account-settings";
import { useClientBilling } from "@/components/settings/ClientBillingContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectWorkspaceClients } from "@/data/prototype-state";

type ClientBillingAvailability = "available" | "managed-externally" | "setup-required" | "no-access";

export type ClientAccountAccess = {
  role: ClientMembershipRole;
  canAccessBilling: boolean;
  billingAvailability: ClientBillingAvailability;
  authenticationMethod: ClientAuthenticationMethod;
};

type ClientAccountSettingsContextValue = {
  account: ClientAccountSettings;
  access: ClientAccountAccess;
  buildHref: (pathname: string) => string;
  saveProfile: (profile: ClientPersonalProfile) => void;
};

const ClientAccountSettingsContext = createContext<ClientAccountSettingsContextValue | null>(null);
const clientAccountStorageKey = "brisk-client-account-settings-v1";
const previewParameterNames = ["client-role", "billing", "auth"] as const;

export function ClientAccountSettingsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { state } = usePrototypeState();
  const { billingSettings } = useClientBilling();
  const [storedAccount, setAccount] = useState<ClientAccountSettings>(() => cloneClientAccountSettings(initialClientAccountSettings));
  const activeClient = selectWorkspaceClients(state, state.session.activeWorkspaceId)
    .find((client) => client.id === (state.session.activeClientId ?? "loom"));
  const account = useMemo<ClientAccountSettings>(() => {
    if (!activeClient) return storedAccount;
    const primaryContact = activeClient.contacts.find((contact) => contact.id === activeClient.primaryContactId);
    return {
      ...storedAccount,
      company: {
        ...storedAccount.company,
        name: activeClient.name,
        logoUrl: activeClient.logoUrl,
        mainContact: primaryContact?.name ?? "",
      },
      team: activeClient.contacts.filter((contact) => contact.portalAccess !== "Paused").map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        role: contact.membershipRole,
        status: contact.portalAccess === "Invited" ? "Pending invitation" as const : "Active" as const,
        projectIds: contact.projectIds,
        avatarUrl: null,
      })),
    };
  }, [activeClient, storedAccount]);

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

  const value = useMemo<ClientAccountSettingsContextValue>(() => ({
    account,
    access,
    buildHref,
    saveProfile,
  }), [access, account, buildHref, saveProfile]);

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
