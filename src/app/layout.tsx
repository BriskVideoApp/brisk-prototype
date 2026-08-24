import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "@/components/video-review/video-review.css";
import "@/components/active-videos/active-videos.css";
import "@/components/active-videos/freelancer-videos.css";
import "@/components/today/today.css";
import "@/components/today/freelancer-today.css";
import "@/components/project/team/team-panel.css";
import "@/components/notifications/project-history.css";
import "@/components/notifications/notification-inbox.css";
import "@/components/notifications/email-delivery.css";
import "@/components/project/project-stage-header.css";
import "@/components/project/project-files.css";
import "@/components/share/share-action-row.css";
import "@/components/script/script.css";
import "@/components/script-transcripts/script-transcripts.css";
import "@/components/brief/brief.css";
import "@/components/media/media.css";
import "@/components/masters/masters.css";
import "@/components/chat/chat.css";
import "@/components/navigation/workspace-sidebar.css";
import "@/components/customer-dashboard/customer-dashboard.css";
import "@/components/brand-kits/brand-kits.css";
import "@/components/form/brisk-select.css";
import "@/components/shoot/shoot.css";
import "@/components/studio-onboard/studio-onboard.css";
import "@/components/navigation/app-shell.css";
import "@/components/clients/clients.css";
import "@/components/people/people.css";
import "@/components/invitations/invitations.css";
import "@/components/document-export/document-export.css";
import "@/components/settings/plan-billing.css";
import "@/components/settings/client-billing.css";
import "@/components/settings/studio-settings.css";
import "@/components/settings/notification-settings.css";
import "@/components/settings/client-account-settings.css";
import "@/components/costs/costs.css";
import "@/components/ai/brisk-ai.css";
import { PrototypeRoleProvider } from "@/components/navigation/PrototypeRoleContext";
import { ProjectCompletionProvider } from "@/components/project/ProjectCompletionContext";
import { ProjectFilesProvider } from "@/components/project/ProjectFilesContext";
import { ProjectStageStatusProvider } from "@/components/project/ProjectStageStatusContext";
import { AppShell } from "@/components/navigation/AppShell";
import { NotificationInboxProvider } from "@/components/notifications/NotificationInboxContext";
import { ClientDataProvider } from "@/components/clients/ClientDataContext";
import { PeopleDataProvider } from "@/components/people/PeopleDataContext";
import { InvitationProvider } from "@/components/invitations/InvitationContext";
import { ProjectTeamDataProvider } from "@/components/project/team/ProjectTeamDataContext";
import { StudioSettingsProvider } from "@/components/settings/StudioSettingsContext";
import { ClientBillingProvider } from "@/components/settings/ClientBillingContext";
import { ClientAccountSettingsProvider } from "@/components/settings/ClientAccountSettingsContext";
import { CostsDataProvider } from "@/components/costs/CostsDataContext";
import { MediaLibraryProvider } from "@/components/media/MediaLibraryContext";
import { BriskAiProvider } from "@/components/ai/BriskAiContext";

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
          <NotificationInboxProvider>
            <StudioSettingsProvider>
              <ClientBillingProvider>
                <ClientAccountSettingsProvider>
                  <ProjectCompletionProvider>
                    <ProjectStageStatusProvider>
                      <ProjectFilesProvider>
                        <MediaLibraryProvider>
                        <ClientDataProvider>
                          <PeopleDataProvider>
                            <ProjectTeamDataProvider>
                              <CostsDataProvider>
                                <InvitationProvider>
                                  <BriskAiProvider>
                                    <Suspense fallback={children}>
                                      <AppShell>{children}</AppShell>
                                    </Suspense>
                                  </BriskAiProvider>
                                </InvitationProvider>
                              </CostsDataProvider>
                            </ProjectTeamDataProvider>
                          </PeopleDataProvider>
                        </ClientDataProvider>
                        </MediaLibraryProvider>
                      </ProjectFilesProvider>
                    </ProjectStageStatusProvider>
                  </ProjectCompletionProvider>
                </ClientAccountSettingsProvider>
              </ClientBillingProvider>
            </StudioSettingsProvider>
          </NotificationInboxProvider>
        </PrototypeRoleProvider>
      </body>
    </html>
  );
}
