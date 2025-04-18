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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-gradient-to-r from-pink-100 to-blue-100 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="bg-pink-200 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">{chatbot.name}</h1>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                Online
              </span>
            </div>
            {chatbot.description && (
              <p className="text-sm text-gray-600 mt-1 ml-10">
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
      <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-500 bg-white">
        <div className="container mx-auto px-4">
          <p>Powered by Aidify | AI-powered assistance</p>
        </div>
      </footer>
      
      {/* Disclaimer */}
      <div className="max-w-3xl mx-auto px-4 pb-8 text-xs text-gray-500">
        <p>
          Disclaimer: Aidify's services are designed to offer support and information for patients undergoing
          various medical treatments and procedures. While we endeavor to provide accurate and beneficial
          advice, our services should not replace professional medical guidance, diagnosis, or treatment. It's
          essential to consult with your healthcare provider for advice tailored to your specific health needs
          and concerns.
        </p>
      </div>
    </div>
  );
}