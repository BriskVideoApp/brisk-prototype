"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

import { getAccessLevelRole, getDefaultAccessLevel, getPrototypePermissions, prototypeAccessLevels, type PrototypeAccessLevel, type PrototypeRole } from "@/data/prototype-permissions";
export type { PrototypeRole } from "@/data/prototype-permissions";

type PrototypeRoleContextValue = {
  selectedRole: PrototypeRole;
  selectedAccessLevel: PrototypeAccessLevel;
  canManageStudio: boolean;
  canManageClientAccount: boolean;
  setSelectedAccessLevel: (level: PrototypeAccessLevel) => void;
  hasLoadedRole: boolean;
  allPages: boolean;
  setSelectedRole: (role: PrototypeRole) => void;
  setAllPages: (allPages: boolean) => void;
};

const PrototypeRoleContext = createContext<PrototypeRoleContextValue | null>(null);
const selectedRoleStorageKey = "brisk-prototype-role-v1";
const selectedLevelStorageKey = "brisk-prototype-access-level-v1";
const studioLevelStorageKey = "brisk-prototype-studio-level-v1";
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
  const [selectedAccessLevel, setSelectedLevelState] = useState<PrototypeAccessLevel>("studio-admin");
  const selectedRole = getAccessLevelRole(selectedAccessLevel);
  const [allPages, setAllPages] = useState(false);

  const setSelectedAccessLevel = useCallback((level: PrototypeAccessLevel) => {
    window.sessionStorage.setItem(selectedLevelStorageKey, level);
    window.sessionStorage.setItem(selectedRoleStorageKey, getAccessLevelRole(level));
    if (getAccessLevelRole(level) === "Studio Staff") window.sessionStorage.setItem(studioLevelStorageKey, level);
    setSelectedLevelState(level);
  }, []);

  const setSelectedRole = useCallback((role: PrototypeRole) => {
    // Returning from a Client preview must not elevate ordinary Studio Staff.
    const lastStudioLevel = window.sessionStorage.getItem(studioLevelStorageKey);
    const level = getAccessLevelRole(selectedAccessLevel) === role ? selectedAccessLevel
      : role === "Studio Staff" ? lastStudioLevel === "studio-admin" ? "studio-admin" : "studio-staff"
      : getDefaultAccessLevel(role);
    setSelectedAccessLevel(level);
  }, [selectedAccessLevel, setSelectedAccessLevel]);

  useEffect(() => {
    if (!hasLoadedScenario) return;
    const storedLevel = window.sessionStorage.getItem(selectedLevelStorageKey);
    const storedRole = window.sessionStorage.getItem(selectedRoleStorageKey);
    const role = prototypeRoles.find((candidate) => candidate === storedRole) ?? activeScenario?.accessRole ?? "Studio Staff";
    const defaultLevel = activeScenario?.personaId === "producer" && role === "Studio Staff"
      ? "studio-staff" : getDefaultAccessLevel(role);
    const level = prototypeAccessLevels.find((candidate) => candidate === storedLevel) ?? defaultLevel;
    if (getAccessLevelRole(level) === "Studio Staff") window.sessionStorage.setItem(studioLevelStorageKey, level);
    setSelectedLevelState(level);
    setAllPages(false);
  }, [activeScenario, hasLoadedScenario]);

  const value = useMemo(
    () => ({
      selectedRole,
      selectedAccessLevel,
      ...getPrototypePermissions(selectedAccessLevel),
      setSelectedAccessLevel,
      hasLoadedRole: hasLoadedScenario,
      allPages,
      setSelectedRole,
      setAllPages,
    }),
    [allPages, hasLoadedScenario, selectedRole, selectedAccessLevel, setSelectedAccessLevel, setSelectedRole],
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
