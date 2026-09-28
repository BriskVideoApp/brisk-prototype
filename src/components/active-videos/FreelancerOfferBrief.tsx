"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefGuidedExperience } from "@/components/brief/BriefPage";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { briefVideoTypeDetails } from "@/data/brief";
import { canViewPendingOfferBrief } from "@/data/prototype-access";
import { selectProject, selectProjectBrief } from "@/data/prototype-state";

const offersHref = "/active-videos?view=offers";

export function FreelancerOfferBrief({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { state, hasHydrated } = usePrototypeState();
  const { offers } = useCostsData();
  const viewer = usePrototypeViewer();
  const project = selectProject(state, projectId);
  const brief = selectProjectBrief(state, projectId);
  const template = state.studioBriefTemplates.find((candidate) => candidate.id === brief?.sourceTemplateId);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId);
  const hasBriefDetails = brief && Object.values(brief.fields).some((field) => field.value.trim());

  if (!hasHydrated) return null;
  if (!project || !brief || !canViewPendingOfferBrief(viewer, project, state, offers)) {
    return <main className="client-not-found"><h1 className="headings-s-bold">Brief unavailable</h1><p className="paragraph-s">This offer is no longer available to view.</p><Link className="client-secondary-button label-s-semibold" href={offersHref}>Back to offers</Link></main>;
  }

  return <main className="freelancer-offer-brief-preview">
    <header className="studio-review-brief-experience-header">
      <div>
        <span className="label-xs-semibold">Offer preview - read only</span>
        <h1 className="headings-s-bold">{project.name}</h1>
        <p className="paragraph-s">{project.clientName} · Full project Brief</p>
        {!hasBriefDetails ? <p className="paragraph-s">No Brief details have been entered yet.</p> : null}
      </div>
      <Link className="freelancer-offer-brief label-s-semibold" href={offersHref}>Back to offers</Link>
    </header>
    <BriefGuidedExperience
      clientName={project.clientName}
      doneLabel="Back to offers"
      fields={brief.fields}
      initialStepId="summary"
      onDone={() => router.push(offersHref)}
      readOnly
      studioName={workspace?.name ?? "Studio"}
      videoTypeIds={template?.videoTypeIds ?? briefVideoTypeDetails.map((videoType) => videoType.name)}
    />
  </main>;
}
