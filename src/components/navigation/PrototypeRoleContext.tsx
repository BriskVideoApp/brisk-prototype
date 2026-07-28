"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  setSelectedRole: (role: PrototypeRole) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);
const roleStorageKey = "brisk-prototype-role";
const prototypeRoles: PrototypeRole[] = ["Studio Staff", "Studio Freelancer", "Customer"];

export function PrototypeRoleProvider({ children }: { children: React.ReactNode }) {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Studio Staff");
  useEffect(() => {
    const storedRole = window.localStorage.getItem(roleStorageKey);
    if (prototypeRoles.includes(storedRole as PrototypeRole)) setSelectedRole(storedRole as PrototypeRole);
  }, []);

  const selectRole = (role: PrototypeRole) => {
    setSelectedRole(role);
    window.localStorage.setItem(roleStorageKey, role);
  };
  const value = useMemo(
    () => ({ selectedRole, setSelectedRole: selectRole }),
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
