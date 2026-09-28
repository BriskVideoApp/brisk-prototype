import { customerDashboardProjects } from "@/data/customer-dashboard";

export function getNextClientProjectCode(clientBadge: string, savedCodes: readonly string[]): string {
  const prefix = clientBadge.toLowerCase().replace(/[^a-z0-9]/gu, "");
  const existingCodes = [
    ...customerDashboardProjects.map((project) => project.code),
    ...savedCodes,
  ];
  const highestSequence = existingCodes.reduce((highest, code) => {
    const suffix = code.toLowerCase().startsWith(prefix) ? code.slice(prefix.length).replace(/^-/u, "") : "";
    return /^\d+$/u.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
  }, 0);

  return `${prefix}${String(highestSequence + 1).padStart(3, "0")}`;
}
