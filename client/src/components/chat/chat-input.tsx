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
    <form onSubmit={handleSubmit} className="flex items-center">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary rounded-r-none"
      />
      <Button
        type="submit"
        disabled={disabled || !message.trim()}
        className="bg-primary hover:bg-primary-dark text-white rounded-l-none px-4"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
