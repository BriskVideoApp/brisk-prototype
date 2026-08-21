import { Suspense } from "react";
import { CustomerDashboard } from "@/components/customer-dashboard/CustomerDashboard";
import "@/components/chat/chat.css";

export default function CustomerDashboardRoute() {
  return <Suspense fallback={null}><CustomerDashboard /></Suspense>;
}
