import { redirect } from "next/navigation";
import { CanonicalShootRoute } from "@/components/project/CanonicalShootRoute";

export default async function ShootRoute({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  if (query.section === "call-sheet" && query.shareScope === "stage") {
    const options = new URLSearchParams();
    if (typeof query.day === "string") options.set("day", query.day);
    if (query.linkAccess === "canEdit" || query.linkAccess === "canComment") options.set("linkAccess", query.linkAccess);
    redirect(`/share/call-sheet/${encodeURIComponent(projectId)}?${options}`);
  }
  return <CanonicalShootRoute projectId={projectId} />;
}
