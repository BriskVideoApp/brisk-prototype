import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'size'> {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size?: 'S' | 'M' | 'L';
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  'data-tooltip'?: string;
}

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'M',
  disabled = false,
  onClick,
  className = '',
  tooltip,
  ...buttonProps
}: ButtonProps) {
  const textStyles = {
    S: 'label-s-semibold',
    M: 'label-m-semibold',
    L: 'label-l-semibold',
  };

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-tooltip={tooltip ?? buttonProps['data-tooltip']}
      aria-description={buttonProps['aria-description'] ?? tooltip}
      data-brisk-button=""
      data-variant={variant}
      data-size={size}
      className={`${styles.button} ${textStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}
