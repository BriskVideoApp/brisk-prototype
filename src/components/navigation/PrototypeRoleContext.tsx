"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  hasLoadedRole: boolean;
  allPages: boolean;
  setSelectedRole: (role: PrototypeRole) => void;
  setAllPages: (allPages: boolean) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);
const selectedRoleStorageKey = "brisk-prototype-role-v1";
export const prototypeRoles: readonly PrototypeRole[] = [
  "Studio Staff",
  "Studio Freelancer",
  "Customer",
];
export const prototypeRoleLabels: Record<PrototypeRole, string> = {
  "Studio Staff": "Studio Staff",
  "Studio Freelancer": "Studio Freelancer",
  Customer: "Client",
};
// Compatibility only for legacy, non-portal demonstration fixtures.
export const prototypeCustomerSlug = "loom";

export function PrototypeRoleProvider({ children }: { children: React.ReactNode }) {
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const [selectedRole, setSelectedRoleState] = useState<PrototypeRole>("Studio Staff");
  const [allPages, setAllPages] = useState(false);

  const setSelectedRole = useCallback((role: PrototypeRole) => {
    window.sessionStorage.setItem(selectedRoleStorageKey, role);
    setSelectedRoleState(role);
  }, []);

  useEffect(() => {
    if (!hasLoadedScenario) return;
    const storedRole = window.sessionStorage.getItem(selectedRoleStorageKey);
    setSelectedRoleState(prototypeRoles.find((role) => role === storedRole) ?? activeScenario?.accessRole ?? "Studio Staff");
    setAllPages(false);
  }, [activeScenario, hasLoadedScenario]);

  const value = useMemo(
    () => ({
      selectedRole,
      hasLoadedRole: hasLoadedScenario,
      allPages,
      setSelectedRole,
      setAllPages,
    }),
    [allPages, hasLoadedScenario, selectedRole, setSelectedRole],
  );

  return (
    <PrototypeRoleContext.Provider value={value}>
      {children}
    </PrototypeRoleContext.Provider>
  );
}

export function usePrototypeRole() {
  const context = useContext(PrototypeRoleContext);

  if (!context) {
    throw new Error("usePrototypeRole must be used within PrototypeRoleProvider");
  }

  return context;
}
