import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/components/video-review/video-review.css";
import "@/components/active-videos/active-videos.css";
import "@/components/today/today.css";
import "@/components/project/team/team-panel.css";
import "@/components/project/project-stage-header.css";
import "@/components/project/project-files.css";
import "@/components/share/share-action-row.css";
import "@/components/script/script.css";
import "@/components/script-transcripts/script-transcripts.css";
import "@/components/brief/brief.css";
import "@/components/media/media.css";
import "@/components/masters/masters.css";
import "@/components/navigation/workspace-sidebar.css";
import "@/components/customer-dashboard/customer-dashboard.css";
import "@/components/brand-kits/brand-kits.css";
import "@/components/form/brisk-select.css";
import "@/components/shoot/shoot.css";
import "@/components/studio-onboard/studio-onboard.css";
import { PrototypeRoleProvider } from "@/components/navigation/PrototypeRoleContext";
import { ProjectCompletionProvider } from "@/components/project/ProjectCompletionContext";
import { ProjectFilesProvider } from "@/components/project/ProjectFilesContext";

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
      <body suppressHydrationWarning>
        <PrototypeRoleProvider>
          <ProjectCompletionProvider>
            <ProjectFilesProvider>{children}</ProjectFilesProvider>
          </ProjectCompletionProvider>
        </PrototypeRoleProvider>
      </body>
    </html>
  );
}
