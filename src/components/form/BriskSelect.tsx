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

export function BriskSelect<T extends string>({
  ariaLabel,
  autoOpen = false,
  clearLabel = "Clear selection",
  clearable = true,
  onChange,
  onOpenChange,
  options,
  placeholder,
  searchable = options.length > 7,
  value,
}: {
  ariaLabel: string;
  autoOpen?: boolean;
  clearLabel?: string;
  clearable?: boolean;
  onChange: (value: T | "") => void;
  onOpenChange?: (isOpen: boolean) => void;
  options: ReadonlyArray<BriskSelectOption<T>>;
  placeholder: string;
  searchable?: boolean;
  value: T | "";
}) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selectedOption = options.find((option) => option.value === value);
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

  const openMenu = (nextActiveIndex = Math.max(0, options.findIndex((option) => option.value === value))) => {
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
    onChange(nextValue);
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

  return <div className="brisk-select">
    <button
      className={`brisk-select-trigger label-s ${selectedOption ? "" : "is-placeholder"}`}
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
      <span>{selectedOption?.label ?? placeholder}</span>
      <DsIcon name="caret-down" size={12} />
    </button>
    {isOpen ? createPortal(<div className="brisk-select-menu" ref={menuRef} style={menuStyle} role="listbox" id={listboxId} aria-label={ariaLabel} tabIndex={-1} onKeyDown={handleMenuKeyDown}>
      {searchable ? <label className="brisk-select-search"><span className="sr-only">Search {ariaLabel.toLowerCase()}</span><DsIcon name="search" size={15} /><input ref={searchRef} type="search" placeholder="Search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} /></label> : null}
      <div className="brisk-select-options" ref={optionsRef}>
        {filteredOptions.map((option, index) => <button className={`brisk-select-option label-s ${option.value === value ? "selected" : ""} ${index === activeIndex ? "active" : ""} ${option.dividerAbove ? "has-divider" : ""}`} type="button" role="option" aria-selected={option.value === value} data-active={index === activeIndex} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectOption(option.value)}><span className="brisk-select-option-label">{option.icon ? <DsIcon name={option.icon} size={16} /> : null}<span>{option.label}</span></span>{option.value === value ? <DsIcon name="check" size={14} /> : null}</button>)}
        {filteredOptions.length === 0 ? <span className="brisk-select-empty label-s">No matching options</span> : null}
      </div>
      {clearable && value ? <button className="brisk-select-clear label-xs-semibold" type="button" onClick={() => selectOption("")}>{clearLabel}</button> : null}
    </div>, document.body) : null}
  </div>;
}
