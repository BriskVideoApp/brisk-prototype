"use client";

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
  initialClientBillingSettings,
  type ClientBillingSettings,
} from "@/data/client-billing";

type ClientBillingContextValue = {
  billingSettings: ClientBillingSettings;
  saveBillingSettings: (settings: ClientBillingSettings) => void;
};

const ClientBillingContext = createContext<ClientBillingContextValue | null>(null);
const clientBillingStorageKey = "brisk-client-billing-settings-v1";

export function ClientBillingProvider({ children }: { children: ReactNode }) {
  const [billingSettings, setBillingSettings] = useState<ClientBillingSettings>(initialClientBillingSettings);

  useEffect(() => {
    const storedSettings = readStoredClientBillingSettings();
    if (storedSettings) setBillingSettings(storedSettings);
  }, []);

  const saveBillingSettings = useCallback((settings: ClientBillingSettings) => {
    setBillingSettings(settings);
    window.localStorage.setItem(clientBillingStorageKey, JSON.stringify(settings));
  }, []);

  const value = useMemo<ClientBillingContextValue>(() => ({
    billingSettings,
    saveBillingSettings,
  }), [billingSettings, saveBillingSettings]);

  return <ClientBillingContext.Provider value={value}>{children}</ClientBillingContext.Provider>;
}

export function useClientBilling() {
  const context = useContext(ClientBillingContext);
  if (!context) throw new Error("useClientBilling must be used within ClientBillingProvider");
  return context;
}

function readStoredClientBillingSettings(): ClientBillingSettings | null {
  try {
    const storedValue = window.localStorage.getItem(clientBillingStorageKey);
    if (!storedValue) return null;
    const storedSettings = JSON.parse(storedValue) as Partial<ClientBillingSettings>;
    const { method, stripeStatus } = storedSettings;
    if (
      (method !== "unselected" && method !== "stripe" && method !== "independent")
      || (stripeStatus !== "not-connected"
        && stripeStatus !== "connected"
        && stripeStatus !== "action-required"
        && stripeStatus !== "disconnected")
    ) {
      throw new Error("Stored Client billing settings are invalid");
    }
    return {
      method,
      stripeStatus,
    };
  } catch {
    window.localStorage.removeItem(clientBillingStorageKey);
    return null;
  }
}
