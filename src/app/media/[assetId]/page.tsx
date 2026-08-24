import { notFound } from "next/navigation";
import { GlobalMediaLibraryPage } from "@/components/media/GlobalMediaLibraryPage";
import { initialMediaAssets } from "@/data/media";
import "@/components/media/media.css";

export function generateStaticParams() {
  return initialMediaAssets.map((asset) => ({ assetId: asset.id }));
}

export default async function MediaAssetRoute({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!initialMediaAssets.some((asset) => asset.id === assetId)) notFound();
  return <GlobalMediaLibraryPage initialAssetId={assetId} />;
}
