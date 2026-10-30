export type InvitationRole = "Studio Staff" | "Studio Freelancer" | "Customer";
export type InvitationStatus = "Pending" | "Accepted" | "Expired";

export type InvitePersonPrefill = {
  purpose?: "brief-send";
  role?: InvitationRole;
  studioPermission?: import("@/data/people").StudioPermission;
  clientMembershipRole?: import("@/data/client-account-settings").ClientMembershipRole;
  email?: string;
  name?: string;
  clientId?: string;
  clientIds?: string[];
  projectId?: string;
  projectIds?: string[];
  jobTitle?: string;
};

export const seededInvitationStatusByPersonId: Readonly<Record<string, InvitationStatus>> = {
  dc: "Expired",
};
