import { ScriptPage } from "@/components/script/ScriptPage";
import type { ScriptRole } from "@/data/script";

type ScriptRouteProps = {
  searchParams: Promise<{
    role?: string | string[];
    subtab?: string | string[];
    clip?: string | string[];
  }>;
};

export default async function ScriptRoute({ searchParams }: ScriptRouteProps) {
  const params = await searchParams;
  const role = getRole(params.role);
  const subtab = getSubtab(params.subtab);
  const clip = getSingleValue(params.clip);

  return (
    <ScriptPage
      initialRole={role}
      initialSubtab={subtab}
      initialTranscriptClipId={clip}
    />
  );
}

function getSubtab(subtab: string | string[] | undefined) {
  const value = getSingleValue(subtab);
  return value === "transcripts" ? value : "script";
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function getRole(role: string | string[] | undefined): ScriptRole {
  const value = Array.isArray(role) ? role[0] : role;
  return value === "customer" ? "customer" : "studio";
}
