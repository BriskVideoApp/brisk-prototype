import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './QuietChoices.module.css';

interface FilterGroupProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  'aria-label': string;
}

export function FilterGroup({ className = '', ...props }: FilterGroupProps) {
  return <div {...props} role="group" data-brisk-filter-group="" className={`${styles.filters} ${className}`} />;
}

interface FilterButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'aria-pressed'> {
  selected: boolean;
  count?: ReactNode;
}

export function FilterButton({
  selected,
  count,
  children,
  type = 'button',
  className = '',
  ...props
}: FilterButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      data-brisk-filter=""
      className={`${styles.choice} label-s-semibold ${className}`}
    >
      {children}
      {count !== undefined && count !== null ? <span className={`${styles.count} label-xs`}>{count}</span> : null}
    </button>
  );
}
