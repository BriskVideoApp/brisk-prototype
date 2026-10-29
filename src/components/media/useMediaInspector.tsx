"use client";

import { useRef, useState, type RefObject } from "react";
import { useConfirmation } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
import type { MediaAssetDrawerTab } from "./MediaAssetDrawer";

type OpenOptions = { opener?: HTMLElement | null; keyboard?: boolean };

export function useMediaInspector(
  workspaceRef: RefObject<HTMLDivElement | null>,
  activeId: string | null,
  setActiveId: (id: string | null) => void,
  setTab: (tab: MediaAssetDrawerTab) => void,
) {
  const [commentDraft, setCommentDraft] = useState("");
  const openerRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(false);
  const { confirm, confirmationDialog } = useConfirmation();

  const guardTransition = async (action: () => void) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      if (commentDraft.trim() && !await confirm({
        title: "Discard unsent comment?",
        description: "Your comment has not been posted. Discard it to leave this file, or keep editing.",
        cancelLabel: "Keep editing",
        confirmLabel: "Discard comment",
        tone: "danger",
      })) return;
      setCommentDraft("");
      action();
    } finally {
      pendingRef.current = false;
    }
  };

  const open = (id: string, tab: MediaAssetDrawerTab, options: OpenOptions = {}) => {
    const opener = options.opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const keyboard = options.keyboard ?? Boolean(opener?.matches(":focus-visible"));
    const apply = () => {
      if (!opener?.closest(".media-inspector")) openerRef.current = opener;
      setActiveId(id);
      setTab(tab);
      if (keyboard) requestAnimationFrame(() => workspaceRef.current?.querySelector<HTMLElement>("[aria-label='Close asset drawer']")?.focus({ preventScroll: true }));
    };
    if (id === activeId) apply();
    else void guardTransition(apply);
  };

  const close = () => void guardTransition(() => {
    const workspace = workspaceRef.current;
    const fallback = activeId ? workspace?.querySelector<HTMLElement>(`[data-media-asset-id="${CSS.escape(activeId)}"]`) : null;
    const target = openerRef.current?.isConnected ? openerRef.current : fallback;
    const scrolls: { element: HTMLElement; top: number; left: number }[] = [];
    for (let element: HTMLElement | null = workspace ?? null; element; element = element.parentElement) {
      scrolls.push({ element, top: element.scrollTop, left: element.scrollLeft });
    }
    const list = workspace?.querySelector<HTMLElement>(".media-list-scroll");
    if (list) scrolls.push({ element: list, top: list.scrollTop, left: list.scrollLeft });
    setActiveId(null);
    requestAnimationFrame(() => {
      for (const { element, top, left } of scrolls) element.scrollTo({ top, left, behavior: "instant" });
      (target?.isConnected ? target : workspace?.querySelector<HTMLElement>(".media-assets-region"))?.focus({ preventScroll: true });
    });
  });

  return { commentDraft, setCommentDraft, open, close, guardTransition, confirmationDialog };
}
