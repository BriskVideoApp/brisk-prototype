"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { DialogSurface, type DialogSize } from "./DialogSurface";

interface EditingDialogProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onCancel: () => void;
  /** Include Cancel and the form's original actions, validation and callbacks. */
  actions?: ReactNode;
  size?: DialogSize;
}

/** The approved editing pattern. Actions remain visible while the form scrolls. */
export function EditingDialog({ title, description, children, onCancel, actions, size = "standard" }: EditingDialogProps) {
  return <DialogSurface
    title={title}
    description={description}
    size={size}
    initialFocus="field"
    onCancel={onCancel}
    actions={actions ?? <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>}
  >{children}</DialogSurface>;
}
