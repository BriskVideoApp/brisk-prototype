"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StudioReviewDraft } from "@/data/studio-onboard";
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
  type StudioProductionDefaults,
  type StudioSettings,
  type StudioStaffAccess,
} from "@/data/studio-settings";

type StudioSettingsContextValue = {
  studio: StudioSettings;
  updateDetails: (details: StudioDetails) => void;
  updateBranding: (branding: StudioBranding) => void;
  updateProductionDefaults: (production: StudioProductionDefaults) => void;
  updateNotificationSettings: (notifications: StudioNotificationSettings) => void;
  updateStaffAccess: (staffAccess: StudioStaffAccess[]) => void;
  applyOnboardingSetup: (draft: StudioReviewDraft) => void;
};

const StudioSettingsContext = createContext<StudioSettingsContextValue | null>(null);
const studioSettingsStorageKey = "brisk-studio-settings-v2";

export function StudioSettingsProvider({ children }: { children: ReactNode }) {
  const [studio, setStudio] = useState<StudioSettings>(() => cloneStudioSettings(initialStudioSettings));
  const studioRef = useRef(studio);

  useEffect(() => {
    const storedStudio = readStoredStudioSettings();
    if (storedStudio) {
      studioRef.current = storedStudio;
      setStudio(storedStudio);
    }

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

  const updateDetails = useCallback((details: StudioDetails) => {
    commitStudio((current) => ({ ...current, details: { ...details } }));
  }, [commitStudio]);

  const updateBranding = useCallback((branding: StudioBranding) => {
    commitStudio((current) => ({
      ...current,
      branding: { ...branding, logoOptions: [...branding.logoOptions] },
    }));
  }, [commitStudio]);

  const updateProductionDefaults = useCallback((production: StudioProductionDefaults) => {
    commitStudio((current) => ({
      ...current,
      production: {
        ...production,
        clientPortal: { ...production.clientPortal },
      },
    }));
  }, [commitStudio]);

  const updateStaffAccess = useCallback((staffAccess: StudioStaffAccess[]) => {
    commitStudio((current) => ({
      ...current,
      staffAccess: staffAccess.map((staffMember) => ({ ...staffMember })),
    }));
  }, [commitStudio]);

  const updateNotificationSettings = useCallback((notifications: StudioNotificationSettings) => {
    commitStudio((current) => ({
      ...current,
      notifications: cloneStudioNotificationSettings(notifications),
    }));
  }, [commitStudio]);

  const applyOnboardingSetup = useCallback((draft: StudioReviewDraft) => {
    commitStudio((current) => ({
      ...current,
      details: {
        ...current.details,
        name: draft.studioName,
        legalName: `${draft.studioName} Pty Ltd`,
        studioType: draft.studioType,
      },
      branding: {
        logoPreviewUrl: draft.logoPreviewUrl,
        logoOptions: [...draft.logoOptions],
        brandAccentId: draft.brandAccentId,
      },
    }));
  }, [commitStudio]);

  const value = useMemo<StudioSettingsContextValue>(() => ({
    studio,
    updateDetails,
    updateBranding,
    updateProductionDefaults,
    updateNotificationSettings,
    updateStaffAccess,
    applyOnboardingSetup,
  }), [applyOnboardingSetup, studio, updateBranding, updateDetails, updateNotificationSettings, updateProductionDefaults, updateStaffAccess]);

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
      notifications: storedStudio.notifications
        ? cloneStudioNotificationSettings(storedStudio.notifications)
        : cloneStudioNotificationSettings(initialStudioNotificationSettings),
    });
  } catch {
    window.localStorage.removeItem(studioSettingsStorageKey);
    return null;
  }
}
