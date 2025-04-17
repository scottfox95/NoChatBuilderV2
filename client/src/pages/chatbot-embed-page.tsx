import { useParams } from "wouter";
import ChatInterface from "@/components/chat/chat-interface";

export default function ChatbotEmbedPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "";
  
  return (
    <div className="h-screen bg-background">
      <div className="max-w-full mx-auto h-full">
        <ChatInterface chatbotSlug={slug} isPreview={false} />
      </div>
    </div>
  );
}