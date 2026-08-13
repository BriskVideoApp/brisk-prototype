"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { RolePreviewControl } from "@/components/navigation/RolePreviewControl";
import { getNavigationItem } from "@/components/navigation/navigationConfig";
import { DsIcon } from "@/components/video-review/DsIcon";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  const currentItem = getNavigationItem(pathname, searchParams.toString());
  const currentPageLabel = currentItem?.label ?? getFallbackPageLabel(pathname);

  return (
    <div className="app-shell">
      <AppSidebar
        mobileOpen={isMobileNavigationOpen}
        onNavigate={() => setIsMobileNavigationOpen(false)}
        onRequestClose={() => setIsMobileNavigationOpen(false)}
      />
      {isMobileNavigationOpen ? (
        <button
          className="app-shell-mobile-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileNavigationOpen(false)}
        />
      ) : null}
      <div className="app-shell-workspace">
        <header className="app-shell-preview-bar">
          <div className="app-shell-current-page">
            <button
              className="app-shell-mobile-menu"
              type="button"
              aria-label="Open navigation"
              aria-expanded={isMobileNavigationOpen}
              onClick={() => setIsMobileNavigationOpen(true)}
            >
              <DsIcon name="queue" size={18} />
            </button>
            <div>
              <span className="label-xs-semibold">Prototype preview</span>
              <strong className="label-m-semibold">{currentPageLabel}</strong>
            </div>
          </div>
          <RolePreviewControl />
        </header>
        <div className="app-shell-content">{children}</div>
      </div>
    </div>
  );
}

function getFallbackPageLabel(pathname: string) {
  if (pathname === "/") return "Today";
  if (pathname.startsWith("/brand-kits/")) return "Brand Kit";
  if (pathname === "/review") return "Edit";

  return pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.split("-")
    .map((word) => word.charAt(0).toLocaleUpperCase("en-AU") + word.slice(1))
    .join(" ") ?? "Brisk";
}
