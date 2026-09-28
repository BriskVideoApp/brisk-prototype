import { BrandKitClientRoute } from "@/components/brand-kits/BrandKitPages";
import { brandKitCustomers } from "@/data/brand-kits";

export function generateStaticParams() {
  return brandKitCustomers.map((customer) => ({ customerSlug: customer.slug }));
}

export default async function CustomerBrandKitRoute({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  return <BrandKitClientRoute customerSlug={customerSlug} />;
}
