"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/** Keep the specialised time editor anchored within the visible workspace. */
export function useTimeEntryEditorLayout(
  opener: HTMLElement,
  panelRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLDivElement | null>,
  fieldsRef: RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;
    const fields = fieldsRef.current;
    if (!panel || !body || !fields) return;
    const workspace = opener.closest<HTMLElement>(".app-shell-content");

    const measure = () => {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
      const bounds = workspace?.getBoundingClientRect();
      const tokens = getComputedStyle(panel);
      const inset = parseFloat(tokens.getPropertyValue("--brisk-space-l"));
      const gap = parseFloat(tokens.getPropertyValue("--brisk-space-s"));
      const top = Math.max(viewportTop, bounds?.top ?? viewportTop) + inset;
      const bottom = Math.min(viewportBottom, bounds?.bottom ?? viewportBottom) - inset;
      const left = Math.max(viewportLeft, bounds?.left ?? viewportLeft) + inset;
      const right = Math.min(viewportRight, bounds?.right ?? viewportRight) - inset;
      const anchor = opener.getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      const bodyStyle = getComputedStyle(body);
      // Use the natural fields height even when the body currently scrolls.
      const naturalHeight = rect.height - body.getBoundingClientRect().height + fields.getBoundingClientRect().height
        + parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
      const maxHeight = Math.max(0, bottom - top);
      const height = Math.min(naturalHeight, maxHeight);
      const below = bottom - anchor.bottom - gap;
      const above = anchor.top - gap - top;
      const openAbove = below < naturalHeight && above > below;
      const width = Math.min(rect.width, Math.max(0, right - left));
      const next: CSSProperties = {
        top: Math.max(top, Math.min(openAbove ? anchor.top - gap - height : anchor.bottom + gap, bottom - height)),
        left: Math.max(left, Math.min(anchor.left, right - width)),
        maxHeight,
        maxWidth: Math.max(0, right - left),
      };
      setPosition((current) => current && Object.keys(next).every((key) => current[key as keyof CSSProperties] === next[key as keyof CSSProperties]) ? current : next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [opener, panel, fields, ...Array.from(panel.children)]) observer.observe(element);
    if (workspace) observer.observe(workspace);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [opener, panelRef, bodyRef, fieldsRef]);

  return position ?? { visibility: "hidden" };
}
