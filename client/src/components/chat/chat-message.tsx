import { Message } from "@shared/schema";
import React from "react";
import aidifyIcon from "../../assets/Aidify_ProfileAVI.png";

interface ChatMessageProps {
  message: Message;
  chatbotName?: string;
  isStreaming?: boolean;
  showAvatar?: boolean;
  isLastInGroup?: boolean;
  isFirstInGroup?: boolean;
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

export default function ChatMessage({ 
  message, 
  chatbotName, 
  isStreaming = false,
  showAvatar = true,
  isLastInGroup = true,
  isFirstInGroup = true
}: ChatMessageProps) {
  
  // User message
  if (message.isUser) {
    return (
      <div className={`flex items-start justify-end mb-1 ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
        <div 
          className={`mr-2 bg-[#0B84FE] rounded-[16px] py-2 px-3 shadow-sm
            ${isFirstInGroup && isLastInGroup ? 'rounded-tr-[16px] rounded-tl-[16px] rounded-bl-[16px] rounded-br-[16px]' : 
             isFirstInGroup ? 'rounded-tr-[16px] rounded-tl-[16px] rounded-bl-[16px] rounded-br-sm' :
             isLastInGroup ? 'rounded-tr-sm rounded-tl-[16px] rounded-bl-[16px] rounded-br-[16px]' : 
             'rounded-tr-sm rounded-tl-[16px] rounded-bl-[16px] rounded-br-sm'}
            max-w-[80%] md:max-w-[70%] mr-3
          `}
        >
          <p className="text-white whitespace-pre-wrap text-base" 
             style={{ wordBreak: 'break-word' }}>
            {formatMessageContent(message.content)}
          </p>
        </div>
        {showAvatar && (
          <div className="flex-shrink-0 min-w-[36px] h-9 w-9 rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-4.5 h-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        {!showAvatar && <div className="w-9" />}
      </div>
    );
  }
  
  // Bot message
  return (
    <div className={`flex items-start ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
      {showAvatar ? (
        <div className={`flex-shrink-0 min-w-[36px] ${isStreaming ? 'bg-[#00001E]/90' : 'bg-[#00001E]'} w-9 h-9 rounded-full 
          flex items-center justify-center shadow-sm transition-colors duration-300 overflow-hidden`}>
          <img 
            src={aidifyIcon} 
            className={`w-9 h-9 ${isStreaming ? 'animate-pulse' : ''}`} 
            alt="Aidify Bot"
          />
        </div>
      ) : (
        <div className="w-9" />
      )}
      <div 
        className={`ml-2 bg-[#E9E9EB] rounded-[16px] py-2 px-3 shadow-sm
          ${isFirstInGroup && isLastInGroup ? 'rounded-tr-[16px] rounded-tl-[16px] rounded-bl-[16px] rounded-br-[16px]' : 
           isFirstInGroup ? 'rounded-tr-[16px] rounded-tl-sm rounded-bl-sm rounded-br-[16px]' :
           isLastInGroup ? 'rounded-tr-[16px] rounded-tl-[16px] rounded-bl-[16px] rounded-br-sm' : 
           'rounded-tr-[16px] rounded-tl-sm rounded-bl-sm rounded-br-[16px]'}
          max-w-[80%] md:max-w-[70%]
        `}
      >
        <div className={`relative ${isStreaming ? 'animate-text-fade-in' : ''}`}>
          <p className="text-gray-800 whitespace-pre-wrap text-sm"
             style={{ wordBreak: 'break-word' }}>
            {formatMessageContent(message.content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-blink"></span>
            )}
          </p>
        </div>
        {isLastInGroup && !message.isUser && chatbotName && (
          <p className="text-xs text-[#EA19FF] mt-1.5 font-medium">
            {chatbotName} {isStreaming && (
              <span className="inline-flex items-center ml-1">
                <span className="text-xs mr-1">typing</span>
                <span className="flex space-x-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-[#EA19FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="inline-block w-1.5 h-1.5 bg-[#EA19FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="inline-block w-1.5 h-1.5 bg-[#EA19FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </span>
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
