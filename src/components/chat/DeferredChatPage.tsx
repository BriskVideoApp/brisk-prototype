"use client";

import dynamic from "next/dynamic";

// Keep the existing drawer lifetime; defer only loading its implementation.
export const DeferredChatPage = dynamic(
  () => import("./ChatPage").then((module) => module.ChatPage),
  { ssr: false },
);
