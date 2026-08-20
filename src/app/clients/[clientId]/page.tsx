import { ClientProfilePage } from "@/components/clients/ClientProfilePage";

export default async function ClientProfileRoute({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientProfilePage clientId={clientId} />;
}
