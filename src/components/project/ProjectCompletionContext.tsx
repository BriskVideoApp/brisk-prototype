"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DeliverableStatus } from "@/data/masters";

export type DeliverableApprovalSnapshot = {
  status: DeliverableStatus;
  approvedVersionId?: string;
  currentVersionId?: string;
  approvedVersionIds: string[];
};

export type ProjectCompletionRecord = {
  deliveredAt: string;
  deliveredBy: string;
  undoExpiresAt: string;
  approvedDeliverableIds: string[];
  deliverableSnapshots: Record<string, DeliverableApprovalSnapshot>;
};

type ProjectCompletionContextValue = {
  completionRecords: Record<string, ProjectCompletionRecord>;
  completeProject: (projectId: string, record: ProjectCompletionRecord) => void;
  undoProjectCompletion: (projectId: string) => void;
};

const storageKey = "brisk-project-completions-v4";
const ProjectCompletionContext = createContext<ProjectCompletionContextValue | null>(null);

export function ProjectCompletionProvider({ children }: { children: React.ReactNode }) {
  const [completionRecords, setCompletionRecords] = useState<Record<string, ProjectCompletionRecord>>({});

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      setCompletionRecords(JSON.parse(stored) as Record<string, ProjectCompletionRecord>);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const updateRecords = (updater: (current: Record<string, ProjectCompletionRecord>) => Record<string, ProjectCompletionRecord>) => {
    setCompletionRecords((current) => {
      const next = updater(current);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<ProjectCompletionContextValue>(() => ({
    completionRecords,
    completeProject: (projectId, record) => updateRecords((current) => ({ ...current, [projectId]: record })),
    undoProjectCompletion: (projectId) => updateRecords((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    }),
  }), [completionRecords]);

  return <ProjectCompletionContext.Provider value={value}>{children}</ProjectCompletionContext.Provider>;
}

export function useProjectCompletion() {
  const context = useContext(ProjectCompletionContext);
  if (!context) throw new Error("useProjectCompletion must be used within ProjectCompletionProvider");
  return context;
}
