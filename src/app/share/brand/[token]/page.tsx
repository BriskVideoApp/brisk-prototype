import { notFound } from "next/navigation";
import { BrandKitPage } from "@/components/brand-kits/BrandKitPages";
import { getBrandKitCustomerByShareToken } from "@/data/brand-kits";

export default async function SharedBrandKitRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const customer = getBrandKitCustomerByShareToken(token);

  if (!customer) {
    notFound();
  }

  return <BrandKitPage customer={customer} isGuest />;
}
