const cacheName = "brisk-shoot-files-v1";

function fileKey(id: string) {
  return new URL(`/shoot-file?file=${encodeURIComponent(id)}`, window.location.origin).href;
}

export async function storeShootFile(file: File) {
  const id = crypto.randomUUID();
  const cache = await caches.open(cacheName);
  await cache.put(fileKey(id), new Response(file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
  }));
  return `/shoot-file?${new URLSearchParams({ file: id, name: file.name })}`;
}

export async function loadShootFile(id: string) {
  const response = await (await caches.open(cacheName)).match(fileKey(id));
  return response?.blob();
}

export function shootDownloadProps(url: string, name: string) {
  return url.startsWith("/shoot-file?") ? { href: `${url}&download=1`, target: "_blank", rel: "noreferrer" } : { href: url, download: name };
}
