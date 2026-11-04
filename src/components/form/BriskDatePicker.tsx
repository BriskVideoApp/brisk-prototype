"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DsIcon } from "@/components/video-review/DsIcon";
import { formatBriefDate, parseBriefDateValue } from "@/lib/brief-dates";

const briefCalendarWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function BriskDatePicker({
  allowClear = true,
  ariaLabel,
  defaultOpen = false,
  dialogAutoFocus = false,
  disabled = false,
  displayLabel,
  inline = false,
  isTertiary = false,
  onChange,
  placeholder,
  popoverAlign,
  popoverSize = "default",
  portalToBody = false,
  value,
  variant,
}: {
  allowClear?: boolean;
  ariaLabel: string;
  defaultOpen?: boolean;
  /** Use the existing DS dialog focus target without opening the calendar. */
  dialogAutoFocus?: boolean;
  disabled?: boolean;
  displayLabel?: string;
  inline?: boolean;
  isTertiary?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  popoverAlign?: "start" | "end";
  popoverSize?: "default" | "compact";
  /** Let calendars in scroll containers float outside them. Modals use their own portal. */
  portalToBody?: boolean;
  value: string;
  variant: "field" | "pill" | "summary";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [visibleMonth, setVisibleMonth] = useState(() => getBriefCalendarMonthStart(value));
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const align = popoverAlign ?? (variant === "summary" ? "end" : "start");

  useLayoutEffect(() => {
    // Escape scroll containers, while keeping modal calendars in the top layer.
    setPortalHost(isOpen && !inline ? pickerRef.current?.closest("dialog") ?? (portalToBody ? document.body : null) : null);
    setPopoverStyle(undefined);
  }, [inline, isOpen, portalToBody]);

  useLayoutEffect(() => {
    const picker = pickerRef.current;
    const popover = popoverRef.current;
    if (!isOpen || inline || !portalHost || !picker || !popover) return;

    const position = () => {
      const trigger = picker.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const tokens = getComputedStyle(popover);
      const padding = Number.parseFloat(tokens.getPropertyValue("--brisk-space-l"));
      const gap = Number.parseFloat(tokens.getPropertyValue("--brisk-space-s"));
      const preferredWidth = Number.parseFloat(tokens.getPropertyValue("--brisk-space-3xl")) * (popoverSize === "compact" ? 7 : 8);
      const width = Math.min(preferredWidth, viewportWidth - padding * 2);
      const height = popover.scrollHeight + popover.offsetHeight - popover.clientHeight;
      const below = viewportTop + viewportHeight - trigger.bottom - padding - gap;
      const above = trigger.top - viewportTop - padding - gap;
      const openAbove = below < height && above > below;
      const availableHeight = Math.max(0, openAbove ? above : below);

      setPopoverStyle({
        position: "fixed",
        left: Math.max(viewportLeft + padding, Math.min(align === "end" ? trigger.right - width : trigger.left, viewportLeft + viewportWidth - width - padding)),
        width,
        top: openAbove ? Math.max(viewportTop + padding, trigger.top - gap - Math.min(height, availableHeight)) : trigger.bottom + gap,
        maxHeight: availableHeight,
        overflowY: "auto",
      });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(picker);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [align, inline, isOpen, popoverSize, portalHost]);

  useLayoutEffect(() => {
    if (defaultOpen && isOpen && portalHost) {
      (popoverRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? popoverRef.current?.querySelector("button"))?.focus({ preventScroll: true });
    }
  }, [defaultOpen, isOpen, portalHost]);
  const readableDate = formatBriefDate(value);
  const selectedDate = parseBriefDateValue(value);
  const selectedValue = selectedDate ? toBriefDateInputValue(selectedDate) : "";
  const todayValue = toBriefDateInputValue(new Date());
  const calendarDays = createBriefCalendarDays(visibleMonth);
  const displayText = displayLabel || readableDate || placeholder;
  const triggerClassName =
    variant === "summary"
      ? `brief-summary-static-chip brief-date-summary-trigger label-xs-semibold${isTertiary ? " is-tertiary" : ""}`
      : variant === "pill"
      ? `brief-date-pill label-xs-semibold${readableDate ? "" : " is-placeholder"}`
      : `brief-date-display label-s${readableDate ? "" : " is-placeholder"}`;

  useEffect(() => {
    if (inline) {
      return;
    }

    if (!isOpen) {
      setVisibleMonth(getBriefCalendarMonthStart(value));
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && (pickerRef.current?.contains(target) || popoverRef.current?.contains(target))) {
        return;
      }

      setIsOpen(false);
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnPointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [inline, isOpen, value]);

  function openPicker() {
    setVisibleMonth(getBriefCalendarMonthStart(value));
    setIsOpen((currentValue) => !currentValue);
  }

  function selectDate(nextValue: string) {
    onChange(nextValue);

    if (!inline) {
      setIsOpen(false);
      pickerRef.current?.querySelector("button")?.focus();
    }
  }

  function selectToday() {
    const today = new Date();

    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    selectDate(toBriefDateInputValue(today));
  }

  const calendar = (
        <div ref={popoverRef} style={inline || !portalHost ? undefined : popoverStyle ?? { visibility: "hidden" }} className={`brief-date-popover${popoverSize === "compact" ? " brief-date-popover-compact" : ""}`} role={inline ? "group" : "dialog"} aria-label={ariaLabel}
        >

          <div className="brief-date-popover-head">
            <strong className="label-s-semibold">{formatBriefCalendarMonth(visibleMonth)}</strong>
            <div className="brief-date-popover-nav" aria-label="Change month">
              <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(addBriefCalendarMonths(visibleMonth, -1))}>
                <DsIcon name="caret-left" size={16} />
              </button>
              <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(addBriefCalendarMonths(visibleMonth, 1))}>
                <DsIcon name="caret-right" size={16} />
              </button>
            </div>
          </div>
          <div className="brief-date-weekdays" aria-hidden="true">
            {briefCalendarWeekdays.map((weekday) => (
              <span className="label-xs-semibold" key={weekday}>
                {weekday}
              </span>
            ))}
          </div>
          <div className="brief-date-grid">
            {calendarDays.map((date) => {
              const dateValue = toBriefDateInputValue(date);
              const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const isSelected = dateValue === selectedValue;
              const isToday = dateValue === todayValue;

              return (
                <button
                  className={`brief-date-day label-xs-semibold${isOutsideMonth ? " is-outside-month" : ""}${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                  key={dateValue}
                  type="button"
                  aria-label={formatBriefCalendarDayLabel(date)}
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() => selectDate(dateValue)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="brief-date-popover-actions">
            {allowClear ? <button className="label-xs-semibold" type="button" onClick={() => selectDate("")}>
              Clear
            </button> : <span />}
            <button className="label-xs-semibold" type="button" disabled={disabled} onClick={selectToday}>
              Today
            </button>
          </div>
        </div>
  );

  return (
    <div
      className={`brief-date-picker-wrap brief-date-picker-wrap-${variant}${inline ? " is-inline" : ""}`}
      ref={pickerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen && !inline) {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
          pickerRef.current?.querySelector("button")?.focus();
        }

        if (event.key === "Tab" && isOpen && portalHost && !inline) {
          const trigger = pickerRef.current?.querySelector("button");
          const controls = popoverRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
          if (!trigger || !controls?.length) return;

          // Keep the floating calendar in the field's original keyboard order.
          if (event.target === trigger && !event.shiftKey) {
            event.preventDefault();
            controls[0].focus();
          } else if (event.target === controls[0] && event.shiftKey) {
            event.preventDefault();
            trigger.focus();
          } else if (event.target === controls[controls.length - 1] && !event.shiftKey) {
            trigger.focus();
            setIsOpen(false);
          }
        }
      }}
      onBlur={(event) => {
        if (inline) {
          return;
        }

        const nextFocus = event.relatedTarget;

        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus) && !popoverRef.current?.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      {inline ? null : (
        <button className={triggerClassName} type="button" data-dialog-autofocus={dialogAutoFocus || undefined} aria-expanded={isOpen} aria-haspopup="dialog" disabled={disabled} onClick={openPicker}>
          <span className={variant !== "summary" ? "brief-deliverable-trigger-label" : undefined}>{displayText}</span>
          {variant === "summary" ? null : <DsIcon name="caret-down" size={12} />}
        </button>
      )}
      {inline || isOpen ? (portalHost && !inline ? createPortal(calendar, portalHost) : calendar) : null}
    </div>
  );
}

function getBriefCalendarMonthStart(value: string) {
  const parsedDate = parseBriefDateValue(value);
  const baseDate = parsedDate ?? new Date();

  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

function addBriefCalendarMonths(date: Date, monthOffset: number) {
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
}

function createBriefCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstVisibleDate = new Date(firstOfMonth);

  firstVisibleDate.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDate);

    date.setDate(firstVisibleDate.getDate() + index);
    return date;
  });
}

function toBriefDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatBriefCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function formatBriefCalendarDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);
}
