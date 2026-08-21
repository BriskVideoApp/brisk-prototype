import type { StudioNotificationCategoryId } from "@/data/notification-settings";

export type StudioNotificationCopy = {
  title: string;
  message: string;
};

export type StudioNotificationPreview = {
  id: string;
  label: string;
  sentWhen: string;
  recipient: string;
  demonstration?: "edit-request-review";
  editable: boolean;
  status: "success" | "warning" | "failure" | "information";
  statusLabel: string;
  actor: string;
  projectCode: string;
  projectName: string;
  stage: string;
  time: string;
  protectedFact: string;
  destinationLabel: string;
  destinationHref: string;
  briskDefault: StudioNotificationCopy;
};

export type StudioNotificationCategoryCopy = {
  id: StudioNotificationCategoryId;
  label: string;
  notifications: readonly StudioNotificationPreview[];
};

export const studioNotificationCopyCategories = [
  {
    id: "customer-reviews",
    label: "Work to review",
    notifications: [
      {
        id: "review-requested",
        label: "Review requested",
        sentWhen: "When a filmmaker clicks Request review in Edit.",
        recipient: "A client or filmmaker chosen to review it.",
        demonstration: "edit-request-review",
        editable: true,
        status: "warning",
        statusLabel: "Action needed",
        actor: "David Ryan",
        projectCode: "LOOM-24",
        projectName: "Launch Film – Sales Narrative",
        stage: "Edit",
        time: "2 min ago",
        protectedFact: "Edit v3 is ready for review.",
        destinationLabel: "Review Edit",
        destinationHref: "/projects/loom-launch-film/stages/edit",
        briskDefault: {
          title: "Edit v3 is ready to review",
          message: "David Ryan requested your review.",
        },
      },
      {
        id: "approval-recorded",
        label: "Approval recorded",
        sentWhen: "When a client approves a Stage.",
        recipient: "The filmmakers working on the project.",
        editable: true,
        status: "success",
        statusLabel: "Approved",
        actor: "Jess Taylor",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Script",
        time: "18 min ago",
        protectedFact: "Script v4 was approved.",
        destinationLabel: "View Script",
        destinationHref: "/projects/loom-launch-film/script",
        briskDefault: {
          title: "Script approved",
          message: "The latest Script has been approved.",
        },
      },
    ],
  },
  {
    id: "customer-comments",
    label: "Comments and replies",
    notifications: [
      {
        id: "mention-received",
        label: "Mention",
        sentWhen: "When someone mentions you in a comment.",
        recipient: "The person mentioned.",
        editable: true,
        status: "information",
        statusLabel: "Mention",
        actor: "Priya Nair",
        projectCode: "HIMS-18",
        projectName: "Product Education - Sleep Series",
        stage: "Edit",
        time: "4 min ago",
        protectedFact: "Comment on frame 184.",
        destinationLabel: "Open comment",
        destinationHref: "/projects/hims-product-education/stages/edit",
        briskDefault: {
          title: "You were mentioned",
          message: "A teammate mentioned you in a comment.",
        },
      },
      {
        id: "reply-assigned",
        label: "Reply needed",
        sentWhen: "When someone asks you to reply to a client.",
        recipient: "The person asked to reply.",
        editable: true,
        status: "warning",
        statusLabel: "Action needed",
        actor: "Tom Mitchell",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Brief",
        time: "12 min ago",
        protectedFact: "Reply from Sarah Kim.",
        destinationLabel: "Reply",
        destinationHref: "/chat",
        briskDefault: {
          title: "Reply needed",
          message: "A client reply needs an answer.",
        },
      },
    ],
  },
  {
    id: "project-changes",
    label: "Project changes",
    notifications: [
      {
        id: "deadline-changed",
        label: "Deadline changed",
        sentWhen: "When a project deadline changes.",
        recipient: "People following project changes.",
        editable: true,
        status: "warning",
        statusLabel: "Changed",
        actor: "Riley Brooks",
        projectCode: "DEEL-18",
        projectName: "Customer Story - APAC Hiring",
        stage: "Masters",
        time: "22 min ago",
        protectedFact: "Final delivery moved to 6 September 2026.",
        destinationLabel: "View project",
        destinationHref: "/projects/deel-customer-story",
        briskDefault: {
          title: "Project deadline changed",
          message: "The final delivery date has been updated.",
        },
      },
      {
        id: "project-paused",
        label: "Project paused",
        sentWhen: "When a project is paused.",
        recipient: "People following project changes.",
        editable: true,
        status: "warning",
        statusLabel: "Needs attention",
        actor: "Alex Morgan",
        projectCode: "RAMP-12",
        projectName: "Finance Recap - June Product Drop",
        stage: "Shoot",
        time: "36 min ago",
        protectedFact: "The client requested a pause.",
        destinationLabel: "View project",
        destinationHref: "/projects/ramp-finance-recap",
        briskDefault: {
          title: "Project paused",
          message: "Work is paused until the project is ready to resume.",
        },
      },
    ],
  },
  {
    id: "published-shoot-updates",
    label: "Shoot changes",
    notifications: [
      {
        id: "call-sheet-published",
        label: "Call sheet published",
        sentWhen: "When someone publishes a call sheet.",
        recipient: "People included on the call sheet.",
        editable: true,
        status: "information",
        statusLabel: "Published",
        actor: "Maddie Park",
        projectCode: "HIMS-18",
        projectName: "Product Education - Sleep Series",
        stage: "Shoot",
        time: "8 min ago",
        protectedFact: "Shoot day 1 is on 24 August 2026.",
        destinationLabel: "View call sheet",
        destinationHref: "/share/call-sheet/hims-product-education",
        briskDefault: {
          title: "Call sheet published",
          message: "The shoot details are ready to view.",
        },
      },
      {
        id: "shoot-details-changed",
        label: "Shoot details changed",
        sentWhen: "When published shoot details change.",
        recipient: "People affected by the change.",
        editable: true,
        status: "warning",
        statusLabel: "Changed",
        actor: "David Ryan",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Shoot",
        time: "1 min ago",
        protectedFact: "Crew call changed from 7:00 am to 6:30 am.",
        destinationLabel: "View call sheet",
        destinationHref: "/share/call-sheet/loom-launch-film",
        briskDefault: {
          title: "Published shoot details changed",
          message: "Please check the updated shoot details.",
        },
      },
    ],
  },
  {
    id: "assignments-offers",
    label: "Work and offers",
    notifications: [
      {
        id: "assignment-added",
        label: "New project work",
        sentWhen: "When someone is added to a project.",
        recipient: "The person added.",
        editable: true,
        status: "information",
        statusLabel: "New work",
        actor: "Tom Mitchell",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Edit",
        time: "14 min ago",
        protectedFact: "You were added as Editor.",
        destinationLabel: "View project",
        destinationHref: "/projects/loom-launch-film",
        briskDefault: {
          title: "New project work",
          message: "You have been added to this project.",
        },
      },
      {
        id: "freelancer-offer",
        label: "Freelancer offer",
        sentWhen: "When you offer a project to a freelancer.",
        recipient: "The selected freelancer.",
        editable: true,
        status: "warning",
        statusLabel: "Action needed",
        actor: "Riley Brooks",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Edit",
        time: "27 min ago",
        protectedFact: "Editor offer for A$1,800.",
        destinationLabel: "Review offer",
        destinationHref: "/projects/loom-launch-film",
        briskDefault: {
          title: "New project offer",
          message: "A Studio would like you to join this project.",
        },
      },
    ],
  },
  {
    id: "media-requests",
    label: "Files and transcripts",
    notifications: [
      {
        id: "media-requested",
        label: "Files requested",
        sentWhen: "When the Studio requests files from a client.",
        recipient: "The selected client contact.",
        editable: true,
        status: "warning",
        statusLabel: "Action needed",
        actor: "Sarah Chen",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Files",
        time: "7 min ago",
        protectedFact: "Product screenshots are still needed.",
        destinationLabel: "Add files",
        destinationHref: "/projects/loom-launch-film/stages/media",
        briskDefault: {
          title: "Files requested",
          message: "Please add the requested files so the project can continue.",
        },
      },
      {
        id: "media-processing-failed",
        label: "File processing failed",
        sentWhen: "When Brisk cannot process a file.",
        recipient: "The uploader and responsible Studio Staff.",
        editable: false,
        status: "failure",
        statusLabel: "Failed",
        actor: "Brisk",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Files",
        time: "3 min ago",
        protectedFact: "Interview A - Camera 1.mov could not be processed.",
        destinationLabel: "Retry",
        destinationHref: "/projects/loom-launch-film/stages/media",
        briskDefault: {
          title: "Couldn’t process file",
          message: "Reconnect the storage account or upload the file again.",
        },
      },
    ],
  },
  {
    id: "contractor-invoices",
    label: "Invoices",
    notifications: [
      {
        id: "invoice-needs-approval",
        label: "Invoice needs approval",
        sentWhen: "When a contractor invoice is ready for approval.",
        recipient: "The invoice approver.",
        editable: true,
        status: "warning",
        statusLabel: "Action needed",
        actor: "Chris Taylor",
        projectCode: "LOOM-24",
        projectName: "Launch Film - Sales Narrative",
        stage: "Edit",
        time: "29 min ago",
        protectedFact: "Invoice CT-3142 is for A$1,950.",
        destinationLabel: "Review invoice",
        destinationHref: "/outstanding-invoices?invoice=invoice-loom-ct",
        briskDefault: {
          title: "Invoice needs approval",
          message: "A contractor invoice is ready for your review.",
        },
      },
      {
        id: "invoice-paid",
        label: "Invoice paid",
        sentWhen: "When a contractor invoice is marked as paid.",
        recipient: "The contractor and responsible Studio Staff.",
        editable: true,
        status: "success",
        statusLabel: "Paid",
        actor: "Tom Mitchell",
        projectCode: "DEEL-18",
        projectName: "Customer Story - APAC Hiring",
        stage: "Edit",
        time: "1 hr ago",
        protectedFact: "Invoice JL-889 was marked as paid.",
        destinationLabel: "View invoice",
        destinationHref: "/outstanding-invoices",
        briskDefault: {
          title: "Invoice paid",
          message: "Payment has been recorded for this invoice.",
        },
      },
    ],
  },
  {
    id: "billing-security",
    label: "Account and access",
    notifications: [
      {
        id: "new-login",
        label: "New login",
        sentWhen: "When Brisk detects a new login.",
        recipient: "The account holder.",
        editable: false,
        status: "warning",
        statusLabel: "Security",
        actor: "Brisk",
        projectCode: "North Star Films",
        projectName: "Studio account",
        stage: "Account",
        time: "Just now",
        protectedFact: "Safari on macOS from Sydney, Australia.",
        destinationLabel: "Review activity",
        destinationHref: "/settings/personal/notifications",
        briskDefault: {
          title: "New login to your account",
          message: "Check this activity if you do not recognise it.",
        },
      },
      {
        id: "access-changed",
        label: "Access changed",
        sentWhen: "When someone’s Studio access changes.",
        recipient: "The person whose access changed.",
        editable: false,
        status: "warning",
        statusLabel: "Access changed",
        actor: "Tom Mitchell",
        projectCode: "North Star Films",
        projectName: "Studio account",
        stage: "Access",
        time: "11 min ago",
        protectedFact: "Your Studio access was updated.",
        destinationLabel: "View account",
        destinationHref: "/settings/personal/notifications",
        briskDefault: {
          title: "Your access changed",
          message: "Review your current Studio access and contact the Studio if this looks wrong.",
        },
      },
    ],
  },
] as const satisfies readonly StudioNotificationCategoryCopy[];

export function getStudioNotificationCopyCategory(categoryId: string) {
  return studioNotificationCopyCategories.find((category) => category.id === categoryId);
}
