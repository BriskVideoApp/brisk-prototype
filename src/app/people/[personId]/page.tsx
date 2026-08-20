import { PersonProfilePage } from "@/components/people/PersonProfilePage";

export default async function PersonProfileRoute({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  return <PersonProfilePage personId={personId} />;
}
