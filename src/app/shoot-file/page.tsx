"use client";

import { useEffect, useState } from "react";
import { loadShootFile } from "@/lib/shoot-files";

export default function ShootFilePage() {
  const [file, setFile] = useState<{ href: string; name: string; pdf: boolean }>();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const name = query.get("name") || "Shoot document";
    let active = true;
    let href = "";
    async function open() {
      const blob = await loadShootFile(query.get("file") || "");
      if (!active) return;
      if (!blob) { setUnavailable(true); return; }
      href = URL.createObjectURL(blob);
      const pdf = blob.type === "application/pdf";
      setFile({ href, name, pdf });
      if (query.has("download") || !pdf) {
        const link = document.createElement("a");
        link.href = href;
        link.download = name;
        link.click();
      }
    }
    void open().catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; if (href) URL.revokeObjectURL(href); };
  }, []);
  if (!file) return <main><p role="status">{unavailable ? "This file is unavailable in this browser. Ask the producer to attach it again or share a file link." : "Opening document…"}</p></main>;
  return <main>
    <a className="label-s-semibold" href={file.href} download={file.name}>Download {file.name}</a>
    {file.pdf && <iframe src={file.href} title={file.name} width="100%" style={{ height: "95vh", border: 0 }} />}
  </main>;
}
