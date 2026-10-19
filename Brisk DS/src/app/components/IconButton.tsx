import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'size'> {
  children: ReactNode;
  'aria-label': string;
  size?: 'S' | 'M';
  variant?: 'quiet' | 'secondary';
  shape?: 'square' | 'circle';
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom';
  tooltipAlign?: 'centre' | 'start' | 'end';
  'data-tooltip'?: string;
}

export function IconButton({
  children,
  type = 'button',
  size = 'S',
  variant = 'quiet',
  shape = 'square',
  className = '',
  tooltip,
  tooltipPlacement = 'top',
  tooltipAlign = 'centre',
  ...buttonProps
}: IconButtonProps) {
  const description = tooltip ?? buttonProps['data-tooltip'] ?? buttonProps['aria-label'];

  return (
    <button
      {...buttonProps}
      type={type}
      data-brisk-icon-button=""
      data-size={size}
      data-variant={variant}
      data-shape={shape}
      data-tooltip={description}
      data-tooltip-placement={tooltipPlacement}
      data-tooltip-align={tooltipAlign}
      aria-description={buttonProps['aria-description'] ?? (description !== buttonProps['aria-label'] ? description : undefined)}
      className={`${styles.button} ${className}`}
    >
      <span className={styles.control} aria-hidden="true">
        {children}
      </span>
    </button>
  );
}
