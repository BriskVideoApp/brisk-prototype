"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DsIcon } from "@/components/video-review/DsIcon";
import { formatBriefDate, parseBriefDateValue } from "@/lib/brief-dates";

const briefCalendarWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function BriskDatePicker({
  ariaLabel,
  defaultOpen = false,
  disabled = false,
  displayLabel,
  inline = false,
  isTertiary = false,
  onChange,
  placeholder,
  value,
  variant,
}: {
  ariaLabel: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  displayLabel?: string;
  inline?: boolean;
  isTertiary?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  variant: "field" | "pill" | "summary";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [visibleMonth, setVisibleMonth] = useState(() => getBriefCalendarMonthStart(value));
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();
  const modal = pickerRef.current?.closest("dialog");
  useLayoutEffect(() => {
    if (!isOpen || inline || !pickerRef.current?.closest("dialog")) { setPopoverStyle(undefined); return; }
    const position = () => {
      const trigger = pickerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const tokens = getComputedStyle(document.documentElement);
      const padding = Number.parseFloat(tokens.getPropertyValue("--brisk-space-l")) || 16;
      const gap = Number.parseFloat(tokens.getPropertyValue("--brisk-space-s")) || 8;
      const width = Math.min(popoverRef.current?.offsetWidth || 300, window.innerWidth - padding * 2);
      const height = popoverRef.current?.offsetHeight || 340;
      const above = window.innerHeight - trigger.bottom < height + padding && trigger.top > window.innerHeight - trigger.bottom;
      setPopoverStyle({ position: "fixed", left: Math.max(padding, Math.min(trigger.left, window.innerWidth - width - padding)), width, top: above ? undefined : trigger.bottom + gap, bottom: above ? window.innerHeight - trigger.top + gap : undefined, maxHeight: Math.max(0, (above ? trigger.top : window.innerHeight - trigger.bottom) - padding - gap), overflowY: "auto" });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [inline, isOpen]);
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
    }
  }

  function selectToday() {
    const today = new Date();

    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    selectDate(toBriefDateInputValue(today));
  }

  const calendar = (
        <div ref={popoverRef} style={popoverStyle} className="brief-date-popover" role={inline ? "group" : "dialog"} aria-label={ariaLabel}
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
                  onClick={() => selectDate(dateValue)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="brief-date-popover-actions">
            <button className="label-xs-semibold" type="button" onClick={() => selectDate("")}>
              Clear
            </button>
            <button className="label-xs-semibold" type="button" onClick={selectToday}>
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
        <button className={triggerClassName} type="button" aria-expanded={isOpen} aria-haspopup="dialog" disabled={disabled} onClick={openPicker}>
          <span className={variant !== "summary" ? "brief-deliverable-trigger-label" : undefined}>{displayText}</span>
          {variant === "summary" ? null : <DsIcon name="caret-down" size={12} />}
        </button>
      )}
      {inline || isOpen ? (modal && !inline ? createPortal(calendar, modal) : calendar) : null}
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
