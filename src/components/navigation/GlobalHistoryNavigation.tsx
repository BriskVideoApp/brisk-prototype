"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { canRoleSeeNavigationItem, getNavigationItem } from "@/components/navigation/navigationConfig";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { DsIcon } from "@/components/video-review/DsIcon";
import { canViewProject } from "@/data/prototype-access";
import type { ScopedProject } from "@/data/prototype-state";

const recentPagesStorageKey = "brisk-recent-pages-v2";

// Retain the existing storage shape, including icons from previously visited pages.
type RecentPage = { href: string; label: string; icon: string };

export function GlobalHistoryNavigation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { selectedRole, allPages } = usePrototypeRole();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const currentHref = search ? `${pathname}?${search}` : pathname;
  const currentItem = getNavigationItem(pathname, search);

  useEffect(() => {
    setIsOpen(false);
    if (!currentItem) {
      setRecentPages(readRecentPages());
      return;
    }
    const currentPage: RecentPage = { href: currentHref, label: currentItem.label, icon: currentItem.icon };
    const nextPages = [currentPage, ...readRecentPages().filter((page) => page.href !== currentHref)].slice(0, 12);
    window.localStorage.setItem(recentPagesStorageKey, JSON.stringify(nextPages));
    setRecentPages(nextPages);
  }, [currentHref, currentItem]);

  // A role switch must not leave an already-open menu showing the previous role's links.
  useEffect(() => setIsOpen(false), [selectedRole, allPages]);

  const options = recentPages.filter((page) => {
    if (page.href === currentHref) return false;
    const [recentPathname, recentSearch = ""] = page.href.split("?");
    const item = getNavigationItem(recentPathname, recentSearch);
    if (!item || !canRoleSeeNavigationItem(item, selectedRole, allPages)) return false;
    const projectId = getRecentProjectId(recentPathname, new URLSearchParams(recentSearch));
    if (!projectId) return true;
    const project = state.projects.find((candidate) => candidate.id === projectId);
    // Contextual labels must not reveal another role's previously viewed project.
    return Boolean(project && canViewProject(viewer, project, state));
  }).map((page) => ({ value: page.href, href: page.href, label: getRecentPageLabel(page, state.projects) }));

  return <nav className="app-global-history-navigation" aria-label="Navigation history">
    <IconButton size="M" aria-label="Go back" tooltip="Back" tooltipPlacement="bottom" tooltipAlign="start" onClick={() => window.history.back()}>
      <DsIcon name="arrow-left" />
    </IconButton>
    <IconButton size="M" className="app-global-history-forward" aria-label="Go forward" tooltip="Forward" tooltipPlacement="bottom" onClick={() => window.history.forward()}>
      <DsIcon name="arrow-left" />
    </IconButton>
    <BriskSelect
      ariaLabel="Recent pages"
      mode="action"
      value=""
      placeholder="Recent pages"
      clearable={false}
      options={options}
      emptyLabel="No recent pages yet."
      open={isOpen}
      onOpenChange={setIsOpen}
      onChange={() => {}}
      actionTrigger={(props) => <IconButton {...props} size="M" aria-label="Recent pages" tooltipPlacement="bottom">
        <DsIcon name="clock-clockwise" />
      </IconButton>}
    />
  </nav>;
}

function getRecentPageLabel(page: RecentPage, projects: readonly ScopedProject[]) {
  const [pathname, search = ""] = page.href.split("?");
  const params = new URLSearchParams(search);
  const item = getNavigationItem(pathname, search);
  const projectId = getRecentProjectId(pathname, params);
  const project = projects.find((candidate) => candidate.id === projectId);
  const context: string[] = [];
  if (project) context.push(`${project.clientName} - ${project.name}`);
  const peopleView = pathname === "/people" ? params.get("view") : null;
  if (peopleView) {
    context.push(peopleView === "Clients" ? "Client contacts" : peopleView);
  }
  if (params.get("preview") === "empty") context.push("Empty preview");
  return [item?.label ?? page.label, ...context].join(" - ");
}

function getRecentProjectId(pathname: string, params: URLSearchParams) {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? params.get("project");
}

function readRecentPages(): RecentPage[] {
  try {
    const stored = window.localStorage.getItem(recentPagesStorageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is RecentPage => {
      if (!value || typeof value !== "object") return false;
      const page = value as Record<string, unknown>;
      return typeof page.href === "string" && typeof page.label === "string" && typeof page.icon === "string";
    });
  } catch {
    return [];
  }
}
