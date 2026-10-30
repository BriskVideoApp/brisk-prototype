"use client";

import { cloneTurnaround, type StudioTurnaround } from "@/data/turnaround";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getStudioBrandColours, type StudioReviewDraft } from "@/data/studio-onboard";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import {
  cloneStudioNotificationSettings,
  initialStudioNotificationSettings,
  type StudioNotificationSettings,
} from "@/data/notification-settings";
import {
  cloneStudioSettings,
  initialStudioSettings,
  type StudioBranding,
  type StudioDetails,
  type StudioIntegrationId,
  type StudioProductionDefaults,
  type StudioSettings,
  type StudioStaffAccess,
} from "@/data/studio-settings";

type StudioSettingsContextValue = {
  studio: StudioSettings;
  hasHydrated: boolean;
  updateTurnaround: (turnaround: StudioTurnaround) => void;
  updateDetails: (details: StudioDetails) => void;
  updateBranding: (branding: StudioBranding) => void;
  updateProductionDefaults: (production: StudioProductionDefaults) => void;
  updateIntegrationConnection: (integrationId: StudioIntegrationId, connected: boolean) => void;
  updateNotificationSettings: (notifications: StudioNotificationSettings) => void;
  updateStaffAccess: (staffAccess: StudioStaffAccess[]) => void;
  applyOnboardingSetup: (draft: StudioReviewDraft) => void;
};

const StudioSettingsContext = createContext<StudioSettingsContextValue | null>(null);
const studioSettingsStorageKey = "brisk-studio-settings-v2";

