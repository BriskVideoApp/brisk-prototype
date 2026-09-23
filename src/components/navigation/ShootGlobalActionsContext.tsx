"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { RequestReviewRecipient } from "@/components/share/RequestReviewModal";
import type { ShareAccess, ShareUserRole } from "@/components/share/ShareActionRow";

export type ShootGlobalActions = {
  canApprove: boolean;
  canEdit: boolean;
  customerName: string;
  initialAccess: ShareAccess;
  isApproved: boolean;
  isWaitingOnReview: boolean;
  waitingOnCompany?: string;
  projectName: string;
  projectId: string;
  reviewFingerprint: string;
  shareUrl: string;
  studioName: string;
  userRole: ShareUserRole;
  beforeAction: (action: "copy" | "send" | "approve", proceed: () => void) => void;
  onApprove: () => void;
  onRequestReview: (recipient: RequestReviewRecipient) => void;
  onSendToStudio: () => void;
  onUnapprove: () => void;
};

type ShootGlobalActionsContextValue = {
  actions: ShootGlobalActions | null;
  registerActions: (actions: ShootGlobalActions) => () => void;
};

const ShootGlobalActionsContext = createContext<ShootGlobalActionsContextValue | null>(null);

export function ShootGlobalActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ShootGlobalActions | null>(null);
  const registerActions = useCallback((nextActions: ShootGlobalActions) => {
    setActions(nextActions);
    return () => setActions((current) => current === nextActions ? null : current);
  }, []);
  const value = useMemo(() => ({ actions, registerActions }), [actions, registerActions]);

  return <ShootGlobalActionsContext.Provider value={value}>{children}</ShootGlobalActionsContext.Provider>;
}

export function useShootGlobalActions() {
  const context = useContext(ShootGlobalActionsContext);
  if (!context) throw new Error("useShootGlobalActions must be used within ShootGlobalActionsProvider");
  return context;
}
