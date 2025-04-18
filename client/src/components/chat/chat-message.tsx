import { Message } from "@shared/schema";
import React from "react";
import aidifyIcon from "../../assets/aidify-logo.png";

interface ChatMessageProps {
  message: Message;
  chatbotName?: string;
  isStreaming?: boolean;
}

// Function to format message content with bold text
function formatMessageContent(content: string): React.ReactNode {
  if (!content) return null;
  
  // Split content by **text** pattern
  const parts = content.split(/(\*\*.*?\*\*)/g);
  
  // Map parts to React nodes with appropriate styling
  return parts.map((part, index) => {
    // Check if this part is enclosed in ** **
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove the ** from the beginning and end
      const text = part.slice(2, -2);
      return <strong key={index} className="font-bold">{text}</strong>;
    }
    
    // Return regular text
    return part;
  });
}

export default function ChatMessage({ message, chatbotName, isStreaming = false }: ChatMessageProps) {
  
  // User message
  if (message.isUser) {
    return (
      <div className="flex items-start justify-end">
        <div className="mr-3 bg-blue-100 rounded-lg py-2 px-4 max-w-[80%] shadow-sm">
          <p className="text-gray-800 whitespace-pre-wrap">{formatMessageContent(message.content)}</p>
        </div>
        <div className="flex-shrink-0 bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    );
  }
  
  // Bot message
  return (
    <div className="flex items-start">
      <div className={`flex-shrink-0 ${isStreaming ? 'bg-gray-900' : 'bg-gray-950'} w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-300`}>
        <img 
          src={aidifyIcon} 
          className={`w-6 h-6 ${isStreaming ? 'animate-pulse' : ''}`} 
          alt="Aidify Bot"
        />
      </div>
      <div className="ml-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg py-2 px-4 max-w-[80%] shadow-sm">
        <div className={`relative ${isStreaming ? 'animate-text-fade-in' : ''}`}>
          <p className="text-gray-800 whitespace-pre-wrap">
            {formatMessageContent(message.content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-blink"></span>
            )}
          </p>
        </div>
        {!message.isUser && chatbotName && (
          <p className="text-xs text-indigo-600 mt-1 text-right font-medium">
            {chatbotName} {isStreaming && (
              <span className="inline-flex items-center ml-1">
                <span className="text-xs mr-1">typing</span>
                <span className="flex space-x-1">
                  <span className="inline-block w-1 h-1 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="inline-block w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </span>
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
