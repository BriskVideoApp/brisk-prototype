// Test mode previews access levels within the existing three user groups.
// These are front-end demonstration rules, not production authentication.
export type PrototypeRole = "Studio Staff" | "Studio Freelancer" | "Customer";
export type PrototypeAccessLevel = "studio-admin" | "studio-staff" | "studio-freelancer" | "client-owner" | "client-teammate";

export const prototypeAccessLevels: readonly PrototypeAccessLevel[] = [
  "studio-admin", "studio-staff", "studio-freelancer", "client-owner", "client-teammate",
];

export const prototypeAccessLevelLabels: Record<PrototypeAccessLevel, string> = {
  "studio-admin": "Studio Admin",
  "studio-staff": "Studio Staff",
  "studio-freelancer": "Studio Freelancer",
  "client-owner": "Client Owner",
  "client-teammate": "Client Teammate",
};

export function getAccessLevelRole(level: PrototypeAccessLevel): PrototypeRole {
  if (level === "client-owner" || level === "client-teammate") return "Customer";
  return level === "studio-freelancer" ? "Studio Freelancer" : "Studio Staff";
}

export function getDefaultAccessLevel(role: PrototypeRole): PrototypeAccessLevel {
  if (role === "Customer") return "client-owner";
  return role === "Studio Freelancer" ? "studio-freelancer" : "studio-admin";
}

export function getPrototypePermissions(level: PrototypeAccessLevel) {
  return {
    canManageStudio: level === "studio-admin",
    canManageClientAccount: level === "client-owner",
  };
}

// Retain legacy stored membership values so existing mock data stays compatible.
export const studioPermissionLabels = { "Studio Owner": "Admin", "Team Member": "Staff" } as const;
export const clientMembershipLabels = { "Client Admin": "Owner", "Client Member": "Teammate" } as const;
