import { FinalDeliveryPage } from "@/components/project-timing/FinalDeliveryPage";

export default async function DeliveryRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <FinalDeliveryPage projectId={projectId} />;
}
