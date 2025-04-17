import { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  // User message
  if (message.isUser) {
    return (
      <div className="flex items-start justify-end">
        <div className="mr-3 bg-primary/30 rounded-lg py-2 px-3 max-w-[80%]">
          <p className="text-white whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex-shrink-0 bg-neutral-700 w-8 h-8 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    );
  }
  
  // Bot message
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 bg-primary/20 w-8 h-8 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-primary-light" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="ml-3 bg-neutral-800 rounded-lg py-2 px-3 max-w-[80%]">
        <p className="text-white whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
