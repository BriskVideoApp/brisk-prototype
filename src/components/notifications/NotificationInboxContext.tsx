"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { StageKey } from "@/components/active-videos/types";
import {
  createClientStageReviewNotification,
  getAuthorisedNotificationInboxItems,
  notificationInboxRecipientByRole,
  type NotificationEmailDeliveryState,
  type RecipientInboxItem,
  type StageReviewRequestedNotificationInput,
} from "@/data/notification-inbox";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import type { NotificationEventKey } from "@/data/notification-registry";
import type { NotificationEmailReminderPreview } from "@/data/notification-inbox";

type ReadIdsByRecipient = Record<string, string[]>;

type StageReviewFollowUpInput = {
  projectId: string;
  projectName: string;
  stage: StageKey | "storyboard";
  targetLabel: string;
  actorName: string;
  recipientRole: PrototypeRole;
  reviewers: readonly string[];
  href: string;
  message: string;
  kind: "request" | "reminder" | "updated";
  occurredAt: string;
};

type OfferNotificationInput = {
  eventKey: Extract<NotificationEventKey, "freelancer.offer.sent" | "freelancer.offer.reminded" | "freelancer.offer.revoked" | "freelancer.offer.accepted" | "freelancer.offer.declined" | "freelancer.assignment.removed">;
  offerId: string;
  recipientId: string;
  recipientRole: "Studio Staff" | "Studio Freelancer";
  actorName: string;
  projectId: string;
  projectName: string;
  title: string;
  copy: string;
  href: string;
  ctaLabel: string;
  occurredAt?: string;
  emailPreview?: NotificationEmailReminderPreview;
};

type NotificationInboxContextValue = {
  items: readonly RecipientInboxItem[];
  unreadCount: number;
  isRead: (item: RecipientInboxItem) => boolean;
  markAsRead: (itemId: string) => void;
  markAllAsRead: () => void;
  retryEmail: (itemId: string) => void;
  publishStageReviewRequest: (input: StageReviewRequestedNotificationInput) => void;
  publishStageReviewFollowUp: (input: StageReviewFollowUpInput) => void;
  publishOfferNotification: (input: OfferNotificationInput) => void;
};

