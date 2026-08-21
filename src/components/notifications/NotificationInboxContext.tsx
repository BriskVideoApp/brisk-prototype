"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  getAuthorisedNotificationInboxItems,
  notificationInboxRecipientByRole,
  type NotificationEmailDeliveryState,
  type RecipientInboxItem,
} from "@/data/notification-inbox";

type ReadIdsByRecipient = Record<string, string[]>;

type NotificationInboxContextValue = {
  items: readonly RecipientInboxItem[];
  unreadCount: number;
  isRead: (item: RecipientInboxItem) => boolean;
  markAsRead: (itemId: string) => void;
  markAllAsRead: () => void;
  retryEmail: (itemId: string) => void;
};

const notificationReadStorageKey = "brisk-notification-inbox-read-v1";
const NotificationInboxContext = createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({ children }: { children: ReactNode }) {
  const { selectedRole } = usePrototypeRole();
  const [readIdsByRecipient, setReadIdsByRecipient] = useState<ReadIdsByRecipient>({});
  const [emailDeliveryOverrides, setEmailDeliveryOverrides] = useState<Record<string, NotificationEmailDeliveryState>>({});
  const authorisedItems = useMemo(
    () => getAuthorisedNotificationInboxItems(selectedRole),
    [selectedRole],
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
  }), [items, personalReadIds, recipientId, unreadCount]);

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
