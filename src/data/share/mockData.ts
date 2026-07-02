import type { ShareAccess, ShareDensity, ShareLinkOpens, ShareStageContext, ShareUserRole } from "@/components/share/ShareActionRow";

export type ShareControlScenario = {
  id: string;
  title: string;
  context: ShareStageContext;
  userRole: ShareUserRole;
  density: ShareDensity;
  initialLinkOpens: ShareLinkOpens;
  initialAccess: ShareAccess;
};

export const shareControlScenarios: ShareControlScenario[] = [
  {
    id: "brief-customer-comment",
    title: "Brief for customer review",
    context: "brief",
    userRole: "Customer",
    density: "comfortable",
    initialLinkOpens: "stageOnly",
    initialAccess: "canComment",
  },
  {
    id: "edit-video-view",
    title: "Edit video only",
    context: "edit",
    userRole: "Studio Staff",
    density: "comfortable",
    initialLinkOpens: "videoOnly",
    initialAccess: "viewOnly",
  },
  {
    id: "masters-edit-access",
    title: "Masters with edit access",
    context: "masters",
    userRole: "Studio Staff",
    density: "compact",
    initialLinkOpens: "wholeProject",
    initialAccess: "canEdit",
  },
  {
    id: "share-link-viewer",
    title: "Share link viewer",
    context: "media",
    userRole: "Share Link Viewer",
    density: "compact",
    initialLinkOpens: "stageOnly",
    initialAccess: "canComment",
  },
];
