"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  hasLoadedRole: boolean;
  allPages: boolean;
  setSelectedRole: (role: PrototypeRole) => void;
  setAllPages: (allPages: boolean) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);
export const prototypeRoles: readonly PrototypeRole[] = [
  "Studio Staff",
  "Studio Freelancer",
  "Customer",
];
export const prototypeRoleLabels: Record<PrototypeRole, string> = {
  "Studio Staff": "Studio",
  "Studio Freelancer": "Freelancer",
  Customer: "Client",
};
export const prototypeCustomerSlug = "loom";

export function PrototypeRoleProvider({ children }: { children: React.ReactNode }) {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Studio Staff");
  const [allPages, setAllPages] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/customer-dashboard" && searchParams.get("studio-preview") === "1") {
      setSelectedRole("Customer");
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedRole,
      hasLoadedRole: true,
      allPages,
      setSelectedRole,
      setAllPages,
    }),
    [allPages, selectedRole],
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
