"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { ComposerSubmission } from "@/components/chat/ChatComposer";
import { ChatCallLauncher } from "@/components/chat/ChatCallLauncher";
import { ChatCallsView } from "@/components/chat/ChatCallsView";
import { ChatGlobalView } from "@/components/chat/ChatGlobalView";
import {
  CustomerSettings,
  ChatSearchOverlay,
  ProjectMemberSettings,
  ShortcutSheet,
} from "@/components/chat/ChatOverlays";
import { ChatProjectList } from "@/components/chat/ChatProjectList";
import { ProjectConnectorSettings } from "@/components/chat/ProjectConnectorSettings";
import { ChatRail } from "@/components/chat/ChatRail";
import type {
  ChatCustomerFilter,
  ChatRailReadTarget,
  ChatRailView,
} from "@/components/chat/ChatRail";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatThreadPane } from "@/components/chat/ChatThreadPane";
import { ChatUnreadControl } from "@/components/chat/ChatUnreadControl";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getDemoProjectDestination } from "@/data/projects";
import type {
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  ChatProject,
  ChatSource,
} from "@/components/chat/types";
import type { ReactionEmoji } from "@/components/video-review/types";
import {
  chatMessages as initialMessages,
  chatClients,
  directMessages as initialDirectMessages,
  chatProjects as initialProjects,
  chatUsers,
  chatWorkspace,
  directConversations,
  groupConversations as initialGroupConversations,
  groupMessages,
  recentCalls,
} from "@/data/chat";
import { appendMessageOnce, resolveOutboundSource } from "@/components/chat/chat-utils";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";

type ChatPageProps = {
  initialProjectId?: string | null;
  initialMessageId?: string;
  embedded?: boolean;
  clientName?: string;
};

