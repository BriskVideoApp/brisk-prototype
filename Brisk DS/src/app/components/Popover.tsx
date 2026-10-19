"use client";

import { createPortal } from "react-dom";
import { useCallback, useId, useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Popover.module.css";

type PopoverTriggerProps = Pick<ComponentPropsWithRef<"button">, "ref" | "onClick" | "onKeyDown" | "aria-controls" | "aria-expanded" | "aria-haspopup">;

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  footer?: (close: () => void) => ReactNode;
}

const focusableSelector = "button:not(:disabled), input:not(:disabled):not([type='hidden']), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']";

function getControls(scope: ParentNode) {
  return Array.from(scope.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.tabIndex >= 0 && !element.closest("[inert], [hidden], [aria-hidden='true']") && element.getClientRects().length > 0);
}

/** Non-modal, anchored settings. Fields retain native keyboard behaviour. */
export function Popover({ open, onOpenChange, title, description, trigger, children, footer }: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const close = useCallback((returnFocus = false) => {
    onOpenChangeRef.current(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const opener = triggerRef.current;
    const panel = panelRef.current;
    if (!opener || !panel) return;

    const positionPanel = () => {
      const rect = opener.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      const tokens = getComputedStyle(panel);
      const padding = parseFloat(tokens.getPropertyValue("--brisk-space-s"));
      const gap = parseFloat(tokens.getPropertyValue("--brisk-space-s"));
      const preferredWidth = parseFloat(tokens.getPropertyValue("--brisk-space-3xl")) * 8;
      const panelWidth = Math.min(preferredWidth, width - padding * 2);
      const preferredHeight = panel.scrollHeight - (bodyRef.current?.clientHeight ?? 0) + (bodyRef.current?.scrollHeight ?? 0) + panel.offsetHeight - panel.clientHeight;
      const below = top + height - rect.bottom - gap - padding;
      const above = rect.top - top - gap - padding;
      const openAbove = below < preferredHeight && above > below;
      const availableHeight = Math.max(0, openAbove ? above : below);

      setPosition({
        width: panelWidth,
        left: Math.max(left + padding, Math.min(rect.right - panelWidth, left + width - panelWidth - padding)),
        top: openAbove ? Math.max(top + padding, rect.top - gap - Math.min(preferredHeight, availableHeight)) : rect.bottom + gap,
        maxHeight: availableHeight,
      });
    };

    const isInside = (target: EventTarget | null) => target instanceof Node && (panel.contains(target) || opener.contains(target));
    const onPointerDown = (event: PointerEvent) => { if (!isInside(event.target)) close(); };
    const onFocusIn = (event: FocusEvent) => { if (!isInside(event.target)) close(); };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };
    positionPanel();
    const frame = requestAnimationFrame(() => getControls(panel)[0]?.focus());
    const observer = new ResizeObserver(positionPanel);
    observer.observe(opener);
    if (bodyRef.current) observer.observe(bodyRef.current);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Keep portalled fields in the opener's logical Tab order, without a modal trap.
  const handleTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || event.nativeEvent.isComposing || !panelRef.current) return;
    const controls = getControls(panelRef.current);
    const index = controls.indexOf(event.target as HTMLElement);
    const next = controls[index + (event.shiftKey ? -1 : 1)];
    if (next) { event.preventDefault(); next.focus(); return; }
    event.preventDefault();
    if (event.shiftKey) { close(true); return; }
    const scope = triggerRef.current?.closest("dialog") ?? document;
    const pageControls = getControls(scope).filter((element) => !panelRef.current?.contains(element));
    const openerIndex = pageControls.indexOf(triggerRef.current!);
    close();
    (pageControls[openerIndex + 1] ?? triggerRef.current)?.focus();
  };

  return <>
    {trigger({
      ref: triggerRef,
      "aria-expanded": open,
      "aria-controls": open ? id : undefined,
      "aria-haspopup": "dialog",
      onClick: () => onOpenChange(!open),
      onKeyDown: (event) => {
        if (event.key === "ArrowDown" && !open) { event.preventDefault(); onOpenChange(true); }
      },
    })}
    {open && triggerRef.current ? createPortal(
      <div
        className={styles.surface}
        ref={panelRef}
        id={id}
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        style={position ?? { visibility: "hidden" }}
        onKeyDown={handleTab}
        data-brisk-popover=""
      >
        <header className={styles.header}>
          <strong className="label-s-semibold" id={`${id}-title`}>{title}</strong>
          {description ? <span className={`${styles.description} label-xs`} id={`${id}-description`}>{description}</span> : null}
        </header>
        <div className={styles.body} ref={bodyRef}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer(() => close(true))}</footer> : null}
      </div>, triggerRef.current.closest("dialog") ?? document.body,
    ) : null}
  </>;
}
