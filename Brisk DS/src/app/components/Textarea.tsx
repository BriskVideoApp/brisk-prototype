"use client";

import { useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import styles from './Textarea.module.css';

interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label?: ReactNode;
  labelSuffix?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  wrapperClassName?: string;
}

export function Textarea({
  id,
  label,
  labelSuffix,
  hint,
  error = false,
  rows = 3,
  className = '',
  wrapperClassName = '',
  disabled = false,
  readOnly = false,
  onChange,
  onBlur,
  ...textareaProps
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = `${textareaId}-hint`;
  const [hasTyped, setHasTyped] = useState(false);
  const hasHint = hint !== undefined && hint !== null && hint !== '' && hint !== false;
  const invalid = error || textareaProps['aria-invalid'] === true || textareaProps['aria-invalid'] === 'true';
  const describedBy = [textareaProps['aria-describedby'], hasHint ? hintId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${wrapperClassName}`}>
      {label && (
        <label className={`${styles.label} label-m-semibold`} htmlFor={textareaId}>
          <span>{label}</span>
          {labelSuffix ? <span className={`${styles.labelSuffix} label-xs`}>{labelSuffix}</span> : null}
        </label>
      )}
      <textarea
        {...textareaProps}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || textareaProps['aria-invalid']}
        aria-describedby={describedBy}
        data-brisk-textarea=""
        data-error={invalid}
        data-typing={hasTyped}
        className={`${styles.textarea} paragraph-s ${className}`}
        onChange={(event) => {
          if (!disabled && !readOnly) setHasTyped(true);
          onChange?.(event);
        }}
        onBlur={(event) => {
          setHasTyped(false);
          onBlur?.(event);
        }}
      />
      {hasHint && <span id={hintId} className={`${styles.hint} label-xs`}>{hint}</span>}
    </div>
  );
}
