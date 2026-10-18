"use client";

import { useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label?: ReactNode;
  labelSuffix?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  size?: 'S' | 'M' | 'L';
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  id,
  label,
  labelSuffix,
  type = 'text',
  onChange,
  onBlur,
  hint,
  error = false,
  size = 'M',
  iconStart,
  iconEnd,
  className = '',
  wrapperClassName = '',
  disabled = false,
  readOnly = false,
  ...inputProps
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [hasTyped, setHasTyped] = useState(false);
  const hintId = `${inputId}-hint`;
  const hasHint = hint !== undefined && hint !== null && hint !== '' && hint !== false;
  const invalid = error || inputProps['aria-invalid'] === true || inputProps['aria-invalid'] === 'true';
  const describedBy = [inputProps['aria-describedby'], hasHint ? hintId : undefined].filter(Boolean).join(' ') || undefined;
  const textStyles = {
    S: 'paragraph-s',
    M: 'paragraph-m',
    L: 'paragraph-l',
  };

  return (
    <div className={`${styles.field} ${wrapperClassName}`}>
      {label && (
        <label className={`${styles.label} label-m-semibold`} htmlFor={inputId}>
          <span>{label}</span>
          {labelSuffix ? <> <span className={`${styles.labelSuffix} label-xs`}>{labelSuffix}</span></> : null}
        </label>
      )}

      <div className={styles.control}>
        {iconStart && (
          <span className={`${styles.icon} ${styles.iconStart}`}>
            {iconStart}
          </span>
        )}

        {iconEnd && (
          <span className={`${styles.icon} ${styles.iconEnd}`}>
            {iconEnd}
          </span>
        )}

        <input
          {...inputProps}
          id={inputId}
          type={type}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid || inputProps['aria-invalid']}
          aria-describedby={describedBy}
          data-brisk-input=""
          data-size={size}
          data-error={invalid}
          data-typing={hasTyped}
          data-icon-start={Boolean(iconStart)}
          data-icon-end={Boolean(iconEnd)}
          onChange={(event) => {
            if (!disabled && !readOnly) setHasTyped(true);
            onChange?.(event);
          }}
          onBlur={(event) => {
            setHasTyped(false);
            onBlur?.(event);
          }}
          className={`${styles.input} ${textStyles[size]} ${className}`}
        />
      </div>

      {hasHint && (
        <span id={hintId} className={`${styles.hint} label-xs`}>
          {hint}
        </span>
      )}
    </div>
  );
}
