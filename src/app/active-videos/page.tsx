import { Suspense } from "react";
import { ActiveVideosPage } from "@/components/active-videos/ActiveVideosPage";

export default function ActiveVideosRoute() {
  return (
    <Suspense fallback={null}>
      <ActiveVideosPage />
    </Suspense>
  );
}
