"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  canRoleSeeNavigationItem,
  getNavigationItem,
  getRoleHome,
} from "@/components/navigation/navigationConfig";
import {
  prototypeRoleLabels,
  prototypeRoles,
  usePrototypeRole,
  type PrototypeRole,
} from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";

export function RolePreviewControl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    selectedRole,
    setSelectedRole,
    allPages,
    setAllPages,
  } = usePrototypeRole();
  const currentItem = getNavigationItem(pathname, searchParams.toString());

  function selectRole(role: PrototypeRole) {
    setSelectedRole(role);

    if (currentItem && !canRoleSeeNavigationItem(currentItem, role, allPages)) {
      router.push(getRoleHome(role));
    }
  }

  function toggleAllPages() {
    const nextAllPages = !allPages;
    setAllPages(nextAllPages);

    if (!nextAllPages && currentItem && !canRoleSeeNavigationItem(currentItem, selectedRole, false)) {
      router.push(getRoleHome(selectedRole));
    }
  }

  return (
    <section className="role-preview-control" aria-label="Prototype view">
      <div className="role-preview-options" role="group" aria-label="View as role">
        {prototypeRoles.map((role) => (
          <button
            className={`label-xs-semibold ${selectedRole === role ? "is-active" : ""}`}
            type="button"
            aria-pressed={selectedRole === role}
            key={role}
            onClick={() => selectRole(role)}
          >
            {prototypeRoleLabels[role]}
          </button>
        ))}
      </div>
      <button
        className={`role-preview-all-pages label-xs-semibold ${allPages ? "is-active" : ""}`}
        type="button"
        aria-pressed={allPages}
        onClick={toggleAllPages}
      >
        <span className="role-preview-checkbox" aria-hidden="true">
          {allPages ? <DsIcon name="check" size={12} /> : null}
        </span>
        All pages
      </button>
    </section>
  );
}
