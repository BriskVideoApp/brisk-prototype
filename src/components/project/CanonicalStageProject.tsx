"use client";

import Link from "next/link";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { getProjectFixture } from "@/data/project-fixtures";
import { selectProject, selectProjectBrief } from "@/data/prototype-state";

export type RouteQuery = Record<string, string | string[] | undefined>;

export function useCanonicalStageProject(projectId: string) {
  const { state, hasHydrated } = usePrototypeState();
  return {
    project: selectProject(state, projectId) ?? getProjectFixture(projectId),
    projectBrief: selectProjectBrief(state, projectId),
    hasHydrated,
  };
}

export function ProjectUnavailable() {
  return (
    <main className="client-not-found">
      <h1 className="headings-s-bold">Project unavailable</h1>
      <p className="paragraph-s">This project is not part of the active Studio workspace.</p>
      <Link className="client-secondary-button label-s-semibold" href="/active-videos">Back to Videos</Link>
    </main>
  );
}

export function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
