export type InvitationRole = "Studio Staff" | "Studio Freelancer" | "Customer";
export type InvitationStatus = "Pending" | "Accepted" | "Expired";

export type InvitePersonPrefill = {
  role?: InvitationRole;
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
