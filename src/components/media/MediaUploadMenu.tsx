import { useEffect, useRef } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaCloudProvider } from "@/data/media";

type MediaUploadMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComputerUpload: () => void;
  onCloudImport: (provider: MediaCloudProvider) => void;
};

export function MediaUploadMenu({
  open,
  onOpenChange,
  onComputerUpload,
  onCloudImport,
}: MediaUploadMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div className="media-upload-menu-wrap" ref={menuRef}>
      <button
        className="media-primary-button label-s-semibold"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <DsIcon name="plus" size={16} />
        Upload
        <DsIcon name="caret-down" size={14} />
      </button>
      {open ? (
        <div className="media-upload-menu" role="menu" aria-label="Upload media">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onComputerUpload();
            }}
          >
            <DsIcon name="upload-simple" size={16} />
            <span>
              <strong className="label-s-semibold">From your computer</strong>
              <span className="label-xs">Choose files from this device</span>
            </span>
          </button>
          <span className="media-upload-menu-divider" aria-hidden="true" />
          <button type="button" role="menuitem" onClick={() => onCloudImport("google-drive")}>
            <span>
              <strong className="label-s-semibold">Google Drive</strong>
              <span className="label-xs">Import files from Drive</span>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => onCloudImport("dropbox")}>
            <span>
              <strong className="label-s-semibold">Dropbox</strong>
              <span className="label-xs">Import files from Dropbox</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
