import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import ChatPreview from "@/components/chat/chat-preview";

export default function ChatbotPreviewWrapper() {
  const form = useFormContext();
  
  // Return a fallback preview if form context is not available
  if (!form) {
    return (
      <ChatPreview
        name="My Chatbot"
        description="A helpful assistant for my users"
        welcomeMessages={["Hello! How can I assist you today?"]}
        suggestedQuestions={[]}
      />
    );
  }
  
  // Watch form values for real-time updates
  const watchedValues = useWatch({
    control: form.control,
    name: ["name", "description", "welcomeMessages", "suggestedQuestions"]
  });

  const [name, description, welcomeMessages, suggestedQuestions] = watchedValues;

  return (
    <ChatPreview
      name={name || "My Chatbot"}
      description={description || "A helpful assistant for my users"}
      welcomeMessages={welcomeMessages || ["Hello! How can I assist you today?"]}
      suggestedQuestions={suggestedQuestions || []}
    />
  );
}