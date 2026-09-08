"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type ScriptMediaPickerOption<T extends string = string> = {
  value: T;
  label: string;
  icon: DsIconName;
};

export function ScriptMediaPicker<T extends string>({
  isOpen,
  options,
  triggerLabel,
  triggerClassName = "",
  triggerIcon = "plus",
  triggerText,
  triggerTooltip,
  onOpenChange,
  onSelect,
}: {
  isOpen: boolean;
  options: Array<ScriptMediaPickerOption<T>>;
  triggerLabel: string;
  triggerClassName?: string;
  triggerIcon?: DsIconName | null;
  triggerText?: string;
  triggerTooltip?: string;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (value: T) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;
    const positionMenu = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const menuGap = 8;
      const width = Math.min(248, window.innerWidth - (viewportPadding * 2));
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
      const estimatedHeight = 192;
      const openAbove = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      setMenuStyle({
        bottom: openAbove ? window.innerHeight - rect.top + menuGap : undefined,
        left,
        top: openAbove ? undefined : rect.bottom + menuGap,
        width,
      });
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) onOpenChange(false);
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [isOpen, onOpenChange]);

  return <div className="script-media-menu-wrap">
    <button className={`script-media-add ${triggerClassName}`.trim()} ref={triggerRef} type="button" aria-label={triggerLabel} aria-expanded={isOpen} data-tooltip={triggerTooltip} onClick={() => onOpenChange(!isOpen)}>
      {triggerIcon ? <DsIcon name={triggerIcon} size={14} /> : null}
      {triggerText ? <span>{triggerText}</span> : null}
    </button>
    {isOpen ? createPortal(<div className="script-media-menu is-portal" ref={menuRef} style={menuStyle} role="menu">
      {options.map((option) => <button className="label-s" type="button" role="menuitem" key={option.value} onClick={() => onSelect(option.value)}>
        <DsIcon name={option.icon} size={18} />
        {option.label}
      </button>)}
    </div>, document.body) : null}
  </div>;
}
