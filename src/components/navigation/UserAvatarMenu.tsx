"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import {
  prototypeRoleLabels,
  usePrototypeRole,
  type PrototypeRole,
} from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { chatUsers, chatWorkspace } from "@/data/chat";
import { hasStudioAdministrationAccess, prototypeCustomerPersonId, prototypeFreelancerPersonId, prototypeStudioPersonId } from "@/data/people";

type UserAvatarMenuProps = {
  placement: "sidebar" | "header";
  onNavigate?: () => void;
};

const prototypeUserIdByRole: Record<PrototypeRole, string> = {
  "Studio Staff": chatWorkspace.currentUserId,
  "Studio Freelancer": "user-nina",
  Customer: "user-jess",
};

const organisationByRole: Record<PrototypeRole, string> = {
  "Studio Staff": chatWorkspace.name,
  "Studio Freelancer": chatWorkspace.name,
  Customer: "Loom",
};

export function UserAvatarMenu({ placement, onNavigate }: UserAvatarMenuProps) {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { people } = usePeople();
  const { account, access, buildHref } = useClientAccountSettings();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const user = chatUsers.find((candidate) => candidate.id === prototypeUserIdByRole[selectedRole]);
  const isClient = selectedRole === "Customer";
  const isFreelancer = selectedRole === "Studio Freelancer";
  const isStudioStaff = selectedRole === "Studio Staff";
  const hasPersonalProfile = true;
  const customer = isClient ? people.find((person) => person.id === prototypeCustomerPersonId) ?? null : null;
  const freelancer = isFreelancer ? people.find((person) => person.id === prototypeFreelancerPersonId) ?? null : null;
  const studioMember = isStudioStaff ? people.find((person) => person.id === prototypeStudioPersonId) ?? null : null;
  const canManageStudioSettings = hasStudioAdministrationAccess(studioMember);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, selectedRole]);

  useEffect(() => {
    if (!isOpen) return;

    firstActionRef.current?.focus();

    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleMenuKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || placement !== "header") return;

      const focusableItems = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [],
      );
      const firstItem = focusableItems.at(0);
      const lastItem = focusableItems.at(-1);

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", handleMenuKeys);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", handleMenuKeys);
    };
  }, [isOpen, placement]);

  if (!user) {
    throw new Error(`Prototype user is missing for ${selectedRole}`);
  }

  const displayName = isClient ? customer?.name ?? account.profile.fullName : isFreelancer ? freelancer?.name ?? user.name : studioMember?.name ?? user.name;
  const displayEmail = isClient ? customer?.email ?? account.profile.signInEmail : isFreelancer ? freelancer?.email ?? user.email : studioMember?.email ?? user.email;
  const photoUrl = isClient ? customer?.avatarUrl ?? account.profile.photoUrl : isFreelancer ? freelancer?.avatarUrl ?? null : studioMember?.avatarUrl ?? null;
  const organisationName = isClient ? account.company.name : organisationByRole[selectedRole];
  const roleLine = isClient
    ? `${access.role} · ${organisationName}`
    : isStudioStaff
      ? `${studioMember?.studioPermission ?? "Team Member"} · ${organisationName}`
      : `${prototypeRoleLabels[selectedRole]} · ${organisationName}`;

  const closeAfterNavigation = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  return (
    <div
      className={`app-user-menu app-user-menu-${placement}`}
      ref={rootRef}
    >
      <button
        className="app-user-menu-trigger"
        type="button"
        aria-label={`Open your menu, signed in as ${displayName}`}
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={placement === "sidebar" ? displayName : undefined}
        ref={triggerRef}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="app-user-menu-trigger-avatar">
          <MenuAvatar photoUrl={photoUrl} user={{ ...user, name: displayName }} />
        </span>
        {placement === "sidebar" ? (
          <>
            <span className="app-user-menu-trigger-copy app-sidebar-copy">
              <strong className="label-s-semibold">{displayName}</strong>
              <span className="label-xs">{organisationName}</span>
            </span>
            <DsIcon name="caret-down" size={14} />
          </>
        ) : null}
      </button>

      {isOpen ? (
        <>
          {placement === "header" ? (
            <button
              className="app-user-menu-backdrop"
              type="button"
              aria-label="Close your menu"
              onClick={() => setIsOpen(false)}
            />
          ) : null}
          <section
            className="app-user-menu-popover"
            id={menuId}
            role="dialog"
            aria-label="Your menu"
            aria-modal={placement === "header" ? true : undefined}
            ref={menuRef}
          >
            <header className="app-user-menu-identity">
              {hasPersonalProfile ? (
                <Link
                  className="app-user-menu-identity-link"
                  href={buildHref("/settings/personal/profile")}
                  aria-label="Open My profile"
                  ref={firstActionRef}
                  onClick={closeAfterNavigation}
                >
                  <span className="app-user-menu-identity-avatar">
                    <MenuAvatar photoUrl={photoUrl} user={{ ...user, name: displayName }} />
                  </span>
                  <span className="app-user-menu-identity-copy">
                    <strong className="label-m-semibold">{displayName}</strong>
                    <span className="label-xs">{displayEmail}</span>
                    <span className="label-xs">{roleLine}</span>
                  </span>
                </Link>
              ) : (
                <div className="app-user-menu-identity-static">
                  <span className="app-user-menu-identity-avatar">
                    <MenuAvatar photoUrl={null} user={{ ...user, name: displayName }} />
                  </span>
                  <span className="app-user-menu-identity-copy">
                    <strong className="label-m-semibold">{displayName}</strong>
                    <span className="label-xs">{displayEmail}</span>
                    <span className="label-xs">{roleLine}</span>
                  </span>
                </div>
              )}
              <button
                className="app-user-menu-close"
                type="button"
                aria-label="Close your menu"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <DsIcon name="x-close-cross" size={16} />
              </button>
            </header>

            <nav className="app-user-menu-actions" aria-label="Your settings">
              <Link
                href={buildHref("/settings/personal/notifications")}
                ref={hasPersonalProfile ? undefined : firstActionRef}
                onClick={closeAfterNavigation}
              >
                <DsIcon name="bell" size={18} />
                <span className="label-s-semibold">My notifications</span>
                <DsIcon name="caret-right" size={14} />
              </Link>
              {isClient && access.role === "Client Admin" ? (
                <Link href={buildHref("/settings/client/company")} onClick={closeAfterNavigation}>
                  <DsIcon name="users-three" size={18} />
                  <span className="label-s-semibold">Company & team</span>
                  <DsIcon name="caret-right" size={14} />
                </Link>
              ) : null}
              {isClient && access.canAccessBilling ? (
                <Link href={buildHref("/client/invoices")} onClick={closeAfterNavigation}>
                  <DsIcon name="file-text" size={18} />
                  <span className="label-s-semibold">Invoices & payments</span>
                  <DsIcon name="caret-right" size={14} />
                </Link>
              ) : null}
              {hasPersonalProfile ? (
                <Link href={buildHref("/settings/personal/security")} onClick={closeAfterNavigation}>
                  <DsIcon name="lock" size={18} />
                  <span className="label-s-semibold">Security</span>
                  <DsIcon name="caret-right" size={14} />
                </Link>
              ) : null}
              {canManageStudioSettings ? (
                <Link href="/settings/studio" onClick={closeAfterNavigation}>
                  <DsIcon name="settings" size={18} />
                  <span className="label-s-semibold">Studio settings</span>
                  <DsIcon name="caret-right" size={14} />
                </Link>
              ) : null}
            </nav>

            <button
              className="app-user-menu-sign-out"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              <DsIcon name="sign-out" size={18} />
              <span className="label-s-semibold">Sign out</span>
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MenuAvatar({
  photoUrl,
  user,
}: {
  photoUrl: string | null;
  user: Parameters<typeof CommentAvatar>[0]["user"];
}) {
  if (photoUrl) {
    return <span className="app-user-menu-photo" aria-label={user.name}><img src={photoUrl} alt="" /></span>;
  }
  return <CommentAvatar user={user} />;
}
