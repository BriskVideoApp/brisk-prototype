"use client";

import { useConfirmation } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BriskSelect } from "@/components/form/BriskSelect";
import {
  getRoleHome,
} from "@/components/navigation/navigationConfig";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { hasStudioAdministrationAccess, prototypeStudioPersonId } from "@/data/people";

export type StudioSettingsSectionId =
  | "overview"
  | "production"
  | "ai-playbook"
  | "integrations"
  | "storage"
  | "notifications"
  | "plan-billing"
  | "client-billing";

type StudioSettingsNavigationItem = {
  id: StudioSettingsSectionId;
  label: string;
  href: string;
  icon: DsIconName;
  description: string;
  note?: string;
};

export const studioSettingsNavigation = [
  {
    id: "overview",
    label: "Studio setup",
    href: "/settings/studio",
    icon: "settings",
    description: "Manage your Studio name, logo, video types and default Client Brief.",
  },
  {
    id: "production",
    label: "Production defaults",
    href: "/settings/studio/production",
    icon: "queue",
    description: "Choose the roles and Staff added to new project teams.",
  },
  {
    id: "ai-playbook",
    label: "AI Playbook",
    href: "/settings/studio/ai-playbook",
    icon: "sparkle",
    description: "Add Studio instructions and references for Brisk AI.",
  },
  {
    id: "integrations",
    label: "Messaging connections",
    href: "/settings/studio/integrations",
    icon: "link",
    description: "Manage the shared accounts that connect your Studio to external messaging apps.",
  },
  {
    id: "storage",
    label: "Storage",
    href: "/settings/studio/storage",
    icon: "weather-cloud",
    description: "Choose where files uploaded to Brisk are saved.",
    note: "No matter which option you choose, your team will upload, watch and share files in Brisk the same way.",
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/settings/notifications",
    icon: "bell",
    description: "Choose what Brisk sends and when.",
  },
  {
    id: "plan-billing",
    label: "Brisk plan & billing",
    href: "/settings/plan-billing",
    icon: "settings",
    description: "Manage your Brisk plan, usage and billing details.",
  },
  {
    id: "client-billing",
    label: "Client billing",
    href: "/settings/client-billing",
    icon: "link",
    description: "Choose how your Studio invoices and collects payments from Clients.",
  },
] as const satisfies readonly StudioSettingsNavigationItem[];

type StudioWorkspaceSectionId = "people" | "clients";

function StudioSettingsSidebar({ activeHref }: { activeHref: string }) {
  return (
    <nav className="studio-settings-navigation" aria-label="Studio Settings">
      {studioSettingsNavigation.map((item) => (
        <Link
          className={`studio-settings-navigation-link label-s-semibold ${item.href === activeHref ? "is-active" : ""}`}
          href={item.href}
          aria-current={item.href === activeHref ? "page" : undefined}
          key={item.id}
        >
          <DsIcon name={item.icon} size={16} />
          <span>{item.label}</span>
          <DsIcon name="caret-right" size={14} />
        </Link>
      ))}
    </nav>
  );
}

export function StudioWorkspacePageFrame({ children, section }: { children: ReactNode; section: StudioWorkspaceSectionId }) {
  const router = useRouter();
  const { selectedRole } = usePrototypeRole();
  const { people } = usePeople();
  const currentStudioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canManageStudioSettings = selectedRole === "Studio Staff" && hasStudioAdministrationAccess(currentStudioMember);
  if (!canManageStudioSettings) return <>{children}</>;

  const activeHref = `/${section}`;
  return (
    <div className="studio-settings-shell studio-workspace-settings-shell">
      <div className="studio-settings-mobile-navigation">
        <span className="label-xs-semibold">Settings section</span>
        <BriskSelect
          ariaLabel="Choose Studio Settings section"
          clearable={false}
          options={[
            { value: "/people", label: "People", icon: "users-three" as const },
            { value: "/clients", label: "Clients", icon: "users-three" as const },
            ...studioSettingsNavigation.map((item) => ({ value: item.href, label: item.label, icon: item.icon })),
          ]}
          placeholder="Choose section"
          searchable={false}
          value={activeHref}
          onChange={(href) => { if (href && href !== activeHref) router.push(href); }}
        />
      </div>
      <div className="studio-settings-layout">
        <StudioSettingsSidebar activeHref={activeHref} />
        <div className="studio-settings-main">{children}</div>
      </div>
    </div>
  );
}

type StudioSettingsUnsavedContextValue = {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasUnsavedChanges: boolean, section?: string) => void;
};

const StudioSettingsUnsavedContext = createContext<StudioSettingsUnsavedContextValue | null>(null);
const unsavedChangesMessage = "You have unsaved changes. Leave without saving?";

export function StudioSettingsShell({
  children,
  sectionId,
}: {
  children: ReactNode;
  sectionId: StudioSettingsSectionId;
}) {
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
  const hasUnsavedChanges = Object.values(dirtySections).some(Boolean);
  const setHasUnsavedChanges = useCallback((dirty: boolean, section = "default") => {
    setDirtySections((current) => {
      if (!dirty && section === "default") return {};
      if (current[section] === dirty) return current;
      return { ...current, [section]: dirty };
    });
  }, []);
  const contextValue = useMemo(() => ({ hasUnsavedChanges, setHasUnsavedChanges }), [hasUnsavedChanges, setHasUnsavedChanges]);

  return (
    <StudioSettingsUnsavedContext.Provider value={contextValue}>
      <StudioSettingsFrame sectionId={sectionId}>{children}</StudioSettingsFrame>
    </StudioSettingsUnsavedContext.Provider>
  );
}

