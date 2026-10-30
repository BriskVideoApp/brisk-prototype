"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { UserAvatarMenu } from "@/components/navigation/UserAvatarMenu";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { PrototypeScenarioToolbar } from "@/components/prototype-scenarios/PrototypeScenarioToolbar";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { studioSettingsNavigation } from "@/components/settings/StudioSettingsShell";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

type SidebarLink = { label: string; href: string; icon: DsIconName };

// Fixed tooltips keep the existing app treatment outside the scrollable rail.
function positionSidebarTooltip(root: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const trigger = target.closest<HTMLElement>("[data-tooltip]");
  if (!trigger || !root.contains(trigger)) return;
  const rect = trigger.getBoundingClientRect();
  trigger.style.setProperty("--hybrid-tooltip-edge", `${root.getBoundingClientRect().right}px`);
  trigger.style.setProperty("--hybrid-tooltip-centre", `${rect.top + rect.height / 2}px`);
}

export function HybridSidebar({ brand, collapsed, onToggle, videosHref }: {
  brand: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  videosHref: string;
}) {
  const pathname = usePathname();
  const navigationId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const { selectedRole, canManageStudio } = usePrototypeRole();
  const viewer = usePrototypeViewer();
  const { access, account, buildHref } = useClientAccountSettings();
  const isStaff = selectedRole === "Studio Staff";
  const isClient = selectedRole === "Customer";
  const canAdministerStudio = canManageStudio;
  const isStudioSettings = canAdministerStudio && (pathname.startsWith("/settings/studio")
    || ["/settings/notifications", "/settings/plan-billing", "/settings/client-billing"].includes(pathname));
  const isAccountSettings = pathname.startsWith("/settings/personal/")
    || (isClient && (pathname.startsWith("/settings/client/") || pathname === "/client/invoices"));
  const workspace: SidebarLink[] = [
    { label: "Videos", href: videosHref, icon: "house-line" },
    ...(isStaff ? [
      { label: "To Do", href: "/today", icon: "check-circle" as const },
      ...(canManageStudio ? [{ label: "People", href: "/people", icon: "user" as const }] : []),
      { label: "Clients", href: "/clients", icon: "buildings" as const },
    ] : []),
    { label: "Media Library", href: "/media", icon: "image-square" },
    ...(isStaff ? [{ label: "Expenses", href: "/outstanding-invoices", icon: "currency-dollar-simple" as const }] : []),
    {
      label: isClient ? "Brand Kit" : "Brand Kits",
      href: isClient ? viewer?.clientId ? `/brand-kits/${viewer.clientId}` : "/prototype/scenarios" : "/brand-kits",
      icon: "palette" as const,
    },
  ];
  const personal: SidebarLink[] = [
    { label: "My profile", href: buildHref("/settings/personal/profile"), icon: "user-switch" },
    { label: "My notifications", href: buildHref("/settings/personal/notifications"), icon: "bell" },
    { label: "Security", href: buildHref("/settings/personal/security"), icon: "lock" },
  ];
  const company: SidebarLink[] = isClient ? [
    ...(access.role === "Client Admin" ? [
      { label: "Company details", href: buildHref("/settings/client/company"), icon: "book-open" as const },
      { label: "Team access", href: buildHref("/settings/client/team"), icon: "users-three" as const },
    ] : []),
    ...(access.canAccessBilling ? [{ label: "Invoices", href: buildHref("/client/invoices"), icon: "file-text" as const }] : []),
  ] : [];

  useLayoutEffect(() => {
    if (!collapsed) return;
    const reposition = () => {
      const root = sidebarRef.current;
      if (root) positionSidebarTooltip(root,
        root.querySelector("[data-tooltip]:hover, [data-tooltip]:focus-visible"));
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [collapsed, pathname]);

  function links(items: readonly SidebarLink[], label: string) {
    return <nav className="hybrid-navigation-links" aria-label={label}>
      {items.map((item) => {
        const path = item.href.split("?")[0];
        const active = item.label === "Videos"
          ? pathname === path || pathname.startsWith("/projects/")
          : pathname === path || (path !== "/settings/studio" && pathname.startsWith(`${path}/`));
        return <Link key={item.href} href={item.href}
          className={`hybrid-navigation-link label-s-semibold${active ? " is-active" : ""}`}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          data-tooltip={collapsed ? item.label : undefined}>
          <DsIcon name={item.icon} size={20} />
          <span className="hybrid-navigation-copy">{item.label}</span>
        </Link>;
      })}
    </nav>;
  }

  return <aside className="hybrid-sidebar" aria-label="Primary navigation" ref={sidebarRef}
    onPointerOver={(event) => positionSidebarTooltip(event.currentTarget, event.target)}
    onFocus={(event) => positionSidebarTooltip(event.currentTarget, event.target)}
    onScrollCapture={(event) => positionSidebarTooltip(event.currentTarget,
      event.currentTarget.querySelector("[data-tooltip]:hover, [data-tooltip]:focus-visible"))}>
    <div className="hybrid-sidebar-heading">
      <div className="hybrid-sidebar-brand">{brand}</div>
      <IconButton size="M" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed} aria-controls={navigationId} onClick={onToggle}
        tooltipPlacement="bottom" tooltipAlign="end">
        <DsIcon name="sidebar-simple" size={20} />
      </IconButton>
    </div>
    <div className="hybrid-sidebar-navigation" id={navigationId}>
      {isStudioSettings || isAccountSettings ? <>
        <Link className="hybrid-navigation-link label-s-semibold" href={videosHref}
          aria-label={isClient ? "Back to your videos" : "Back to workspace"}
          data-tooltip={collapsed ? isClient ? "Back to your videos" : "Back to workspace" : undefined}>
          <DsIcon name="arrow-left" size={20} /><span className="hybrid-navigation-copy">{isClient ? "Back to your videos" : "Back to workspace"}</span>
        </Link>
        <div className="hybrid-settings-group">
          <span className="hybrid-navigation-heading label-xs">{isStudioSettings ? "Studio settings" : "Personal"}</span>
          {links(isStudioSettings ? studioSettingsNavigation : personal, isStudioSettings ? "Studio settings" : "Personal settings")}
        </div>
        {isAccountSettings && company.length ? <div className="hybrid-settings-group">
          <span className="hybrid-navigation-heading label-xs">{account.company.name}</span>
          {links(company, "Company settings")}
        </div> : null}
      </> : links(workspace, "Workspace")}
    </div>
    <div className="hybrid-sidebar-footer">
      <UserAvatarMenu placement="sidebar" collapsed={collapsed} />
      {canAdministerStudio ? links([{ label: "Studio settings", href: "/settings/studio", icon: "settings" }], "Studio administration") : null}
      <PrototypeScenarioToolbar inline placement="sidebar" />
    </div>
  </aside>;
}
