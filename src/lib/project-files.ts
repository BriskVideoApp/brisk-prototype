import type { ProjectFileLocation } from "@/components/active-videos/types";

export type FileLocationProvider =
  | "LucidLink"
  | "Dropbox"
  | "Google Drive"
  | "Shade"
  | "Frame.io"
  | "Box"
  | "OneDrive"
  | null;

const fileLocationUserNames: Record<string, string> = {
  "user-jordan": "Jordan Lee",
  "user-maddie": "Maddie Diaz",
  "user-sarah": "Sarah Chen",
  "user-tom": "Tom Editor",
};

export function detectFileLocationProvider(value: string): FileLocationProvider {
  const hostname = getHostname(value);

  if (!hostname) return null;
  if (matchesHostname(hostname, "lucidlink.com") || matchesHostname(hostname, "lucid.link")) return "LucidLink";
  if (matchesHostname(hostname, "dropbox.com")) return "Dropbox";
  if (matchesHostname(hostname, "drive.google.com")) return "Google Drive";
  if (
    matchesHostname(hostname, "shade.inc") ||
    matchesHostname(hostname, "shade.co") ||
    hostname.split(".").some((part) => part === "shade")
  ) return "Shade";
  if (matchesHostname(hostname, "frame.io")) return "Frame.io";
  if (matchesHostname(hostname, "box.com")) return "Box";
  if (matchesHostname(hostname, "onedrive.live.com") || matchesHostname(hostname, "sharepoint.com")) return "OneDrive";

  return null;
}

export function getFileLocationOpenLabel(location: Pick<ProjectFileLocation, "url">) {
  const provider = detectFileLocationProvider(location.url);
  return provider ? `Open in ${provider}` : "Open Project Files";
}

export function getFileLocationTooltip(location: Pick<ProjectFileLocation, "url">) {
  const provider = detectFileLocationProvider(location.url);
  return provider ? `Open project files in ${provider}` : "Open project files";
}

export function getFileLocationDisplayLabel(location: Pick<ProjectFileLocation, "label" | "url">) {
  return location.label?.trim() || detectFileLocationProvider(location.url) || "Project Files";
}

export function getFileLocationHref(value: string) {
  const trimmedValue = value.trim();

  if (/^[a-z][a-z\d+.-]*:/iu.test(trimmedValue)) return trimmedValue;
  if (trimmedValue.startsWith("\\\\")) return `file:${trimmedValue.replaceAll("\\", "/")}`;
  if (trimmedValue.startsWith("/")) return `file://${trimmedValue}`;
  if (/^[a-z]:[\\/]/iu.test(trimmedValue)) return `file:///${trimmedValue.replaceAll("\\", "/")}`;
  if (/^[^\s/]+\.[^\s/]+/u.test(trimmedValue)) return `https://${trimmedValue}`;

  return trimmedValue;
}

export function getFileLocationUserName(userRef: string | null) {
  if (!userRef) return null;
  return fileLocationUserNames[userRef] ?? userRef;
}

export function formatFileLocationRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);

  if (!Number.isFinite(days)) return "unknown date";
  if (Math.abs(days) < 1) return "today";

  return new Intl.RelativeTimeFormat("en-AU", { numeric: "auto" }).format(days, "day");
}

export function formatFileLocationDate(value: string | null) {
  if (!value) return "never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown date";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getHostname(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.startsWith("/") || trimmedValue.startsWith("\\")) return null;

  try {
    const parsedUrl = new URL(/^[a-z][a-z\d+.-]*:\/\//iu.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`);
    return parsedUrl.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesHostname(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}
