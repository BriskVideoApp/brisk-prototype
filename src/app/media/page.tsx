import { GlobalMediaLibraryPage } from "@/components/media/GlobalMediaLibraryPage";
import "@/components/media/media.css";

type MediaLibrarySearchParams = Promise<{ project?: string | string[]; folder?: string | string[]; assets?: string | string[] }>;

export default async function MediaLibraryRoute({ searchParams }: { searchParams: MediaLibrarySearchParams }) {
  const query = await searchParams;
  return <GlobalMediaLibraryPage initialProjectId={singleValue(query.project)} initialFolderId={singleValue(query.folder)} initialAssetIds={singleValue(query.assets)?.split(",") ?? []} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
