import { Suspense } from "react";
import { TodayPage } from "@/components/today/TodayPage";

export default function TodayRoute() {
  return <Suspense fallback={null}><TodayPage /></Suspense>;
}