const notificationReadStorageKey = "brisk-notification-inbox-read-v1";
const generatedNotificationStorageKey = "brisk-notification-inbox-generated-v1";
const NotificationInboxContext = createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({ children }: { children: ReactNode }) {
  const { selectedRole } = usePrototypeRole();
  const { state: prototypeState } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { activeScenario } = usePrototypeScenario();
  const currentRecipientName = viewer?.name ?? (selectedRole === "Customer"
    ? prototypeState.clients.find((client) => client.id === prototypeState.session.activeClientId)?.contacts[0]?.name ?? "Jess Taylor"
    : "Tom Mitchell");
  const recipientId = viewer?.id ?? notificationInboxRecipientByRole[selectedRole];
  const [readIdsByRecipient, setReadIdsByRecipient] = useState<ReadIdsByRecipient>({});
  const [emailDeliveryOverrides, setEmailDeliveryOverrides] = useState<Record<string, NotificationEmailDeliveryState>>({});
  const [generatedItems, setGeneratedItems] = useState<RecipientInboxItem[]>([]);
  const authorisedItems = useMemo(
    () => {
      const fixtureItems = activeScenario?.state === "new" ? [] : getAuthorisedNotificationInboxItems(selectedRole, undefined, recipientId);
      const authorisedGeneratedItems = getAuthorisedNotificationInboxItems(selectedRole, generatedItems, recipientId)
        .filter((item) => !item.recipientNames || item.recipientNames.includes(currentRecipientName));
      const uniqueItems = new Map<string, RecipientInboxItem>();

      [...fixtureItems, ...authorisedGeneratedItems].forEach((item) => {
        uniqueItems.set(`${item.canonicalEventId}:${item.recipientId}`, item);
      });

      return [...uniqueItems.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    },
    [activeScenario?.state, currentRecipientName, generatedItems, recipientId, selectedRole],
  );
  const items = useMemo(
    () => authorisedItems.map((item) => {
      const emailDeliveryState = emailDeliveryOverrides[item.id];

      if (!emailDeliveryState) {
        return item;
      }

      if (item.emailDeliveryState === "failed" && emailDeliveryState === "sent") {
        return {
          ...item,
          category: "update" as const,
          state: "success" as const,
          label: "Completed" as const,
          title: item.emailRetrySuccess?.title ?? "Email sent",
          copy: item.emailRetrySuccess?.copy ?? "The email was sent.",
          emailDeliveryState,
        };
      }

      return { ...item, emailDeliveryState };
    }),
    [authorisedItems, emailDeliveryOverrides],
  );
  const personalReadIds = readIdsByRecipient[recipientId] ?? [];

  useEffect(() => {
    setReadIdsByRecipient(readStoredNotificationReadState());
    setGeneratedItems(readStoredGeneratedNotifications());
  }, []);

  const isRead = (item: RecipientInboxItem) => (
    item.initiallyRead || personalReadIds.includes(item.id)
  );
  const unreadCount = items.filter((item) => !isRead(item)).length;

  const updatePersonalReadIds = (itemIds: readonly string[]) => {
    setReadIdsByRecipient((current) => {
      const nextPersonalReadIds = [...new Set([
        ...(current[recipientId] ?? []),
        ...itemIds,
      ])];
      const nextState = {
        ...current,
        [recipientId]: nextPersonalReadIds,
      };

      window.localStorage.setItem(notificationReadStorageKey, JSON.stringify(nextState));
      return nextState;
    });
  };

  const publishStageReviewRequest = useCallback((input: StageReviewRequestedNotificationInput) => {
    const item = createClientStageReviewNotification(input);

    setGeneratedItems((current) => {
      const nextItems = [
        item,
        ...current.filter((candidate) => (
          candidate.canonicalEventId !== item.canonicalEventId
          || candidate.recipientId !== item.recipientId
        )),
      ];
      window.localStorage.setItem(generatedNotificationStorageKey, JSON.stringify(nextItems));
      return nextItems;
    });
    setReadIdsByRecipient((current) => {
      const recipientId = item.recipientId;
      const nextState = {
        ...current,
        [recipientId]: (current[recipientId] ?? []).filter((itemId) => itemId !== item.id),
      };
      window.localStorage.setItem(notificationReadStorageKey, JSON.stringify(nextState));
      return nextState;
    });
  }, []);

  const publishStageReviewFollowUp = useCallback((input: StageReviewFollowUpInput) => {
    const recipientId = notificationInboxRecipientByRole[input.recipientRole];
    const item: RecipientInboxItem = {
      id: `generated-${input.stage}-${input.kind}-${input.projectId}-${input.occurredAt}`,
      canonicalEventId: `${input.stage}-${input.kind}-${input.projectId}-${input.occurredAt}`,
      eventKey: input.kind === "request" ? "stage.review_requested" : input.kind === "reminder" ? "stage.review_reminded" : "stage.review_updated",
      recipientId,
      recipientNames: input.reviewers,
      recipientRole: input.recipientRole,
      recipientResponsibility: "reviewer",
      category: "action-required",
      state: "warning",
      label: "Needs attention",
      title: input.kind === "request" ? `${input.targetLabel} ready for review` : input.kind === "reminder" ? `Reminder to review ${input.targetLabel}` : `Updated ${input.targetLabel} ready for review`,
      copy: input.message || (input.kind === "request" ? `Review ${input.targetLabel} and add any feedback.` : input.kind === "reminder" ? `Please review ${input.targetLabel} when you can.` : `${input.targetLabel} has changed since it was sent for review.`),
      actorName: input.actorName,
      projectId: input.projectId,
      projectName: input.projectName,
      stage: input.stage,
      occurredAt: input.occurredAt,
      href: input.href,
      deepLinkTarget: "project-stage",
      ctaLabel: `Review ${input.targetLabel}`,
      emailDeliveryState: "sent",
      initiallyRead: false,
    };

    setGeneratedItems((current) => {
      const nextItems = [item, ...current];
      window.localStorage.setItem(generatedNotificationStorageKey, JSON.stringify(nextItems));
      return nextItems;
    });
    setReadIdsByRecipient((current) => {
      const nextState = {
        ...current,
        [recipientId]: (current[recipientId] ?? []).filter((itemId) => itemId !== item.id),
      };
      window.localStorage.setItem(notificationReadStorageKey, JSON.stringify(nextState));
      return nextState;
    });
  }, []);

  const publishOfferNotification = useCallback((input: OfferNotificationInput) => {
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const item: RecipientInboxItem = {
      id: `offer-${input.offerId}-${input.eventKey}-${occurredAt}`,
      canonicalEventId: `offer-${input.offerId}-${input.eventKey}-${occurredAt}`,
      eventKey: input.eventKey,
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      recipientResponsibility: input.recipientRole === "Studio Freelancer" ? "offer-recipient" : "project-lead",
      category: input.eventKey === "freelancer.offer.sent" || input.eventKey === "freelancer.offer.declined" ? "action-required" : "update",
      state: input.eventKey === "freelancer.offer.declined" || input.eventKey === "freelancer.offer.revoked" || input.eventKey === "freelancer.assignment.removed" ? "warning" : input.eventKey === "freelancer.offer.accepted" ? "success" : "information",
      label: input.eventKey === "freelancer.offer.accepted" ? "Completed" : input.eventKey === "freelancer.offer.sent" ? "Needs attention" : "Update",
      title: input.title,
      copy: input.copy,
      actorName: input.actorName,
      projectId: input.projectId,
      projectName: input.projectName,
      occurredAt,
      href: input.href,
      deepLinkTarget: input.recipientRole === "Studio Freelancer" ? "freelancer-offer" : "project-overview",
      ctaLabel: input.ctaLabel,
      emailPreview: input.emailPreview,
      initiallyRead: false,
    };

    setGeneratedItems((current) => {
      const nextItems = [item, ...current];
      window.localStorage.setItem(generatedNotificationStorageKey, JSON.stringify(nextItems));
      return nextItems;
    });
  }, []);

  const value = useMemo<NotificationInboxContextValue>(() => ({
    items,
    unreadCount,
    isRead,
    markAsRead: (itemId) => updatePersonalReadIds([itemId]),
    markAllAsRead: () => updatePersonalReadIds(items.map((item) => item.id)),
    retryEmail: (itemId) => {
      setEmailDeliveryOverrides((current) => ({ ...current, [itemId]: "sent" }));
      updatePersonalReadIds([itemId]);
    },
    publishStageReviewRequest,
    publishStageReviewFollowUp,
    publishOfferNotification,
  }), [items, personalReadIds, publishOfferNotification, publishStageReviewFollowUp, publishStageReviewRequest, recipientId, unreadCount]);

  return (
    <NotificationInboxContext.Provider value={value}>
      {children}
    </NotificationInboxContext.Provider>
  );
}

export function useNotificationInbox() {
  const context = useContext(NotificationInboxContext);

  if (!context) {
    throw new Error("useNotificationInbox must be used within NotificationInboxProvider");
  }

  return context;
}

function readStoredNotificationReadState(): ReadIdsByRecipient {
  try {
    const storedState = window.localStorage.getItem(notificationReadStorageKey);
    return storedState ? JSON.parse(storedState) as ReadIdsByRecipient : {};
  } catch {
    return {};
  }
}

function readStoredGeneratedNotifications(): RecipientInboxItem[] {
  try {
    const storedState = window.localStorage.getItem(generatedNotificationStorageKey);
    if (!storedState) return [];

    const parsedState: unknown = JSON.parse(storedState);
    return Array.isArray(parsedState) ? parsedState as RecipientInboxItem[] : [];
  } catch {
    return [];
  }
}
