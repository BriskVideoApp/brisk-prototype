import { BrandKitClientRoute } from "@/components/brand-kits/BrandKitPages";

export default async function SubBrandKitRoute({
  params,
  searchParams,
}: {
  params: Promise<{ customerSlug: string; subBrandSlug: string }>;
  searchParams: Promise<{ relationship?: string; setup?: string }>;
}) {
  const { customerSlug, subBrandSlug } = await params;
  const { relationship, setup } = await searchParams;
  return <BrandKitClientRoute customerSlug={customerSlug} subBrandSlug={subBrandSlug} relationship={relationship} setup={setup} />;
}
