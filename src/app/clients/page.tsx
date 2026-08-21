import { Suspense } from "react";
import { ClientsPage } from "@/components/clients/ClientsPage";

export default function ClientsRoute() {
  return <Suspense fallback={null}><ClientsPage /></Suspense>;
}
