import { Suspense } from "react";
import { TodayPage } from "@/components/today/TodayPage";

export default function Home() {
  return <Suspense fallback={null}><TodayPage /></Suspense>;
}
