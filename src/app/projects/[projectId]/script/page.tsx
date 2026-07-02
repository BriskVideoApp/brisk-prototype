import { ScriptPage } from "@/components/script/ScriptPage";
import type { ScriptRole } from "@/data/script";

type ScriptRouteProps = {
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

export default async function ScriptRoute({ searchParams }: ScriptRouteProps) {
  const params = await searchParams;
  const role = getRole(params.role);

  return <ScriptPage initialRole={role} />;
}

function getRole(role: string | string[] | undefined): ScriptRole {
  const value = Array.isArray(role) ? role[0] : role;
  return value === "customer" ? "customer" : "studio";
}
