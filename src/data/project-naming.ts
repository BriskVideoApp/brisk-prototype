import { customerDashboardProjects } from "@/data/customer-dashboard";
import { getDefaultProjectCodePrefix } from "@/data/clients";

export function getNextClientProjectCode(clientCodePrefix: string, savedCodes: readonly string[]): string {
  const prefix = clientCodePrefix.toLocaleLowerCase("en-AU").replace(/[^a-z]/gu, "") || getDefaultProjectCodePrefix(clientCodePrefix);
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
