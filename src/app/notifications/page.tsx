import { Suspense } from "react";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export default function NotificationsRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationsPage />
    </Suspense>
  );
}
