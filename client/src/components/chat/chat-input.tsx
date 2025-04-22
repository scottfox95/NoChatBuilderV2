import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 120px height
      textareaRef.current.style.height = `${newHeight}px`;
      setRows(Math.ceil(newHeight / 24)); // Approximate row height is 24px
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
      
      // Provide haptic feedback on send if supported
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey && !disabled && message.trim()) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-2">
      {/* Quick replies (collapsed when textarea grows) */}
      {rows === 1 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => !disabled && setMessage("How does this service work?")}
            className="inline-flex px-2.5 py-1 text-xs bg-white hover:bg-gray-100 text-gray-800 rounded-full border border-gray-300 transition-colors shadow-sm whitespace-nowrap"
          >
            How does this service work?
          </button>
          <button
            type="button"
            onClick={() => !disabled && setMessage("What are my next steps?")}
            className="inline-flex px-2.5 py-1 text-xs bg-white hover:bg-gray-100 text-gray-800 rounded-full border border-gray-300 transition-colors shadow-sm whitespace-nowrap"
          >
            What are my next steps?
          </button>
        </div>
      )}
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 pr-12 rounded-2xl shadow-sm py-2.5 px-3.5 text-sm min-h-[44px]"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <Button
          type="submit"
          disabled={disabled || !message.trim()}
          className="absolute right-1.5 bottom-1.5 bg-[#EA19FF] hover:bg-[#C716D1] text-white h-9 w-9 p-0 rounded-full flex items-center justify-center"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
