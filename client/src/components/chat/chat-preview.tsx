import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip } from "lucide-react";
import aidifyIcon from "../../assets/Aidify_ProfileAVI.png";

interface ChatPreviewProps {
  name?: string;
  description?: string;
  welcomeMessages?: string[];
  suggestedQuestions?: string[];
}

export default function ChatPreview({ 
  name = "My Chatbot", 
  description = "A helpful assistant for my users",
  welcomeMessages = ["Hello! How can I assist you today?"],
  suggestedQuestions = []
}: ChatPreviewProps) {
  
  // Show the first welcome message, or all if there are multiple
  const displayMessages = welcomeMessages.filter(msg => msg.trim().length > 0);
  
  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-neutral-800">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
        <img 
          src={aidifyIcon} 
          alt="Chatbot Avatar" 
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{name}</h3>
          {description && (
            <p className="text-sm text-neutral-400 truncate">{description}</p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Welcome Messages */}
        {displayMessages.map((message, index) => (
          <div key={index} className="flex items-start gap-3">
            <img 
              src={aidifyIcon} 
              alt="Bot" 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
            />
            <div className="flex-1">
              <div className="bg-neutral-800 rounded-lg p-3 max-w-[80%]">
                <p className="text-sm text-white whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs text-neutral-500 px-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.slice(0, 3).map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700 cursor-default"
                  disabled
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area (Visual Only) */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type your message..."
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 pr-20"
              disabled
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-neutral-400"
                disabled
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-neutral-400"
                disabled
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-2 text-center">
          This is a preview - the actual chatbot will be interactive
        </p>
      </div>
    </div>
  );
}