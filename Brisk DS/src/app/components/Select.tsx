"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, type ComponentPropsWithRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type BriskSelectOption<T extends string = string> = {
  value: T;
  label: string;
  triggerLabel?: string;
  icon?: DsIconName;
  logoSrc?: string;
  dividerAbove?: boolean;
  description?: string;
  content?: ReactNode;
  group?: string;
  searchText?: string;
  /** Action menus only. Disabled commands stay visible but cannot be invoked. */
  disabled?: boolean;
  /** Preserve native explanations for unavailable commands. */
  title?: string;
  /** Action menus only. Styling does not change confirmation or deletion behaviour. */
  tone?: "default" | "danger";
};

type ActionTriggerProps = Pick<ComponentPropsWithRef<"button">, "ref" | "disabled" | "onClick" | "onKeyDown" | "aria-controls" | "aria-expanded" | "aria-haspopup" | "aria-label">;

export type BriskActionContext = {
  x: number;
  y: number;
  anchor: HTMLElement | null;
  fallbackFocus?: HTMLElement | null;
  keyboard?: boolean;
};

type BriskSelectSharedProps<T extends string> = {
  ariaLabel: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  name?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Actions share the menu surface but do not represent a saved field value. */
  mode?: "select" | "action";
  /** Action-mode adapters retain the caller's existing trigger or context anchor. */
  actionTrigger?: (props: ActionTriggerProps) => ReactNode;
  actionContext?: BriskActionContext;
  /** Opt-in width for short action labels; ordinary fields are unaffected. */
  actionMenuSize?: "default" | "compact";
  /** Capture a stable focus target before a command removes its own trigger. */
  actionFallbackFocus?: (trigger: HTMLButtonElement | null) => HTMLElement | null;
  open?: boolean;
  footer?: ReactNode;
  hideCaret?: boolean;
  initialQuery?: string;
  onSearchChange?: (query: string) => void;
  autoOpen?: boolean;
  className?: string;
  clearLabel?: string;
  clearable?: boolean;
  footerAction?: {
    label: string;
    icon?: DsIconName;
    keepOpen?: boolean;
    onSelect: (trigger: HTMLButtonElement | null) => void;
  };
  onOpenChange?: (isOpen: boolean) => void;
  options: ReadonlyArray<BriskSelectOption<T>>;
  placeholder: string;
  /** Filter category labels remain readable when no value is selected. */
  placeholderTone?: "hint" | "label";
  searchable?: boolean;
  showSelectedIcon?: boolean;
  triggerContent?: ReactNode;
  triggerClassName?: string;
  tooltip?: string;
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

export type BriskSelectProps<T extends string> = BriskSelectSingleProps<T> | BriskSelectMultipleProps<T>;

export function BriskSelect<T extends string>(props: BriskSelectProps<T>) {
  const {
    ariaLabel,
    id,
    disabled = false,
    invalid = false,
    required = false,
    name,
    searchPlaceholder = "Search",
    emptyLabel = "No matching options",
    mode = "select",
    actionTrigger,
    actionContext,
    open,
    footer,
    hideCaret = false,
    initialQuery = "",
    onSearchChange,
    autoOpen = false,
    className = "",
    clearLabel = "Clear selection",
    clearable = true,
    footerAction,
    onOpenChange,
    options,
    placeholder,
    placeholderTone = "hint",
    showSelectedIcon = false,
    triggerContent,
    triggerClassName = "",
    tooltip,
  } = props;
  const searchable = mode !== "action" && (props.searchable ?? options.length > 15);
  const context = mode === "action" ? actionContext : undefined;
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeaheadRef = useRef({ text: "", time: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showActiveFocus, setShowActiveFocus] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selectedValues: T[] = props.multiple ? props.value : props.value || options.some((option) => option.value === "") ? [props.value as T] : [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const triggerLabel = selectedOptions.length === 0
    ? placeholder
    : props.multiple && selectedOptions.length > 1
      ? props.selectionLabel?.(selectedOptions) ?? `${selectedOptions.length} selected`
      : selectedOptions[0].triggerLabel ?? selectedOptions[0].label;
  const selectedLogoSrc = selectedOptions.length === 1 ? selectedOptions[0].logoSrc : undefined;
  const selectedIcon = selectedOptions.length === 1 ? selectedOptions[0].icon : undefined;
  const filteredOptions = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return normalisedQuery ? options.filter((option) => `${option.label} ${option.searchText ?? ""}`.toLowerCase().includes(normalisedQuery)) : options;
  }, [options, query]);

  const positionMenu = () => {
    const anchor = context?.anchor ?? triggerRef.current;
    if (!anchor) return;
    const rect = context ? { left: context.x, right: context.x, top: context.y, bottom: context.y, width: 0 } : anchor.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const tokens = getComputedStyle(anchor);
    const viewportPadding = parseFloat(tokens.getPropertyValue("--brisk-space-s"));
    const triggerGap = parseFloat(tokens.getPropertyValue("--brisk-space-xs"));
    const rowHeight = parseFloat(tokens.getPropertyValue("--brisk-space-3xl")) + (mode === "action" ? parseFloat(tokens.getPropertyValue("--brisk-space-xs")) : 0);
    const searchHeight = searchable ? rowHeight + viewportPadding : viewportPadding;
    const actionHeight = (props.multiple ? rowHeight + viewportPadding : clearable && selectedValues.length ? rowHeight : 0) + (footerAction ? rowHeight : 0) + (footer ? rowHeight * 4 : 0);
    const actionSpacing = mode === "action"
      ? (options.filter((option) => option.dividerAbove).length * viewportPadding) + parseFloat(tokens.getPropertyValue("--brisk-space-xxs"))
      : 0;
    const preferredHeight = Math.min(520, (options.length * rowHeight) + searchHeight + actionHeight + actionSpacing);
    const actionWidth = props.actionMenuSize === "compact" ? (rowHeight * 4) + triggerGap : rowHeight * 5;
    const preferredWidth = mode === "action" ? Math.max(actionWidth, rect.width) : Math.max(192, rect.width);
    const width = Math.min(preferredWidth, viewportWidth - (viewportPadding * 2));
    const preferredLeft = mode === "action" && !context ? rect.right - width : rect.left;
    const left = Math.min(Math.max(viewportLeft + viewportPadding, preferredLeft), viewportLeft + viewportWidth - width - viewportPadding);
    const spaceBelow = viewportTop + viewportHeight - rect.bottom - triggerGap - viewportPadding;
    const spaceAbove = rect.top - viewportTop - triggerGap - viewportPadding;
    const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.max(0, Math.min(preferredHeight, openAbove ? spaceAbove : spaceBelow));

    setMenuStyle({
      bottom: openAbove ? window.innerHeight - rect.top + triggerGap : undefined,
      left,
      maxHeight: availableHeight,
      top: openAbove ? undefined : rect.bottom + triggerGap,
      width,
      "--brisk-select-footer-limit": `${Math.max(0, availableHeight - searchHeight - rowHeight - viewportPadding)}px`,
    } as CSSProperties);
  };

  const openMenu = (nextActiveIndex = Math.max(0, options.findIndex((option) => selectedValues.includes(option.value))), keyboard = false) => {
    if (disabled) return;
    setActiveIndex(mode === "action" && options[nextActiveIndex]?.disabled ? Math.max(0, options.findIndex((option) => !option.disabled)) : nextActiveIndex);
    setShowActiveFocus(keyboard);
    setQuery(initialQuery);
    onSearchChange?.(initialQuery);
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    setQuery("");
    onOpenChange?.(false);
    if (returnFocus) {
      const target = context?.anchor ?? triggerRef.current;
      const fallback = context?.fallbackFocus ?? (mode === "action" ? props.actionFallbackFocus?.(triggerRef.current) : undefined);
      window.requestAnimationFrame(() => (target?.isConnected ? target : fallback)?.focus({ preventScroll: true }));
    }
  };

  const selectOption = (nextValue: T | "") => {
    if (mode === "action" && options.find((option) => option.value === nextValue)?.disabled) return;
    if (mode === "action") {
      // Close first so an action can open a dialog without losing its focus to this menu.
      setIsOpen(false);
      setQuery("");
      onOpenChange?.(false);
      const target = context?.anchor ?? triggerRef.current;
      const fallback = context?.fallbackFocus ?? props.actionFallbackFocus?.(triggerRef.current);
      (target?.isConnected ? target : fallback)?.focus({ preventScroll: true });
      if (!props.multiple) props.onChange(nextValue);
      window.requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.activeElement === target) {
          (target?.isConnected ? target : fallback)?.focus({ preventScroll: true });
        }
      });
      return;
    }
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
    if (open === undefined || open === isOpen) return;
    if (open) openMenu(undefined, context?.keyboard ?? false);
    else closeMenu();
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    positionMenu();
    const updatePosition = () => positionMenu();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!(context?.anchor ?? triggerRef.current)?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    const closeOnFocusOutside = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!(context?.anchor ?? triggerRef.current)?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("focusin", closeOnFocusOutside);
    const frame = window.requestAnimationFrame(() => (searchable ? searchRef.current : mode === "action" ? optionsRef.current : triggerRef.current)?.focus());
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("focusin", closeOnFocusOutside);
    };
  }, [isOpen, searchable, context?.x, context?.y, context?.anchor]);

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
  }, [activeIndex, isOpen, query]);

  // Portals keep the field's logical Tab order, including optional footer actions.
  const moveTabFocus = (event: KeyboardEvent) => {
    const actions = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("button:not([role='option']):not([role='menuitem']):not(:disabled), input:not([role='combobox']):not(:disabled)") ?? []);
    const actionIndex = actions.indexOf(event.target as HTMLElement);
    const nextAction = event.shiftKey ? actions[actionIndex - 1] : actions[actionIndex + 1];
    if (nextAction || (event.shiftKey && actionIndex === 0)) {
      event.preventDefault();
      (nextAction ?? (searchable ? searchRef.current : mode === "action" ? optionsRef.current : triggerRef.current))?.focus();
      return;
    }
    const anchor = context?.anchor ?? triggerRef.current;
    const scope = anchor?.closest("dialog") ?? document;
    const controls = Array.from(scope.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href], [tabindex='0']"))
      .filter((element) => element.tabIndex >= 0 && !menuRef.current?.contains(element) && !element.matches(":disabled, [inert], [aria-hidden='true']") && element.getClientRects().length > 0);
    const index = controls.indexOf(anchor!);
    const next = controls[index + (event.shiftKey ? -1 : 1)];
    if (next) event.preventDefault();
    closeMenu();
    (next ?? anchor)?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === "Tab") { moveTabFocus(event); return; }
    if (event.target instanceof HTMLElement && event.target.closest(".brisk-select-custom-footer")) return;
    if (event.target instanceof HTMLButtonElement && menuRef.current?.contains(event.target) && !["option", "menuitem"].includes(event.target.getAttribute("role") ?? "")) return;
    const isSearch = event.target === searchRef.current;
    if (mode === "action") {
      const enabled = filteredOptions.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        setShowActiveFocus(true);
        const current = enabled.indexOf(activeIndex);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
        if (enabled[next] !== undefined) setActiveIndex(enabled[next]);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex].value);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const previous = typeaheadRef.current;
        const text = Date.now() - previous.time > 700 ? event.key : previous.text + event.key;
        typeaheadRef.current = { text, time: Date.now() };
        const next = filteredOptions.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(text.toLowerCase()));
        if (next >= 0) { setActiveIndex(next); setShowActiveFocus(true); }
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setShowActiveFocus(true);
      setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(current + 1, filteredOptions.length - 1) : Math.max(current - 1, 0));
    } else if (event.key === "Home" && !isSearch) {
      event.preventDefault();
      setShowActiveFocus(true);
      setActiveIndex(0);
    } else if (event.key === "End" && !isSearch) {
      event.preventDefault();
      setShowActiveFocus(true);
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    } else if (event.key === "Enter" || (event.key === " " && !isSearch)) {
      event.preventDefault();
      if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex].value);
    } else if (!isSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const previous = typeaheadRef.current;
      setShowActiveFocus(true);
      const text = Date.now() - previous.time > 700 ? event.key : previous.text + event.key;
      typeaheadRef.current = { text, time: Date.now() };
      const next = filteredOptions.findIndex((option) => option.label.toLowerCase().startsWith(text.toLowerCase()));
      if (next >= 0) setActiveIndex(next);
    }
  };

  const actionButtonProps: ActionTriggerProps = {
    ref: triggerRef,
    disabled,
    "aria-label": ariaLabel,
    "aria-controls": isOpen ? listboxId : undefined,
    "aria-expanded": isOpen,
    "aria-haspopup": "menu",
    onClick: (event) => isOpen ? closeMenu() : openMenu(undefined, event.detail === 0),
    onKeyDown: (event) => {
      if (isOpen) { handleMenuKeyDown(event); return; }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const index = event.key === "ArrowUp" ? options.findLastIndex((option) => !option.disabled) : undefined;
        openMenu(index, true);
      }
    },
  };

  return <div className={`brisk-select ${className}`} data-brisk-select-mode={mode}>
    {mode === "action" && context ? null : mode === "action" && actionTrigger ? actionTrigger(actionButtonProps) : <button
      className={`brisk-select-trigger label-s ${selectedOptions.length ? "" : "is-placeholder"} ${triggerClassName}`}
      data-brisk-select-placeholder-tone={placeholderTone}
      ref={triggerRef}
      id={id}
      disabled={disabled}
      type="button"
      role={searchable || mode === "action" ? undefined : "combobox"}
      aria-controls={isOpen ? listboxId : undefined}
      aria-expanded={isOpen}
      aria-haspopup={mode === "action" ? "menu" : "listbox"}
      aria-label={ariaLabel}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-activedescendant={!searchable && mode !== "action" && isOpen && filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
      aria-description={tooltip}
      data-tooltip={tooltip}
      onClick={(event) => isOpen ? closeMenu() : openMenu(undefined, mode === "action" && event.detail === 0)}
      onKeyDown={(event) => {
        if (isOpen) { handleMenuKeyDown(event); return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openMenu(undefined, true);
        }
      }}
    >
      <span className="brisk-select-trigger-label">
        {triggerContent ?? <>{selectedLogoSrc ? <img className="brisk-select-option-logo" src={selectedLogoSrc} alt="" /> : showSelectedIcon && selectedIcon ? <DsIcon name={selectedIcon} size={16} /> : null}<span>{triggerLabel}</span></>}
      </span>
      {!hideCaret ? <DsIcon name="caret-down" size={12} /> : null}
    </button>}
    {name ? selectedValues.map((value) => <input key={value} type="hidden" name={name} value={value} />) : null}
    {isOpen ? createPortal(<div className="brisk-select-menu" data-brisk-select-mode={mode} ref={menuRef} style={menuStyle} onKeyDown={handleMenuKeyDown}>
      {searchable ? <label className="brisk-select-search"><DsIcon name="search" size={16} /><input className="label-s" ref={searchRef} type="search" role="combobox" aria-label={`Search ${ariaLabel.toLowerCase()}`} aria-expanded={isOpen} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined} placeholder={searchPlaceholder} value={query} onChange={(event) => { setQuery(event.target.value); onSearchChange?.(event.target.value); setActiveIndex(0); }} /></label> : null}
      <div className="brisk-select-options" ref={optionsRef} role={mode === "action" ? "menu" : "listbox"} tabIndex={mode === "action" ? -1 : undefined} aria-activedescendant={mode === "action" && filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined} id={listboxId} aria-label={ariaLabel} aria-multiselectable={props.multiple || undefined}>
        {filteredOptions.map((option, index) => {
          const isSelected = selectedValues.includes(option.value);
          return <div key={option.value} role="presentation">
            {option.group && option.group !== filteredOptions[index - 1]?.group ? <div className="brisk-select-group label-xs-semibold" role="presentation">{option.group}</div> : null}
            <button
              className={`brisk-select-option label-s ${isSelected && mode !== "action" ? "selected" : ""} ${index === activeIndex && showActiveFocus ? "active" : ""} ${option.dividerAbove ? "has-divider" : ""}`}
              type="button"
              disabled={mode === "action" && option.disabled}
              title={option.title}
              role={mode === "action" ? "menuitem" : "option"}
              id={`${listboxId}-${index}`}
              tabIndex={-1}
              aria-selected={mode === "action" ? undefined : isSelected}
              data-active={index === activeIndex}
              data-action-tone={mode === "action" ? option.tone : undefined}
              onMouseEnter={() => { if (mode === "action" && option.disabled) return; setActiveIndex(index); setShowActiveFocus(false); }}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option.value)}
            >
              <span className="brisk-select-option-label">
                {option.logoSrc ? <img className="brisk-select-option-logo" src={option.logoSrc} alt="" /> : option.icon ? <DsIcon name={option.icon} size={16} /> : null}
                <span>
                  <span className="brisk-select-option-content">{option.content ?? option.label}</span>
                  {option.description ? <small className="brisk-select-option-description label-xs">{option.description}</small> : null}
                </span>
              </span>
              {isSelected && mode !== "action" ? <DsIcon name="check" size={16} /> : null}
            </button>
          </div>;
        })}
      </div>
      {filteredOptions.length === 0 ? <span className="brisk-select-empty label-s" role="status">{emptyLabel}</span> : null}
      {footer ? <div className="brisk-select-custom-footer">{footer}</div> : null}
      {props.multiple ? <div className="brisk-select-menu-actions">{clearable && selectedValues.length ? <button className="brisk-select-clear label-xs-semibold" type="button" onClick={() => selectOption("")}>{clearLabel}</button> : <span />}
        <button className="brisk-select-done label-xs-semibold" type="button" onClick={() => closeMenu(true)}>Done</button>
      </div> : clearable && selectedValues.length ? <button className="brisk-select-clear label-xs-semibold" type="button" onClick={() => selectOption("")}>{clearLabel}</button> : null}
      {footerAction ? <button className="brisk-select-footer-action label-xs-semibold" type="button" onClick={() => {
        const trigger = triggerRef.current;
        if (footerAction.keepOpen) {
          setQuery("");
          onSearchChange?.("");
          window.requestAnimationFrame(() => (searchable ? searchRef.current : triggerRef.current)?.focus());
        } else closeMenu();
        footerAction.onSelect(trigger);
      }}>{footerAction.icon ? <DsIcon name={footerAction.icon} size={16} /> : null}{footerAction.label}</button> : null}
    </div>, (context?.anchor ?? triggerRef.current)?.closest(mode === "action" ? 'dialog, [role="dialog"]' : "dialog") ?? document.body) : null}
  </div>;
}
