"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { GlobalHeaderActions } from "@/components/navigation/GlobalHeaderActions";
import { UserAvatarMenu } from "@/components/navigation/UserAvatarMenu";
import { BriskAiAssistant } from "@/components/ai/BriskAiAssistant";
import { PrototypeScenarioToolbar } from "@/components/prototype-scenarios/PrototypeScenarioToolbar";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getAppShellPresentation } from "@/components/navigation/prototypeNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeScenario } = usePrototypeScenario();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const presentation = getAppShellPresentation(pathname, Boolean(activeScenario));

  if (presentation === "standalone") {
    return children;
  }

  if (presentation === "clean-entry") {
    return (
      <div className="prototype-test-frame">
        <PrototypeScenarioToolbar inline />
        <div className="prototype-test-content">{children}</div>
      </div>
    );
  }

  return (
    <div className="prototype-test-frame">
      <PrototypeScenarioToolbar inline />
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
            <button
              className="app-global-action-button app-shell-mobile-navigation-trigger"
              type="button"
              aria-label="Open navigation"
              aria-controls="brisk-primary-navigation"
              aria-expanded={isMobileNavigationOpen}
              onClick={() => setIsMobileNavigationOpen(true)}
            >
              <DsIcon name="columns" size={18} />
            </button>
            <GlobalHeaderActions />
            <UserAvatarMenu placement="header" />
          </header>
          <div className="app-shell-content">{children}</div>
        </div>
        <BriskAiAssistant />
      </div>
    </div>
  );
}
