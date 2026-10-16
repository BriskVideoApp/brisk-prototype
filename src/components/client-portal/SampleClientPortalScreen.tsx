"use client";

import { ClientPortalUnavailable } from "@/components/client-portal/ClientPortalScreen";
import { CustomerDashboard } from "@/components/customer-dashboard/CustomerDashboard";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { sampleClientPortalProjects } from "@/data/customer-dashboard";

export function SampleClientPortalScreen() {
  const { selectedRole } = usePrototypeRole();

  if (selectedRole === "Customer") {
    return <ClientPortalUnavailable title="Sample preview unavailable" description="This Studio preview is for Studio Staff and Freelancers." />;
  }

  return (
    <CustomerDashboard
      activity={[]}
      clientName="Sample Client"
      initialProjects={sampleClientPortalProjects}
      initialSeries={[]}
      samplePreview
      storageScopeKey="studio-setup-sample-portal"
      studioPreview
    />
  );
}
