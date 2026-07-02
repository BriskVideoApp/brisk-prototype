import type { Metadata } from "next";
import "./globals.css";
import "@/components/video-review/video-review.css";
import "@/components/active-videos/active-videos.css";
import "@/components/today/today.css";
import "@/components/project/team/team-panel.css";
import "@/components/share/share-action-row.css";

export const metadata: Metadata = {
  title: "Brisk Prototype",
  description: "Studio production screens for the Brisk prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
