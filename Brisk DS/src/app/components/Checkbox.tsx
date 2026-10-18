"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { DsIcon } from '@/components/video-review/DsIcon';
import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'onChange' | 'children'> {
  label?: ReactNode;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  checkedIcon?: ReactNode;
  indeterminateIcon?: ReactNode;
  wrapperClassName?: string;
}

export function Checkbox({
  label,
  checked,
  defaultChecked = false,
  indeterminate = false,
  onChange,
  onKeyDown,
  disabled = false,
  checkedIcon = <DsIcon name="check" size={14} />,
  indeterminateIcon = <span className={styles.mixed} />,
  className = '',
  wrapperClassName = '',
  ref,
  ...inputProps
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const isChecked = checked ?? uncontrolledChecked;
  const setInputRef = useCallback((element: HTMLInputElement | null) => {
    inputRef.current = element;
    if (typeof ref === 'function') return ref(element);
    if (ref) ref.current = element;
  }, [ref]);

  // ARIA alone does not set the native mixed state.
  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  });

  return (
    <label className={`${styles.root} ${wrapperClassName}`} data-brisk-checkbox="" data-disabled={disabled}>
      <input
        {...inputProps}
        ref={setInputRef}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : isChecked}
        data-indeterminate={indeterminate}
        className={`${styles.input} ${className}`}
        onChange={(event) => {
          if (disabled) return;
          if (checked === undefined) setUncontrolledChecked(event.target.checked);
          onChange?.(event.target.checked);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Retain the existing Enter shortcut; Space uses the native checkbox action.
          if (!event.defaultPrevented && event.key === 'Enter' && !disabled) {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
      <span className={styles.control} aria-hidden="true">
        {indeterminate ? indeterminateIcon : isChecked ? checkedIcon : null}
      </span>
      {label !== undefined && label !== null && label !== false && label !== '' ? (
        <span className={`${styles.label} label-s`}>{label}</span>
      ) : null}
    </label>
  );
}
