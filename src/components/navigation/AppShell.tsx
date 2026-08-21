"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { GlobalHeaderActions } from "@/components/navigation/GlobalHeaderActions";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const isStandaloneDocument = pathname.startsWith("/print/") || pathname.startsWith("/share/call-sheet/");

  if (isStandaloneDocument) {
    return children;
  }

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
        <header className="app-global-header">
          <GlobalHeaderActions />
        </header>
        <div className="app-shell-content">{children}</div>
      </div>
    </div>
  );
}