export function StudioSettingsProvider({ children }: { children: ReactNode }) {
  const { canManageStudio } = usePrototypeRole();
  const {
    commitStudioSetup,
    hasHydrated,
    state: prototypeState,
    updateWorkspaceBranding,
    updateWorkspaceDetails,
  } = usePrototypeState();
  const [studio, setStudio] = useState<StudioSettings>(() => cloneStudioSettings(initialStudioSettings));
  const studioRef = useRef(studio);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const activeWorkspaceName = prototypeState.workspaces.find((workspace) => workspace.id === prototypeState.session.activeWorkspaceId)?.name;

  useEffect(() => {
    const storedStudio = readStoredStudioSettings();
    if (storedStudio) {
      studioRef.current = storedStudio;
      setStudio(storedStudio);
    }

    setSettingsLoaded(true);
    const syncStoredStudio = (event: StorageEvent) => {
      if (event.key !== studioSettingsStorageKey) return;
      const nextStudio = readStoredStudioSettings();
      if (!nextStudio) return;
      studioRef.current = nextStudio;
      setStudio(nextStudio);
    };

    window.addEventListener("storage", syncStoredStudio);
    return () => window.removeEventListener("storage", syncStoredStudio);
  }, []);

  const commitStudio = useCallback((update: (current: StudioSettings) => StudioSettings) => {
    const nextStudio = update(studioRef.current);
    studioRef.current = nextStudio;
    window.localStorage.setItem(studioSettingsStorageKey, JSON.stringify(nextStudio));
    setStudio(nextStudio);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !activeWorkspaceName || studioRef.current.details.name === activeWorkspaceName) return;
    commitStudio((current) => ({
      ...current,
      details: { ...current.details, name: activeWorkspaceName },
    }));
  }, [activeWorkspaceName, commitStudio, hasHydrated]);

  const updateDetails = useCallback((details: StudioDetails) => {
    if (!canManageStudio) return;
    updateWorkspaceDetails(details);
    commitStudio((current) => ({ ...current, details: { ...details } }));
  }, [canManageStudio, commitStudio, updateWorkspaceDetails]);

  const updateBranding = useCallback((branding: StudioBranding) => {
    if (!canManageStudio) return;
    updateWorkspaceBranding(branding);
    commitStudio((current) => ({
      ...current,
      branding: {
        ...branding,
        logoOptions: [...branding.logoOptions],
        brandColours: getStudioBrandColours(branding),
      },
    }));
  }, [canManageStudio, commitStudio, updateWorkspaceBranding]);

  const updateProductionDefaults = useCallback((production: StudioProductionDefaults) => {
    if (!canManageStudio) return;
    commitStudio((current) => ({
      ...current,
      production: {
        defaultTeam: production.defaultTeam.map((member) => ({ ...member })),
        turnaround: cloneTurnaround(current.production.turnaround),
      },
    }));
  }, [canManageStudio, commitStudio]);

  const updateTurnaround = useCallback((turnaround: StudioTurnaround) => {
    if (!canManageStudio) return;
    commitStudio((current) => ({ ...current, production: { ...current.production, turnaround: cloneTurnaround(turnaround) } }));
  }, [canManageStudio, commitStudio]);

  const updateStaffAccess = useCallback((staffAccess: StudioStaffAccess[]) => {
    if (!canManageStudio) return;
    commitStudio((current) => ({
      ...current,
      staffAccess: staffAccess.map((staffMember) => ({ ...staffMember })),
    }));
  }, [canManageStudio, commitStudio]);

  const updateIntegrationConnection = useCallback((integrationId: StudioIntegrationId, connected: boolean) => {
    if (!canManageStudio) return;
    commitStudio((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [integrationId]: { ...current.integrations[integrationId], connected },
      },
    }));
  }, [canManageStudio, commitStudio]);

  const updateNotificationSettings = useCallback((notifications: StudioNotificationSettings) => {
    if (!canManageStudio) return;
    commitStudio((current) => ({
      ...current,
      notifications: cloneStudioNotificationSettings(notifications),
    }));
  }, [canManageStudio, commitStudio]);

  const applyOnboardingSetup = useCallback((draft: StudioReviewDraft) => {
    commitStudioSetup(draft);
    commitStudio((current) => ({
      ...current,
      details: {
        ...current.details,
        name: draft.studioName,
        studioType: draft.studioType,
      },
    }));
  }, [commitStudio, commitStudioSetup]);

  const value = useMemo<StudioSettingsContextValue>(() => ({
    studio,
    hasHydrated: settingsLoaded,
    updateTurnaround,
    updateDetails,
    updateBranding,
    updateProductionDefaults,
    updateIntegrationConnection,
    updateNotificationSettings,
    updateStaffAccess,
    applyOnboardingSetup,
  }), [applyOnboardingSetup, settingsLoaded, updateTurnaround, studio, updateBranding, updateDetails, updateIntegrationConnection, updateNotificationSettings, updateProductionDefaults, updateStaffAccess]);

  return <StudioSettingsContext.Provider value={value}>{children}</StudioSettingsContext.Provider>;
}

export function useStudioSettings() {
  const context = useContext(StudioSettingsContext);
  if (!context) throw new Error("useStudioSettings must be used within StudioSettingsProvider");
  return context;
}

function readStoredStudioSettings(): StudioSettings | null {
  const storedValue = window.localStorage.getItem(studioSettingsStorageKey);
  if (!storedValue) return null;

  try {
    const storedStudio = JSON.parse(storedValue) as Partial<StudioSettings>;
    if (!storedStudio.details || !storedStudio.branding || !storedStudio.production || !Array.isArray(storedStudio.staffAccess)) {
      throw new Error("Stored Studio settings are incomplete");
    }
    return cloneStudioSettings({
      ...(storedStudio as StudioSettings),
      integrations: storedStudio.integrations
        ? {
            whatsapp: { ...storedStudio.integrations.whatsapp },
            slack: { ...storedStudio.integrations.slack },
          }
        : {
            whatsapp: { ...initialStudioSettings.integrations.whatsapp },
            slack: { ...initialStudioSettings.integrations.slack },
          },
      notifications: storedStudio.notifications
        ? cloneStudioNotificationSettings(storedStudio.notifications)
        : cloneStudioNotificationSettings(initialStudioNotificationSettings),
    });
  } catch {
    window.localStorage.removeItem(studioSettingsStorageKey);
    return null;
  }
}
