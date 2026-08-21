import { Suspense } from "react";
import { BrandKitsContent } from "./BrandKitsContent";

function BrandKitsFallback() {
  return (
    <main className="brand-kits-shell">
      <div className="brand-kits-main">
        <header className="brand-kits-page-header">
          <div className="brand-kits-title">
            <h1>Brand Kits</h1>
            <p className="paragraph-s">One kit per customer.</p>
          </div>
        </header>
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