export function ChatPage({ initialProjectId, initialMessageId, embedded = false, clientName }: ChatPageProps) {
  const { selectedRole } = usePrototypeRole();
  const { studio } = useStudioSettings();
  const { activeScenario } = usePrototypeScenario();
  const searchParams = useSearchParams();
  const isEmptyPreview = searchParams.get("preview") === "empty" || activeScenario?.state === "new";
  const [clients, setClients] = useState(chatClients);
  const [projects, setProjects] = useState(initialProjects);
  const [messages, setMessages] = useState([...initialMessages, ...initialDirectMessages, ...groupMessages]);
  const [dmConversations, setDmConversations] = useState(directConversations);
  const [groupConversationList, setGroupConversationList] = useState(initialGroupConversations);
  const [activeView, setActiveView] = useState<ChatRailView>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (isEmptyPreview) {
      return null;
    }

    if (initialProjectId === null) {
      return null;
    }

    if (initialProjectId && initialProjects.some((project) => project.id === initialProjectId)) {
      return initialProjectId;
    }

    return initialProjectId === undefined ? "loom-launch-film" : null;
  });
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedCompanyChatClientName, setSelectedCompanyChatClientName] = useState<string | null>(null);
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChatChannel>("external");
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectorSettingsOpen, setIsConnectorSettingsOpen] = useState(false);
  const [isCustomerSettingsOpen, setIsCustomerSettingsOpen] = useState(false);
  const studioConnectors = studio.integrations;
  const [isShortcutSheetOpen, setIsShortcutSheetOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDroppedFiles, setPendingDroppedFiles] = useState<File[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<ChatCustomerFilter>("Active");
  const [isNewMessagePickerOpen, setIsNewMessagePickerOpen] = useState(false);
  const openedInitialMessageRef = useRef(false);

  const effectiveCurrentUserId =
    selectedRole === "Customer"
      ? "user-jess"
      : selectedRole === "Studio Freelancer"
        ? "user-nina"
        : chatWorkspace.currentUserId;
  const isCustomer = selectedRole === "Customer";
  const isStudioStaff = selectedRole === "Studio Staff";
  const accessibleProjects = useMemo(() => {
    if (isEmptyPreview) return [];

    const roleProjects = selectedRole === "Customer"
      ? projects.filter((project) => project.clientMemberIds.includes(effectiveCurrentUserId))
      : selectedRole === "Studio Freelancer"
        ? projects.filter((project) => project.memberIds.includes(effectiveCurrentUserId))
        : projects;

    return clientName
      ? roleProjects.filter((project) => project.clientName === clientName)
      : roleProjects;
  }, [clientName, effectiveCurrentUserId, isEmptyPreview, projects, selectedRole]);

  useEffect(() => {
    if (!initialMessageId || openedInitialMessageRef.current) return;

    const targetMessage = messages.find((message) => message.id === initialMessageId);
    const canOpenProject = targetMessage
      ? accessibleProjects.some((project) => project.id === targetMessage.projectId)
      : false;
    const canOpenChannel = targetMessage
      ? selectedRole !== "Customer" || targetMessage.channel === "external"
      : false;

    openedInitialMessageRef.current = true;
    if (!targetMessage || !canOpenProject || !canOpenChannel) return;

    setActiveView("projects");
    setSelectedProjectId(targetMessage.projectId);
    setSelectedClientName(null);
    setSelectedCompanyChatClientName(null);
    setActiveChannel(targetMessage.channel);
    setThreadParentId(targetMessage.threadId);
    setHighlightedMessageId(targetMessage.id);

    const highlightTimeout = window.setTimeout(() => setHighlightedMessageId(null), 2000);
    return () => window.clearTimeout(highlightTimeout);
  }, [accessibleProjects, initialMessageId, messages, selectedRole]);
  const accessibleClients = clientName
    ? clients.filter((client) => client.name === clientName)
    : clients;
  const customerStatusByName = useMemo(
    () => new Map(clients.map((client) => [client.name, client.status])),
    [clients],
  );
  const customerFilteredProjects = isStudioStaff && customerFilter !== "All"
    ? accessibleProjects.filter(
        (project) => customerStatusByName.get(project.clientName) === customerFilter,
      )
    : accessibleProjects;
  const unreadFilteredProjects = showUnreadOnly
    ? customerFilteredProjects.filter(
        (project) => project.externalUnread + project.internalUnread > 0,
      )
    : customerFilteredProjects;
  const projectListProjects = selectedClientName && isStudioStaff
    ? unreadFilteredProjects.filter((project) => project.clientName === selectedClientName)
    : unreadFilteredProjects;
  const companyUnreadCounts = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        [...new Set(accessibleProjects.map((project) => project.clientName))].map((clientName) => [
          clientName,
          messages.filter(
            (message) =>
              message.projectId === getCompanyChatId(clientName) &&
              !message.readBy.includes(effectiveCurrentUserId),
          ).length,
        ]),
      ),
    [accessibleProjects, effectiveCurrentUserId, messages],
  );
  const selectedProject = selectedProjectId
    ? accessibleProjects.find((project) => project.id === selectedProjectId) ?? null
    : null;
  const selectedClient = selectedClientName
    ? clients.find((client) => client.name === selectedClientName) ?? null
    : null;
  const selectedClientProjects = selectedClientName
    ? projects.filter((project) => project.clientName === selectedClientName)
    : [];
  const selectedClientUsers = selectedClient
    ? chatUsers.filter((user) => selectedClient.userIds.includes(user.id))
    : [];
  const selectedProjectCompanyUsers = selectedProject
    ? chatUsers.filter((user) =>
        clients.find((client) => client.name === selectedProject.clientName)?.userIds.includes(user.id),
      )
    : [];
  const selectedCompanyChatProject = useMemo<ChatProject | null>(() => {
    if (!selectedCompanyChatClientName) {
      return null;
    }

    const clientProjects = accessibleProjects.filter(
      (project) => project.clientName === selectedCompanyChatClientName,
    );
    const referenceProject = clientProjects[0];

    if (!referenceProject) {
      return null;
    }

    const companyChatId = getCompanyChatId(selectedCompanyChatClientName);
    const companyMessages = messages.filter((message) => message.projectId === companyChatId);

    return {
      id: companyChatId,
      code: selectedCompanyChatClientName,
      title: "Client chat",
      clientName: selectedCompanyChatClientName,
      status: "In Production",
      memberIds: [...new Set(clientProjects.flatMap((project) => project.memberIds))],
      clientMemberIds: [...new Set(clientProjects.flatMap((project) => project.clientMemberIds))],
      externalUnread: companyMessages.filter(
        (message) =>
          message.channel === "external" && !message.readBy.includes(effectiveCurrentUserId),
      ).length,
      internalUnread: companyMessages.filter(
        (message) =>
          message.channel === "internal" && !message.readBy.includes(effectiveCurrentUserId),
      ).length,
      preferredSource: referenceProject.preferredSource,
      connectors: referenceProject.connectors,
    };
  }, [accessibleProjects, effectiveCurrentUserId, messages, selectedCompanyChatClientName]);
  const activeProjectChat = selectedProject ?? selectedCompanyChatProject;
  const activeProjectChatId = activeProjectChat?.id ?? null;
  const visibleMessages = activeProjectChat
    ? messages
        .filter(
          (message) =>
            message.projectId === activeProjectChat.id &&
            message.channel === activeChannel &&
            message.threadId === null,
        )
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    : [];
  const threadParent = threadParentId
    ? messages.find((message) => message.id === threadParentId) ?? null
    : null;
  const threadReplies = threadParent
    ? messages
        .filter((message) => message.threadId === threadParent.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    : [];
  const visibleDmConversations = (isEmptyPreview ? [] : dmConversations).filter((conversation) =>
    conversation.memberIds.includes(effectiveCurrentUserId),
  );
  const selectedDm = selectedDmId
    ? dmConversations.find((conversation) => conversation.id === selectedDmId) ?? null
    : null;
  const selectedDmUser = selectedDm
    ? chatUsers.find(
        (user) => user.id === selectedDm.memberIds.find((memberId) => memberId !== effectiveCurrentUserId),
      ) ?? chatUsers.find((user) => user.name === selectedDm.title) ?? null
    : null;
  const selectedDmProject: ChatProject | null = selectedDm
    ? {
        id: selectedDm.id,
        code: "DM",
        title: selectedDm.title,
        clientName: chatWorkspace.name,
        status: "In Production",
        memberIds: [...new Set([...selectedDm.memberIds, effectiveCurrentUserId])],
        clientMemberIds: [],
        externalUnread: 0,
        internalUnread: selectedDm.unread,
        preferredSource: "brisk",
        connectors: {
          whatsapp: {
            enabled: false,
            detail: "Not available in direct messages",
            numberOwner: "studio",
            conversationName: "Not available in direct messages",
          },
          slack: {
            enabled: false,
            detail: "Not available in direct messages",
            setup: "brisk-app",
            channelName: "Not available in direct messages",
          },
        },
      }
    : null;
  const directMessageStream = selectedDm
    ? messages
        .filter((message) => message.projectId === selectedDm.id && message.threadId === null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    : [];
  const selectedGroup = selectedGroupId
    ? groupConversationList.find((conversation) => conversation.id === selectedGroupId) ?? null
    : null;
  const selectedGroupProject: ChatProject | null = selectedGroup
    ? {
        id: selectedGroup.id,
        code: "Group",
        title: selectedGroup.title,
        clientName: chatWorkspace.name,
        status: "In Production",
        memberIds: selectedGroup.memberIds,
        clientMemberIds: [],
        externalUnread: 0,
        internalUnread: selectedGroup.unread,
        preferredSource: "brisk",
        connectors: {
          whatsapp: {
            enabled: false,
            detail: "Not available in groups",
            numberOwner: "studio",
            conversationName: "Not available in groups",
          },
          slack: {
            enabled: false,
            detail: "Not available in groups",
            setup: "brisk-app",
            channelName: "Not available in groups",
          },
        },
      }
    : null;
  const groupMessageStream = selectedGroup
    ? messages
        .filter((message) => message.projectId === selectedGroup.id && message.threadId === null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    : [];
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const markRailTargetRead = useCallback(
    (target: ChatRailReadTarget) => {
      const matchesProject = (project: ChatProject) =>
        target.type === "all" ||
        (target.type === "client" && project.clientName === target.clientName) ||
        (target.type === "project" && project.id === target.projectId);

      setProjects((current) =>
        current.map((project) =>
          matchesProject(project)
            ? { ...project, externalUnread: 0, internalUnread: 0 }
            : project,
        ),
      );

      if (target.type !== "project") {
        const companyChatIds = new Set(
          accessibleProjects
            .filter((project) => target.type === "all" || project.clientName === target.clientName)
            .map((project) => getCompanyChatId(project.clientName)),
        );

        setMessages((current) =>
          current.map((message) =>
            companyChatIds.has(message.projectId) && !message.readBy.includes(effectiveCurrentUserId)
              ? { ...message, readBy: [...message.readBy, effectiveCurrentUserId] }
              : message,
          ),
        );
      }

      notify(target.type === "all" ? "All messages marked as read" : "Messages marked as read");
    },
    [accessibleProjects, effectiveCurrentUserId, notify],
  );

  const markProjectChannelRead = useCallback(
    (project: ChatProject, channel: ChatChannel) => {
      const storedProject = projects.some((candidate) => candidate.id === project.id);

      if (storedProject) {
        setProjects((current) =>
          current.map((candidate) =>
            candidate.id === project.id
              ? {
                  ...candidate,
                  externalUnread: channel === "external" ? 0 : candidate.externalUnread,
                  internalUnread: channel === "internal" ? 0 : candidate.internalUnread,
                }
              : candidate,
          ),
        );
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.projectId === project.id &&
            message.channel === channel &&
            !message.readBy.includes(effectiveCurrentUserId)
              ? { ...message, readBy: [...message.readBy, effectiveCurrentUserId] }
              : message,
          ),
        );
      }

      notify(`${channel === "external" ? "External" : "Internal"} messages marked as read`);
    },
    [effectiveCurrentUserId, notify, projects],
  );

  useEffect(() => {
    if (activeView !== "projects" || !activeProjectChatId) {
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === activeProjectChatId
          ? {
              ...project,
              externalUnread: activeChannel === "external" ? 0 : project.externalUnread,
              internalUnread: activeChannel === "internal" ? 0 : project.internalUnread,
            }
          : project,
      ),
    );
    setMessages((current) =>
      current.map((message) =>
        message.projectId === activeProjectChatId &&
        message.channel === activeChannel &&
        !message.readBy.includes(effectiveCurrentUserId)
          ? { ...message, readBy: [...message.readBy, effectiveCurrentUserId] }
          : message,
      ),
    );
  }, [
    activeChannel,
    activeProjectChatId,
    activeView,
    effectiveCurrentUserId,
  ]);

  const markMessageUnread = useCallback(
    (messageId: string) => {
      const message = messages.find((candidate) => candidate.id === messageId);

      if (!message || !message.readBy.includes(effectiveCurrentUserId)) {
        notify("Message is already unread");
        return;
      }

      setMessages((current) =>
        current.map((candidate) =>
          candidate.id === messageId
            ? {
                ...candidate,
                readBy: candidate.readBy.filter((userId) => userId !== effectiveCurrentUserId),
              }
            : candidate,
        ),
      );

      if (projects.some((project) => project.id === message.projectId)) {
        setProjects((current) =>
          current.map((project) =>
            project.id === message.projectId
              ? {
                  ...project,
                  externalUnread:
                    message.channel === "external"
                      ? project.externalUnread + 1
                      : project.externalUnread,
                  internalUnread:
                    message.channel === "internal"
                      ? project.internalUnread + 1
                      : project.internalUnread,
                }
              : project,
          ),
        );
      } else if (dmConversations.some((conversation) => conversation.id === message.projectId)) {
        setDmConversations((current) =>
          current.map((conversation) =>
            conversation.id === message.projectId
              ? { ...conversation, unread: conversation.unread + 1 }
              : conversation,
          ),
        );
      } else if (groupConversationList.some((conversation) => conversation.id === message.projectId)) {
        setGroupConversationList((current) =>
          current.map((conversation) =>
            conversation.id === message.projectId
              ? { ...conversation, unread: conversation.unread + 1 }
              : conversation,
          ),
        );
      }

      notify("Message marked as unread");
    },
    [
      dmConversations,
      effectiveCurrentUserId,
      groupConversationList,
      messages,
      notify,
      projects,
    ],
  );

  const markConversationRead = useCallback(
    (view: "dms" | "groups", conversationId: string) => {
      if (view === "dms") {
        setDmConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
          ),
        );
      } else {
        setGroupConversationList((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
          ),
        );
      }

      notify("Messages marked as read");
    },
    [notify],
  );

  const markGlobalViewRead = useCallback(
    (view: Exclude<ChatRailView, "projects">) => {
      if (view === "dms") {
        setDmConversations((current) =>
          current.map((conversation) => ({ ...conversation, unread: 0 })),
        );
      } else if (view === "groups") {
        setGroupConversationList((current) =>
          current.map((conversation) => ({ ...conversation, unread: 0 })),
        );
      } else if (view === "mentions" || view === "threads") {
        setMessages((current) =>
          current.map((message) =>
            !message.readBy.includes(effectiveCurrentUserId)
              ? { ...message, readBy: [...message.readBy, effectiveCurrentUserId] }
              : message,
          ),
        );
      }

      notify("Messages marked as read");
    },
    [effectiveCurrentUserId, notify],
  );

  useEffect(() => {
    if (isCustomer) {
      setActiveView("projects");
      setActiveChannel("external");
      setThreadParentId(null);
      setIsConnectorSettingsOpen(false);
      setIsSettingsOpen(false);

      if (!accessibleProjects.some((project) => project.id === selectedProjectId)) {
        setSelectedProjectId(accessibleProjects[0]?.id ?? null);
      }
    }
  }, [accessibleProjects, isCustomer, selectedProjectId]);

  useEffect(() => {
    if (!isStudioStaff) {
      setSelectedClientName(null);
    }
  }, [isStudioStaff]);

  useEffect(() => {
    if (
      !isCustomer &&
      activeView === "dms" &&
      selectedDmId &&
      !visibleDmConversations.some((conversation) => conversation.id === selectedDmId)
    ) {
      setSelectedDmId(null);
      setThreadParentId(null);
    }
  }, [activeView, isCustomer, selectedDmId, visibleDmConversations]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const commandKey = event.metaKey || event.ctrlKey;

      if (commandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (commandKey && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setActiveView("projects");
        setSelectedProjectId(null);
        setSelectedClientName(null);
        setShowUnreadOnly(true);
        notify("Showing all unread project conversations");
        return;
      }

      if (commandKey && event.key === "/") {
        event.preventDefault();
        setIsShortcutSheetOpen(true);
        return;
      }

      if (event.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isNewMessagePickerOpen) {
          setIsNewMessagePickerOpen(false);
        } else if (isCustomerSettingsOpen) {
          setIsCustomerSettingsOpen(false);
        } else if (isConnectorSettingsOpen) {
          setIsConnectorSettingsOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isShortcutSheetOpen) {
          setIsShortcutSheetOpen(false);
        } else if (threadParentId) {
          setThreadParentId(null);
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    isSearchOpen,
    isNewMessagePickerOpen,
    isCustomerSettingsOpen,
    isConnectorSettingsOpen,
    isSettingsOpen,
    isShortcutSheetOpen,
    notify,
    threadParentId,
  ]);

  const selectProject = (projectId: string | null) => {
    setActiveView("projects");
    setSelectedProjectId(projectId);
    setSelectedCompanyChatClientName(null);
    if (projectId === null) {
      setSelectedClientName(null);
    }
    setSelectedDmId(null);
    setSelectedGroupId(null);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setShowUnreadOnly(false);
    setIsNewMessagePickerOpen(false);
  };

  const selectClient = (clientName: string) => {
    setActiveView("projects");
    setSelectedProjectId(null);
    setSelectedClientName(clientName);
    setSelectedCompanyChatClientName(null);
    setSelectedDmId(null);
    setSelectedGroupId(null);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setShowUnreadOnly(false);
    setIsNewMessagePickerOpen(false);
  };

  const selectCompanyChat = (clientName: string) => {
    setActiveView("projects");
    setSelectedProjectId(null);
    setSelectedClientName(clientName);
    setSelectedCompanyChatClientName(clientName);
    setSelectedDmId(null);
    setSelectedGroupId(null);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setShowUnreadOnly(false);
    setIsNewMessagePickerOpen(false);
  };

  const selectGlobalView = (view: ChatRailView) => {
    setActiveView(view);
    setSelectedCompanyChatClientName(null);
    setSelectedDmId(null);
    setSelectedGroupId(null);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setIsNewMessagePickerOpen(false);
  };

  const selectDirectConversation = (conversationId: string) => {
    setActiveView("dms");
    setSelectedProjectId(null);
    setSelectedCompanyChatClientName(null);
    setSelectedDmId(conversationId);
    setSelectedGroupId(null);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setIsNewMessagePickerOpen(false);
  };

  const selectGroupConversation = (conversationId: string) => {
    setActiveView("groups");
    setSelectedProjectId(null);
    setSelectedCompanyChatClientName(null);
    setSelectedDmId(null);
    setSelectedGroupId(conversationId);
    setThreadParentId(null);
    setHighlightedMessageId(null);
    setIsNewMessagePickerOpen(false);
  };

  const startDirectConversation = (userId: string) => {
    const participant = chatUsers.find((user) => user.id === userId);

    if (!participant) {
      return;
    }

    const existingConversation = dmConversations.find(
      (conversation) =>
        conversation.memberIds.includes(effectiveCurrentUserId) &&
        conversation.memberIds.includes(userId),
    );

    if (existingConversation) {
      selectDirectConversation(existingConversation.id);
      return;
    }

    const conversationId = `dm-${[effectiveCurrentUserId, userId].sort().join("-")}`;
    setDmConversations((current) => [
      {
        id: conversationId,
        title: participant.name,
        memberIds: [effectiveCurrentUserId, userId],
        lastSenderId: effectiveCurrentUserId,
        preview: "Start the conversation.",
        createdAt: new Date().toISOString(),
        unread: 0,
      },
      ...current,
    ]);
    selectDirectConversation(conversationId);
  };

  const updateProject = (updatedProject: ChatProject) => {
    setProjects((current) =>
      current.map((project) => (project.id === updatedProject.id ? updatedProject : project)),
    );
  };

  const submitMessage = (
    submission: ComposerSubmission,
    threadId: string | null = null,
  ) => {
    if (!activeProjectChat) {
      return;
    }

    if (submission.editingMessageId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === submission.editingMessageId
            ? { ...message, body: submission.body, editedAt: new Date().toISOString() }
            : message,
        ),
      );
      notify("Message updated");
      return;
    }

    const automaticLoomAttachments =
      submission.attachments.length === 0 && /https?:\/\/(?:www\.)?loom\.com\//u.test(submission.body)
        ? [
            {
              id: `attachment-loom-${Date.now()}`,
              type: "loom" as const,
              name: "Loom video",
              url: submission.body.match(/https?:\/\/[^\s]+/u)?.[0],
            },
          ]
        : [];
    const source: ChatSource = resolveOutboundSource({
      channel: activeChannel,
      project: activeProjectChat,
      requestedSource: submission.source,
      studioConnectors,
    });
    const createdAt = new Date().toISOString();
    const newMessage: ChatMessage = {
      id: `message-${Date.now()}`,
      projectId: activeProjectChat.id,
      channel: activeChannel,
      threadId,
      senderId: effectiveCurrentUserId,
      senderSystem: null,
      senderRole: isCustomer ? "client" : "team",
      body: submission.body,
      attachments: [...submission.attachments, ...automaticLoomAttachments],
      reactions: [],
      sourceChannel: source,
      createdAt,
      editedAt: null,
      deletedAt: null,
      readBy: [effectiveCurrentUserId],
      mentions: submission.mentions,
      connectorMessageKey: source === "brisk"
        ? undefined
        : `${source}:${activeProjectChat.id}:${threadId ?? "root"}:${createdAt}`,
    };

    setMessages((current) => appendMessageOnce(current, newMessage));
    notify(
      activeChannel === "internal"
        ? `Posted internally to ${chatWorkspace.name}`
        : `Sent through ${source === "brisk" ? "Brisk" : source === "whatsapp" ? "WhatsApp" : "Slack"}`,
    );
  };

  const submitDirectMessage = (
    submission: ComposerSubmission,
    threadId: string | null = null,
  ) => {
    if (!selectedDm) {
      return;
    }

    if (submission.editingMessageId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === submission.editingMessageId
            ? { ...message, body: submission.body, editedAt: new Date().toISOString() }
            : message,
        ),
      );
      notify("Message updated");
      return;
    }

    const createdAt = new Date().toISOString();
    const newMessage: ChatMessage = {
      id: `direct-message-${Date.now()}`,
      projectId: selectedDm.id,
      channel: "internal",
      threadId,
      senderId: effectiveCurrentUserId,
      senderSystem: null,
      senderRole: "team",
      body: submission.body,
      attachments: submission.attachments,
      reactions: [],
      sourceChannel: "brisk",
      createdAt,
      editedAt: null,
      deletedAt: null,
      readBy: [effectiveCurrentUserId],
      mentions: submission.mentions,
    };

    setMessages((current) => [...current, newMessage]);
    setDmConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedDm.id
          ? {
              ...conversation,
              lastSenderId: effectiveCurrentUserId,
              preview: submission.body || "Sent an attachment.",
              createdAt,
            }
          : conversation,
      ),
    );
    notify(`Sent privately to ${selectedDm.title}`);
  };

  const submitGroupMessage = (
    submission: ComposerSubmission,
    threadId: string | null = null,
  ) => {
    if (!selectedGroup) {
      return;
    }

    if (submission.editingMessageId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === submission.editingMessageId
            ? { ...message, body: submission.body, editedAt: new Date().toISOString() }
            : message,
        ),
      );
      notify("Message updated");
      return;
    }

    const newMessage: ChatMessage = {
      id: `group-message-${Date.now()}`,
      projectId: selectedGroup.id,
      channel: "internal",
      threadId,
      senderId: effectiveCurrentUserId,
      senderSystem: null,
      senderRole: "team",
      body: submission.body,
      attachments: submission.attachments,
      reactions: [],
      sourceChannel: "brisk",
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      readBy: [effectiveCurrentUserId],
      mentions: submission.mentions,
    };

    setMessages((current) => [...current, newMessage]);
    notify(`Sent to ${selectedGroup.title}`);
  };

  const toggleReaction = (messageId: string, emoji: ReactionEmoji, label: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        if (message.sourceChannel === "slack") {
          return message;
        }

        const existingReaction = message.reactions.find((reaction) => reaction.emoji === emoji);

        if (!existingReaction) {
          return {
            ...message,
            reactions: [
              ...message.reactions,
              { emoji, label, selectedBy: [effectiveCurrentUserId] },
            ],
          };
        }

        const isSelected = existingReaction.selectedBy.includes(effectiveCurrentUserId);
        const selectedBy = isSelected
          ? existingReaction.selectedBy.filter((userId) => userId !== effectiveCurrentUserId)
          : [...existingReaction.selectedBy, effectiveCurrentUserId];

        return {
          ...message,
          reactions: message.reactions
            .map((reaction) =>
              reaction.emoji === emoji ? { ...reaction, selectedBy } : reaction,
            )
            .filter((reaction) => reaction.selectedBy.length > 0),
        };
      }),
    );
  };

  const deleteMessage = (messageId: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, deletedAt: new Date().toISOString() }
          : message,
      ),
    );
    notify("Message deleted");
  };

  const editMessage = (messageId: string, body: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, body, editedAt: new Date().toISOString() }
          : message,
      ),
    );
    notify("Message updated");
  };

  const selectSearchResult = (message: ChatMessage, openThread = false) => {
    setActiveView("projects");
    setSelectedProjectId(message.projectId);
    setSelectedClientName(null);
    setSelectedCompanyChatClientName(null);
    setActiveChannel(message.channel);
    setIsSearchOpen(false);
    setHighlightedMessageId(message.id);
    setThreadParentId(openThread ? message.id : null);
    window.setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  const getLastEditableMessage = () => {
    if (!activeProjectChat) {
      return null;
    }

    const message = [...messages]
      .reverse()
      .find(
        (candidate) =>
          candidate.projectId === activeProjectChat.id &&
          candidate.channel === activeChannel &&
          candidate.threadId === null &&
          candidate.senderId === effectiveCurrentUserId &&
          !candidate.deletedAt,
      );

    return message ? { id: message.id, body: message.body } : null;
  };

  const getLastEditableDirectMessage = () => {
    if (!selectedDm) {
      return null;
    }

    const message = [...messages]
      .reverse()
      .find(
        (candidate) =>
          candidate.projectId === selectedDm.id &&
          candidate.threadId === null &&
          candidate.senderId === effectiveCurrentUserId &&
          !candidate.deletedAt,
      );

    return message ? { id: message.id, body: message.body } : null;
  };

  const getLastEditableGroupMessage = () => {
    if (!selectedGroup) {
      return null;
    }

    const message = [...messages]
      .reverse()
      .find(
        (candidate) =>
          candidate.projectId === selectedGroup.id &&
          candidate.threadId === null &&
          candidate.senderId === effectiveCurrentUserId &&
          !candidate.deletedAt,
      );

    return message ? { id: message.id, body: message.body } : null;
  };

  const studioMemberIds = chatUsers
    .filter((user) => user.team === "studio")
    .map((user) => user.id);
  const projectCallMemberIds = activeProjectChat
    ? [...new Set([
        ...activeProjectChat.memberIds,
        ...(activeChannel === "external" ? activeProjectChat.clientMemberIds : []),
        effectiveCurrentUserId,
      ])]
    : [];
  const activeCallContext =
    activeView === "projects" && activeProjectChat
      ? {
          name: selectedCompanyChatProject
            ? `${selectedCompanyChatProject.clientName} Client chat`
            : `${activeProjectChat.code} ${activeProjectChat.title}`,
          defaultMemberIds: [effectiveCurrentUserId],
          availableMemberIds:
            activeChannel === "external"
              ? projectCallMemberIds
              : [...new Set([...studioMemberIds, effectiveCurrentUserId])],
        }
      : activeView === "dms" && selectedDm
        ? {
            name: selectedDm.title,
            defaultMemberIds: [...new Set([...selectedDm.memberIds, effectiveCurrentUserId])],
            availableMemberIds: [...new Set([...studioMemberIds, effectiveCurrentUserId])],
          }
        : activeView === "groups" && selectedGroup
          ? {
              name: selectedGroup.title,
              defaultMemberIds: [...new Set([...selectedGroup.memberIds, effectiveCurrentUserId])],
              availableMemberIds: [...new Set([...studioMemberIds, effectiveCurrentUserId])],
            }
          : activeView === "calls"
            ? {
                name: chatWorkspace.name,
                defaultMemberIds: [effectiveCurrentUserId],
                availableMemberIds: [...new Set([...studioMemberIds, effectiveCurrentUserId])],
              }
            : null;
  const activeRailClientName = isStudioStaff
    ? selectedClientName ?? activeProjectChat?.clientName ?? null
    : null;

  return (
    <div className={`chat-workspace-shell ${isCustomer ? "customer-view" : ""} ${embedded ? "embedded" : ""}`}>
      <main className={`chat-shell ${isCustomer ? "customer-view" : ""} ${embedded ? "embedded" : ""}`}>
        <ChatRail
          workspaceName={chatWorkspace.name}
          role={selectedRole}
          activeProjectId={selectedProjectId}
          activeClientName={activeRailClientName}
          activeView={activeView}
          projects={accessibleProjects}
          clients={accessibleClients}
          customerFilter={customerFilter}
          showUnreadOnly={showUnreadOnly}
          companyUnreadCounts={companyUnreadCounts}
          onProjectSelect={selectProject}
          onClientSelect={selectClient}
          onViewSelect={selectGlobalView}
          onCustomerFilterChange={(filter) => {
            setCustomerFilter(filter);
            setActiveView("projects");
            setSelectedProjectId(null);
            setSelectedClientName(null);
            setSelectedCompanyChatClientName(null);
            setThreadParentId(null);
          }}
          onUnreadOnlyChange={(nextShowUnreadOnly) => {
            setShowUnreadOnly(nextShowUnreadOnly);
            setActiveView("projects");
            setSelectedProjectId(null);
            setSelectedClientName(null);
            setSelectedCompanyChatClientName(null);
            setThreadParentId(null);
          }}
          onMarkRead={markRailTargetRead}
          onGlobalMarkRead={markGlobalViewRead}
          onSearchOpen={() => setIsSearchOpen(true)}
        />

      <section className="chat-main-pane">
        <header className="chat-main-header">
          <div className="chat-main-header-title">
            {!isCustomer &&
            ((activeView === "projects" && activeProjectChat) ||
              (activeView === "dms" && selectedDm) ||
              (activeView === "groups" && selectedGroup)) ? (
              <button
                className="chat-header-back"
                type="button"
                aria-label={
                  selectedDm
                    ? "Back to direct messages"
                    : selectedGroup
                      ? "Back to groups"
                      : selectedClientName
                        ? `Back to ${selectedClientName} projects`
                        : "Back to all project conversations"
                }
                onClick={() => {
                  if (selectedDm) {
                    setSelectedDmId(null);
                    setThreadParentId(null);
                  } else if (selectedGroup) {
                    setSelectedGroupId(null);
                    setThreadParentId(null);
                  } else if (selectedCompanyChatProject) {
                    setSelectedCompanyChatClientName(null);
                    setThreadParentId(null);
                  } else if (selectedClientName) {
                    setSelectedProjectId(null);
                    setThreadParentId(null);
                  } else {
                    selectProject(null);
                  }
                }}
              >
                <DsIcon name="arrow-left" size={18} />
              </button>
            ) : null}
            {selectedDmUser && activeView === "dms" ? (
              <CommentAvatar user={selectedDmUser} compact />
            ) : null}
            <div>
              <h1>
                {activeView === "dms" && selectedDm
                  ? selectedDm.title
                  : activeView === "groups" && selectedGroup
                    ? selectedGroup.title
                  : activeView !== "projects"
                  ? formatViewTitle(activeView)
                  : selectedCompanyChatProject
                    ? `${selectedCompanyChatProject.clientName} Client chat`
                  : selectedProject
                    ? `${selectedProject.code} ${selectedProject.title}`
                    : selectedClientName
                      ? `${selectedClientName} projects`
                      : "All project conversations"}
              </h1>
              {selectedDmUser && activeView === "dms" ? (
                <span className="label-xs">{selectedDmUser.roleLabel}</span>
              ) : selectedGroup && activeView === "groups" ? (
                <span className="label-xs">{selectedGroup.memberIds.length} members</span>
              ) : selectedCompanyChatProject && activeView === "projects" ? (
                <span className="label-xs">General conversation about {selectedCompanyChatProject.clientName}</span>
              ) : selectedProject && activeView === "projects" ? (
                <span className="label-xs">{selectedProject.clientName}</span>
              ) : null}
            </div>
          </div>
          <div className="chat-main-header-actions">
            {activeView === "dms" && !selectedDm ? (
              <>
                <button
                  className="chat-primary-button label-s-semibold"
                  type="button"
                  aria-expanded={isNewMessagePickerOpen}
                  onClick={() => setIsNewMessagePickerOpen((current) => !current)}
                >
                  <DsIcon name="plus" size={16} />
                  New message
                </button>
                {isNewMessagePickerOpen ? (
                  <div className="chat-member-picker" role="dialog" aria-label="Start a direct message">
                    <p className="label-xs-semibold">Message a studio member</p>
                    {chatUsers
                      .filter((user) => user.team === "studio" && user.id !== effectiveCurrentUserId)
                      .map((user) => {
                        const conversation = visibleDmConversations.find(
                          (candidate) =>
                            candidate.memberIds.includes(effectiveCurrentUserId) &&
                            candidate.memberIds.includes(user.id),
                        );

                        return (
                          <button
                            type="button"
                            key={user.id}
                            onClick={() => {
                              if (conversation) {
                                selectDirectConversation(conversation.id);
                              } else {
                                startDirectConversation(user.id);
                              }
                              setIsNewMessagePickerOpen(false);
                            }}
                          >
                            <CommentAvatar user={user} compact />
                            <span>
                              <strong className="label-s-semibold">{user.name}</strong>
                              <small className="label-xs">{user.roleLabel}</small>
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ) : null}
              </>
            ) : activeView === "groups" && !selectedGroup ? (
              <button
                className="chat-primary-button label-s-semibold"
                type="button"
                onClick={() => notify("New group ready")}
              >
                <DsIcon name="plus" size={16} />
                Create group
              </button>
            ) : null}
            {activeCallContext ? (
              <ChatCallLauncher
                contextName={activeCallContext.name}
                currentUserId={effectiveCurrentUserId}
                defaultMemberIds={activeCallContext.defaultMemberIds}
                availableMemberIds={activeCallContext.availableMemberIds}
                users={chatUsers}
                prominent={activeView === "calls"}
                onNotify={notify}
              />
            ) : null}
            {selectedProject && activeView === "projects" && !isCustomer ? (
              <>
                {getDemoProjectDestination(selectedProject.id, "brief") ? (
                  <Link
                    className="chat-secondary-button label-s-semibold"
                    href={getDemoProjectDestination(selectedProject.id, "brief")?.href ?? ""}
                  >
                    Go to project
                  </Link>
                ) : (
                  <span className="chat-secondary-button is-disabled label-s-semibold" aria-disabled="true">
                    Demo not available
                  </span>
                )}
                <button
                  className="chat-icon-button"
                  type="button"
                  aria-label="Manage project members"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <DsIcon name="users-three" size={19} />
                </button>
                {activeChannel === "external" ? (
                  <button
                    className="chat-icon-button"
                    type="button"
                    aria-label="Open External Chat settings"
                    onClick={() => setIsConnectorSettingsOpen(true)}
                  >
                    <DsIcon name="settings" size={19} />
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </header>

        {activeView === "calls" ? (
          <ChatCallsView
            calls={isEmptyPreview ? [] : recentCalls}
            projects={accessibleProjects}
            users={chatUsers}
            workspaceName={chatWorkspace.name}
            onNotify={notify}
          />
        ) : activeView === "dms" && selectedDm && selectedDmProject ? (
          <div className={`chat-conversation-layout ${threadParent ? "thread-open" : ""}`}>
            <section className="chat-conversation-pane direct">
              <ChatMessageList
                messages={directMessageStream}
                allMessages={messages}
                users={chatUsers}
                project={selectedDmProject}
                channel="internal"
                surface="direct"
                currentUserId={effectiveCurrentUserId}
                highlightedMessageId={highlightedMessageId}
                onOpenThread={setThreadParentId}
                onToggleReaction={toggleReaction}
                onDeleteMessage={deleteMessage}
                onEditMessage={editMessage}
                onMarkUnread={markMessageUnread}
                onFilesDropped={setPendingDroppedFiles}
                onNotify={notify}
              />
              <ChatComposer
                project={selectedDmProject}
                channel="internal"
                users={chatUsers}
                projects={accessibleProjects}
                studioConnectors={studioConnectors}
                placeholder={`Message ${selectedDm.title}`}
                incomingFiles={pendingDroppedFiles}
                onIncomingFilesConsumed={() => setPendingDroppedFiles([])}
                onSend={(submission) => submitDirectMessage(submission)}
                onEditLast={getLastEditableDirectMessage}
              />
            </section>

            {threadParent ? (
              <ChatThreadPane
                parentMessage={threadParent}
                replies={threadReplies}
                project={selectedDmProject}
                users={chatUsers}
                projects={accessibleProjects}
                studioConnectors={studioConnectors}
                currentUserId={effectiveCurrentUserId}
                directContext
                onClose={() => setThreadParentId(null)}
                onSend={(submission) => submitDirectMessage(submission, threadParent.id)}
                onToggleReaction={toggleReaction}
                onDeleteMessage={deleteMessage}
                onEditMessage={editMessage}
                onMarkUnread={markMessageUnread}
                onNotify={notify}
              />
            ) : null}
          </div>
        ) : activeView === "groups" && selectedGroup && selectedGroupProject ? (
          <div className={`chat-conversation-layout ${threadParent ? "thread-open" : ""}`}>
            <section className="chat-conversation-pane direct">
              <ChatMessageList
                messages={groupMessageStream}
                allMessages={messages}
                users={chatUsers}
                project={selectedGroupProject}
                channel="internal"
                surface="direct"
                currentUserId={effectiveCurrentUserId}
                highlightedMessageId={highlightedMessageId}
                onOpenThread={setThreadParentId}
                onToggleReaction={toggleReaction}
                onDeleteMessage={deleteMessage}
                onEditMessage={editMessage}
                onMarkUnread={markMessageUnread}
                onFilesDropped={setPendingDroppedFiles}
                onNotify={notify}
              />
              <ChatComposer
                project={selectedGroupProject}
                channel="internal"
                users={chatUsers}
                projects={accessibleProjects}
                studioConnectors={studioConnectors}
                placeholder={`Message ${selectedGroup.title}`}
                incomingFiles={pendingDroppedFiles}
                onIncomingFilesConsumed={() => setPendingDroppedFiles([])}
                onSend={(submission) => submitGroupMessage(submission)}
                onEditLast={getLastEditableGroupMessage}
              />
            </section>

            {threadParent ? (
              <ChatThreadPane
                parentMessage={threadParent}
                replies={threadReplies}
                project={selectedGroupProject}
                users={chatUsers}
                projects={accessibleProjects}
                studioConnectors={studioConnectors}
                currentUserId={effectiveCurrentUserId}
                directContext
                onClose={() => setThreadParentId(null)}
                onSend={(submission) => submitGroupMessage(submission, threadParent.id)}
                onToggleReaction={toggleReaction}
                onDeleteMessage={deleteMessage}
                onEditMessage={editMessage}
                onMarkUnread={markMessageUnread}
                onNotify={notify}
              />
            ) : null}
          </div>
        ) : activeView === "projects" && activeProjectChat ? (
          <>
            {!isCustomer ? (
              <div className={`chat-channel-tabs ${activeChannel}`} role="tablist" aria-label="Chat channel">
                <div className="chat-channel-tab-slot">
                  <button
                    className={`chat-channel-tab external ${activeChannel === "external" ? "active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeChannel === "external"}
                    onClick={() => {
                      setActiveChannel("external");
                      setThreadParentId(null);
                    }}
                  >
                    <span className="chat-channel-tab-copy">
                      <strong className="label-s-semibold">External</strong>
                      <small className="label-xs">Chat with the client</small>
                    </span>
                  </button>
                  <ChatUnreadControl
                    className="tab"
                    count={activeProjectChat.externalUnread}
                    ariaLabel={`Mark ${activeProjectChat.externalUnread} unread External messages as read`}
                    onMarkRead={() => markProjectChannelRead(activeProjectChat, "external")}
                  />
                </div>
                <div className="chat-channel-tab-slot">
                  <button
                    className={`chat-channel-tab internal ${activeChannel === "internal" ? "active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeChannel === "internal"}
                    onClick={() => {
                      setActiveChannel("internal");
                      setThreadParentId(null);
                    }}
                  >
                    <span className="chat-channel-tab-copy">
                      <strong className="label-s-semibold">Internal</strong>
                      <small className="label-xs">{chatWorkspace.name} only</small>
                    </span>
                  </button>
                  <ChatUnreadControl
                    className="tab"
                    count={activeProjectChat.internalUnread}
                    ariaLabel={`Mark ${activeProjectChat.internalUnread} unread Internal messages as read`}
                    onMarkRead={() => markProjectChannelRead(activeProjectChat, "internal")}
                  />
                </div>
              </div>
            ) : null}

            <div className={`chat-conversation-layout ${threadParent ? "thread-open" : ""}`}>
              <section className={`chat-conversation-pane ${activeChannel}`}>
                <ChatMessageList
                  messages={visibleMessages}
                  allMessages={messages}
                  users={chatUsers}
                  project={activeProjectChat}
                  channel={activeChannel}
                  currentUserId={effectiveCurrentUserId}
                  highlightedMessageId={highlightedMessageId}
                  onOpenThread={setThreadParentId}
                  onToggleReaction={toggleReaction}
                  onDeleteMessage={deleteMessage}
                  onEditMessage={editMessage}
                  onMarkUnread={markMessageUnread}
                  onFilesDropped={setPendingDroppedFiles}
                  onNotify={notify}
                />
                <ChatComposer
                  project={activeProjectChat}
                  channel={activeChannel}
                  canUseConnectors={!isCustomer}
                  users={chatUsers}
                  projects={accessibleProjects}
                  studioConnectors={studioConnectors}
                  placeholder={isCustomer ? "Message your production team" : undefined}
                  incomingFiles={pendingDroppedFiles}
                  onIncomingFilesConsumed={() => setPendingDroppedFiles([])}
                  onSend={(submission) => submitMessage(submission)}
                  onEditLast={getLastEditableMessage}
                />
              </section>

              {threadParent ? (
                <ChatThreadPane
                  parentMessage={threadParent}
                  replies={threadReplies}
                  project={activeProjectChat}
                  users={chatUsers}
                  projects={accessibleProjects}
                  studioConnectors={studioConnectors}
                  currentUserId={effectiveCurrentUserId}
                  customerContext={isCustomer}
                  onClose={() => setThreadParentId(null)}
                  onSend={(submission) => submitMessage(submission, threadParent.id)}
                  onToggleReaction={toggleReaction}
                  onDeleteMessage={deleteMessage}
                  onEditMessage={editMessage}
                  onMarkUnread={markMessageUnread}
                  onNotify={notify}
                />
              ) : null}
            </div>
          </>
        ) : activeView === "projects" ? (
          <ChatProjectList
            projects={isEmptyPreview ? [] : projectListProjects}
            messages={isEmptyPreview ? [] : messages}
            users={chatUsers}
            clientName={selectedClientName}
            showCompanyChat={!isCustomer && Boolean(selectedClientName)}
            onProjectSelect={selectProject}
            onCompanyChat={() => {
              if (selectedClientName) {
                selectCompanyChat(selectedClientName);
              }
            }}
            onCustomerSettings={() => setIsCustomerSettingsOpen(true)}
            onProjectMarkRead={(projectId) =>
              markRailTargetRead({ type: "project", projectId })
            }
            role={selectedRole}
          />
        ) : (
          <ChatGlobalView
            view={activeView}
            currentUserId={effectiveCurrentUserId}
            projects={accessibleProjects}
            messages={messages}
            users={chatUsers}
            directConversations={visibleDmConversations}
            groupConversations={isEmptyPreview ? [] : groupConversationList}
            customerContext={isCustomer}
            onConversationSelect={selectDirectConversation}
            onGroupConversationSelect={selectGroupConversation}
            onConversationMarkRead={markConversationRead}
            onMessageSelect={selectSearchResult}
          />
        )}
      </section>

      {isSearchOpen ? (
        <ChatSearchOverlay
          messages={messages}
          projects={accessibleProjects}
          users={chatUsers}
          role={selectedRole}
          currentUserId={effectiveCurrentUserId}
          onClose={() => setIsSearchOpen(false)}
          onSelectMessage={selectSearchResult}
        />
      ) : null}

      {isSettingsOpen && selectedProject ? (
        <ProjectMemberSettings
          project={selectedProject}
          users={chatUsers}
          companyUsers={selectedProjectCompanyUsers}
          onClose={() => setIsSettingsOpen(false)}
          onProjectChange={updateProject}
        />
      ) : null}

      {isConnectorSettingsOpen && selectedProject && !isCustomer ? (
        <ProjectConnectorSettings
          project={selectedProject}
          studioName={studio.details.name}
          studioConnectors={studioConnectors}
          onClose={() => setIsConnectorSettingsOpen(false)}
          onNotify={notify}
          onProjectChange={updateProject}
        />
      ) : null}

      {isCustomerSettingsOpen && selectedClient ? (
        <CustomerSettings
          clientName={selectedClient.name}
          status={selectedClient.status}
          projects={selectedClientProjects}
          companyUsers={selectedClientUsers}
          onClose={() => setIsCustomerSettingsOpen(false)}
          onStatusChange={(status) => {
            setClients((current) => current.map((client) =>
              client.name === selectedClient.name ? { ...client, status } : client,
            ));
          }}
          onNotify={notify}
        />
      ) : null}

      {isShortcutSheetOpen ? (
        <ShortcutSheet onClose={() => setIsShortcutSheetOpen(false)} />
      ) : null}

      {toast ? <div className="chat-toast label-s-semibold" role="status">{toast}</div> : null}
      </main>
    </div>
  );
}

function formatViewTitle(view: ChatRailView) {
  if (view === "dms") {
    return "Direct messages";
  }

  return view[0].toUpperCase() + view.slice(1);
}

function getCompanyChatId(clientName: string) {
  const clientSlug = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

  return `company-chat-${clientSlug}`;
}
