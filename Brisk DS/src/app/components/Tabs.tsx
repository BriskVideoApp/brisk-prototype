'use client';

import { useId, useRef, type ComponentPropsWithRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './QuietChoices.module.css';

interface TabOption<Value extends string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
}

interface TabsProps<Value extends string> extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onChange'> {
  label: string;
  value: Value;
  options: readonly TabOption<Value>[];
  onValueChange: (value: Value) => void;
  children: ReactNode;
}

export function Tabs<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  children,
  className = '',
  ...props
}: TabsProps<Value>) {
  const id = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex(option => option.value === value);

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = options.flatMap((option, optionIndex) => option.disabled ? [] : [optionIndex]);
    const position = enabled.indexOf(index);
    const direction = event.currentTarget.closest('[dir]')?.getAttribute('dir') === 'rtl' ? -1 : 1;
    let next: number | undefined;

    if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    else if (event.key === 'ArrowRight') next = enabled[(position + direction + enabled.length) % enabled.length];
    else if (event.key === 'ArrowLeft') next = enabled[(position - direction + enabled.length) % enabled.length];
    else return;

    if (next === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onValueChange(options[next].value);
  };

  return (
    <div {...props} data-brisk-tabs="" className={`${styles.tabs} ${className}`}>
      <div className={styles.tabList} role="tablist" aria-label={label} aria-orientation="horizontal">
        {options.map((option, index) => (
          <button
            className={`${styles.choice} ${styles.tab} label-s-semibold`}
            key={option.value}
            ref={button => { buttons.current[index] = button; }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={value === option.value}
            aria-controls={`${id}-panel`}
            tabIndex={value === option.value ? 0 : -1}
            disabled={option.disabled}
            data-brisk-tab=""
            onClick={() => onValueChange(option.value)}
            onKeyDown={event => navigate(event, index)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={selectedIndex >= 0 ? `${id}-tab-${selectedIndex}` : undefined} tabIndex={0} className={styles.panel}>
        {children}
      </div>
    </div>
  );
}
