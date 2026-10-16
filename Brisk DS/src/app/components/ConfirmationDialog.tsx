"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DialogSurface } from "./DialogSurface";
import { Button } from "./Button";
import styles from "./ConfirmationDialog.module.css";

export interface ConfirmationDialogProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "primary" | "danger";
  expanded?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
  /** For confirmations with more than two actions. Use DS Buttons, size S. */
  actions?: ReactNode;
}

/** The approved Brisk confirmation pattern, with an expanded content slot. */
export function ConfirmationDialog({
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  expanded = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
  actions,
}: ConfirmationDialogProps) {
  return <DialogSurface
    title={title}
    description={description}
    size={expanded ? "expanded" : "compact"}
    onCancel={onCancel}
    actions={actions ?? <>
      <Button size="S" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
      <Button size="S" variant={tone} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
    </>}
  >{children ? <div className={`${styles.content} paragraph-s`}>{children}</div> : null}</DialogSurface>;
}

type ConfirmationRequest = Omit<ConfirmationDialogProps, "onConfirm" | "onCancel" | "actions">;

/** Replaces browser confirm prompts without changing the action that follows. */
export function useConfirmation() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);
  const finish = useCallback((accepted: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setRequest(null);
    resolve?.(accepted);
  }, []);
  useEffect(() => () => {
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);
  const confirm = useCallback((next: ConfirmationRequest) => new Promise<boolean>((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    setRequest(next);
  }), []);
  return {
    confirm,
    confirmationDialog: request
      ? <ConfirmationDialog {...request} onCancel={() => finish(false)} onConfirm={() => finish(true)} />
      : null,
  };
}
