import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="w-full bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-pink-500 focus:border-pink-500 pr-12 rounded-full shadow-sm"
      />
      <Button
        type="submit"
        disabled={disabled || !message.trim()}
        className="absolute right-1 top-1 bg-pink-500 hover:bg-pink-600 text-white h-8 w-8 p-0 rounded-full"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
