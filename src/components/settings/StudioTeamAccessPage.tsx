"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ActionMenu, type BrandMenuItem } from "@/components/brand-kits/AssetManagement";
import { useInvitations } from "@/components/invitations/InvitationContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Person } from "@/data/people";
import type { StudioStaffAccess } from "@/data/studio-settings";

export function StudioTeamAccessPage() {
  const router = useRouter();
  const { people, setPersonStatus } = usePeople();
  const { studio, updateStaffAccess } = useStudioSettings();
  const { openInvitePerson, resendStudioStaffInvitation } = useInvitations();
  const staffRows = studio.staffAccess.flatMap((access) => {
    const person = people.find((candidate) => candidate.id === access.personId);
    return person ? [{ access, person }] : [];
  });

  const updateMember = (personId: string, update: Partial<StudioStaffAccess>) => {
    updateStaffAccess(studio.staffAccess.map((staffMember) => (
      staffMember.personId === personId ? { ...staffMember, ...update } : staffMember
    )));
  };

  const inviteStudioStaff = () => {
    openInvitePerson({ role: "Studio Staff" }, (person, submission) => {
      if (submission.role !== "Studio Staff") return;
      if (studio.staffAccess.some((staffMember) => staffMember.personId === person.id)) return;
      updateStaffAccess([
        ...studio.staffAccess,
        {
          personId: person.id,
          status: "Pending invite",
          hasBillingAccess: false,
        },
      ]);
    });
  };

  const openProfile = (personId: string, section?: "Access") => {
    router.push(`/people/${personId}${section ? `?section=${section}` : ""}`);
  };

  const getMemberActions = (person: Person, staffMember: StudioStaffAccess): BrandMenuItem[] => {
    if (["Pending invite", "Expired invite"].includes(staffMember.status)) {
      return [
        {
          label: "View invitation",
          icon: "eye",
          onSelect: () => openProfile(person.id, "Access"),
        },
        {
          label: "Resend invite",
          icon: "envelope-simple",
          onSelect: () => {
            resendStudioStaffInvitation(person);
            setPersonStatus(person.id, "Invited");
            updateMember(person.id, { status: "Pending invite" });
          },
        },
        {
          label: "Cancel invitation",
          icon: "trash-simple",
          destructive: true,
          onSelect: () => {
            setPersonStatus(person.id, "Archived");
            updateMember(person.id, { status: "Removed", hasBillingAccess: false });
          },
        },
      ];
    }

    if (staffMember.status === "Active") {
      return [
        {
          label: "View profile",
          icon: "eye",
          onSelect: () => openProfile(person.id),
        },
        {
          label: staffMember.hasBillingAccess ? "Remove billing access" : "Grant billing access",
          icon: "lock",
          onSelect: () => updateMember(person.id, { hasBillingAccess: !staffMember.hasBillingAccess }),
        },
        {
          label: "Pause access",
          icon: "pause",
          onSelect: () => {
            setPersonStatus(person.id, "Paused");
            updateMember(person.id, { status: "Paused" });
          },
        },
        {
          label: "Remove from Studio",
          icon: "trash-simple",
          destructive: true,
          onSelect: () => {
            setPersonStatus(person.id, "Archived");
            updateMember(person.id, { status: "Removed", hasBillingAccess: false });
          },
        },
      ];
    }

    return [{ label: "View profile", icon: "eye", onSelect: () => openProfile(person.id) }];
  };

  return (
    <section className="studio-settings-section studio-team-access" aria-labelledby="studio-team-access-heading">
      <div className="studio-settings-section-heading studio-settings-section-heading-row">
        <div>
          <h2 className="headings-xs-bold" id="studio-team-access-heading">Studio Staff</h2>
          <div className="studio-team-description-row">
            <p className="paragraph-s">Everyone listed here has full Studio workspace access.</p>
            <Link className="studio-team-directory-link label-s-semibold" href="/people">Open People directory</Link>
          </div>
        </div>
        <Button size="S" onClick={inviteStudioStaff}>
          <span className="studio-settings-button-content"><DsIcon name="plus" size={16} /> Invite Studio Staff</span>
        </Button>
      </div>

      {staffRows.length > 0 ? <div className="studio-team-table-frame">
        <table className="studio-team-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Job title</th>
              <th>Status</th>
              <th>Billing access</th>
            </tr>
          </thead>
          <tbody>
            {staffRows.map(({ access, person }) => {
              const profileHref = `/people/${person.id}`;
              return (
                <tr
                  className="studio-team-row-link"
                  key={person.id}
                  tabIndex={0}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                    router.push(profileHref);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
                    event.preventDefault();
                    router.push(profileHref);
                  }}
                >
                  <td data-label="Person">
                    <Link className="studio-team-person-link" href={profileHref}>
                      <PeopleAvatar person={person} size="S" />
                      <span>
                        <strong className="label-m-semibold">{person.name}</strong>
                        <small className="label-xs">{person.email}</small>
                      </span>
                    </Link>
                  </td>
                  <td data-label="Job title"><span className="label-s-semibold">{person.jobTitles[0] ?? "Studio Staff"}</span></td>
                  <td data-label="Status">
                    <span className={`studio-team-status is-${access.status.toLocaleLowerCase("en-AU").replaceAll(" ", "-")} label-xs-semibold`}>
                      {access.status}
                    </span>
                  </td>
                  <td data-label="Billing access">
                    <div className="studio-team-billing-cell">
                      <span className={`studio-team-billing-access ${access.hasBillingAccess ? "is-admin" : ""} label-xs-semibold`}>
                        {access.hasBillingAccess ? "Admin" : "None"}
                      </span>
                      <ActionMenu label={`Actions for ${person.name}`} items={getMemberActions(person, access)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div> : (
        <div className="studio-team-empty-state">
          <span><DsIcon name="users-three" size={28} /></span>
          <h2 className="headings-xs-bold">Invite your first collaborator</h2>
          <p className="paragraph-s">Studio Staff with workspace access will appear here.</p>
          <Button size="S" onClick={inviteStudioStaff}>Invite Studio Staff</Button>
        </div>
      )}
    </section>
  );
}
