import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Chatbot } from "@shared/schema";
import { Loader } from "@/components/ui/loader";
import ChatInterface from "@/components/chat/chat-interface";

export default function CareAidPublicPage() {
  const [match, params] = useRoute("/public/care-aid/:slug");
  const slug = params?.slug || "";
  
  // Get chatbot information
  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/public/chatbot/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size="lg" variant="primary" withText text="Loading Care Aid..." />
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Care Aid Not Found</h1>
          <p className="text-neutral-400 mb-6">
            The Care Aid you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-background-light">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{chatbot.name}</h1>
            </div>
            {chatbot.description && (
              <p className="text-sm text-neutral-400 mt-1">
                {chatbot.description}
              </p>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-[75vh] md:h-[70vh]">
            <ChatInterface chatbotSlug={slug} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-neutral-800 py-4 text-center text-sm text-neutral-500">
        <div className="container mx-auto px-4">
          <p>Powered by Aidify | Built with OpenAI's Responses API</p>
        </div>
      </footer>
    </div>
  );
}