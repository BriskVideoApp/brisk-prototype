"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { MediaViewMode } from "./MediaFilterBar";

type Layout = { docked: boolean; top: number; right: number; height: number };

/** Measure the space owned by Media, rather than infer it from the window width. */
export function useMediaInspectorLayout(workspaceRef: RefObject<HTMLDivElement | null>, open: boolean, viewMode: MediaViewMode) {
  const [layout, setLayout] = useState<Layout>({ docked: false, top: 0, right: 0, height: 0 });

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || !open) return;
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      const content = workspace.closest<HTMLElement>(".app-shell-content");
      const contentBounds = content?.getBoundingClientRect();
      const top = Math.max(bounds.top, contentBounds?.top ?? 0);
      const bottom = Math.min(window.innerHeight, contentBounds?.bottom ?? window.innerHeight);
      const locationWidth = Array.from(workspace.children)
        .filter((child) => child.matches(".media-project-rail, .media-folder-rail"))
        .reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);
      const style = getComputedStyle(workspace);
      const inspectorWidth = parseFloat(style.getPropertyValue("--media-inspector-width"));
      const region = workspace.querySelector<HTMLElement>(".media-assets-region");
      const regionStyle = region ? getComputedStyle(region) : null;
      const padding = regionStyle ? parseFloat(regionStyle.paddingLeft) + parseFloat(regionStyle.paddingRight) : 0;
      const grid = workspace.querySelector<HTMLElement>(".media-card-grid");
      const gap = grid ? parseFloat(getComputedStyle(grid).columnGap) : 0;
      const cardMinimum = parseFloat(style.getPropertyValue("--media-card-min-width"));
      const table = workspace.querySelector<HTMLElement>(".media-list-table");
      // A list keeps its existing table minimum and horizontal scrolling contract.
      const minimum = viewMode === "list" && table
        ? parseFloat(getComputedStyle(table).minWidth) + padding
        : cardMinimum * 2 + gap + padding;
      const next = {
        docked: window.innerWidth > 860 && bounds.width - locationWidth - inspectorWidth >= minimum,
        top,
        right: Math.max(0, window.innerWidth - bounds.right),
        height: Math.max(0, bottom - top),
      };
      setLayout((current) => Object.keys(next).every((key) => current[key as keyof Layout] === next[key as keyof Layout]) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    for (const child of workspace.children) {
      if (child.matches(".media-project-rail, .media-folder-rail")) observer.observe(child);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [workspaceRef, open, viewMode]);

  const style: CSSProperties & Record<`--media-inspector-${string}`, string> = {
    "--media-inspector-top": `${layout.top}px`,
    "--media-inspector-right": `${layout.right}px`,
    "--media-inspector-height": `${layout.height}px`,
  };
  return { docked: layout.docked, style };
}
