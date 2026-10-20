"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type ReactNode } from "react";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { UserAvatarMenu } from "@/components/navigation/UserAvatarMenu";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { usePeople } from "@/components/people/PeopleDataContext";
import { PrototypeScenarioToolbar } from "@/components/prototype-scenarios/PrototypeScenarioToolbar";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { studioSettingsNavigation } from "@/components/settings/StudioSettingsShell";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { hasStudioAdministrationAccess, prototypeStudioPersonId } from "@/data/people";

type SidebarLink = { label: string; href: string; icon: DsIconName };

export function HybridSidebar({ brand, collapsed, onToggle, videosHref }: {
  brand: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  videosHref: string;
}) {
  const pathname = usePathname();
  const navigationId = useId();
  const { selectedRole } = usePrototypeRole();
  const viewer = usePrototypeViewer();
  const { people } = usePeople();
  const { access, account, buildHref } = useClientAccountSettings();
  const isStaff = selectedRole === "Studio Staff";
  const isClient = selectedRole === "Customer";
  const studioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canAdministerStudio = isStaff && hasStudioAdministrationAccess(studioMember);
  const isStudioSettings = canAdministerStudio && (pathname.startsWith("/settings/studio")
    || ["/settings/notifications", "/settings/plan-billing", "/settings/client-billing"].includes(pathname));
  const isAccountSettings = pathname.startsWith("/settings/personal/")
    || (isClient && (pathname.startsWith("/settings/client/") || pathname === "/client/invoices"));
  const workspace: SidebarLink[] = [
    { label: "Videos", href: videosHref, icon: "film-strip" },
    ...(isStaff ? [
      { label: "To Do", href: "/today", icon: "check-circle" as const },
      { label: "People", href: "/people", icon: "users-three" as const },
      { label: "Clients", href: "/clients", icon: "buildings" as const },
    ] : []),
    { label: "Media Library", href: "/media", icon: "image-square" },
    ...(canAdministerStudio ? [{ label: "Expenses", href: "/outstanding-invoices", icon: "money" as const }] : []),
    ...(!isStaff ? [{
      label: isClient ? "Brand Kit" : "Brand Kits",
      href: isClient ? viewer?.clientId ? `/brand-kits/${viewer.clientId}` : "/prototype/scenarios" : "/brand-kits",
      icon: "frame-corners" as const,
    }] : []),
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
          title={collapsed ? item.label : undefined}>
          <DsIcon name={item.icon} size={20} />
          <span className="hybrid-navigation-copy">{item.label}</span>
        </Link>;
      })}
    </nav>;
  }

  return <aside className="hybrid-sidebar" aria-label="Primary navigation">
    <div className="hybrid-sidebar-heading">
      <div className="hybrid-sidebar-brand">{brand}</div>
      <IconButton aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-expanded={!collapsed} aria-controls={navigationId} onClick={onToggle}
        tooltipPlacement="bottom" tooltipAlign="end">
        <DsIcon name={collapsed ? "caret-right" : "caret-left"} />
      </IconButton>
    </div>
    <div className="hybrid-sidebar-navigation" id={navigationId}>
      {isStudioSettings || isAccountSettings ? <>
        <Link className="hybrid-navigation-link label-s-semibold" href={videosHref}
          aria-label={isClient ? "Back to your videos" : "Back to workspace"}
          title={collapsed ? isClient ? "Back to your videos" : "Back to workspace" : undefined}>
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
      <UserAvatarMenu placement="sidebar" />
      {canAdministerStudio ? links([{ label: "Studio settings", href: "/settings/studio", icon: "settings" }], "Studio administration") : null}
      <PrototypeScenarioToolbar inline placement="sidebar" />
    </div>
  </aside>;
}
