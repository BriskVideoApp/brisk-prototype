"use client";

import { useEffect, useRef, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";

export function TranscriptClipMenu({
  onDelete,
  onDownload,
  onHide,
  onRename,
}: {
  onDelete: () => void;
  onDownload: () => void;
  onHide: () => void;
  onRename: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeMenu = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [isOpen]);

  return (
    <div className="transcript-action-menu-wrap" ref={menuRef}>
      <button
        className="transcript-quiet-button transcript-overflow-button"
        type="button"
        aria-label="More transcript actions"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <DsIcon name="dots-three" size={16} />
      </button>
      {isOpen ? (
        <div className="transcript-action-menu" role="menu">
          <button
            className="label-s"
            role="menuitem"
            type="button"
            onClick={() => {
              onRename();
              setIsOpen(false);
            }}
          >
            <DsIcon name="pencil-simple" size={15} />
            Rename
          </button>
          <button
            className="label-s"
            role="menuitem"
            type="button"
            onClick={() => {
              onDownload();
              setIsOpen(false);
            }}
          >
            <DsIcon name="download-simple" size={15} />
            Download PDF
          </button>
          <button
            className="transcript-menu-danger label-s"
            role="menuitem"
            type="button"
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
          >
            <DsIcon name="trash" size={15} />
            Delete
          </button>
          <span className="transcript-menu-divider" aria-hidden="true" />
          <button
            className="label-s"
            role="menuitem"
            type="button"
            onClick={() => {
              onHide();
              setIsOpen(false);
            }}
          >
            <DsIcon name="eye-slash" size={15} />
            Hide transcript
          </button>
        </div>
      ) : null}
    </div>
  );
}