function StudioSettingsFrame({ children, sectionId }: { children: ReactNode; sectionId: StudioSettingsSectionId }) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm, confirmationDialog } = useConfirmation();
  const { selectedRole } = usePrototypeRole();
  const { people } = usePeople();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const allowNavigationRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const activeSection = studioSettingsNavigation.find((item) => item.id === sectionId) ?? studioSettingsNavigation[0];
  const title = activeSection.label;
  const activeSectionNote = "note" in activeSection ? activeSection.note : undefined;
  const currentStudioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canManageStudioSettings = hasStudioAdministrationAccess(currentStudioMember);

  const confirmNavigation = useCallback(async () => {
    if (!hasUnsavedChanges) return true;
    if (!(await confirm({ title: "Discard unsaved changes?", description: unsavedChangesMessage, tone: "danger", confirmLabel: "Discard changes" }))) return false;
    allowNavigationRef.current = true;
    setHasUnsavedChanges(false);
    return true;
  }, [confirm, hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (destination.origin === window.location.origin
        && destination.pathname === window.location.pathname
        && destination.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      void confirmNavigation().then((accepted) => {
        if (!accepted) return;
        if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        else window.location.assign(destination.href);
      });
    };
    // History traversal needs a synchronous decision before Next handles the event.
    // Keep the native safeguard here, and on tab close/reload, to protect unsaved work.
    const handlePopState = () => {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        return;
      }
      if (window.confirm(unsavedChangesMessage)) {
        allowNavigationRef.current = true;
        setHasUnsavedChanges(false);
        return;
      }
      restoringHistoryRef.current = true;
      window.history.forward();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [confirmNavigation, hasUnsavedChanges, router, setHasUnsavedChanges]);

  if (selectedRole !== "Studio Staff") {
    const isCustomer = selectedRole === "Customer";
    return (
      <main className="studio-settings-permission-state">
        <span className="studio-settings-permission-icon"><DsIcon name="lock" size={28} /></span>
        <span className="label-xs-semibold">Studio Settings</span>
        <h1 className="headings-s-bold">Studio Settings are for Studio Staff</h1>
        <p className="paragraph-s">
          {isCustomer
            ? "Customers can only manage their own Client and project access. Studio identity, Staff and billing stay private."
            : "Studio Freelancers can only access the Clients and projects they have been invited to. Ask Studio Staff if a setting needs to change."}
        </p>
        <Link className="client-secondary-button label-s-semibold" href={getRoleHome(selectedRole)}>
          {isCustomer ? "Open Client portal" : "Back to invited projects"}
        </Link>
      </main>
    );
  }

  if (!canManageStudioSettings) {
    return (
      <main className="studio-settings-permission-state">
        <span className="studio-settings-permission-icon"><DsIcon name="lock" size={28} /></span>
        <span className="label-xs-semibold">Studio Settings</span>
        <h1 className="headings-s-bold">Studio Settings are restricted</h1>
        <p className="paragraph-s">Only Studio Owners can manage Studio-wide details, access, defaults and billing.</p>
        <Link className="client-secondary-button label-s-semibold" href="/settings/personal/profile">Open my profile</Link>
      </main>
    );
  }

  return (
    <div className="studio-settings-shell">
      {confirmationDialog}
      <header className="studio-settings-header">
        <div className={`studio-settings-header-inner ${sectionId === "overview" ? "has-preview-action" : ""}`}>
          <div className="studio-settings-header-copy">
            <h1 className="headings-m-bold">{title}</h1>
            {sectionId !== "overview" ? <p className="paragraph-s">{activeSection.description}</p> : null}
            {activeSectionNote ? <div className="studio-settings-header-note label-s"><DsIcon name="info" size={16} /><span>{activeSectionNote}</span></div> : null}
          </div>
          {sectionId === "overview" ? (
            <Link className="client-secondary-button label-s-semibold" href="/settings/studio/portal-preview">
              <DsIcon name="eye" size={16} /> Preview sample Client portal
            </Link>
          ) : null}
        </div>
      </header>

      <div className="studio-settings-mobile-navigation">
        <span className="label-xs-semibold">Settings section</span>
        <BriskSelect
          ariaLabel="Choose Studio Settings section"
          clearable={false}
          options={studioSettingsNavigation.map((item) => ({ value: item.href, label: item.label, icon: item.icon }))}
          placeholder="Choose section"
          searchable={false}
          value={activeSection.href}
          onChange={async (href) => {
            if (!href || href === pathname || !(await confirmNavigation())) return;
            router.push(href);
          }}
        />
      </div>

      <div className="studio-settings-layout">
        <StudioSettingsSidebar activeHref={activeSection.href} />
        <div className="studio-settings-main">{children}</div>
      </div>
    </div>
  );
}

export function useStudioSettingsUnsavedChanges() {
  const context = useContext(StudioSettingsUnsavedContext);
  if (!context) throw new Error("useStudioSettingsUnsavedChanges must be used within StudioSettingsShell");
  return context;
}
