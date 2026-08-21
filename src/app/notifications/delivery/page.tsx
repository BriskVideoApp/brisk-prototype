import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmailDeliveryPage } from "@/components/notifications/EmailDeliveryPage";

export const metadata: Metadata = {
  title: "Email delivery diagnostics - Development QA",
  robots: { index: false, follow: false },
};

export default function EmailDeliveryRoute() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <Suspense fallback={null}><EmailDeliveryPage /></Suspense>;
}
