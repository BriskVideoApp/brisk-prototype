import { FreelancerOfferBrief } from "@/components/active-videos/FreelancerOfferBrief";

export default async function OfferBriefRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <FreelancerOfferBrief projectId={projectId} />;
}
