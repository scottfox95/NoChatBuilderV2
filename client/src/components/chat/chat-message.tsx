import { Message } from "@shared/schema";
import { useEffect, useState } from "react";

interface ChatMessageProps {
  message: Message;
  chatbotName?: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, chatbotName, isStreaming = false }: ChatMessageProps) {
  // State to control blinking cursor for streaming effect
  const [showCursor, setShowCursor] = useState(true);
  
  // Blink the cursor during streaming
  useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isStreaming]);
  
  // User message
  if (message.isUser) {
    return (
      <div className="flex items-start justify-end">
        <div className="mr-3 bg-blue-100 rounded-lg py-2 px-4 max-w-[80%] shadow-sm">
          <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
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
      <div className={`flex-shrink-0 ${isStreaming ? 'bg-pink-100' : 'bg-pink-200'} w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-300`}>
        <svg 
          className={`w-4 h-4 text-pink-500 ${isStreaming ? 'animate-pulse' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="ml-3 bg-pink-50 rounded-lg py-2 px-4 max-w-[80%] shadow-sm">
        <p className="text-gray-800 whitespace-pre-wrap">
          {message.content}
          {isStreaming && showCursor && <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-blink"></span>}
        </p>
        {!message.isUser && chatbotName && (
          <p className="text-xs text-pink-500 mt-1 text-right font-medium">
            {chatbotName} {isStreaming && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1"></span>}
          </p>
        )}
      </div>
    </div>
  );
}
