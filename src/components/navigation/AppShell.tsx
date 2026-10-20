"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { GlobalHeaderActions, openCustomerGlobalChatEventName } from "@/components/navigation/GlobalHeaderActions";
import { GlobalHistoryNavigation } from "@/components/navigation/GlobalHistoryNavigation";
import { ShootGlobalActionsProvider } from "@/components/navigation/ShootGlobalActionsContext";
import { UserAvatarMenu } from "@/components/navigation/UserAvatarMenu";
import { DeferredBriskAiAssistant } from "@/components/ai/DeferredBriskAiAssistant";
import { BriskAiHeaderButton } from "@/components/ai/BriskAiHeaderButton";
import { PrototypeScenarioToolbar } from "@/components/prototype-scenarios/PrototypeScenarioToolbar";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { getActiveClientPortalDestination, getAppShellPresentation } from "@/components/navigation/prototypeNavigation";
import { DeferredChatPage as ChatPage } from "@/components/chat/DeferredChatPage";
import { DsIcon } from "@/components/video-review/DsIcon";
import { HybridSidebar } from "@/components/navigation/HybridSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const { activeScenario } = usePrototypeScenario();
  const { selectedRole } = usePrototypeRole();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { studio } = useStudioSettings();
  const presentation = getAppShellPresentation(pathname, Boolean(activeScenario), selectedRole,
    searchParams.get("studio-preview") === "1");
  const clientPortalHref = getActiveClientPortalDestination(state, viewer);
  const isStudioStaff = selectedRole === "Studio Staff";
  const isStudioUser = selectedRole !== "Customer";
  const videosHref = selectedRole === "Customer" ? clientPortalHref ?? "/prototype/scenarios" : "/active-videos";
  const isClientJourneyEntry = pathname === "/prototype/journey-entry" && activeScenario?.entry === "client-magic-link";

  useEffect(() => {
    if (pathname === "/customer-dashboard") return;
    const openGlobalChat = () => setIsGlobalChatOpen(true);
    window.addEventListener(openCustomerGlobalChatEventName, openGlobalChat);
    return () => window.removeEventListener(openCustomerGlobalChatEventName, openGlobalChat);
  }, [pathname]);

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    if (!isGlobalChatOpen) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGlobalChatOpen(false);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [isGlobalChatOpen]);

  if (!hasMounted && presentation !== "standalone") return null;

  if (presentation === "standalone" || (isClientJourneyEntry && selectedRole !== "Studio Staff")) {
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
    <ShootGlobalActionsProvider>
      <div className="prototype-test-frame">
        <div className={`app-shell app-shell-hybrid${isNavigationCollapsed ? " is-navigation-collapsed" : ""}`}>
          <HybridSidebar
            brand={<StudioHeaderBrand selectedRole={selectedRole} studioName={studio.details.name} logoPreviewUrl={studio.branding.logoPreviewUrl} compact />}
            collapsed={isNavigationCollapsed}
            onToggle={() => setIsNavigationCollapsed((current) => !current)}
            videosHref={videosHref}
          />
          <div className="app-shell-workspace">
            <header className="app-global-header">
              <div className="app-account-header">
                <div className="app-account-header-leading">
                  {isStudioUser ? <Link
                    className="app-account-brisk-brand"
                    href={videosHref}
                    aria-label="Videos"
                    data-tooltip="Videos"
                  >
                    <Image src="/assets/logos/brisk.svg" alt="" width={24} height={16} priority />
                  </Link> : null}
                  <StudioHeaderBrand selectedRole={selectedRole} studioName={studio.details.name} logoPreviewUrl={studio.branding.logoPreviewUrl} />
                </div>
                <div className="app-account-header-trailing">
                  <PrototypeScenarioToolbar inline />
                  <UserAvatarMenu placement="header" />
                </div>
              </div>
              <div className="app-workspace-header">
                <div className="app-global-header-leading">
                  <GlobalHistoryNavigation />
                  <Link className={`app-header-navigation-link is-primary label-s-semibold ${pathname === videosHref ? "is-active" : ""}`} href={videosHref}>
                    Videos
                  </Link>
                  {isStudioStaff ? <Link className={`app-header-navigation-link label-s-semibold ${pathname === "/today" ? "is-active" : ""}`} href="/today">
                    To Do
                  </Link> : null}
                  {isStudioStaff ? <Link className={`app-header-navigation-link label-s-semibold ${pathname.startsWith("/people") ? "is-active" : ""}`} href="/people">
                    People
                  </Link> : null}
                  {isStudioStaff ? <Link className={`app-header-navigation-link label-s-semibold ${pathname.startsWith("/clients") ? "is-active" : ""}`} href="/clients">
                    Clients
                  </Link> : null}
                  {!isStudioStaff ? <Link className={`app-header-navigation-link label-s-semibold ${pathname === "/media" ? "is-active" : ""}`} href="/media">
                    Media Library
                  </Link> : null}
                  {!isStudioStaff ? <Link
                    className={`app-header-navigation-link label-s-semibold ${pathname.startsWith("/brand-kits") ? "is-active" : ""}`}
                    href={isStudioUser ? "/brand-kits" : viewer?.clientId ? `/brand-kits/${viewer.clientId}` : "/prototype/scenarios"}
                  >
                    {isStudioUser ? "Brand Kits" : "Brand Kit"}
                  </Link> : null}
                </div>
                <div className="app-global-header-trailing">
                  <GlobalHeaderActions />
                  <BriskAiHeaderButton />
                </div>
              </div>
            </header>
            <div className="app-shell-content">{children}</div>
          </div>
          <DeferredBriskAiAssistant />
          {isGlobalChatOpen ? (
            <div className="customer-chat-backdrop" role="presentation" onMouseDown={() => setIsGlobalChatOpen(false)}>
              <aside
                className="customer-chat-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Global Chat"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  className="customer-chat-close"
                  type="button"
                  aria-label="Close Chat"
                  onClick={() => setIsGlobalChatOpen(false)}
                >
                  <DsIcon name="x-close-cross" size={18} />
                </button>
                <ChatPage key="global-chat-drawer" embedded initialProjectId={null} onNavigate={() => setIsGlobalChatOpen(false)} />
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </ShootGlobalActionsProvider>
  );
}

function StudioHeaderBrand({
  selectedRole,
  studioName,
  logoPreviewUrl,
  compact = false,
}: {
  selectedRole: ReturnType<typeof usePrototypeRole>["selectedRole"];
  studioName: string;
  logoPreviewUrl: string | null;
  compact?: boolean;
}) {
  const initials = studioName.split(/\s+/u).map((part) => part.charAt(0)).slice(0, 2).join("");
  const content = <>
    <span className="app-global-client-studio-logo" aria-label={`${studioName} logo`}>
      {logoPreviewUrl ? <img src={logoPreviewUrl} alt="" /> : <span className="label-s-semibold">{initials}</span>}
    </span>
    <strong className={compact ? "label-s-semibold" : "label-m-semibold"}>{studioName}</strong>
    {selectedRole !== "Customer" ? <DsIcon name="caret-down" size={14} /> : null}
  </>;

  if (selectedRole === "Studio Staff") {
    return (
      <Link className="app-global-client-studio-brand is-link" href="/settings/studio">
        {content}
      </Link>
    );
  }

  return (
    <div className="app-global-client-studio-brand">
      {content}
    </div>
  );
}
