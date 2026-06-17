import type { Metadata } from "next";
import "./globals.css";
import "@/components/video-review/video-review.css";

export const metadata: Metadata = {
  title: "Brisk Video Review",
  description: "Filmmaker video review screen for the Brisk prototype",
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
