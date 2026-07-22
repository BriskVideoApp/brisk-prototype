import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/components/video-review/video-review.css";
import "@/components/active-videos/active-videos.css";
import "@/components/today/today.css";
import "@/components/project/team/team-panel.css";
import "@/components/project/project-stage-header.css";
import "@/components/share/share-action-row.css";
import "@/components/script/script.css";
import "@/components/brief/brief.css";
import "@/components/media/media.css";

export const metadata: Metadata = {
  title: "Brisk Prototype",
  description: "Studio production screens for the Brisk prototype",
};

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-brisk-loaded",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
