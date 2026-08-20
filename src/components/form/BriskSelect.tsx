"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type BriskSelectOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: DsIconName;
  dividerAbove?: boolean;
};

type BriskSelectSharedProps<T extends string> = {
  ariaLabel: string;
  autoOpen?: boolean;
  className?: string;
  clearLabel?: string;
  clearable?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  options: ReadonlyArray<BriskSelectOption<T>>;
  placeholder: string;
  searchable?: boolean;
  triggerClassName?: string;
};

type BriskSelectSingleProps<T extends string> = BriskSelectSharedProps<T> & {
  multiple?: false;
  onChange: (value: T | "") => void;
  value: T | "";
};

type BriskSelectMultipleProps<T extends string> = BriskSelectSharedProps<T> & {
  multiple: true;
  onChange: (value: T[]) => void;
  selectionLabel?: (selectedOptions: ReadonlyArray<BriskSelectOption<T>>) => string;
  value: T[];
};

type BriskSelectProps<T extends string> = BriskSelectSingleProps<T> | BriskSelectMultipleProps<T>;

export function BriskSelect<T extends string>(props: BriskSelectProps<T>) {
  const {
    ariaLabel,
    autoOpen = false,
    className = "",
    clearLabel = "Clear selection",
    clearable = true,
    onOpenChange,
    options,
    placeholder,
    triggerClassName = "",
  } = props;
  const searchable = props.searchable ?? options.length > 7;
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selectedValues: T[] = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const triggerLabel = selectedOptions.length === 0
    ? placeholder
    : props.multiple && selectedOptions.length > 1
      ? props.selectionLabel?.(selectedOptions) ?? `${selectedOptions.length} selected`
      : selectedOptions[0].label;
  const filteredOptions = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return normalisedQuery ? options.filter((option) => option.label.toLowerCase().includes(normalisedQuery)) : options;
  }, [options, query]);

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const triggerGap = 4;
    const preferredHeight = Math.min(520, (options.length * 40) + (searchable ? 48 : 8));
    const minimumHeight = 112;
    const preferredWidth = Math.min(320, Math.max(192, rect.width));
    const width = Math.min(preferredWidth, window.innerWidth - (viewportPadding * 2));
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const spaceBelow = window.innerHeight - rect.bottom - triggerGap - viewportPadding;
    const spaceAbove = rect.top - triggerGap - viewportPadding;
    const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.max(64, Math.min(preferredHeight, openAbove ? spaceAbove : spaceBelow));

    setMenuStyle({
      bottom: openAbove ? window.innerHeight - rect.top + triggerGap : undefined,
      left,
      maxHeight: availableHeight,
      top: openAbove ? undefined : rect.bottom + triggerGap,
      width,
    });
  };

  const openMenu = (nextActiveIndex = Math.max(0, options.findIndex((option) => selectedValues.includes(option.value)))) => {
    setActiveIndex(nextActiveIndex);
    setQuery("");
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    setQuery("");
    onOpenChange?.(false);
    if (returnFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectOption = (nextValue: T | "") => {
    if (props.multiple) {
      if (!nextValue) props.onChange([]);
      else props.onChange(selectedValues.includes(nextValue) ? selectedValues.filter((value) => value !== nextValue) : [...selectedValues, nextValue]);
      return;
    }
    props.onChange(nextValue);
    closeMenu(true);
  };

  useEffect(() => {
    if (autoOpen) openMenu();
  }, [autoOpen]);

  useEffect(() => {
    if (!isOpen) return;
    positionMenu();
    const updatePosition = () => positionMenu();
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.requestAnimationFrame(() => (searchable ? searchRef.current : menuRef.current)?.focus());
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [isOpen, searchable]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, filteredOptions.length - 1)));
  }, [filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) return;
    const optionsElement = optionsRef.current;
    const activeOption = optionsElement?.querySelector<HTMLElement>("[data-active='true']");
    if (!optionsElement || !activeOption) return;
    const optionTop = activeOption.offsetTop;
    const optionBottom = optionTop + activeOption.offsetHeight;
    if (optionTop < optionsElement.scrollTop) optionsElement.scrollTop = optionTop;
    else if (optionBottom > optionsElement.scrollTop + optionsElement.clientHeight) optionsElement.scrollTop = optionBottom - optionsElement.clientHeight;
  }, [activeIndex, isOpen]);

  const handleMenuKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(current + 1, filteredOptions.length - 1) : Math.max(current - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    } else if (event.key === "Enter" && filteredOptions[activeIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex].value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    }
  };

  return <div className={`brisk-select ${className}`}>
    <button
      className={`brisk-select-trigger label-s ${selectedOptions.length ? "" : "is-placeholder"} ${triggerClassName}`}
      ref={triggerRef}
      type="button"
      aria-controls={isOpen ? listboxId : undefined}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      onClick={() => isOpen ? closeMenu() : openMenu()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openMenu(event.key === "ArrowDown" ? 0 : options.length - 1);
        }
      }}
    >
      <span>{triggerLabel}</span>
      <DsIcon name="caret-down" size={12} />
    </button>
    {isOpen ? createPortal(<div className="brisk-select-menu" ref={menuRef} style={menuStyle} role="listbox" id={listboxId} aria-label={ariaLabel} aria-multiselectable={props.multiple || undefined} tabIndex={-1} onKeyDown={handleMenuKeyDown}>
      {searchable ? <label className="brisk-select-search"><span className="sr-only">Search {ariaLabel.toLowerCase()}</span><DsIcon name="search" size={15} /><input ref={searchRef} type="search" placeholder="Search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} /></label> : null}
      <div className="brisk-select-options" ref={optionsRef}>
        {filteredOptions.map((option, index) => {
          const isSelected = selectedValues.includes(option.value);
          return <button className={`brisk-select-option label-s ${isSelected ? "selected" : ""} ${index === activeIndex ? "active" : ""} ${option.dividerAbove ? "has-divider" : ""}`} type="button" role="option" aria-selected={isSelected} data-active={index === activeIndex} key={option.value} onMouseEnter={() => setActiveIndex(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} onClick={() => selectOption(option.value)}><span className="brisk-select-option-label">{option.icon ? <DsIcon name={option.icon} size={16} /> : null}<span>{option.label}</span></span>{isSelected ? <DsIcon name="check" size={14} /> : null}</button>;
        })}
        {filteredOptions.length === 0 ? <span className="brisk-select-empty label-s">No matching options</span> : null}
      </div>
      {props.multiple ? <div className="brisk-select-menu-actions">{clearable && selectedValues.length ? <button className="brisk-select-clear label-xs-semibold" type="button" onClick={() => selectOption("")}>{clearLabel}</button> : <span />}
        <button className="brisk-select-done label-xs-semibold" type="button" onClick={() => closeMenu(true)}>Done</button>
      </div> : clearable && selectedValues.length ? <button className="brisk-select-clear label-xs-semibold" type="button" onClick={() => selectOption("")}>{clearLabel}</button> : null}
    </div>, document.body) : null}
  </div>;
}
