import { Suspense } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { BrandKitsContent } from "./BrandKitsContent";

function BrandKitsFallback() {
  return (
    <main className="brand-kits-shell">
      <div className="brand-kits-main">
        <WorkspacePageHeader title="Brand Kits" />
        <section className="brand-kits-page-content" aria-label="Loading Brand Kits" />
      </div>
    </main>
  );
}

export default function BrandKitsRoute() {
  return (
    <Suspense fallback={<BrandKitsFallback />}>
      <BrandKitsContent />
    </Suspense>
  );
}
