"use client";

import { MediaBrowser } from "./MediaBrowser";

type GlobalMediaLibraryPageProps = {
  initialProjectId?: string | null;
  initialFolderId?: string | null;
  initialAssetId?: string | null;
};

export function GlobalMediaLibraryPage({ initialProjectId = null, initialFolderId = null, initialAssetId = null }: GlobalMediaLibraryPageProps) {
  return <main className="media-library-page"><header className="media-library-header"><div><h1>Media Library</h1><p className="paragraph-s">View media across all your projects. To upload files, open a project and select Media.</p></div></header><MediaBrowser scope="global" initialProjectId={initialProjectId} initialFolderId={initialFolderId} initialAssetId={initialAssetId} /></main>;
}
