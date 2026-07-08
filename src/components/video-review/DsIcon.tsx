import type { CSSProperties } from "react";

const iconPaths = {
  "arrow-left": "/brisk-icons/arrow-left.svg",
  "alert-triangle": "/brisk-icons/alert-triangle.svg",
  "caret-down": "/brisk-icons/caret-down.svg",
  "copy": "/brisk-icons/copy.svg",
  "dots-three": "/brisk-icons/dots-three.svg",
  "dots-three-vertical": "/brisk-icons/dots-three-vertical.svg",
  "dots-six-vertical": "/brisk-icons/dots-six-vertical.svg",
  "download-simple": "/brisk-icons/download-simple.svg",
  "link": "/brisk-icons/link.svg",
  "link-simple-horizontal": "/brisk-icons/link-simple-horizontal.svg",
  "upload-simple": "/brisk-icons/upload-simple.svg",
  "arrow-counter-clockwise": "/brisk-icons/arrow-counter-clockwise.svg",
  "arrow-clockwise": "/brisk-icons/arrow-clockwise.svg",
  "caret-left": "/brisk-icons/caret-left.svg",
  "caret-right": "/brisk-icons/caret-right.svg",
  "play": "/brisk-icons/play.svg",
  "pause": "/brisk-icons/pause.svg",
  "speaker-high": "/brisk-icons/speaker-high.svg",
  "trash-simple": "/brisk-icons/trash-simple.svg",
  "pencil-simple": "/brisk-icons/pencil-simple.svg",
  "pencil-simple-ds": "/brisk-icons/pencil-simple-ds.svg",
  "columns": "/brisk-icons/columns.svg",
  "queue": "/brisk-icons/queue.svg",
  "picture-in-picture": "/brisk-icons/picture-in-picture.svg",
  "frame-corners": "/brisk-icons/frame-corners.svg",
  "paperclip": "/brisk-icons/paperclip.svg",
  "video-camera": "/brisk-icons/video-camera.svg",
  "video-camera-ds": "/brisk-icons/video-camera-ds.svg",
  "clipboard-text": "/brisk-icons/clipboard-text.svg",
  "stage-edit": "/brisk-icons/stage-edit.svg",
  "film-strip": "/brisk-icons/film-strip.svg",
  "grid-four": "/brisk-icons/grid-four.svg",
  "image-square": "/brisk-icons/image-square.svg",
  "pen-nib": "/brisk-icons/pen-nib.svg",
  "smiley": "/brisk-icons/smiley.svg",
  "plus": "/brisk-icons/plus.svg",
  "push-pin-simple": "/brisk-icons/push-pin-simple.svg",
  "push-pin-simple-fill": "/brisk-icons/push-pin-simple.svg",
  "paper-plane-tilt": "/brisk-icons/paper-plane-tilt.svg",
  "check": "/brisk-icons/check.svg",
  "checks": "/brisk-icons/checks.svg",
  "chat-circle": "/brisk-icons/chat-circle.svg",
  "chopchop-ai": "/brisk-icons/chopchop-ai.svg?v=4",
  "heart": "/brisk-icons/heart.svg",
  "arrows-clockwise": "/brisk-icons/arrows-clockwise.svg",
  "fire-simple": "/brisk-icons/fire-simple.svg",
  "eye": "/brisk-icons/eye.svg",
  "film-slate": "/brisk-icons/film-slate.svg",
  "hand": "/brisk-icons/hand.svg",
  "thumbs-up-like-fill": "/brisk-icons/thumbs-up-like-fill.svg",
  "x-close-cross": "/brisk-icons/x-close-cross.svg",
  "check-circle": "/brisk-icons/check-circle.svg",
} as const;

export type DsIconName = keyof typeof iconPaths;

export function DsIcon({
  name,
  size = 16,
}: {
  name: DsIconName;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="ds-icon"
      style={{
        "--icon-url": `url("${iconPaths[name]}")`,
        "--icon-size": `${size}px`,
      } as CSSProperties}
    />
  );
}
