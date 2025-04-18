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
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-[85vh] md:h-[80vh]">
            <ChatInterface chatbotSlug={slug} />
          </div>
        </div>
      </div>
      
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