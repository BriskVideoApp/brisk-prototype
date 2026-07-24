import { ChatPage } from "@/components/chat/ChatPage";
import "@/components/chat/chat.css";

type ChatRouteProps = {
  searchParams: Promise<{
    project?: string | string[];
  }>;
};

export default async function ChatRoute({ searchParams }: ChatRouteProps) {
  const params = await searchParams;
  const projectId = Array.isArray(params.project) ? params.project[0] : params.project;

  return <ChatPage initialProjectId={projectId} />;
}
