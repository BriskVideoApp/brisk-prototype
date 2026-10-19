import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Toggle.module.css';

interface ToggleProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children' | 'role'> {
  label?: ReactNode;
  wrapperClassName?: string;
}

export function Toggle({
  label,
  className = '',
  wrapperClassName = '',
  disabled = false,
  ...inputProps
}: ToggleProps) {
  return (
    <label className={`${styles.root} ${wrapperClassName}`} data-brisk-toggle="">
      <input
        {...inputProps}
        type="checkbox"
        role="switch"
        disabled={disabled}
        className={`${styles.input} ${className}`}
      />
      <span className={styles.control} aria-hidden="true" />
      {label !== undefined && label !== null && label !== false && label !== '' ? (
        <span className={`${styles.label} label-s`}>{label}</span>
      ) : null}
    </label>
  );
}
