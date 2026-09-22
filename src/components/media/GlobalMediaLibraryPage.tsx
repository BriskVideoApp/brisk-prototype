"use client";

import { MediaBrowser } from "./MediaBrowser";

type GlobalMediaLibraryPageProps = {
  initialProjectId?: string | null;
  initialFolderId?: string | null;
  initialAssetId?: string | null;
};

export function GlobalMediaLibraryPage({ initialProjectId = null, initialFolderId = null, initialAssetId = null }: GlobalMediaLibraryPageProps) {
  return <main className="media-library-page"><MediaBrowser scope="global" initialProjectId={initialProjectId} initialFolderId={initialFolderId} initialAssetId={initialAssetId} /></main>;
}
