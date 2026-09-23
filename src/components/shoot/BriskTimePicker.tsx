"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatTime } from "@/data/shoot";
import { DsIcon } from "@/components/video-review/DsIcon";

export type BriskTimePickerProps = {
  ariaLabel: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

type TimePeriod = "am" | "pm";

const timePickerOptions = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  opensUp: boolean;
};

export function BriskTimePicker({ ariaLabel, placeholder = "Choose time", value, onChange }: BriskTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value ? formatTime(value) : "");
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const parts = getTimePickerParts(value);
  const typedOption = normaliseTypedTime(draft, parts.period);
  const selectedOption = typedOption === null
    ? toTimePickerValue(parts.hour, parts.minute, parts.period)
    : typedOption;

  useEffect(() => {
    setDraft(value ? formatTime(value) : "");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnPointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    const animationFrame = window.requestAnimationFrame(() => {
      centreTimeOption(selectedOptionRef.current);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, selectedOption]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const styles = getComputedStyle(document.documentElement);
      const gap = Number.parseFloat(styles.getPropertyValue("--brisk-space-s")) || 0;
      const viewportPadding = Number.parseFloat(styles.getPropertyValue("--brisk-space-l")) || gap;
      const spaceAbove = Math.max(0, triggerRect.top - gap - viewportPadding);
      const spaceBelow = Math.max(0, window.innerHeight - triggerRect.bottom - gap - viewportPadding);
      const opensUp = spaceBelow < popoverRect.height && spaceAbove > spaceBelow;
      const availableHeight = opensUp ? spaceAbove : spaceBelow;
      const width = Math.min(
        Math.max(triggerRect.width, popoverRect.width),
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(triggerRect.right - width, window.innerWidth - width - viewportPadding),
      );

      setPopoverPosition({
        top: opensUp ? triggerRect.top : triggerRect.bottom,
        left,
        width,
        maxHeight: availableHeight,
        opensUp,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  function commitDraft() {
    const nextValue = normaliseTypedTime(draft, parts.period);
    if (nextValue === null) {
      setDraft(value ? formatTime(value) : "");
      return;
    }

    setDraft(nextValue ? formatTime(nextValue) : "");
    if (nextValue !== value) onChange(nextValue);
  }

  function selectCurrentTime() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    onChange(normaliseTypedTime(currentTime, parts.period) ?? currentTime);
    setIsOpen(false);
  }

  return (
    <div
      className="shoot-brisk-time-picker"
      ref={pickerRef}
    >
      <div className="shoot-brisk-time-trigger" data-open={isOpen} ref={triggerRef}>
        <input
          aria-label={ariaLabel}
          inputMode="text"
          placeholder={placeholder}
          value={draft}
          onBlur={commitDraft}
          onChange={(event) => {
            setDraft(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(value ? formatTime(value) : "");
              setIsOpen(false);
              event.currentTarget.blur();
            }
          }}
        />
        <button
          className="shoot-brisk-time-toggle"
          type="button"
          aria-label={`Open ${ariaLabel} picker`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((current) => !current)}
        >
          <DsIcon name="clock-clockwise" size={16} />
        </button>
      </div>
      {isOpen ? (
        createPortal(<div
          className={`shoot-brisk-time-popover${popoverPosition?.opensUp ? " opens-up" : ""}`}
          role="dialog"
          aria-label={ariaLabel}
          ref={popoverRef}
          style={popoverPosition ? {
            top: popoverPosition.top,
            left: popoverPosition.left,
            width: popoverPosition.width,
            maxHeight: popoverPosition.maxHeight,
            visibility: "visible",
          } : { visibility: "hidden" }}
          onBlur={(event) => {
            const nextFocus = event.relatedTarget;
            if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) setIsOpen(false);
          }}
        >
          <div className="shoot-brisk-time-options" role="listbox" aria-label="Available times">
            {timePickerOptions.map((option) => {
              const isSelected = option === selectedOption;
              return (
                <button
                  className={`shoot-brisk-time-option label-s-semibold${isSelected ? " is-selected" : ""}`}
                  key={option}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setDraft(formatTime(option));
                    setIsOpen(false);
                  }}
                >
                  {formatTime(option)}
                </button>
              );
            })}
          </div>
          <div className="shoot-brisk-time-actions">
            <button className="label-xs-semibold" type="button" onClick={() => {
              onChange("");
              setIsOpen(false);
            }}>Clear</button>
            <button className="label-xs-semibold" type="button" onClick={selectCurrentTime}>Now</button>
            <button className="label-xs-semibold" type="button" onClick={() => setIsOpen(false)}>Done</button>
          </div>
        </div>, document.body)
      ) : null}
    </div>
  );
}

function getTimePickerParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : 9;
  const minute = match ? Number(match[2]) : 0;
  const safeHour = hour24 >= 0 && hour24 <= 23 ? hour24 : 9;
  const safeMinute = minute >= 0 && minute <= 59 ? minute : 0;
  const roundedMinutes = Math.round(((safeHour * 60) + safeMinute) / 15) * 15;
  const wrappedMinutes = roundedMinutes % (24 * 60);
  const roundedHour = Math.floor(wrappedMinutes / 60);

  return {
    hour: roundedHour % 12 || 12,
    minute: wrappedMinutes % 60,
    period: (roundedHour >= 12 ? "pm" : "am") as TimePeriod,
  };
}

function toTimePickerValue(hour: number, minute: number, period: TimePeriod) {
  const hour24 = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normaliseTypedTime(input: string, fallbackPeriod: TimePeriod): string | null {
  const compact = input.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  if (!compact) return "";

  const periodMatch = compact.match(/(am|pm|a|p)$/);
  const explicitPeriod = periodMatch
    ? periodMatch[1].startsWith("p") ? "pm" : "am"
    : null;
  const numericPart = periodMatch ? compact.slice(0, -periodMatch[1].length) : compact;
  let hour: number;
  let minute: number;

  if (numericPart.includes(":")) {
    const [hourPart, minutePart, ...remainder] = numericPart.split(":");
    if (remainder.length || !/^\d{1,2}$/.test(hourPart) || !/^\d{1,2}$/.test(minutePart)) return null;
    hour = Number(hourPart);
    minute = Number(minutePart);
  } else if (/^\d{1,4}$/.test(numericPart)) {
    if (numericPart.length <= 2) {
      hour = Number(numericPart);
      minute = 0;
    } else {
      hour = Number(numericPart.slice(0, -2));
      minute = Number(numericPart.slice(-2));
    }
  } else {
    return null;
  }

  if (minute > 59) return null;

  let hour24: number;
  if (explicitPeriod) {
    if (hour < 1 || hour > 12) return null;
    hour24 = (hour % 12) + (explicitPeriod === "pm" ? 12 : 0);
  } else if (hour >= 0 && hour <= 23) {
    hour24 = hour >= 1 && hour <= 12
      ? (hour % 12) + (fallbackPeriod === "pm" ? 12 : 0)
      : hour;
  } else {
    return null;
  }

  const roundedMinutes = Math.round(((hour24 * 60) + minute) / 15) * 15;
  const wrappedMinutes = roundedMinutes % (24 * 60);
  const roundedHour = Math.floor(wrappedMinutes / 60);
  const roundedMinute = wrappedMinutes % 60;
  return `${String(roundedHour).padStart(2, "0")}:${String(roundedMinute).padStart(2, "0")}`;
}

function centreTimeOption(option: HTMLButtonElement | null) {
  const list = option?.parentElement;
  if (!option || !list) return;
  list.scrollTop = Math.max(0, option.offsetTop - ((list.clientHeight - option.offsetHeight) / 2));
}
