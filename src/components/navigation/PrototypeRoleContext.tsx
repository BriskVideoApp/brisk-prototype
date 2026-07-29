"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  hasLoadedRole: boolean;
  setSelectedRole: (role: PrototypeRole) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);
const roleStorageKey = "brisk-prototype-role";
const prototypeRoles: PrototypeRole[] = ["Studio Staff", "Studio Freelancer", "Customer"];
export const prototypeCustomerSlug = "loom";

export function PrototypeRoleProvider({ children }: { children: React.ReactNode }) {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Studio Staff");
  const [hasLoadedRole, setHasLoadedRole] = useState(false);

  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem(roleStorageKey);

      if (prototypeRoles.includes(storedRole as PrototypeRole)) {
        setSelectedRole(storedRole as PrototypeRole);
      }
    } finally {
      setHasLoadedRole(true);
    }
  }, []);

  const selectRole = (role: PrototypeRole) => {
    setSelectedRole(role);
    window.localStorage.setItem(roleStorageKey, role);
  };
  const value = useMemo(
    () => ({ selectedRole, hasLoadedRole, setSelectedRole: selectRole }),
    [hasLoadedRole, selectedRole],
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
