import { Suspense } from "react";
import { PersonProfilePage } from "@/components/people/PersonProfilePage";

export default async function PersonProfileRoute({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  return <Suspense fallback={null}><PersonProfilePage personId={personId} /></Suspense>;
}
