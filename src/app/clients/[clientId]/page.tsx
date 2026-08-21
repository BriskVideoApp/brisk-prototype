import { Suspense } from "react";
import { ClientProfilePage } from "@/components/clients/ClientProfilePage";

export default async function ClientProfileRoute({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <Suspense fallback={null}><ClientProfilePage clientId={clientId} /></Suspense>;
}
