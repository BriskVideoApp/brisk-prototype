import { Suspense } from "react";
import { ChatPage } from "@/components/chat/ChatPage";
import "@/components/chat/chat.css";

type ChatRouteProps = {
  searchParams: Promise<{
    project?: string | string[];
    message?: string | string[];
  }>;
};

export default async function ChatRoute({ searchParams }: ChatRouteProps) {
  const params = await searchParams;
  const projectId = Array.isArray(params.project) ? params.project[0] : params.project;
  const messageId = Array.isArray(params.message) ? params.message[0] : params.message;

  return <Suspense fallback={null}><ChatPage initialProjectId={projectId} initialMessageId={messageId} /></Suspense>;
}
