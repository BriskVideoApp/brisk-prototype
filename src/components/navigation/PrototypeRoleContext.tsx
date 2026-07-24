"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  setSelectedRole: (role: PrototypeRole) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);

export function PrototypeRoleProvider({ children }: { children: React.ReactNode }) {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Studio Staff");
  const value = useMemo(
    () => ({ selectedRole, setSelectedRole }),
    [selectedRole],
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
