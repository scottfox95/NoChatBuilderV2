import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Basic message shape coming from the server */
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = { message: ChatMessage };

/**
 * Chat bubble component
 * – Assistant messages use light-gray, user messages use light-green
 * – Markdown is rendered via react-markdown + remark-gfm
 */
export default function Message({ message }: Props) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`rounded-lg p-3 leading-relaxed ${
        isAssistant ? "bg-slate-50" : "bg-green-50"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className="prose prose-sm max-w-none"
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}