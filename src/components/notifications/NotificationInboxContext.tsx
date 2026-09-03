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
import {
  createClientStageReviewNotification,
  getAuthorisedNotificationInboxItems,
  notificationInboxRecipientByRole,
  type NotificationEmailDeliveryState,
  type RecipientInboxItem,
  type StageReviewRequestedNotificationInput,
} from "@/data/notification-inbox";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

type ReadIdsByRecipient = Record<string, string[]>;

type NotificationInboxContextValue = {
  items: readonly RecipientInboxItem[];
  unreadCount: number;
  isRead: (item: RecipientInboxItem) => boolean;
  markAsRead: (itemId: string) => void;
  markAllAsRead: () => void;
  retryEmail: (itemId: string) => void;
  publishStageReviewRequest: (input: StageReviewRequestedNotificationInput) => void;
};

const notificationReadStorageKey = "brisk-notification-inbox-read-v1";
const generatedNotificationStorageKey = "brisk-notification-inbox-generated-v1";
const NotificationInboxContext = createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({ children }: { children: ReactNode }) {
  const { selectedRole } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const [readIdsByRecipient, setReadIdsByRecipient] = useState<ReadIdsByRecipient>({});
  const [emailDeliveryOverrides, setEmailDeliveryOverrides] = useState<Record<string, NotificationEmailDeliveryState>>({});
  const [generatedItems, setGeneratedItems] = useState<RecipientInboxItem[]>([]);
  const authorisedItems = useMemo(
    () => {
      const fixtureItems = activeScenario?.state === "new" ? [] : getAuthorisedNotificationInboxItems(selectedRole);
      const authorisedGeneratedItems = getAuthorisedNotificationInboxItems(selectedRole, generatedItems);
      const uniqueItems = new Map<string, RecipientInboxItem>();

      [...fixtureItems, ...authorisedGeneratedItems].forEach((item) => {
        uniqueItems.set(`${item.canonicalEventId}:${item.recipientId}`, item);
      });

      return [...uniqueItems.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    },
    [activeScenario?.state, generatedItems, selectedRole],
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
  const recipientId = notificationInboxRecipientByRole[selectedRole];
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
  }), [items, personalReadIds, publishStageReviewRequest, recipientId, unreadCount]);

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
