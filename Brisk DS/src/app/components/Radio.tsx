import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Radio.module.css';

interface RadioProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  label?: ReactNode;
  wrapperClassName?: string;
}

export function Radio({
  label,
  className = '',
  wrapperClassName = '',
  disabled = false,
  ...inputProps
}: RadioProps) {
  return (
    <label className={`${styles.root} ${wrapperClassName}`} data-brisk-radio="">
      <input
        {...inputProps}
        type="radio"
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
