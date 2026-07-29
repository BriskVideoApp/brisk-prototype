import { notFound } from "next/navigation";
import { BrandKitPage } from "@/components/brand-kits/BrandKitPages";
import {
  createManualBrandProfile,
  getBrandKitCustomer,
  makeSubBrandFallback,
} from "@/data/brand-kits";

export default async function SubBrandKitRoute({
  params,
  searchParams,
}: {
  params: Promise<{ customerSlug: string; subBrandSlug: string }>;
  searchParams: Promise<{ relationship?: string; setup?: string }>;
}) {
  const { customerSlug, subBrandSlug } = await params;
  const { relationship, setup } = await searchParams;
  const customer = getBrandKitCustomer(customerSlug);

  if (!customer) {
    notFound();
  }

  const storedSubBrand = customer.subBrands.find((candidate) => candidate.slug === subBrandSlug);
  const relationshipOverride = relationship === "master" || relationship === "sub-brand"
    ? relationship
    : undefined;
  const subBrand = storedSubBrand
    ? {
        ...storedSubBrand,
        relationship: relationshipOverride ?? storedSubBrand.relationship,
      }
    : makeSubBrandFallback(
        customer,
        subBrandSlug,
        relationshipOverride ?? "sub-brand",
        setup === "manual" ? createManualBrandProfile() : undefined,
      );

  return <BrandKitPage customer={customer} subBrand={subBrand} />;
}
