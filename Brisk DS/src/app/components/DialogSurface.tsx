"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./DialogSurface.module.css";

export type DialogSize = "compact" | "standard" | "expanded" | "wide" | "full";

interface DialogSurfaceProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  onCancel: () => void;
  size?: DialogSize;
  initialFocus?: "field" | "action";
}

/** Shared presentation and keyboard behaviour for Brisk dialogs. No close icon. */
export function DialogSurface({ title, description, children, actions, onCancel, size = "standard", initialFocus = "action" }: DialogSurfaceProps) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    const explicitField = element.querySelector<HTMLElement>("[data-dialog-autofocus], [data-confirmation-autofocus], [autofocus]");
    const firstField = initialFocus === "field"
      ? element.querySelector<HTMLElement>('input:not(:disabled):not([type="hidden"]):not([type="file"]), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"]')
      : null;
    (explicitField ?? firstField ?? actionsRef.current?.querySelector<HTMLElement>("button:not(:disabled)"))?.focus();
    return () => {
      element.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [initialFocus]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[size]}`}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current();
      }}
      onKeyDown={(event) => { if (event.key === "Escape") event.stopPropagation(); }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
      }}
    >
      <header className={styles.header}>
        <h2 className="headings-xs-bold" id={`${id}-title`}>{title}</h2>
        {description ? <div className="paragraph-s" id={`${id}-description`}>{description}</div> : null}
      </header>
      {children ? <div className={`${styles.content} paragraph-s`}>{children}</div> : null}
      <footer className={styles.actions} ref={actionsRef}>{actions}</footer>
    </dialog>,
    document.body,
  );
}
