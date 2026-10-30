"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getRoleHome } from "@/components/navigation/navigationConfig";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import {
  useClientAccountSettings,
  type ClientAccountAccess,
} from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export function PersonalSettingsPageShell({
  backHref,
  backLabel,
  children,
  description,
  title,
}: {
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const { selectedRole } = usePrototypeRole();
  const resolvedBackHref = backHref ?? (selectedRole === "Studio Freelancer" ? "/active-videos" : selectedRole === "Studio Staff" ? "/today" : "/customer-dashboard");
  const resolvedBackLabel = backLabel ?? (selectedRole === "Studio Freelancer" ? "Back to My jobs" : selectedRole === "Studio Staff" ? "Back to To Do" : "Back to dashboard");

  return (
    <AccountSettingsPageShell
      backHref={resolvedBackHref}
      backLabel={resolvedBackLabel}
      description={selectedRole === "Customer" ? undefined : description}
      eyebrow={selectedRole === "Customer" ? undefined : "Your settings"}
      title={title}
    >
      {children}
    </AccountSettingsPageShell>
  );
}

export function PersonalSettingsAccessBoundary({ children }: { children: ReactNode }) {
  return children;
}

export function ClientCompanySettingsPageShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <AccountSettingsPageShell
      backHref="/customer-dashboard"
      backLabel="Back to dashboard"
      title={title}
    >
      {children}
    </AccountSettingsPageShell>
  );
}

export function ClientInvoicesPageShell({ children }: { children: ReactNode }) {
  return (
    <AccountSettingsPageShell
      backHref="/customer-dashboard"
      backLabel="Back to dashboard"
      title="Invoices"
    >
      {children}
    </AccountSettingsPageShell>
  );
}

function AccountSettingsPageShell({
  backHref,
  backLabel,
  children,
  description,
  eyebrow,
  title,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  const { selectedRole } = usePrototypeRole();
  const { buildHref } = useClientAccountSettings();
  return (
    <main className="account-settings-page">
      <header className="account-settings-header">
        <div className="account-settings-header-inner">
          <Link className="account-settings-back label-s-semibold" href={buildHref(backHref)}>
            <DsIcon name="arrow-left" size={16} />
            {backLabel}
          </Link>
          {eyebrow ? <span className="label-xs-semibold">{eyebrow}</span> : null}
          <h1 className="headings-m-bold">{title}</h1>
          {description ? <p className="paragraph-s">{description}</p> : null}
        </div>
      </header>
      {selectedRole === "Customer" ? <ClientSettingsNavigation /> : null}
      <div className="account-settings-content">{children}</div>
    </main>
  );
}

function ClientSettingsNavigation() {
  const pathname = usePathname();
  const { access, buildHref } = useClientAccountSettings();
  const personal = [
    { href: "/settings/personal/profile", label: "My profile" },
    { href: "/settings/personal/notifications", label: "Notifications" },
    { href: "/settings/personal/security", label: "Security" },
  ];
  const company = [
    ...(access.role === "Client Admin" ? [
      { href: "/settings/client/company", label: "Company details" },
      { href: "/settings/client/team", label: "Team access" },
    ] : []),
    ...(access.canAccessBilling ? [{ href: "/client/invoices", label: "Invoices" }] : []),
  ];
  const isCompanyPage = pathname.startsWith("/settings/client/") || pathname === "/client/invoices";
  const currentPages = isCompanyPage ? company : personal;

  return (
    <nav className="account-settings-page-navigation" aria-label="Client settings">
      <div className="account-settings-page-navigation-inner">
        <div className="account-settings-page-navigation-scopes">
          <Link
            className={`label-s-semibold ${isCompanyPage ? "" : "is-active"}`}
            href={buildHref(personal[0].href)}
            aria-current={isCompanyPage ? undefined : "location"}
          >
            Personal
          </Link>
          {company.length ? (
            <Link
              className={`label-s-semibold ${isCompanyPage ? "is-active" : ""}`}
              href={buildHref(company[0].href)}
              aria-current={isCompanyPage ? "location" : undefined}
            >
              Company
            </Link>
          ) : null}
        </div>
        <div className="account-settings-page-navigation-pages">
          {currentPages.map((item) => (
            <Link
              key={item.href}
              className={`label-s-semibold ${pathname === item.href ? "is-active" : ""}`}
              href={buildHref(item.href)}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function ClientSettingsAccessBoundary({
  children,
  requireAdmin = false,
  requireBilling = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
  requireBilling?: boolean;
}) {
  const { selectedRole } = usePrototypeRole();
  const { access, buildHref } = useClientAccountSettings();
  const studioName = useStudioCompanyName();

  if (selectedRole !== "Customer") {
    return (
      <AccountSettingsPermissionState
        description="Switch the prototype to the Client view to open this account setting. Studio settings and Client account settings stay separate."
        href={getRoleHome(selectedRole)}
        linkLabel="Back to workspace"
        title="Client account settings are only available to Clients"
      />
    );
  }

  if (requireAdmin && access.role !== "Client Admin") {
    return (
      <AccountSettingsPermissionState
        description="Only Client Owners can update company details and manage the Client team. Ask a Client Owner at your company for access."
        href={buildHref("/settings/personal/profile")}
        linkLabel="Open my profile"
        title="Company & team is restricted"
      />
    );
  }

  if (requireBilling && !access.canAccessBilling) {
    const unavailableBillingCopy = getUnavailableBillingCopy(access.billingAvailability, studioName);
    return (
      <AccountSettingsPermissionState
        description={unavailableBillingCopy.description}
        eyebrow={unavailableBillingCopy.eyebrow}
        href={buildHref("/customer-dashboard")}
        icon={unavailableBillingCopy.icon}
        linkLabel="Back to dashboard"
        title={unavailableBillingCopy.title}
      />
    );
  }

  return children;
}

function getUnavailableBillingCopy(availability: ClientAccountAccess["billingAvailability"], studioName: string) {
  if (availability === "managed-externally") {
    return {
      title: "Billing is managed outside Brisk",
      description: `${studioName} will send invoices and payment instructions through its chosen billing system.`,
      eyebrow: "Client billing",
      icon: "file-text" as const satisfies DsIconName,
    };
  }
  if (availability === "setup-required") {
    return {
      title: "Online payments are unavailable",
      description: `${studioName} is updating its payment setup. Contact your producer if you need help with an invoice.`,
      eyebrow: "Payment setup",
      icon: "info" as const satisfies DsIconName,
    };
  }
  return {
    title: "Invoices & payments is restricted",
    description: "Your account does not have access to Client invoices. Ask a Client Owner for help.",
    eyebrow: "Access restricted",
    icon: "lock" as const satisfies DsIconName,
  };
}

function AccountSettingsPermissionState({
  description,
  eyebrow = "Access restricted",
  href,
  icon = "lock",
  linkLabel,
  title,
}: {
  description: string;
  eyebrow?: string;
  href: string;
  icon?: DsIconName;
  linkLabel: string;
  title: string;
}) {
  return (
    <main className="account-settings-permission-state">
      <span className="account-settings-permission-icon"><DsIcon name={icon} size={28} /></span>
      <span className="label-xs-semibold">{eyebrow}</span>
      <h1 className="headings-s-bold">{title}</h1>
      <p className="paragraph-s">{description}</p>
      <Link className="client-secondary-button label-s-semibold" href={href}>{linkLabel}</Link>
    </main>
  );
}
