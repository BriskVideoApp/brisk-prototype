import { notFound } from "next/navigation";
import { BrandKitPage } from "@/components/brand-kits/BrandKitPages";
import { brandKitCustomers, getBrandKitCustomer } from "@/data/brand-kits";

export function generateStaticParams() {
  return brandKitCustomers.map((customer) => ({ customerSlug: customer.slug }));
}

export default async function CustomerBrandKitRoute({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  const customer = getBrandKitCustomer(customerSlug);

  if (!customer) {
    notFound();
  }

  return <BrandKitPage customer={customer} />;
}
